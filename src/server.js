import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";

let speedhiveUrl = process.env.SPEEDHIVE_URL || "";
let overlayEnabled = true;
let scrapingEnabled = true;
const CONFIG_FILE = path.resolve("config.json");

// Load config on startup
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const conf = JSON.parse(raw);
    if (conf.speedhiveUrl) speedhiveUrl = conf.speedhiveUrl;
    if (typeof conf.overlayEnabled === 'boolean') overlayEnabled = conf.overlayEnabled;
    if (typeof conf.scrapingEnabled === 'boolean') scrapingEnabled = conf.scrapingEnabled;
    console.log("Loaded config:", { speedhiveUrl, overlayEnabled, scrapingEnabled });
  }
} catch (e) {
  console.error("Error loading config:", e);
}

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(cors());
app.use("/api", (req, res, next) => {
  res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  next();
});
app.use(express.static("dist"));

// --- STATE MANAGEMENT ---
let lastData = { standings: [], sessionName: "", sessionLaps: "", flagFinish: false, announcements: [], updatedAt: 0 };
let globalBrowser = null;
let globalPage = null;
let isBrowserInitializing = false;
let lastUrl = "";

// --- BROWSER MANAGEMENT ---

async function launchBrowser() {
  const launchOptions = {
    headless: "new",
    args: [
      "--no-sandbox", 
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", 
      "--disable-gpu",
      "--disable-speech-api",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-breakpad",
      "--disable-component-extensions-with-background-pages",
      "--disable-extensions",
      "--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints,AudioServiceOutOfProcess,IsolateOrigins,site-per-process",
      "--disable-ipc-flooding-protection",
      "--disable-renderer-backgrounding",
      "--enable-features=NetworkService,NetworkServiceInProcess",
      "--force-color-profile=srgb",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-default-browser-check",
      "--no-pings",
      "--password-store=basic",
      "--use-gl=swiftshader",
      "--window-size=1280,720",
      "--disable-site-isolation-trials"
    ]
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const b = await puppeteer.launch(launchOptions);
  const p = await b.newPage();
  
  p.setDefaultNavigationTimeout(60000); 
  p.setDefaultTimeout(60000);

  await p.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
  await p.setViewport({ width: 1280, height: 720 });
  
  // Forward browser console logs (optional, kept for debug)
  // p.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await p.setRequestInterception(true);
  p.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'media', 'font'].includes(resourceType)) {
          req.abort();
      } else {
          req.continue();
      }
  });
  
  return { browser: b, page: p };
}

async function ensurePage(targetUrl) {
  if (isBrowserInitializing) return null;

  try {
    // 1. Check if browser exists and is connected
    if (!globalBrowser || !globalBrowser.isConnected()) {
      console.log("Initializing Browser...");
      isBrowserInitializing = true;
      if (globalBrowser) try { await globalBrowser.close(); } catch {}
      globalBrowser = null;
      globalPage = null;
      
      const instance = await launchBrowser();
      globalBrowser = instance.browser;
      globalPage = instance.page;
      isBrowserInitializing = false;
      lastUrl = ""; // Reset URL tracking
    }

    // 2. Check if page exists (should always be true if browser is ok)
    if (!globalPage || globalPage.isClosed()) {
       console.log("Page closed, recreating...");
       globalPage = await globalBrowser.newPage();
       lastUrl = "";
    }

    // 3. Navigate if URL changed or first run
    if (lastUrl !== targetUrl) {
      console.log(`Navigating to ${targetUrl}`);
      // Use goto for the first time
      await globalPage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      lastUrl = targetUrl;
      
      // Initial wait for rows to stabilize
      try {
          await globalPage.waitForFunction(() => {
             const t = document.body.innerText || "";
             return (!t.includes("Loading") && t.length > 50) || document.querySelectorAll('.datatable-body-row, tr').length > 0;
          }, { timeout: 15000 });
      } catch (e) {
          console.log("Initial load wait timed out, proceeding anyway.");
      }
    }

    return globalPage;
  } catch (e) {
    console.error("Error in ensurePage:", e);
    isBrowserInitializing = false;
    // Force restart next time
    try { if (globalBrowser) await globalBrowser.close(); } catch {}
    globalBrowser = null;
    globalPage = null;
    lastUrl = "";
    return null;
  }
}

