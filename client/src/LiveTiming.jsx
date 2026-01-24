import React, { useEffect, useMemo, useRef, useState } from "react";
import { animate, useMount } from "react-ui-animate";
import { Timer } from "lucide-react";
import CurrentLap from "./CurrentLap";
import Overtakes from "./Overtakes";
import Announcements from "./Announcements";
import VotingWidget from "./VotingWidget";

// --- Helpers ---
function safe(v) {
  return v == null ? "" : String(v);
}
function surname(n) {
  const s = safe(n).trim();
  if (!s) return "";
  if (s.includes(",")) return s.split(",")[0].trim();
  const parts = s.split(/\s+/);
  if (parts.length === 1) return s;
  if (parts.length === 2) return parts[1];
  return parts.slice(0, -1).join(" ");
}
function parseTime(t) {
  const s = safe(t).trim();
  if (!s || s === "-" || /lap/i.test(s)) return null;
  const m = s.match(/^(\d+):([0-5]?\d(?:\.\d+)?)/);
  if (m) return parseInt(m[1], 10) * 60 + parseFloat(m[2]);
  const n = s.replace(/[^\d.]/g, "");
  if (!n) return null;
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : null;
}
function fastestIndex(list) {
  let idx = -1;
  let best = Infinity;
  for (let i = 0; i < list.length; i++) {
    const v = parseTime(list[i]?.bestLap ?? list[i]?.lastLap);
    if (v != null && v < best) {
      best = v;
      idx = i;
    }
  }
  return idx;
}
function idFor(r) {
  return `${safe(r.number)}|${safe(surname(r.name))}`;
}
function formatTimer(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const t = Math.floor((ms % 1000) / 100);
  const p2 = (v) => (v < 10 ? `0${v}` : `${v}`);
  return m > 0 ? `${m}:${p2(s)}.${t}` : `${s}.${String(Math.floor(ms % 1000)).padStart(3, "0")}`;
}

const PALETTE = ["#ffd166", "#f4978e", "#caffbf", "#a0c4ff", "#ffadad", "#fdffb6", "#bde0fe", "#d0f4de"];
function colorFor(numStr, nameStr) {
  const n = parseInt(safe(numStr), 10);
  const idx = Number.isFinite(n) ? n % PALETTE.length : Math.abs(safe(nameStr).charCodeAt(0) || 0) % PALETTE.length;
  return PALETTE[idx];
}

