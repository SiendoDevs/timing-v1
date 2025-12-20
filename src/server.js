import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";

let speedhiveUrl = process.env.SPEEDHIVE_URL || "";
let overlayEnabled = true;
const CONFIG_FILE = path.resolve("config.json");

// Load config on startup
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const conf = JSON.parse(raw);
    if (conf.speedhiveUrl) speedhiveUrl = conf.speedhiveUrl;
    if (typeof conf.overlayEnabled === 'boolean') overlayEnabled = conf.overlayEnabled;
    console.log("Loaded config:", { speedhiveUrl, overlayEnabled });
  }
} catch (e) {
  console.error("Error loading config:", e);
}

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
// Habilitar CORS para cualquier origen (para desarrollo y Vercel)
app.use(cors());
// Deshabilitar caché para endpoints de API
app.use("/api", (req, res, next) => {
  res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  next();
});
app.use(express.static("dist"));

let browser = null;
let page = null;
let lastData = { standings: [], sessionName: "", flagFinish: false, updatedAt: 0 };
let lastFetchTs = 0;
let scrapePromise = null;
const MIN_FETCH_INTERVAL = 3000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureBrowser() {
  if (browser && page) {
    if (browser.isConnected()) return;
    try { await browser.close(); } catch(e) {}
    browser = null;
    page = null;
  }
  
  // Opciones de lanzamiento para Puppeteer en Render
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
      "--disable-gpu"
    ]
  };

  // Si estamos en producción (Render detecta NODE_ENV=production o similar, 
  // pero lo más seguro es checkear si existe executablePath del sistema)
  // En Render, Chrome suele estar en /usr/bin/google-chrome-stable o similar si se instala.
  // Pero usando puppeteer normal, intenta descargar su propio chrome.
  
      // INTENTO 1: Usar executablePath explícito si se define en ENV (común en docker/render)
      if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      }
    
      browser = await puppeteer.launch(launchOptions);
      page = await browser.newPage();
      
      // Prevent navigation timeout errors by disabling timeout on page operations
      page.setDefaultNavigationTimeout(60000); 
      page.setDefaultTimeout(60000);

      await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Forward browser console logs to Node terminal
      page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

      // Optimize: Block unnecessary resources to speed up loading and save memory
      // Blocking images/media/fonts is crucial for stability in low-memory environments (like Render free tier)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
          const resourceType = req.resourceType();
          // Block heavy assets that are not essential for text content
          if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
              // CAREFUL: Blocking stylesheets might break some SPAs, but Speedhive is usually data-heavy.
              // If layout breaks detection, remove 'stylesheet' from this list.
              // For now, let's block 'image', 'media', 'font' to save RAM.
              // Update: NOT blocking stylesheets as it might hide elements needed for detection (e.g. display:none)
          }
          
          if (['image', 'media', 'font'].includes(resourceType)) {
              req.abort();
          } else {
              req.continue();
          }
      });
    }
    
    async function scrapeStandings({ debug = false, overrideUrl = null } = {}) {
      const targetUrl = overrideUrl || speedhiveUrl;
      if (!targetUrl) {
        return { standings: [], sessionName: "", sessionLaps: "", flagFinish: false, announcements: [], updatedAt: Date.now() };
      }
      
      try {
        await ensureBrowser();
      } catch (e) {
        console.error("Browser launch failed, retrying in next cycle:", e);
        // Force browser reset
        try { if (browser) await browser.close(); } catch (_) {}
        browser = null;
        page = null;
        return lastData;
      }
      
      // Check if browser is already at the target URL to avoid reloading the wrong page
      let currentUrl = "";
      try {
         currentUrl = page.url();
      } catch (e) {
         console.log("Error getting page URL, browser might be crashed:", e);
         try { if (browser) await browser.close(); } catch (_) {}
         browser = null; page = null;
         return lastData;
      }

      // Normalize URLs for comparison (ignore trailing slash, query params, etc if needed)
      // But strict comparison is safer to ensure we switch sessions immediately.
      const isSameUrl = currentUrl === targetUrl;
    
      if (!isSameUrl) {
        try {
          console.log(`Navigating to ${targetUrl} (was ${currentUrl})`);
          // When switching URLs, we force a full navigation
          await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
          // Reset last data on URL switch to avoid showing old session data
          lastData = { standings: [], sessionName: "", flagFinish: false, updatedAt: 0 };
        } catch (e) {
          console.log("Nav warning:", String(e));
          // If navigation fails, we might need to restart browser next time
          try { if (browser) await browser.close(); } catch (_) {}
          browser = null; page = null;
          return lastData;
        }
      } else {
        // If already on the page, don't reload to preserve SPA state and avoid delay.
        // However, we must verify the page is not stuck/broken.
        try {
          const isHealthy = await Promise.race([
              page.evaluate(() => {
                const t = document.body.innerText || "";
                // Relaxed health check: if we have ANY content length, assume it might be valid for now.
                // Speedhive sometimes takes a long time to render rows, and "Loading" might persist.
                if (t.length < 50) return false;
                
                // If it explicitly says "Loading" for too long, it might be stuck, but let's be lenient.
                // We'll trust the scrape step to wait for rows.
                return true;
              }),
              new Promise((_, r) => setTimeout(() => r(new Error("Health check timeout")), 5000))
          ]);
          if (!isHealthy) {
            console.log("Page appears stuck or empty (failed health check), forcing reload...");
            await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
          }
        } catch (e) {
          console.error("Health check failed, reloading:", e);
          try {
             await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
          } catch (ex) {
             console.error("Reload failed, restarting browser:", ex);
             try { if (browser) await browser.close(); } catch (_) {}
             browser = null; page = null;
             return lastData;
          }
        }
      }
      
      // Wait for "Loading" to disappear (restored safer timeout)
      try {
        await page.waitForFunction(() => {
           const t = document.body.innerText || "";
           return !t.includes("Loading") && !t.includes("Please wait");
        }, { timeout: 25000 }); // Increased to 25s
      } catch (e) {
        // It's okay if it times out, maybe "Loading" is part of the page text or already gone
      }
    
      // Try to wait for actual data rows to appear (restored safer timeout)
      try {
        await page.waitForFunction(() => {
           // Check for specific rows or substantial content
           const rows = document.querySelectorAll('.datatable-body-row, tr, [role="row"], .role-row');
           if (rows.length > 0) return true; // Changed > 2 to > 0 to accept even 1 row
           
           // Fallback: check text length if rows are not standard
           const bodyText = document.body.innerText || "";
           return bodyText.length > 200 && !bodyText.includes("Loading");
        }, { timeout: 25000 }); // Increased to 25s
      } catch (e) {
        // Proceed anyway, maybe we can scrape something
      }
      
      await delay(100);
    
      try {
          const result = await Promise.race([
            page.evaluate((wantDebug) => {
    function text(el) { return (el?.textContent || "").trim(); }
    function safeParseInt(v) { const n = parseInt(String(v).replace(/[^\d]/g, "")); return Number.isFinite(n) ? n : null; }
    
    // Custom getAttribute function to ensure we get live style values
    function getStyle(el, prop) {
        return el?.style?.[prop] || "";
    }
    
    // Polyfill for matches if needed, though modern browsers have it.
    // We will use standard DOM methods.

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
      // 1. Try specific .header/.value structure (common in Speedhive)
      const headers = Array.from(document.querySelectorAll('.header, .label'));
      for (const h of headers) {
        if (text(h).toLowerCase() === 'laps' || text(h).toLowerCase() === 'vueltas') {
          let val = h.nextElementSibling;
          // Accept any next sibling, not just .value, but prefer .value if exists
          if (val) {
             if (val.classList.contains('value')) return text(val);
             // If not .value, check if it looks like a number
             const t = text(val);
             if (/^[\d/]+$/.test(t)) return t;
          }
          
          const parent = h.parentElement;
          if (parent) {
             val = parent.querySelector('.value');
             if (val) return text(val);
             // Fallback: look for any element with digits
             const digitEl = Array.from(parent.children).find(c => c !== h && /^[\d/]+$/.test(text(c)));
             if (digitEl) return text(digitEl);
          }
        }
      }

      // 2. Generic text search in small containers
      // Look for "Laps: 12" or "12 Laps"
      const candidates = Array.from(document.querySelectorAll('div, span, p, li'));
      for (const el of candidates) {
         // Optimization: skip complex elements
         if (el.children.length > 2) continue;
         const t = text(el);
         if (!t) continue;
         
         // Match "Laps 10", "Laps: 10", "10 Laps", "10/20 Laps"
         // Avoid matching long sentences
         if (t.length > 30) continue;

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
      // Removed heuristic checking for 'final' in session name as it causes false positives
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
        // Robust cleanup of number from name (start and end)
        if (number) {
           // Remove number from start (e.g. "118 .. Name")
           // Escape number just in case, though usually safe
           const escNum = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
           const startRe = new RegExp(`^\\s*${escNum}[\\s.\\-]*`, "i");
           name = name.replace(startRe, "");
           
           // Remove number from end (e.g. "Name 118")
           const endRe = new RegExp(`[\\s.\\-]*${escNum}\\s*$`, "i");
           name = name.replace(endRe, "");
        } else {
           // Fallback: remove leading digits if they look like a number
           name = name.replace(/^\s*\d{1,4}[\s.\\-]+/, "");
        }
        // Final cleanup of any remaining leading/trailing separators
        name = name.replace(/^[\s.\\-]+/, "").replace(/[\s.\\-]+$/, "").trim();

        const positionCellSel = getSel('.datatable-cell-position');
        const lapsCellSel = getSel('.datatable-cell-laps');
        const lastCellSel = getSel('.datatable-cell-last') || getSel('.datatable-cell-last-lap-time');
        const diffCellSel = getSel('.datatable-cell-diff') || getSel('.datatable-cell-difference');
        const gapCellSel = getSel('.datatable-cell-gap');
        const totalCellSel = getSel('.datatable-cell-total') || getSel('.datatable-cell-total-time');
        const bestCellSel = getSel('.datatable-cell-best') || getSel('.datatable-cell-best-lap-time');
        const classCellSel = getSel('.datatable-cell-class');
        
        // Check for checkered flag on individual row
        const flagIcon = row.querySelector('.ico-flag-finish') || 
                         row.querySelector('.flag-icon-finish') || 
                         row.querySelector('.fa-flag-checkered') ||
                         row.querySelector('[class*="finish-flag"]') ||
                         row.querySelector('[class*="flag-finish"]') ||
                         row.querySelector('img[alt*="finish" i]') ||
                         row.querySelector('img[src*="finish" i]');
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
          position,
          number,
          name,
          class: classCellSel || "",
          laps,
          lastLap: lastCellSel,
          diff: diffCellSel,
          gap: gapCellSel,
          totalTime: totalCellSel,
          bestLap: bestCellSel,
          hasFinishFlag
        });
      }
      if (!out.length) return null;
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
        pos: getIdx("pos"),
        comp: getIdx("competitor"),
        laps: getIdx("laps"),
        last: getIdx("last"),
        diff: getIdx("diff"),
        gap: getIdx("gap"),
        total: getIdx("total"),
        best: getIdx("best")
      };
      const bodyRows = Array.from(document.querySelectorAll('[role=\"row\"]')).filter(r => !r.querySelector('[role=\"columnheader\"]'));
      const result = [];
      for (const tr of bodyRows) {
        const flagIcon = tr.querySelector('.ico-flag-finish') || 
                         tr.querySelector('[class*="flag-finish"]') || 
                         tr.querySelector('[class*="finish-flag"]');
        const cells = Array.from(tr.querySelectorAll('[role="cell"], td, div'));
        function cell(i) { return i >= 0 && i < cells.length ? text(cells[i]) : ""; }
        const comp = cell(idx.comp);
        const numberMatch = comp.match(/^\s*(\d{1,4})\s+/);
        const number = numberMatch ? numberMatch[1] : "";
        const name = numberMatch ? comp.replace(numberMatch[0], "").trim() : comp;
        result.push({
          hasFinishFlag: !!flagIcon,
          position: safeParseInt(cell(idx.pos)),
          number,
          name,
          class: "",
          laps: safeParseInt(cell(idx.laps)),
          lastLap: cell(idx.last),
          diff: cell(idx.diff),
          gap: cell(idx.gap),
          totalTime: cell(idx.total),
          bestLap: cell(idx.best)
        });
      }
      if (!result.length) return null;
      return wantDebug ? { rows: result, headers, idx } : result;
    }
    function extractFromTableTag() {
      const t = document.querySelector("table");
      if (!t) return null;
      const headerCells = Array.from(t.querySelectorAll("thead th"));
      const headers = headerCells.map(h => text(h).toLowerCase());
      const getIdx = label => headers.findIndex(h => h.includes(label));
      const idx = {
        pos: getIdx("pos"),
        comp: getIdx("competitor"),
        laps: getIdx("laps"),
        last: getIdx("last"),
        diff: getIdx("diff"),
        gap: getIdx("gap"),
        total: getIdx("total"),
        best: getIdx("best")
      };
      const bodyRows = Array.from(t.querySelectorAll("tbody tr"));
      const result = [];
      for (const tr of bodyRows) {
        const flagIcon = tr.querySelector('.ico-flag-finish') || 
                         tr.querySelector('[class*="flag-finish"]') || 
                         tr.querySelector('[class*="finish-flag"]');
        const cells = Array.from(tr.children);
        function cell(i) { return i >= 0 && i < cells.length ? text(cells[i]) : ""; }
        const comp = cell(idx.comp);
        const numberMatch = comp.match(/^\s*(\d{1,4})\s+/);
        const number = numberMatch ? numberMatch[1] : "";
        const name = numberMatch ? comp.replace(numberMatch[0], "").trim() : comp;
        result.push({
          hasFinishFlag: !!flagIcon,
          position: safeParseInt(cell(idx.pos)),
          number,
          name,
          class: "",
          laps: safeParseInt(cell(idx.laps)),
          lastLap: cell(idx.last),
          diff: cell(idx.diff),
          gap: cell(idx.gap),
          totalTime: cell(idx.total),
          bestLap: cell(idx.best)
        });
      }
      if (!result.length) return null;
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
      const m3 = msg.match(/Number\s+(\d+)\s+has reduced the gap to Number\s+(\d+)\s+to\s+([0-9:.]+)/i);
      if (m3) return { kind: "gap_reduce", number: parseInt(m3[1],10), target: parseInt(m3[2],10), gap: m3[3], text: msg };
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
    // Debug output for progress scraping
    if (payload && payload.length > 0) {
       console.log("DEBUG PROGRESS:", payload.map(r => r.lapProgress).filter(p => p).slice(0, 5));
    }
    if (!payload) { payload = extractFromRoles(); if (payload) source = "roles"; }
    if (!payload) { payload = extractFromTableTag(); if (payload) source = "table"; }
    if (!payload) { payload = extractFromNext(); if (payload) source = "next"; }
    
    // Generic fallback for list-based layouts
    if (!payload) {
      function extractGenericList() {
         // Look for common row containers
         const candidates = Array.from(document.querySelectorAll('div, li, tr'));
         const potentialRows = [];
         
         for (const el of candidates) {
            // Check if element has children that look like number and name
            const textContent = text(el);
            // Must start with a number (position)
            if (!/^\d+\s+[A-Za-z]/.test(textContent)) continue;
            // Must have reasonable length
            if (textContent.length < 5 || textContent.length > 200) continue;
            
            // Try to split by common delimiters or spacing
            const parts = textContent.split(/\s+/);
            if (parts.length < 3) continue;
            
            // Very naive check: if it contains a time-like string
            if (!/\d+:\d+\.\d+/.test(textContent) && !/\d+\.\d+/.test(textContent) && !/Laps/.test(textContent)) continue;

            // Avoid header-like rows
            if (/Pos|Name|Gap|Diff/i.test(textContent)) continue;

            potentialRows.push({
               position: parseInt(parts[0]) || 0,
               number: parts[1] || "",
               name: parts.slice(2, 5).join(" "), // heuristic
               laps: 0,
               lastLap: "",
               diff: "",
               gap: "",
               totalTime: "",
               bestLap: ""
            });
            if (potentialRows.length > 50) break; // limit
         }
         // Filter to only keep if we found a sequence (e.g. 1, 2, 3...)
         if (potentialRows.length >= 3) {
             // sort by position to see if it makes sense
             potentialRows.sort((a,b) => a.position - b.position);
             const isSequential = potentialRows.slice(0, 3).every((r, i) => r.position === i + 1 || r.position === i + 2); // lenient
             if (isSequential) return potentialRows;
         }
         return null;
      }
      const generic = extractGenericList();
      if (generic) {
          payload = generic;
          source = "generic_list_scan";
      }
    }

    const rows = wantDebug ? (payload?.rows || []) : (payload || []);
    const sessionName = extractSessionName();
    const sessionLaps = extractSessionLaps();
    const flagFinish = extractFlagFinish();
    const announcements = extractAnnouncements();
    const dbg = wantDebug ? { 
        sourceMethod: source, 
        headers: payload?.headers || [], 
        idx: payload?.idx || {}, 
        stats: stats(rows),
        pageTitle: document.title,
        bodyPreview: document.body.innerText.substring(0, 2000),
        htmlPreview: document.documentElement.outerHTML.substring(0, 2000)
    } : null;
    return { rows, sessionName, sessionLaps, flagFinish, announcements, debug: dbg };
  }, debug === true),
  new Promise((_, reject) => setTimeout(() => reject(new Error("Scrape evaluation timeout")), 60000))
  ]);
  if (!overrideUrl) {
    const isEmpty = !result.rows || result.rows.length === 0;
    const hasOldData = lastData.standings && lastData.standings.length > 0;

    // Helper to determine if we are likely in the same session despite minor scrape glitches
    const cleanName = (n) => (n || "").toLowerCase().replace(/\s+/g, "").replace(/speedhive|mylaps|loading/gi, "").replace(/lap\d+/gi, "").replace(/vuelta\d+/gi, "").replace(/\d+\/\d+/g, "");
    const s1 = cleanName(result.sessionName);
    const s2 = cleanName(lastData.sessionName);
    // If one of them is empty/generic (after clean), we assume continuity. 
    // Only return false if both are substantial and different.
    const isDifferentSession = s1 && s2 && s1 !== s2;
    const sameSession = !isDifferentSession;

    if (isEmpty && hasOldData && sameSession) {
        console.log("Scrape returned empty results for same session - preserving previous data.");
        // Update timestamp to show we are still alive
        lastData.updatedAt = Date.now();
        // Update announcements if available, otherwise keep old ones (implicit in returning lastData)
        if (result.announcements && result.announcements.length) {
            lastData.announcements = result.announcements;
        }
        return lastData;
    }

    // Logic to prevent announcement flickering:
    // If we have valid rows (not empty), but announcements are empty, 
    // and it's the same session, preserve the old announcements.
    let finalAnnouncements = result.announcements || [];
    if (finalAnnouncements.length === 0 && sameSession && lastData.announcements && lastData.announcements.length > 0) {
       finalAnnouncements = lastData.announcements;
    }
    
    // Also stabilize Session Name if the new one is missing/generic but we had a good one
    let finalSessionName = result.sessionName || "";
    if ((!finalSessionName || /speedhive|mylaps|loading/i.test(finalSessionName)) && lastData.sessionName) {
        finalSessionName = lastData.sessionName;
    }

    lastData = { standings: result.rows, sessionName: finalSessionName, sessionLaps: result.sessionLaps || "", flagFinish: !!result.flagFinish, announcements: finalAnnouncements, updatedAt: Date.now() };
    lastFetchTs = Date.now();
    return lastData;
  } else {
    return { standings: result.rows, sessionName: result.sessionName || "", sessionLaps: result.sessionLaps || "", flagFinish: !!result.flagFinish, announcements: result.announcements || [], updatedAt: Date.now(), debug: result.debug };
  }
} catch (e) {
  console.log("Scrape Error:", String(e));
  if (String(e).includes("Execution context was destroyed") || String(e).includes("Target closed")) {
      // If context destroyed, force browser restart next time
      try { if (browser) await browser.close(); } catch (_) {}
      browser = null; page = null;
  }
  // Return last known good data instead of clearing the screen on error
  console.log("Returning last valid data due to scrape error.");
  return { 
      standings: lastData.standings || [], 
      sessionName: lastData.sessionName || "", 
      sessionLaps: lastData.sessionLaps || "", 
      flagFinish: !!lastData.flagFinish, 
      announcements: lastData.announcements || [], 
      updatedAt: Date.now() 
  };
}
}