// --- SCRAPING LOGIC ---

const SCRAPE_FUNCTION = (wantDebug) => {
    function text(el) { return (el?.textContent || "").trim(); }
    function safeParseInt(v) { const n = parseInt(String(v).replace(/[^\d]/g, "")); return Number.isFinite(n) ? n : null; }
    
    function extractSessionName() {
      const h1 = document.querySelector('h1.session-name') || document.querySelector('[class*="session-name"]');
      const t = text(h1);
      if (t) return t;
      const tt = h1?.getAttribute?.('title') || '';
      if (tt) return tt.trim();
      const meta = document.querySelector('h1[title]');
      const mt = text(meta) || meta?.getAttribute?.('title') || '';
      if (mt) return mt.trim();
      const nd = window.__NEXT_DATA__?.props?.pageProps;
      const sn = nd?.session?.name || nd?.event?.name || '';
      if (sn) return String(sn);
      return document.title || '';
    }
    function extractSessionLaps() {
      const headers = Array.from(document.querySelectorAll('.header, .label'));
      for (const h of headers) {
        if (text(h).toLowerCase() === 'laps' || text(h).toLowerCase() === 'vueltas') {
          let val = h.nextElementSibling;
          if (val) {
             if (val.classList.contains('value')) return text(val);
             const t = text(val);
             if (/^[\d/]+$/.test(t)) return t;
          }
          const parent = h.parentElement;
          if (parent) {
             val = parent.querySelector('.value');
             if (val) return text(val);
             const digitEl = Array.from(parent.children).find(c => c !== h && /^[\d/]+$/.test(text(c)));
             if (digitEl) return text(digitEl);
          }
        }
      }
      const candidates = Array.from(document.querySelectorAll('div, span, p, li'));
      for (const el of candidates) {
         if (el.children.length > 2) continue;
         const t = text(el);
         if (!t || t.length > 30) continue;
         const m = t.match(/(?:laps|vueltas)\s*[:]?\s*(\d+(?:\/\d+)?)/i);
         if (m) return m[1];
         const m2 = t.match(/(\d+(?:\/\d+)?)\s*(?:laps|vueltas)/i);
         if (m2) return m2[1];
      }
      return null;
    }
    function extractFlagFinish() {
      const byClass = document.querySelector('i.ico-flag-finish-xl') || document.querySelector('[class*="ico-flag-finish"]');
      if (byClass) return true;
      const svgFlag = Array.from(document.querySelectorAll('svg, i, span')).some(el => {
        const c = (el.getAttribute('class') || '').toLowerCase();
        return c.includes('flag') && (c.includes('finish') || c.includes('check'));
      });
      if (svgFlag) return true;
      const txt = document.body.innerText.toLowerCase();
      if (/\bfinish\b/.test(txt) && /\bflag\b/.test(txt)) return true;
      const nd = window.__NEXT_DATA__?.props?.pageProps;
      const st = nd?.session?.status?.toLowerCase?.() || '';
      if (st && (st.includes('finish') || st.includes('completed') || st.includes('ended'))) return true;
      return false;
    }
    function extractFromDataTable() {
      const headerNodes = Array.from(document.querySelectorAll('div[class*="datatable-header"]'));
      if (!headerNodes.length) return null;
      const headers = headerNodes.map(h => text(h).toLowerCase());
      const getIdx = label => headers.findIndex(h => h.includes(label));
      const idx = {
        pos: getIdx("pos"),
        comp: getIdx("competitor"),
        num: headers.findIndex(h => h.trim() === "#" || h.includes("número") || h.includes("number")),
        laps: getIdx("laps"),
        last: getIdx("last"),
        diff: getIdx("diff"),
        gap: getIdx("gap"),
        total: getIdx("total"),
        best: getIdx("best")
      };
      const rowNodes = Array.from(document.querySelectorAll('div[class*=\"datatable-body-row\"], div[class*=\"datatable-row\"]'));
      if (!rowNodes.length) return null;
      const out = [];
      for (const row of rowNodes) {
        const getSel = (sel) => {
          const el = row.querySelector(sel);
          return el ? text(el) : "";
        };
        const compCell = getSel('.datatable-cell-competitor');
        const numberCellSel = getSel('.datatable-cell-display-number') || getSel('.datatable-cell-number');
        let number = numberCellSel;
        if (!number) {
          const m = compCell.match(/^\s*(\d{1,4})\s+/);
          number = m ? m[1] : (compCell.match(/\b\d{1,4}\b/)?.[0] || "");
        }
        
        let name = compCell;
        if (number) {
           const escNum = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
           const startRe = new RegExp(`^\\s*${escNum}[\\s.\\-]*`, "i");
           name = name.replace(startRe, "");
           const endRe = new RegExp(`[\\s.\\-]*${escNum}\\s*$`, "i");
           name = name.replace(endRe, "");
        } else {
           name = name.replace(/^\s*\d{1,4}[\s.\\-]+/, "");
        }
        name = name.replace(/^[\s.\\-]+/, "").replace(/[\s.\\-]+$/, "").trim();

        const positionCellSel = getSel('.datatable-cell-position');
        const lapsCellSel = getSel('.datatable-cell-laps');
        const lastCellSel = getSel('.datatable-cell-last') || getSel('.datatable-cell-last-lap-time');
        const diffCellSel = getSel('.datatable-cell-diff') || getSel('.datatable-cell-difference');
        const gapCellSel = getSel('.datatable-cell-gap');
        const totalCellSel = getSel('.datatable-cell-total') || getSel('.datatable-cell-total-time');
        const bestCellSel = getSel('.datatable-cell-best') || getSel('.datatable-cell-best-lap-time');
        const classCellSel = getSel('.datatable-cell-class');
        
        const flagIcon = row.querySelector('.ico-flag-finish') || row.querySelector('.flag-icon-finish') || row.querySelector('.fa-flag-checkered') || row.querySelector('[class*="finish-flag"]') || row.querySelector('[class*="flag-finish"]') || row.querySelector('img[alt*="finish" i]') || row.querySelector('img[src*="finish" i]');
        const hasFinishFlag = !!flagIcon;

        let position = safeParseInt(positionCellSel);
        let laps = safeParseInt(lapsCellSel);
        if (position == null && idx.pos >= 0) {
          let cells = Array.from(row.querySelectorAll(':scope > *'));
          if (!cells.length) cells = Array.from(row.children);
          position = safeParseInt(idx.pos >= 0 && idx.pos < cells.length ? text(cells[idx.pos]) : "");
        }
        if (laps == null && idx.laps >= 0) {
          let cells = Array.from(row.querySelectorAll(':scope > *'));
          if (!cells.length) cells = Array.from(row.children);
          laps = safeParseInt(idx.laps >= 0 && idx.laps < cells.length ? text(cells[idx.laps]) : "");
        }
        out.push({
          position, number, name, class: classCellSel || "", laps, lastLap: lastCellSel, diff: diffCellSel, gap: gapCellSel, totalTime: totalCellSel, bestLap: bestCellSel, hasFinishFlag
        });
      }
      return wantDebug ? { rows: out, headers, idx } : out;
    }
    function extractFromNext() {
      const data = window.__NEXT_DATA__;
      const pp = data?.props?.pageProps;
      const lb = pp?.leaderboard || pp?.standings || pp?.results;
      if (Array.isArray(lb)) {
        const out = lb.map(row => ({
          position: row.position ?? row.pos ?? null,
          number: row.number ?? row.no ?? null,
          name: row.name ?? row.competitor ?? row.driver ?? "",
          class: row.class ?? row.group ?? "",
          laps: row.laps ?? null,
          lastLap: row.lastLap ?? row.last_time ?? "",
          diff: row.diff ?? "",
          gap: row.gap ?? "",
          totalTime: row.totalTime ?? "",
          bestLap: row.bestLap ?? row.best_time ?? ""
        }));
        return wantDebug ? { rows: out, headers: [], idx: {} } : out;
      }
      return null;
    }
    function extractFromRoles() {
      const headers = Array.from(document.querySelectorAll('[role="columnheader"]')).map(h => text(h).toLowerCase());
      if (!headers.length) return null;
      const getIdx = label => headers.findIndex(h => h.includes(label));
      const idx = {
        pos: getIdx("pos"), comp: getIdx("competitor"), laps: getIdx("laps"), last: getIdx("last"), diff: getIdx("diff"), gap: getIdx("gap"), total: getIdx("total"), best: getIdx("best")
      };
      const bodyRows = Array.from(document.querySelectorAll('[role=\"row\"]')).filter(r => !r.querySelector('[role=\"columnheader\"]'));
      const result = [];
      for (const tr of bodyRows) {
        const flagIcon = tr.querySelector('.ico-flag-finish') || tr.querySelector('[class*="flag-finish"]') || tr.querySelector('[class*="finish-flag"]');
        const cells = Array.from(tr.querySelectorAll('[role="cell"], td, div'));
        function cell(i) { return i >= 0 && i < cells.length ? text(cells[i]) : ""; }
        const comp = cell(idx.comp);
        const numberMatch = comp.match(/^\s*(\d{1,4})\s+/);
        const number = numberMatch ? numberMatch[1] : "";
        const name = numberMatch ? comp.replace(numberMatch[0], "").trim() : comp;
        result.push({
          hasFinishFlag: !!flagIcon, position: safeParseInt(cell(idx.pos)), number, name, class: "", laps: safeParseInt(cell(idx.laps)), lastLap: cell(idx.last), diff: cell(idx.diff), gap: cell(idx.gap), totalTime: cell(idx.total), bestLap: cell(idx.best)
        });
      }
      return wantDebug ? { rows: result, headers, idx } : result;
    }
    function extractFromTableTag() {
      const t = document.querySelector("table");
      if (!t) return null;
      const headerCells = Array.from(t.querySelectorAll("thead th"));
      const headers = headerCells.map(h => text(h).toLowerCase());
      const getIdx = label => headers.findIndex(h => h.includes(label));
      const idx = {
        pos: getIdx("pos"), comp: getIdx("competitor"), laps: getIdx("laps"), last: getIdx("last"), diff: getIdx("diff"), gap: getIdx("gap"), total: getIdx("total"), best: getIdx("best")
      };
      const bodyRows = Array.from(t.querySelectorAll("tbody tr"));
      const result = [];
      for (const tr of bodyRows) {
        const flagIcon = tr.querySelector('.ico-flag-finish') || tr.querySelector('[class*="flag-finish"]') || tr.querySelector('[class*="finish-flag"]');
        const cells = Array.from(tr.children);
        function cell(i) { return i >= 0 && i < cells.length ? text(cells[i]) : ""; }
        const comp = cell(idx.comp);
        const numberMatch = comp.match(/^\s*(\d{1,4})\s+/);
        const number = numberMatch ? numberMatch[1] : "";
        const name = numberMatch ? comp.replace(numberMatch[0], "").trim() : comp;
        result.push({
          hasFinishFlag: !!flagIcon, position: safeParseInt(cell(idx.pos)), number, name, class: "", laps: safeParseInt(cell(idx.laps)), lastLap: cell(idx.last), diff: cell(idx.diff), gap: cell(idx.gap), totalTime: cell(idx.total), bestLap: cell(idx.best)
        });
      }
      return wantDebug ? { rows: result, headers, idx } : result;
    }
    function stats(list) {
      const keys = ["position","number","name","laps","lastLap","diff","gap","totalTime","bestLap","lapProgress","hasFinishFlag"];
      const out = {};
      for (const k of keys) out[k] = list.reduce((acc, r) => acc + (r[k] ? 1 : 0), 0);
      return out;
    }
    function parseAnnouncement(msg) {
      const m1 = msg.match(/Number\s+(\d+)\s+is up\s+(\d+)\s+places?\s+to\s+(\d+)/i);
      if (m1) return { kind: "pos_up", number: parseInt(m1[1],10), delta: parseInt(m1[2],10), toPos: parseInt(m1[3],10), text: msg };
      const m2 = msg.match(/Number\s+(\d+)\s+has just dropped to\s+(\d+)/i);
      if (m2) return { kind: "pos_down", number: parseInt(m2[1],10), toPos: parseInt(m2[2],10), text: msg };
      const m4 = msg.match(/Here comes Number\s+(\d+).*Number\s+(\d+)/i);
      if (m4) return { kind: "chase", number: parseInt(m4[1],10), target: parseInt(m4[2],10), text: msg };
      return { kind: "text", text: msg };
    }
    function extractAnnouncements() {
      const rootIcon = document.querySelector('.ico-announcement') || document.querySelector('[class*=\"ico-announcement\"]');
      const container = rootIcon ? (rootIcon.closest('.col-12') || rootIcon.parentElement) : (document.querySelector('[class*=\"announcement\"]') || document.querySelector('[class*=\"broadcast\"]') || null);
      const blocks = container ? Array.from(container.querySelectorAll('.d-flex.align-items-center.text-nowrap')) : [];
      const items = [];
      for (const b of blocks) {
        const tm = text(b.querySelector('.time'));
        const msg = text(b.querySelector('.text'));
        if (msg) {
          const parsed = parseAnnouncement(msg);
          items.push({ time: tm, ...parsed });
        }
      }
      if (!items.length) {
        const nodes = Array.from(document.querySelectorAll('span, div'));
        for (const el of nodes) {
          const t = text(el);
          if (!t) continue;
          if (/Number\s+\d+/.test(t) || /gap to Number\s+\d+/.test(t) || /dropped to\s+\d+/.test(t)) {
            items.push({ time: "", ...parseAnnouncement(t) });
          }
          if (items.length >= 6) break;
        }
      }
      return items.slice(0, 6);
    }
    
    let source = null;
    let payload = extractFromDataTable();
    if (payload) source = "datatable";
    if (!payload) { payload = extractFromRoles(); if (payload) source = "roles"; }
    if (!payload) { payload = extractFromTableTag(); if (payload) source = "table"; }
    if (!payload) { payload = extractFromNext(); if (payload) source = "next"; }
    if (!payload) {
      function extractGenericList() {
         const candidates = Array.from(document.querySelectorAll('div, li, tr'));
         const potentialRows = [];
         for (const el of candidates) {
            const textContent = text(el);
            if (!/^\d+\s+[A-Za-z]/.test(textContent)) continue;
            if (textContent.length < 5 || textContent.length > 200) continue;
            const parts = textContent.split(/\s+/);
            if (parts.length < 3) continue;
            if (!/\d+:\d+\.\d+/.test(textContent) && !/\d+\.\d+/.test(textContent) && !/Laps/.test(textContent)) continue;
            if (/Pos|Name|Gap|Diff/i.test(textContent)) continue;
            potentialRows.push({
               position: parseInt(parts[0]) || 0, number: parts[1] || "", name: parts.slice(2, 5).join(" "), laps: 0, lastLap: "", diff: "", gap: "", totalTime: "", bestLap: ""
            });
            if (potentialRows.length > 50) break;
         }
         if (potentialRows.length >= 3) {
             potentialRows.sort((a,b) => a.position - b.position);
             const isSequential = potentialRows.slice(0, 3).every((r, i) => r.position === i + 1 || r.position === i + 2);
             if (isSequential) return potentialRows;
         }
         return null;
      }
      const generic = extractGenericList();
      if (generic) { payload = generic; source = "generic_list_scan"; }
    }

    const rows = wantDebug ? (payload?.rows || []) : (payload || []);
    const sessionName = extractSessionName();
    const sessionLaps = extractSessionLaps();
    const flagFinish = extractFlagFinish();
    const announcements = extractAnnouncements();
    const dbg = wantDebug ? { 
        sourceMethod: source, headers: payload?.headers || [], idx: payload?.idx || {}, stats: stats(rows), pageTitle: document.title, bodyPreview: document.body.innerText.substring(0, 2000), htmlPreview: document.documentElement.outerHTML.substring(0, 2000)
    } : null;
    return { rows, sessionName, sessionLaps, flagFinish, announcements, debug: dbg };
};