export default function LiveTiming() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const limitParam = params.get("limit");
  const widthParam = params.get("w");
  const widthPxParam = params.get("wp");
  const marginParam = params.get("m");

  const [title, setTitle] = useState("Live Timing");
  const [lapsLabel, setLapsLabel] = useState("");
  const [finishFlag, setFinishFlag] = useState(false);
  const [raceFlag, setRaceFlag] = useState("GREEN");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  
  const MODES = ["GAP", "DIFF", "TOTAL", "BEST", "LAST"];
  const MODE_LABELS = { GAP: "DIF", DIFF: "INT", TOTAL: "TOTAL", BEST: "MEJOR", LAST: "ULTIMA" };
  const [modeIdx, setModeIdx] = useState(0);

  const [showOverlay, setShowOverlay] = useState(true);
  const [showComments, setShowComments] = useState(true);
  const [showVotingWidget, setShowVotingWidget] = useState(true);
  const [showOvertakes, setShowOvertakes] = useState(true);
  const [showCurrentLap, setShowCurrentLap] = useState(true);
  const [showFastestLap, setShowFastestLap] = useState(true);
  const [showLapFinish, setShowLapFinish] = useState(true);
  const SNAP_KEY = "overlay:lastSnapshot";

  const [activeCard, setActiveCard] = useState(null); 
  const eventQueue = useRef([]);
  const cardTimerRef = useRef(null);
  const [cardTimerDisplay, setCardTimerDisplay] = useState("0:00.0");
  
  const lastPositions = useRef(new Map());
  const [annItems, setAnnItems] = useState([]);
  const annLastRef = useRef(null);
  const [lapsChangeAnim, setLapsChangeAnim] = useState(false);
  const prevLapsRef = useRef(null);
  const [lastFastestKey, setLastFastestKey] = useState(null);
  const [lastFastestTime, setLastFastestTime] = useState(null);

  const [showGreenBanner, setShowGreenBanner] = useState(false);
  const prevRaceFlag = useRef(raceFlag);

  useEffect(() => {
    if (raceFlag === "GREEN") {
      const wasBlack = prevRaceFlag.current && String(prevRaceFlag.current).startsWith("BLACK");
      if (!wasBlack) {
        setShowGreenBanner(true);
        const t = setTimeout(() => setShowGreenBanner(false), 5000);
        return () => clearTimeout(t);
      } else {
        setShowGreenBanner(false);
      }
    } else {
      setShowGreenBanner(false);
    }
    prevRaceFlag.current = raceFlag;
  }, [raceFlag]);

  useEffect(() => {
    const limit = limitParam && parseInt(limitParam) > 0 ? parseInt(limitParam) : 15;
    if (rows.length > limit) {
      const t = setInterval(() => {
        setPage(p => {
          const maxPages = Math.ceil(rows.length / limit);
          return (p + 1) % maxPages;
        });
      }, 10000);
      return () => clearInterval(t);
    } else {
      setPage(0);
    }
  }, [rows.length, limitParam]);



  useEffect(() => {
    if (rows && rows.length > 0) {
      rows.forEach(r => {
        const id = idFor(r);
        const pos = parseInt(safe(r.position), 10);
        if (Number.isFinite(pos)) {
          lastPositions.current.set(id, pos);
        }
      });
    }
  }, [rows]);

  useEffect(() => {
    document.title = "LIVETIMING | StreamRace 1.0";
    const wpx = parseInt(widthPxParam);
    if (wpx && wpx >= 200 && wpx <= 900) {
      document.documentElement.style.setProperty("--overlay-wpx", String(wpx));
    } else {
      const w = parseInt(widthParam);
      if (w && w > 0 && w <= 100) {
        const px = Math.round(w * 19.2);
        document.documentElement.style.setProperty("--overlay-wpx", String(px));
      }
    }
    const m = parseInt(marginParam);
    if (m && m >= 0 && m <= 200) {
      document.documentElement.style.setProperty("--overlay-m", String(m));
    }
  }, [widthParam, widthPxParam, marginParam]);

  function computeLaps(list) {
    if (!Array.isArray(list) || !list.length) return null;
    const leader = list.reduce((best, r) => {
      if (best == null) return r;
      if ((r.position ?? 9999) < (best.position ?? 9999)) return r;
      return best;
    }, null);
    const lp = leader?.laps ?? null;
    if (lp != null) return lp;
    const max = Math.max(...list.map((r) => r.laps ?? -1));
    return max >= 0 ? max : null;
  }

  function renderEffects(prevRows, nextRows, isFlagged) {
    const fi = fastestIndex(nextRows);
    const fiTime = fi >= 0 ? parseTime(nextRows[fi]?.bestLap ?? nextRows[fi]?.lastLap) : null;
    const fiId = fi >= 0 ? `${safe(nextRows[fi]?.number)}|${safe(surname(nextRows[fi]?.name))}` : null;
    const shouldAnim = fi >= 0 && (fiId !== lastFastestKey || (fiTime != null && (lastFastestTime == null || fiTime < lastFastestTime)));
    if (fi >= 0) {
      setLastFastestKey(fiId);
      setLastFastestTime(fiTime);
      
      if (shouldAnim && lastFastestKey !== null && showFastestLap) {
          eventQueue.current.push({
             id: 'FASTEST-' + Date.now(),
             type: 'FASTEST',
             data: {
                number: safe(nextRows[fi].number),
                name: surname(nextRows[fi].name),
                time: formatTimer(fiTime * 1000)
             }
          });
      }
    }
    
    if (isFlagged) {
      if (activeCard) {
          setActiveCard(null);
          if (cardTimerRef.current) clearInterval(cardTimerRef.current);
      }
      eventQueue.current = [];
      return;
    }

    const prevMap = new Map();
    if (Array.isArray(prevRows)) {
      prevRows.forEach(r => {
        const id = idFor(r);
        const p = parseInt(safe(r.position), 10);
        if (Number.isFinite(p)) prevMap.set(id, p);
      });
    }
    let bestGain = { delta: 0, id: null, pos: null, num: null, who: null };
    let bestDrop = { delta: 0, id: null, pos: null, num: null, who: null };
    nextRows.forEach(r => {
      const id = idFor(r);
      const prev = prevMap.get(id);
      const cur = parseInt(safe(r.position), 10);
      if (prev != null && Number.isFinite(cur)) {
        const d = prev - cur;
        if (d > bestGain.delta) bestGain = { delta: d, id, pos: cur, num: safe(r.number), who: surname(r.name) };
        if (d < bestDrop.delta) bestDrop = { delta: d, id, pos: cur, num: safe(r.number), who: surname(r.name) };
      }
    });
    const nowStr = new Date().toLocaleTimeString();
    if (bestGain.delta > 0) {
      const key = `up:${bestGain.num}:${bestGain.delta}:${bestGain.pos}`;
      if (annLastRef.current !== key) {
        annLastRef.current = key;
        const text = `Number ${bestGain.num} is up ${bestGain.delta} places to ${bestGain.pos}.`;
        setAnnItems(prev => [{ time: nowStr, kind: "pos_up", number: parseInt(bestGain.num, 10), delta: bestGain.delta, toPos: bestGain.pos, text }, ...prev].slice(0, 6));
      }
    } else if (bestDrop.delta < 0) {
      const dropDelta = Math.abs(bestDrop.delta);
      const key = `down:${bestDrop.num}:${dropDelta}:${bestDrop.pos}`;
      if (annLastRef.current !== key) {
        annLastRef.current = key;
        const text = `Number ${bestDrop.num} has just dropped to ${bestDrop.pos}.`;
        setAnnItems(prev => [{ time: nowStr, kind: "pos_down", number: parseInt(bestDrop.num, 10), toPos: bestDrop.pos, text }, ...prev].slice(0, 6));
      }
    }

      const finishers = [];
      nextRows.forEach(r => {
        const id = idFor(r);
        const prevRow = prevRows.find(pr => idFor(pr) === id);
        
        if (prevRow) {
           const prevLaps = parseInt(safe(prevRow.laps), 10);
           const curLaps = parseInt(safe(r.laps), 10);
           if (curLaps > prevLaps) {
             const lastLapTime = parseTime(r.lastLap);
             const prevLapTime = parseTime(prevRow.lastLap);
             
             if (lastLapTime) {
                let delta = null;
                if (prevLapTime) {
                   delta = (lastLapTime - prevLapTime) * 1000;
                }
                finishers.push({ r, delta, lastLap: r.lastLap });
             }
           }
        }
      });

      if (finishers.length > 0 && showLapFinish) {
         finishers.sort((a, b) => {
            if (a.delta === null) return 1;
            if (b.delta === null) return -1;
            return a.delta - b.delta;
         });
         
         const pick = finishers[0];
         eventQueue.current.push({
            type: 'FINISH',
            data: {
                number: safe(pick.r.number),
                name: surname(pick.r.name),
                finalTimeStr: pick.lastLap,
                deltaMs: pick.delta
            }
         });
      }
  }

  // --- Scheduler & Animation Effects ---

  useEffect(() => {
    if (!showFastestLap) {
      // Cleanup FASTEST events if disabled
      eventQueue.current = eventQueue.current.filter(e => e.type !== 'FASTEST');
      if (activeCard?.type === 'FASTEST') {
        setActiveCard(null);
      }
    }
  }, [showFastestLap, activeCard]);

  useEffect(() => {
    if (!showLapFinish) {
      // Cleanup FINISH events if disabled
      eventQueue.current = eventQueue.current.filter(e => e.type !== 'FINISH');
      if (activeCard?.type === 'FINISH') {
        setActiveCard(null);
        if (cardTimerRef.current) {
          clearInterval(cardTimerRef.current);
          cardTimerRef.current = null;
        }
      }
    }
  }, [showLapFinish, activeCard]);

  useEffect(() => {
    const timer = setInterval(() => {
        const fastestIdx = eventQueue.current.findIndex(e => e.type === 'FASTEST');

        // Priority Interruption: If showing FINISH but a FASTEST comes in, interrupt!
        if (activeCard && activeCard.type === 'FINISH' && fastestIdx >= 0) {
            if (cardTimerRef.current) {
                clearInterval(cardTimerRef.current);
                cardTimerRef.current = null;
            }
            const nextEvent = eventQueue.current.splice(fastestIdx, 1)[0];
            setActiveCard({ ...nextEvent, stage: 'show' });
            setTimeout(() => setActiveCard(null), 10000);
            return;
        }

        if (activeCard) return; // Busy
        if (eventQueue.current.length === 0) return;

        // Normal Scheduling: Priority: FASTEST > FINISH
        let nextEvent;
        if (fastestIdx >= 0) {
             nextEvent = eventQueue.current.splice(fastestIdx, 1)[0];
        } else {
             nextEvent = eventQueue.current.shift();
        }

        if (nextEvent.type === 'FASTEST') {
            setActiveCard({ ...nextEvent, stage: 'show' });
            setTimeout(() => {
                setActiveCard(prev => prev?.id === nextEvent.id ? null : prev);
            }, 10000);
        } else if (nextEvent.type === 'FINISH') {
            startLapSimulation(nextEvent);
        }
    }, 250);
    return () => clearInterval(timer);
  }, [activeCard]);

  function startLapSimulation(event) {
    const { finalTimeStr, deltaMs } = event.data;
    const finalMs = parseTime(finalTimeStr) * 1000;
    if (!finalMs) {
        setActiveCard(null);
        return;
    }
    const duration = 5000;
    const startMs = Math.max(0, finalMs - duration);
    const startTime = Date.now();

    setActiveCard({ ...event, stage: 'timer' });
    setCardTimerDisplay(formatTimer(startMs));

    if (cardTimerRef.current) clearInterval(cardTimerRef.current);
    
    cardTimerRef.current = setInterval(() => {
       const now = Date.now();
       const elapsed = now - startTime;
       
       if (elapsed >= duration) {
          setCardTimerDisplay(formatTimer(finalMs));
          if (cardTimerRef.current) clearInterval(cardTimerRef.current);
          cardTimerRef.current = null;
          
          setActiveCard(prev => prev ? ({ ...prev, stage: 'result' }) : null);
          
          setTimeout(() => {
             setActiveCard(null);
          }, 7000);
       } else {
          setCardTimerDisplay(formatTimer(startMs + elapsed));
       }
    }, 50);
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const apiOrigin = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiOrigin}/api/standings`);
        const data = await res.json();
        if (!mounted) return;
        let nextTitle = data.sessionName ? String(data.sessionName) : "Live Timing";
        let nextFlag = !!data.flagFinish;
        let nextRaceFlag = data.raceFlag || "GREEN";
        let list = (data.standings || []);
        const anns = Array.isArray(data.announcements) ? data.announcements : [];
        let nextLaps = data.sessionLaps;

        if (!list.length) {
          try {
            const snap = JSON.parse(localStorage.getItem(SNAP_KEY) || "{}");
            const snapTitle = snap.title || "";
            const srvTitle = data.sessionName || "";
            const isDifferentSession = srvTitle && snapTitle && srvTitle !== snapTitle;
            const isNewerState = snap.finishFlag && data.flagFinish === false;

            if (!isDifferentSession && !isNewerState) {
              if (Array.isArray(snap.rows) && snap.rows.length) {
                list = snap.rows;
                nextTitle = snap.title || nextTitle;
                nextFlag = !!snap.finishFlag;
                nextLaps = snap.sessionLaps || nextLaps;
              }
            }
          } catch {}
        } else {
          try {
            const snap = { rows: list, title: nextTitle, finishFlag: nextFlag, sessionLaps: nextLaps, announcements: anns };
            localStorage.setItem(SNAP_KEY, JSON.stringify(snap));
          } catch {}
        }
        setTitle(nextTitle);
        setFinishFlag(nextFlag);
        setRaceFlag(nextRaceFlag);
        setAnnItems(anns);
        let laps = nextLaps;
        if (!laps) laps = computeLaps(list || []);
        
        if (laps !== null && laps !== undefined) {
          const lapsNum = parseInt(laps, 10);
          const prevLapsNum = prevLapsRef.current !== null ? parseInt(prevLapsRef.current, 10) : -1;
          
          if (!isNaN(lapsNum)) {
            if (prevLapsNum !== -1 && lapsNum > prevLapsNum) {
              setLapsChangeAnim(true);
              setTimeout(() => setLapsChangeAnim(false), 2000);
            }
            if (lapsNum > prevLapsNum || (prevLapsNum !== -1 && prevLapsNum - lapsNum > 5)) {
              prevLapsRef.current = String(lapsNum);
            }
            const anyZero = list && list.some(r => parseInt(r.laps ?? -1, 10) === 0);
            if (!anyZero && prevLapsNum !== -1 && lapsNum < prevLapsNum && prevLapsNum - lapsNum <= 5) {
               laps = prevLapsNum;
            }
          }
        }

        setLapsLabel(laps !== null && laps !== undefined ? `Vueltas: ${laps}` : "");
        setRows((prev) => {
          renderEffects(prev, list, nextFlag);
          return list;
        });
      } catch (e) {
      }
    }
    if (showOverlay) {
      load();
    }
    const t = showOverlay ? setInterval(load, 1000) : null;
    const mt = showOverlay ? setInterval(() => {
      setModeIdx(prev => (prev + 1) % MODES.length);
    }, 6000) : null;

    if (!showOverlay) {
      setActiveCard(null);
      eventQueue.current = [];
    }
    return () => {
      mounted = false;
      if (t) clearInterval(t);
      if (mt) clearInterval(mt);
    };
  }, [limitParam, showOverlay, showFastestLap, showLapFinish]);

  useEffect(() => {
    let alive = true;
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        if (!alive) return;
        setShowOverlay(data.overlayEnabled !== false);
        setShowComments(data.commentsEnabled !== false);
        setShowVotingWidget(data.votingWidgetEnabled !== false);
        setShowOvertakes(data.overtakesEnabled !== false);
        setShowCurrentLap(data.currentLapEnabled !== false);
        setShowFastestLap(data.fastestLapEnabled !== false);
        setShowLapFinish(data.lapFinishEnabled !== false);
      } catch {}
    }
    loadConfig();
    const ci = setInterval(loadConfig, 1000);
    return () => {
      alive = false;
      clearInterval(ci);
    };
  }, []);

  useEffect(() => {
    if (showOverlay) {
      try {
        const snap = JSON.parse(localStorage.getItem(SNAP_KEY) || "{}");
        if ((!rows || rows.length === 0) && Array.isArray(snap.rows) && snap.rows.length) {
          setRows(snap.rows);
          if (snap.title) setTitle(String(snap.title));
          setFinishFlag(!!snap.finishFlag);
          let laps = snap.sessionLaps;
          if (!laps) laps = computeLaps(snap.rows || []);
          setLapsLabel(laps ? `Vueltas: ${laps}` : "");
          if (Array.isArray(snap.announcements)) setAnnItems(snap.announcements);
        }
      } catch {}
    }
    // eslint-disable-next-line
  }, [showOverlay]);
  useEffect(() => {
    try {
      const snap = JSON.parse(localStorage.getItem(SNAP_KEY) || "{}");
      if (Array.isArray(snap.rows) && snap.rows.length) {
        setRows(snap.rows);
        if (snap.title) setTitle(String(snap.title));
        setFinishFlag(!!snap.finishFlag);
        let laps = snap.sessionLaps;
        if (!laps) laps = computeLaps(snap.rows || []);
        setLapsLabel(laps ? `Vueltas: ${laps}` : "");
      }
    } catch {}
    // eslint-disable-next-line
  }, []);

  const fi = fastestIndex(rows);
  let bestOver = null;
  if (rows && rows.length) {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const id = idFor(r);
      const prevPos = lastPositions.current.get(id);
      const curNum = Number.parseInt(safe(r.position), 10);
      const curPos = Number.isFinite(curNum) ? curNum : null;
      if (prevPos != null && curPos != null && prevPos > curPos) {
        const gain = prevPos - curPos;
        const sname = surname(r.name);
        if (!bestOver || gain > bestOver.gain) {
          bestOver = { gain, badge: safe(r.number), who: sname };
        }
      }
    }
  }

  const mountedOverlay = useMount(showOverlay, { from: 0, enter: 1, exit: 0 });
  const mountedLap = useMount(!!activeCard && showOverlay, { from: 0, enter: 1, exit: 0 });

  const limit = limitParam && parseInt(limitParam) > 0 ? parseInt(limitParam) : 15;
  const pageStart = page * limit;
  const visibleRows = rows.slice(pageStart, pageStart + limit);

  const globalFastestIndex = fastestIndex(rows);
  const globalFastestRow = globalFastestIndex >= 0 ? rows[globalFastestIndex] : null;

  const flagBanners = {
    YELLOW: { text: "BANDERA AMARILLA", class: "bg-yellow-500 text-black animate-pulse" },
    RED: { text: "BANDERA ROJA", class: "bg-red-600 text-white animate-pulse" },
    SC: { text: "SAFETY CAR", class: "bg-orange-500 text-black animate-pulse" },
    VSC: { text: "VIRTUAL SAFETY CAR", class: "bg-orange-500 text-black animate-pulse" },
    SLOW: { text: "SLOW", class: "bg-orange-500 text-black animate-pulse" },
    BLUE: { text: "BANDERA AZUL", class: "bg-blue-600 text-white animate-pulse" },
    WHITE: { text: "BANDERA BLANCA", class: "bg-white text-black animate-pulse" },
    FINISH: { text: "CARRERA FINALIZADA", class: "bg-white text-black" },
    GREEN: { text: "BANDERA VERDE", class: "bg-green-500 text-black" }
  };
  
  let activeBanner = null;
  
  if (raceFlag && raceFlag.startsWith("BLACK")) {
     const parts = raceFlag.split(":");
     const num = parts[1] || "";
     activeBanner = { 
        text: num ? `BANDERA NEGRA #${num}` : "BANDERA NEGRA", 
        class: "bg-black text-white border-2 border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse" 
     };
  } else {
     activeBanner = flagBanners[raceFlag];
  }
  
  // Only show GREEN banner if temporary state is true
  if (raceFlag === "GREEN" && !showGreenBanner) {
    activeBanner = null;
  }

  const [bannerContent, setBannerContent] = useState(activeBanner);
  useEffect(() => {
    if (activeBanner) setBannerContent(activeBanner);
  }, [activeBanner]);

  const mountedFlag = useMount(!!activeBanner, {
    from: 0,
    enter: 1,
    exit: 0,
    config: { tension: 100, friction: 20 }
  });

  return (
    <div>
      {mountedOverlay((a) => (
        <animate.div
          style={{
            opacity: a,
            translateY: a.to([0, 1], ["-10px", "0px"]),
          }}
          className="fixed top-[calc(var(--overlay-m)*1px)] left-[calc(var(--overlay-m)*1px)] w-[calc(var(--overlay-wpx)*1px)] z-50"
        >
        <div className="relative">
          {/* Main Panel */}
          <div className="rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.5)] bg-[#141414] border border-white/5">
            {/* Header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-white/10 bg-[#0a0a0a] relative z-20">
              <div className="w-2 h-8 rounded-full bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]" />
              <div className="font-black italic text-lg tracking-tighter text-white drop-shadow-lg">{title}</div>
              <div className="ml-auto flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  <span className="font-mono font-bold text-[var(--accent)] text-base tracking-widest uppercase">
                    {MODE_LABELS[MODES[modeIdx]]}
                  </span>
              </div>
            </div>
            
            {/* Flag Banner */}
            {mountedFlag((v) => (
              <animate.div
                style={{
                  opacity: v,
                  maxHeight: v.to([0, 1], ["0px", "60px"]),
                  translateY: v.to([0, 1], ["-60px", "0px"]),
                }}
                className="w-full overflow-hidden relative z-10"
              >
                 {bannerContent && (
                   <div className={`w-full py-2 font-black text-center text-xl uppercase tracking-widest ${bannerContent.class} shadow-lg`}>
                      {bannerContent.text}
                   </div>
                 )}
              </animate.div>
            ))}
            
            {/* Rows */}
            <div className="flex flex-col">
                {visibleRows.map((r, i) => {
                  const id = idFor(r);
                  const prevPos = lastPositions.current.get(id);
                  const curNum = Number.parseInt(safe(r.position), 10);
                  const curPos = Number.isFinite(curNum) ? curNum : 9999;
                  const prevVal = Number.isFinite(prevPos) ? prevPos : null;
                  const sname = surname(r.name);
                  
                  const arrow = (lastPositions.current.size > 0 && prevVal != null)
                    ? curPos < prevVal
                      ? <span className="text-green-500 ml-1 text-sm">▲</span>
                      : curPos > prevVal
                        ? <span className="text-red-500 ml-1 text-sm">▼</span>
                        : null
                    : null;
                  
                  const isFastest = globalFastestRow && idFor(r) === idFor(globalFastestRow);
                  
                  let metricVal = "";
                  const mode = MODES[modeIdx];
                  if (mode === "GAP") metricVal = r.gap || "-";
                  else if (mode === "DIFF") metricVal = r.diff || "-";
                  else if (mode === "TOTAL") metricVal = r.totalTime || "-";
                  else if (mode === "BEST") metricVal = r.bestLap || "-";
                  else if (mode === "LAST") metricVal = r.lastLap || "-";
                  
                  return (
                    <div key={id} className={`flex items-center gap-3 px-4 py-1.5 border-b border-white/5 bg-[#0f0f0f]/50 hover:bg-white/5 transition-colors ${isFastest && showFastestLap && !r.hasFinishFlag ? "bg-purple-600/50 animate-pulse" : ""}`}>
                      {/* Position */}
                      <div className="w-10 text-right font-black italic text-xl text-white/50 relative">
                        {r.hasFinishFlag && <span className="absolute -left-2 top-1/2 -translate-y-1/2 text-xs">🏁</span>}
                        {!r.hasFinishFlag && isFastest && showFastestLap && <span className="absolute left-0 top-1/2 -translate-y-1/2 text-purple-500 flex items-center justify-center"><Timer size={20} /></span>}
                        {safe(r.position)}
                        {arrow}
                      </div>

                      {/* Number */}
                      <div className="w-10 h-8 flex items-center justify-center rounded-lg bg-white/10 font-black italic text-lg text-white border border-white/5 shadow-inner">
                         {safe(r.number)}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                         <div className="font-bold italic uppercase text-lg tracking-tight text-white truncate drop-shadow-sm">{safe(sname)}</div>
                      </div>

                      {/* Time */}
                      <div className="w-24 text-right font-mono font-bold text-lg text-[var(--accent)] tracking-tight">
                        <span className="metric-swap" key={`${mode}:${id}`}>
                          {safe(metricVal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Floating Elements (Laps, Overtakes, Comments) */}
          <div className="absolute top-0 left-full ml-4 flex gap-3 items-start">
            {lapsLabel && showCurrentLap && (
              <CurrentLap finishFlag={finishFlag} lapsLabel={lapsLabel} lapsChangeAnim={lapsChangeAnim} />
            )}
            {showOvertakes && (
              <Overtakes badge={bestOver?.badge} who={bestOver?.who} gain={bestOver?.gain || 0} />
            )}
            {showComments && <Announcements items={annItems} />}
          </div>
          
        </div>
        </animate.div>
      ))}

      {/* Voting Widget */}
      {showVotingWidget && (
         <div className="fixed top-[150px] right-[calc(var(--overlay-m)*1px)] z-50">
            <VotingWidget />
         </div>
      )}

      {/* Lap Card Overlay */}
      {mountedLap((a, isMounted) => (
        isMounted && activeCard && (
          <animate.div
            style={{ opacity: a, translateY: a.to([0, 1], ["8px", "0px"]) }}
            className={`fixed right-[calc(var(--overlay-m)*1px)] bottom-[calc(var(--overlay-m)*1px)] w-[300px] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 bg-[#141414] ${activeCard.type === 'FASTEST' ? "border-purple-500/50 shadow-purple-900/20" : ""}`}
          >
            {/* Progress Bar Background */}
            {activeCard.type === 'FINISH' && activeCard.stage === 'result' && (
              <div className={`absolute top-0 bottom-0 left-0 animate-progress z-0 pointer-events-none ${activeCard.data.deltaMs > 0 ? "bg-red-500/20" : "bg-green-500/20"}`} />
            )}
            {activeCard.type === 'FASTEST' && (
              <div className="absolute top-0 bottom-0 left-0 bg-purple-500/20 z-0 pointer-events-none" />
            )}

            {/* Header */}
            <div className="relative z-10 px-4 py-3 flex items-center gap-3 border-b border-white/10 bg-[#0a0a0a]">
               <div className="w-10 h-8 flex items-center justify-center rounded bg-white/10 font-black italic text-lg text-white">
                  {activeCard.data.number}
               </div>
               <div className="font-black uppercase italic text-xl leading-none truncate flex-1 text-white">
                  {activeCard.data.name}
               </div>
            </div>

            {/* Content */}
            <div className="relative z-10 p-4">
              <div className="flex flex-col items-center justify-center min-h-[60px]">
                <div className={`text-6xl font-black tabular-nums leading-none tracking-tighter text-center italic transition-all duration-300 ${activeCard.type === 'FASTEST' ? "text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" : (activeCard.stage === 'result' ? (activeCard.data.deltaMs > 0 ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]") : "text-white")}`}>
                  {activeCard.type === 'FASTEST' ? activeCard.data.time : cardTimerDisplay}
                </div>
              </div>
              
              <div className="flex items-center justify-center pt-3 mt-2 border-t border-white/10">
                {activeCard.type === 'FASTEST' ? (
                    <div className="px-3 py-1 rounded bg-purple-600 text-white font-black italic uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                        RÉCORD DE VUELTA
                    </div>
                ) : (
                    activeCard.data.deltaMs !== null && Math.abs(activeCard.data.deltaMs) < 10000 && activeCard.stage === 'result' ? (
                    <div className={`px-3 py-1 rounded font-black tabular-nums leading-none tracking-tight italic text-xl shadow-lg ${activeCard.data.deltaMs < 0 ? "bg-green-500 text-black" : "bg-red-500 text-white"}`}>
                        {activeCard.data.deltaMs > 0 ? "+" : ""}{(activeCard.data.deltaMs / 1000).toFixed(2)}
                    </div>
                    ) : (
                    <div className="text-white/30 text-xs font-bold italic uppercase tracking-widest">EN CURSO</div>
                    )
                )}
              </div>
            </div>
          </animate.div>
        )
      ))}
    </div>
  );
}