async function executeScrape({ debug = false, overrideUrl = null } = {}) {
  // Wait for previous scrape
  let waitCount = 0;
  while (scrapePromise) {
     if (waitCount++ > 50) { // 5 seconds
        throw new Error("Scrape queue timeout - previous scrape stuck");
     }
     try { await Promise.race([scrapePromise, delay(100)]); } catch (e) {}
  }

  const myPromise = scrapeStandings({ debug, overrideUrl });
  scrapePromise = myPromise;

  try {
    return await myPromise;
  } finally {
    if (scrapePromise === myPromise) {
      scrapePromise = null;
    }
  }
}

app.get("/api/standings", async (_req, res) => {
  try {
    const debug = _req.query?.debug === "1";
    const testUrl = typeof _req.query?.url === "string" ? _req.query.url : null;
    const force = _req.query?.force === "1";

    // 1. Check cache for standard polling requests (no debug/force/testUrl)
    if (!testUrl && !force && !debug && Date.now() - lastFetchTs < MIN_FETCH_INTERVAL && lastData.standings.length) {
      res.json({ source: speedhiveUrl, updatedAt: lastData.updatedAt, sessionName: lastData.sessionName || "", sessionLaps: lastData.sessionLaps || "", flagFinish: !!lastData.flagFinish, standings: lastData.standings, announcements: lastData.announcements || [] });
      return;
    }

    // 2. If a scrape is already running...
    if (scrapePromise) {
      if (!testUrl && !force && !debug) {
         // Standard poll: return cached data immediately if busy
         res.json({ source: speedhiveUrl, updatedAt: lastData.updatedAt || Date.now(), sessionName: lastData.sessionName || "", sessionLaps: lastData.sessionLaps || "", flagFinish: !!lastData.flagFinish, standings: lastData.standings || [], announcements: lastData.announcements || [] });
         return;
      }
      // Debug/Force/TestUrl: Wait for the current scrape to finish to avoid race conditions
      try { await scrapePromise; } catch (e) {}
    }

    // 3. Start new scrape (serialized)
    const data = await executeScrape({ debug, overrideUrl: testUrl });
    
    res.json({ source: testUrl || speedhiveUrl, updatedAt: data.updatedAt, sessionName: data.sessionName || "", sessionLaps: data.sessionLaps || "", flagFinish: !!data.flagFinish, standings: Array.isArray(data.standings) ? data.standings : [], announcements: data.announcements || [], debug: data.debug });
  } catch (err) {
    console.error("Scrape Error:", err);
    let errorMsg = String(err);
    if (errorMsg.includes("Could not find Chrome")) {
      errorMsg += " (HINT: Ensure Render service is set to 'Docker' Runtime)";
    }
    res.json({ source: speedhiveUrl, updatedAt: Date.now(), sessionName: lastData.sessionName || "", flagFinish: !!lastData.flagFinish, standings: lastData.standings || [], announcements: lastData.announcements || [], error: errorMsg });
  }
});