// --- BACKGROUND LOOP ---

async function tick() {
  if (!scrapingEnabled || !speedhiveUrl) {
    return;
  }

  const p = await ensurePage(speedhiveUrl);
  if (!p) return; // Browser initializing or error

  try {
    const result = await p.evaluate(SCRAPE_FUNCTION, false);
    
    // Logic to merge/stabilize data (same as before)
    const isEmpty = !result.rows || result.rows.length === 0;
    const hasOldData = lastData.standings && lastData.standings.length > 0;
    const cleanName = (n) => (n || "").toLowerCase().replace(/\s+/g, "").replace(/speedhive|mylaps|loading/gi, "").replace(/lap\d+/gi, "").replace(/vuelta\d+/gi, "").replace(/\d+\/\d+/g, "");
    const s1 = cleanName(result.sessionName);
    const s2 = cleanName(lastData.sessionName);
    const sameSession = !(!s1 || !s2) && (s1 === s2 || s1.includes(s2) || s2.includes(s1));

    if (isEmpty && hasOldData && sameSession) {
        lastData.updatedAt = Date.now();
        if (result.announcements && result.announcements.length) {
            lastData.announcements = result.announcements;
        }
    } else {
        let finalAnnouncements = result.announcements || [];
        if (finalAnnouncements.length === 0 && sameSession && lastData.announcements && lastData.announcements.length > 0) {
           finalAnnouncements = lastData.announcements;
        }
        let finalSessionName = result.sessionName || "";
        if ((!finalSessionName || /speedhive|mylaps|loading/i.test(finalSessionName)) && lastData.sessionName) {
            finalSessionName = lastData.sessionName;
        }
        lastData = { 
            standings: result.rows, 
            sessionName: finalSessionName, 
            sessionLaps: result.sessionLaps || "", 
            flagFinish: !!result.flagFinish, 
            announcements: finalAnnouncements, 
            updatedAt: Date.now() 
        };
    }
  } catch (e) {
    console.error("Tick scrape error:", e.message);
    // If error is related to target closed, reset
    if (e.message.includes("Target closed") || e.message.includes("Session closed")) {
        globalPage = null;
        globalBrowser = null;
        lastUrl = "";
    }
  }
}

