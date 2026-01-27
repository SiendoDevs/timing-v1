import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

let speedhiveUrl = process.env.SPEEDHIVE_URL || "";
let overlayEnabled = true;
let scrapingEnabled = true;
let commentsEnabled = true;
let votingWidgetEnabled = true;
let overtakesEnabled = true;
let currentLapEnabled = true;
let fastestLapEnabled = true;
let lapFinishEnabled = true;
let raceFlag = "GREEN"; // Default flag
let publicUrl = ""; // For QR codes
const CONFIG_FILE = path.resolve("config.json");
const USERS_FILE = path.resolve("users.json");
// const CIRCUIT_FILE = path.resolve("circuit.json"); // Replaced by Redis

// --- REDIS CONNECTION ---
let useRedis = false;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Configure Redis client safely
const redisOptions = { url: REDIS_URL };
if (REDIS_URL.startsWith('rediss://')) {
  redisOptions.socket = {
    tls: true,
    rejectUnauthorized: false
  };
}

const redisClient = createClient(redisOptions);

redisClient.on('error', (err) => {
  // Only log if we expect Redis to be working (useRedis is true)
  if (useRedis) {
    console.error('Redis Client Error', err);
  }
});

const connectRedisWithRetry = async (retries = 5, delay = 2000) => {
  // Quick check: If in production (Render) and URL is localhost, user likely forgot to set REDIS_URL.
  // We skip connection to avoid startup delay and error logs.
  if (process.env.NODE_ENV === 'production' && REDIS_URL.includes('localhost')) {
    console.log("Production environment detected but REDIS_URL is missing (defaulting to localhost).");
    console.log("Skipping Redis connection. App will run in memory-only mode.");
    useRedis = false;
    return;
  }

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to connect to Redis (Attempt ${i + 1}/${retries})...`);
      await redisClient.connect();
      useRedis = true;
      console.log("Redis connected successfully.");
      return;
    } catch (e) {
      console.error(`Redis connection attempt ${i + 1} failed:`, e.message);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.log("All Redis connection attempts failed. Running in memory-only mode.");
  useRedis = false;
  // Ensure we are disconnected to stop internal retries of the client
  try {
    if (redisClient.isOpen) await redisClient.disconnect();
  } catch (e) { /* ignore */ }
};

// Start connection process
connectRedisWithRetry();

console.log("---------------------------------------------------");
console.log("---  SERVER STARTING: SPANISH COMMENTS ENABLED  ---");
console.log("---------------------------------------------------");

// Load config on startup
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const conf = JSON.parse(raw);
    if (conf.speedhiveUrl) speedhiveUrl = conf.speedhiveUrl;
    if (typeof conf.overlayEnabled === 'boolean') overlayEnabled = conf.overlayEnabled;
    if (typeof conf.scrapingEnabled === 'boolean') scrapingEnabled = conf.scrapingEnabled;
    if (typeof conf.commentsEnabled === 'boolean') commentsEnabled = conf.commentsEnabled;
    if (typeof conf.votingWidgetEnabled === 'boolean') votingWidgetEnabled = conf.votingWidgetEnabled;
    if (typeof conf.overtakesEnabled === 'boolean') overtakesEnabled = conf.overtakesEnabled;
    if (typeof conf.currentLapEnabled === 'boolean') currentLapEnabled = conf.currentLapEnabled;
    if (typeof conf.fastestLapEnabled === 'boolean') fastestLapEnabled = conf.fastestLapEnabled;
    if (typeof conf.lapFinishEnabled === 'boolean') lapFinishEnabled = conf.lapFinishEnabled;
    if (conf.raceFlag) raceFlag = conf.raceFlag;
    if (conf.publicUrl) publicUrl = conf.publicUrl;
    console.log("Loaded config:", { speedhiveUrl, overlayEnabled, scrapingEnabled, commentsEnabled, votingWidgetEnabled, overtakesEnabled, currentLapEnabled, fastestLapEnabled, lapFinishEnabled, raceFlag, publicUrl });
  }
} catch (e) {
  console.error("Error loading config:", e);
}

// --- CIRCUIT INFO ---
// Circuit info is now handled via Redis in endpoints, but we keep a memory fallback
let memoryCircuitInfo = {}; 


// --- USER MANAGEMENT ---
let users = [];
const DEFAULT_ADMIN = {
  username: "admin",
  password: process.env.ADMIN_PASSWORD || "admin123",
  role: "admin"
};

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      users = JSON.parse(raw);
      // Ensure admin exists if env var changed or file is old
      const envAdminPass = process.env.ADMIN_PASSWORD;
      const adminUser = users.find(u => u.username === "admin");
      if (adminUser && envAdminPass && adminUser.password !== envAdminPass) {
          // Optional: Update admin password if env var changes? 
          // Better to respect file if it exists, so user changes via UI persist.
          // But for initial setup, we might want to ensure at least one admin.
      }
      if (!adminUser) {
          users.push(DEFAULT_ADMIN);
          saveUsers();
      }
    } else {
      users = [DEFAULT_ADMIN];
      saveUsers();
    }
    console.log(`Loaded ${users.length} users.`);
  } catch (e) {
    console.error("Error loading users:", e);
    users = [DEFAULT_ADMIN];
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Error saving users:", e);
  }
}

loadUsers();

const PORT = process.env.PORT || 3000;
const sessions = new Set();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Auth Middleware
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) {
    console.log("Auth failed: No token provided");
    return res.status(401).json({ error: "Unauthorized" });
  }

  let isValid = false;
  try {
    if (useRedis) {
      const val = await redisClient.get(`session:${token}`);
      console.log(`Auth check for token ${token.substring(0, 5)}... in Redis:`, !!val);
      isValid = !!val;
    } else {
      isValid = sessions.has(token);
      console.log(`Auth check for token ${token.substring(0, 5)}... in Memory:`, isValid);
    }
  } catch (e) {
    console.error("Auth middleware error:", e);
    // Fallback to memory check if Redis fails
    isValid = sessions.has(token); 
    console.log(`Auth check fallback for token ${token.substring(0, 5)}... in Memory:`, isValid);
  }

  if (isValid) {
    next();
  } else {
    console.log("Auth failed: Invalid token");
    res.status(401).json({ error: "Unauthorized" });
  }
};

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
    // --- PARSING ENGINE (Metadata Extraction Only) ---
    const PARSING_RULES = [
      {
        // "Number 12 is up 3 places to 5"
        pattern: /(?:Number|No\.?)\s+(\d+)\s+is\s+up\s+(\d+)\s+places?\s+to\s+(\d+)/i,
        transform: (m) => ({ 
            kind: "pos_up", 
            number: parseInt(m[1],10), 
            delta: parseInt(m[2],10), 
            toPos: parseInt(m[3],10)
        })
      },
      {
        // "Number 12 has just dropped to 8"
        pattern: /(?:Number|No\.?)\s+(\d+)\s+has\s+just\s+dropped\s+to\s+(\d+)/i,
        transform: (m) => ({
            kind: "pos_down", 
            number: parseInt(m[1],10), 
            toPos: parseInt(m[2],10)
        })
      },
      {
        // "Here comes Number 12... Number 8"
        pattern: /Here\s+comes\s+(?:Number|No\.?)\s+(\d+).*(?:Number|No\.?)\s+(\d+)/i,
        transform: (m) => ({
            kind: "chase", 
            number: parseInt(m[1],10), 
            target: parseInt(m[2],10)
        })
      },
      {
        // "New best lap for Number 12"
        pattern: /New\s+best\s+lap\s+for\s+(?:Number|No\.?)\s+(\d+)/i,
        transform: (m) => ({
            kind: "best_lap", 
            number: parseInt(m[1],10)
        })
      },
      {
        // "Number 12 improved on their best lap with a 1:40.5"
        pattern: /(?:Number|No\.?)\s+(\d+)\s+improved\s+on\s+their\s+best\s+lap\s+with\s+a\s+([0-9:.]+)/i,
        transform: (m) => ({
            kind: "improved_lap", 
            number: parseInt(m[1],10), 
            time: m[2]
        })
      }
    ];

    function parseAnnouncement(msg) {
      // 1. Try exact rules to extract metadata
      for (const rule of PARSING_RULES) {
        const m = msg.match(rule.pattern);
        if (m) {
            // Return metadata + original text
            return { text: msg, ...rule.transform(m) };
        }
      }

      // 2. Default fallback
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

let isTickRunning = false;

async function tick() {
  if (isTickRunning || !scrapingEnabled || !speedhiveUrl) {
    return;
  }
  isTickRunning = true;

  const p = await ensurePage(speedhiveUrl);
  if (!p) {
      isTickRunning = false;
      return; 
  }

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
  } finally {
    isTickRunning = false;
  }
}

// Start the loop (approx every 3s)
setInterval(tick, 3000);

// --- ENDPOINTS ---

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  // Compatibility with old frontend (only password) -> assume admin
  if (!username && password) {
    const admin = users.find(u => u.username === "admin");
    if (admin && admin.password === password) {
       const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
       sessions.add(token);
       if (useRedis) {
         await redisClient.set(`session:${token}`, JSON.stringify({ username: "admin", role: "admin" }), { EX: 86400 * 7 });
       }
       return res.json({ token, username: "admin", role: "admin" });
    }
    return res.status(401).json({ error: "Invalid password" });
  }

  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessions.add(token);
    if (useRedis) {
      await redisClient.set(`session:${token}`, JSON.stringify({ username: user.username, role: user.role || "user" }), { EX: 86400 * 7 });
    }
    res.json({ token, username: user.username, role: user.role || "user" });
  } else {
    res.status(401).json({ error: "Credenciales inválidas" });
  }
});

// --- USER MANAGEMENT ENDPOINTS ---

app.get("/api/users", requireAuth, (req, res) => {
  const safeUsers = users.map(u => ({ username: u.username, role: u.role || "user" }));
  res.json(safeUsers);
});

app.post("/api/users", requireAuth, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Faltan datos (usuario y contraseña requeridos)" });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: "El usuario ya existe" });
  }
  
  users.push({ username, password, role: role || "user" });
  saveUsers();
  res.json({ ok: true, username });
});

app.delete("/api/users/:username", requireAuth, (req, res) => {
  const { username } = req.params;
  if (username === "admin") {
    return res.status(400).json({ error: "No se puede eliminar al usuario admin principal" });
  }
  
  const initialLen = users.length;
  users = users.filter(u => u.username !== username);
  
  if (users.length !== initialLen) {
    saveUsers();
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "Usuario no encontrado" });
  }
});

// --- CIRCUIT ENDPOINTS ---

app.get("/api/circuit", async (req, res) => {
  try {
    if (!useRedis) return res.json(memoryCircuitInfo);
    const data = await redisClient.get("circuit_info");
    res.json(data ? JSON.parse(data) : {});
  } catch (e) {
    console.error("Redis get error:", e);
    res.json(memoryCircuitInfo); // Return memory fallback to prevent UI hang
  }
});

app.post("/api/circuit", requireAuth, async (req, res) => {
  try {
    if (!useRedis) {
      memoryCircuitInfo = { ...memoryCircuitInfo, ...req.body };
      return res.json(memoryCircuitInfo);
    }
    const currentRaw = await redisClient.get("circuit_info");
    const current = currentRaw ? JSON.parse(currentRaw) : {};
    
    const updated = { ...current, ...req.body };
    await redisClient.set("circuit_info", JSON.stringify(updated));
    
    res.json(updated);
  } catch (e) {
    console.error("Redis set error:", e);
    res.status(500).json({ error: "Error saving circuit info" });
  }
});

// --- CIRCUIT LIBRARY ENDPOINTS ---

const DEFAULT_CIRCUITS = [];

let memoryCircuitLibrary = [...DEFAULT_CIRCUITS];

// Helper to ensure we always get a valid library array from Redis (with defaults if empty)
async function getLibraryFromRedis() {
  const data = await redisClient.get("circuit_library");
  if (!data) {
    // If key missing, return defaults (and optionally seed it, but let's just return defaults)
    // We can seed it here or just let the next write seed it.
    // For consistency, let's just return defaults.
    return [...DEFAULT_CIRCUITS];
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_CIRCUITS];
  } catch (e) {
    console.error("Error parsing circuit library from Redis:", e);
    return [...DEFAULT_CIRCUITS];
  }
}

app.get("/api/circuits", async (req, res) => {
  try {
    if (!useRedis) {
      console.log("GET /api/circuits: Serving from memory (Redis unavailable)");
      return res.json(memoryCircuitLibrary);
    }

    const library = await getLibraryFromRedis();
    
    // If we fetched defaults because Redis was empty, we should probably save them back 
    // to ensure persistence if the user adds nothing.
    const data = await redisClient.get("circuit_library");
    if (!data) {
       await redisClient.set("circuit_library", JSON.stringify(library));
    }

    res.json(library);
  } catch (e) {
    console.error("Redis library get error:", e);
    res.json(memoryCircuitLibrary); // Fallback to memory
  }
});

app.post("/api/circuits", requireAuth, async (req, res) => {
  try {
    const { id, name, location, length, turns, recordTime, recordDriver, recordYear, mapUrl } = req.body;
    
    const newCircuit = {
      id: id || Date.now().toString(),
      name, location, length, turns, recordTime, recordDriver, recordYear, mapUrl,
      updatedAt: Date.now()
    };

    if (!useRedis) {
      console.log("POST /api/circuits: Saving to memory (Redis unavailable)");
      const existingIndex = memoryCircuitLibrary.findIndex(c => c.id === newCircuit.id);
      if (existingIndex >= 0) {
        memoryCircuitLibrary[existingIndex] = newCircuit;
      } else {
        memoryCircuitLibrary.push(newCircuit);
      }
      return res.json({ ok: true, library: memoryCircuitLibrary });
    }
    
    // Fetch current library using the helper to ensure we don't lose defaults
    let library = await getLibraryFromRedis();
    
    const existingIndex = library.findIndex(c => c.id === newCircuit.id);
    if (existingIndex >= 0) {
      library[existingIndex] = newCircuit;
    } else {
      library.push(newCircuit);
    }

    await redisClient.set("circuit_library", JSON.stringify(library));
    console.log("POST /api/circuits: Saved to Redis. Total circuits:", library.length);
    res.json({ ok: true, library });
  } catch (e) {
    console.error("Redis library save error:", e);
    res.status(500).json({ error: "Error saving to library" });
  }
});

app.delete("/api/circuits/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!useRedis) {
       const initialLen = memoryCircuitLibrary.length;
       memoryCircuitLibrary = memoryCircuitLibrary.filter(c => c.id !== id);
       if (memoryCircuitLibrary.length !== initialLen) {
         return res.json({ ok: true, library: memoryCircuitLibrary });
       } else {
         return res.status(404).json({ error: "Circuito no encontrado" });
       }
    }

    let library = await getLibraryFromRedis();
    
    const initialLen = library.length;
    library = library.filter(c => c.id !== id);
    
    if (library.length !== initialLen) {
      await redisClient.set("circuit_library", JSON.stringify(library));
      res.json({ ok: true, library });
    } else {
      res.status(404).json({ error: "Circuito no encontrado" });
    }
  } catch (e) {
    console.error("Redis library delete error:", e);
    res.status(500).json({ error: "Error deleting from library" });
  }
});

app.post("/api/verify-token", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) return res.status(401).json({ valid: false });

  let isValid = false;
  try {
    if (useRedis) {
      const val = await redisClient.get(`session:${token}`);
      isValid = !!val;
    } else {
      isValid = sessions.has(token);
    }
  } catch (e) {
    isValid = sessions.has(token);
  }

  if (isValid) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

app.get("/api/standings", async (req, res) => {
  const debug = req.query?.debug === "1";
  const testUrl = req.query?.url;
  
  // Normal high-performance path
  if (!debug && !testUrl) {
      res.json({ ...lastData, raceFlag });
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
          raceFlag,
          standings: result.rows,
          announcements: result.announcements,
          debug: result.debug
      });
  } catch (e) {
      res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/flag", requireAuth, (req, res) => {
  try {
    const { flag } = req.body;
    if (flag) {
      raceFlag = flag;
      try {
        const currentConfig = fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")) : {};
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...currentConfig, raceFlag }, null, 2));
      } catch (e) {
        console.error("Error saving flag config:", e);
      }
    }
    res.json({ ok: true, raceFlag });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/config", (_req, res) => {
  res.json({ speedhiveUrl, overlayEnabled, scrapingEnabled, commentsEnabled, votingWidgetEnabled, overtakesEnabled, currentLapEnabled, fastestLapEnabled, lapFinishEnabled, raceFlag, publicUrl });
});

app.post("/api/config", requireAuth, async (req, res) => {
  try {
    const { speedhiveUrl: nextUrl, overlayEnabled: nextOverlayEnabled, scrapingEnabled: nextScrapingEnabled, commentsEnabled: nextCommentsEnabled, votingWidgetEnabled: nextVotingWidgetEnabled, overtakesEnabled: nextOvertakesEnabled, currentLapEnabled: nextCurrentLapEnabled, fastestLapEnabled: nextFastestLapEnabled, lapFinishEnabled: nextLapFinishEnabled, publicUrl: nextPublicUrl, initialData } = req.body || {};
    
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
    if (typeof nextCommentsEnabled === "boolean") commentsEnabled = nextCommentsEnabled;
    if (typeof nextVotingWidgetEnabled === "boolean") votingWidgetEnabled = nextVotingWidgetEnabled;
    if (typeof nextOvertakesEnabled === "boolean") overtakesEnabled = nextOvertakesEnabled;
    if (typeof nextCurrentLapEnabled === "boolean") currentLapEnabled = nextCurrentLapEnabled;
    if (typeof nextFastestLapEnabled === "boolean") fastestLapEnabled = nextFastestLapEnabled;
    if (typeof nextLapFinishEnabled === "boolean") lapFinishEnabled = nextLapFinishEnabled;
    if (typeof nextPublicUrl === "string") publicUrl = nextPublicUrl;
    
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ speedhiveUrl, overlayEnabled, scrapingEnabled, commentsEnabled, votingWidgetEnabled, overtakesEnabled, currentLapEnabled, fastestLapEnabled, lapFinishEnabled, publicUrl }, null, 2));
    } catch (e) {
      console.error("Error saving config:", e);
    }
    
    res.json({ ok: true, speedhiveUrl, overlayEnabled, scrapingEnabled, commentsEnabled, votingWidgetEnabled, overtakesEnabled, currentLapEnabled, fastestLapEnabled, lapFinishEnabled, publicUrl });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// --- VOTING SYSTEM (Redis / In-Memory) ---
// redisClient and useRedis are initialized at the top of the file

let memoryVoting = {
  candidates: [],
  votes: {},
  active: false,
  voteId: ""
};

// Helper to get voting status
async function getVotingStatus() {
  if (useRedis) {
    const active = await redisClient.get('timing_voting:active') === 'true';
    const voteId = await redisClient.get('timing_voting:id') || "";
    const candidatesStr = await redisClient.get('timing_voting:candidates');
    const candidates = candidatesStr ? JSON.parse(candidatesStr) : [];
    
    // Get votes for each candidate
    const resultCandidates = [];
    let totalVotes = 0;
    
    for (const c of candidates) {
      const votes = parseInt(await redisClient.get(`timing_voting:count:${c.number}`) || '0', 10);
      totalVotes += votes;
      resultCandidates.push({ ...c, votes });
    }
    
    // Calculate percentages
    resultCandidates.forEach(c => {
      c.percent = totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0;
    });
    
    return { active, voteId, candidates: resultCandidates, totalVotes, publicUrl };
  } else {
    // Memory implementation
    const totalVotes = Object.values(memoryVoting.votes).reduce((a, b) => a + b, 0);
    const resultCandidates = memoryVoting.candidates.map(c => {
      const votes = memoryVoting.votes[c.number] || 0;
      return {
        ...c,
        votes,
        percent: totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0
      };
    });
    return { active: memoryVoting.active, voteId: memoryVoting.voteId, candidates: resultCandidates, totalVotes, publicUrl };
  }
}

app.get("/api/voting/status", async (req, res) => {
  try {
    const status = await getVotingStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/voting/start", requireAuth, async (req, res) => {
  try {
    const { candidates } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: "Invalid candidates list" });
    }

    const newVoteId = Date.now().toString();

    if (useRedis) {
      // Clear previous voting data - ONLY for this app namespace
      const keys = await redisClient.keys('timing_voting:*');
      if (keys.length > 0) await redisClient.del(keys);
      
      await redisClient.set('timing_voting:candidates', JSON.stringify(candidates));
      await redisClient.set('timing_voting:active', 'true');
      await redisClient.set('timing_voting:id', newVoteId);
    } else {
      memoryVoting.candidates = candidates;
      memoryVoting.votes = {};
      memoryVoting.active = true;
      memoryVoting.voteId = newVoteId;
    }
    
    res.json({ ok: true, voteId: newVoteId });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/voting/stop", requireAuth, async (req, res) => {
  try {
    if (useRedis) {
      // Check total votes before stopping
      const candidatesStr = await redisClient.get('timing_voting:candidates');
      const candidates = candidatesStr ? JSON.parse(candidatesStr) : [];
      let totalVotes = 0;
      for (const c of candidates) {
         const v = parseInt(await redisClient.get(`timing_voting:count:${c.number}`) || '0', 10);
         totalVotes += v;
      }

      await redisClient.set('timing_voting:active', 'false');
      
      // If no votes, clear candidates to "clean" the state
      if (totalVotes === 0) {
         await redisClient.del('timing_voting:candidates');
         // Clean counts too
         for (const c of candidates) {
            await redisClient.del(`timing_voting:count:${c.number}`);
         }
      }

    } else {
      memoryVoting.active = false;
      const totalVotes = Object.values(memoryVoting.votes).reduce((a, b) => a + b, 0);
      
      // If no votes, clear candidates to "clean" the state
      if (totalVotes === 0) {
        memoryVoting.candidates = [];
        memoryVoting.votes = {};
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post("/api/voting/vote", async (req, res) => {
  try {
    const { candidateNumber } = req.body;
    if (!candidateNumber) return res.status(400).json({ error: "Missing candidateNumber" });

    // Check if voting is active
    let active = false;
    if (useRedis) {
      active = await redisClient.get('timing_voting:active') === 'true';
    } else {
      active = memoryVoting.active;
    }

    if (!active) return res.status(403).json({ error: "Voting is closed" });

    if (useRedis) {
      await redisClient.incr(`timing_voting:count:${candidateNumber}`);
    } else {
      if (!memoryVoting.votes[candidateNumber]) memoryVoting.votes[candidateNumber] = 0;
      memoryVoting.votes[candidateNumber]++;
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/vote", (_req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
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
app.get("/livetiming", (_req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});
app.get("/voting-overlay", (_req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});
app.get("/track", (_req, res) => {
  res.sendFile(path.resolve("dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`OBS overlay server on http://localhost:${PORT}/`);
  console.log(`Background scraping loop active: ${scrapingEnabled ? "YES" : "NO"}`);
});