app.get("/api/config", (_req, res) => {
  res.json({ speedhiveUrl, overlayEnabled });
});

app.post("/api/config", async (req, res) => {
  try {
    const { speedhiveUrl: nextUrl, overlayEnabled: nextOverlayEnabled, initialData } = req.body || {};
    if (typeof nextUrl === "string" && /^https?:\/\//i.test(nextUrl)) {
      if (nextUrl !== speedhiveUrl) {
        speedhiveUrl = nextUrl;
        
        if (initialData && Array.isArray(initialData.standings) && initialData.standings.length > 0) {
            console.log("Configuration updated: Using provided initial data to avoid re-scrape delay.");
            // Adopt the data immediately
            lastData = { 
                standings: initialData.standings, 
                sessionName: initialData.sessionName || "", 
                sessionLaps: initialData.sessionLaps || "",
                flagFinish: !!initialData.flagFinish, 
                announcements: initialData.announcements || [], 
                updatedAt: Date.now() 
            };
            lastFetchTs = Date.now();
            
            // Trigger background scrape (non-blocking) to keep it fresh, but don't wait for it
            executeScrape().catch(e => console.error("Background scrape failed:", e));
        } else {
            // Reset lastData partially to avoid confusion, but we will immediately refill it.
            lastData = { standings: [], sessionName: "", flagFinish: false, announcements: [], updatedAt: 0 };
            lastFetchTs = 0;
            
            // Trigger immediate scrape and wait for it
            console.log("Configuration updated: forcing immediate scrape for new URL...");
            try {
                await executeScrape();
            } catch (e) {
                console.error("Immediate scrape failed:", e);
            }
        }
      }
    }
    if (typeof nextOverlayEnabled === "boolean") {
      overlayEnabled = nextOverlayEnabled;
    }
    
    // No persist config - memory only
    // try {
    //   fs.writeFileSync(CONFIG_FILE, JSON.stringify({ speedhiveUrl, overlayEnabled }));
    // } catch (e) {
    //   console.error("Error saving config:", e);
    // }

    res.json({ ok: true, speedhiveUrl, overlayEnabled });
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
});