// Start the loop (approx every 1s)
setInterval(tick, 1000);

// --- ENDPOINTS ---

app.get("/api/standings", async (req, res) => {
  const debug = req.query?.debug === "1";
  const testUrl = req.query?.url;
  
  // Normal high-performance path
  if (!debug && !testUrl) {
      res.json(lastData);
      return;
  }

  // Debug/Test path (slower, on-demand)
  try {
      let targetUrl = testUrl || speedhiveUrl;
      const p = await ensurePage(targetUrl);
      if (!p) throw new Error("Could not initialize browser");
      const result = await p.evaluate(SCRAPE_FUNCTION, true);
      res.json({
          source: targetUrl,
          updatedAt: Date.now(),
          sessionName: result.sessionName,
          sessionLaps: result.sessionLaps,
          flagFinish: result.flagFinish,
          standings: result.rows,
          announcements: result.announcements,
          debug: result.debug
      });
  } catch (e) {
      res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/config", (_req, res) => {
  res.json({ speedhiveUrl, overlayEnabled, scrapingEnabled });
});

app.post("/api/config", async (req, res) => {
  try {
    const { speedhiveUrl: nextUrl, overlayEnabled: nextOverlayEnabled, scrapingEnabled: nextScrapingEnabled, initialData } = req.body || {};
    
    if (typeof nextUrl === "string" && /^https?:\/\//i.test(nextUrl)) {
      if (nextUrl !== speedhiveUrl) {
        speedhiveUrl = nextUrl;
        console.log("Config: URL changed to", speedhiveUrl);
        // Reset URL tracking so the loop navigates immediately
        lastUrl = ""; 
        
        if (initialData && Array.isArray(initialData.standings)) {
            lastData = { 
                standings: initialData.standings, 
                sessionName: initialData.sessionName || "", 
                sessionLaps: initialData.sessionLaps || "",
                flagFinish: !!initialData.flagFinish, 
                announcements: initialData.announcements || [], 
                updatedAt: Date.now() 
            };
        }
      }
    }
    if (typeof nextOverlayEnabled === "boolean") overlayEnabled = nextOverlayEnabled;
    if (typeof nextScrapingEnabled === "boolean") scrapingEnabled = nextScrapingEnabled;
    
    res.json({ ok: true, speedhiveUrl, overlayEnabled, scrapingEnabled });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});
app.get("/grid", (_req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});
app.get("/results", (_req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`OBS overlay server on http://localhost:${PORT}/`);
  console.log(`Background scraping loop active: ${scrapingEnabled ? "YES" : "NO"}`);
});
