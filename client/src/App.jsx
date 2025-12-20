import React, { useEffect, useMemo, useRef, useState } from "react";
import { animate, useMount } from "react-ui-animate";
import { Timer } from "lucide-react";
import CurrentLap from "./CurrentLap";
import Overtakes from "./Overtakes";
import Announcements from "./Announcements";

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

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const limitParam = params.get("limit");
  const widthParam = params.get("w");
  const widthPxParam = params.get("wp");
  const marginParam = params.get("m");

  const [title, setTitle] = useState("Live Timing");
  const [lapsLabel, setLapsLabel] = useState("");
  const [finishFlag, setFinishFlag] = useState(false);
  const [rows, setRows] = useState([]);
  
  const MODES = ["GAP", "DIFF", "TOTAL", "BEST", "LAST"];
  const MODE_LABELS = { GAP: "DIF", DIFF: "INT", TOTAL: "TOTAL", BEST: "MEJOR", LAST: "ULTIMA" };
  const [modeIdx, setModeIdx] = useState(0);

  const [showOverlay, setShowOverlay] = useState(true);
  const SNAP_KEY = "overlay:lastSnapshot";

  const lastPositions = useRef(new Map());
  const lastLaps = useRef(new Map());
  const [tracking, setTracking] = useState(null);
  const trackingRef = useRef(null);
  const [lapTimerText, setLapTimerText] = useState("0:00.0");
  const lapTickRef = useRef(null);
  const [lapCardVisible, setLapCardVisible] = useState(false);
  const [lapBadge, setLapBadge] = useState("");
  const [lapWho, setLapWho] = useState("");
  const [lapDelta, setLapDelta] = useState(null);
  const [annItems, setAnnItems] = useState([]);
  const annLastRef = useRef(null);

  const [lastFastestKey, setLastFastestKey] = useState(null);
  const [lastFastestTime, setLastFastestTime] = useState(null);
  const [lapFinishAnim, setLapFinishAnim] = useState(false);
  const [lapsChangeAnim, setLapsChangeAnim] = useState(false);
  const prevLapsRef = useRef(null);

  const [showFastest, setShowFastest] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setShowFastest(prev => !prev);
    }, 10000);
    return () => clearInterval(t);
  }, []);

  // Update lastPositions reference whenever rows change to track position changes
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
    document.title = "Livetiming OBS Overlay | Siendo Studio";
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

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const apiOrigin = import.meta.env.VITE_API_URL || "https://timing-v1.onrender.com";
        const res = await fetch(`${apiOrigin}/api/standings`);
        const data = await res.json();
        if (!mounted) return;
        let nextTitle = data.sessionName ? String(data.sessionName) : "Live Timing";
        let nextFlag = !!data.flagFinish;
        let list = (data.standings || []);
        const anns = Array.isArray(data.announcements) ? data.announcements : [];
        let nextLaps = data.sessionLaps;

        if (!list.length) {
          try {
            const snap = JSON.parse(localStorage.getItem(SNAP_KEY) || "{}");
            if (Array.isArray(snap.rows) && snap.rows.length) {
              list = snap.rows;
              nextTitle = snap.title || nextTitle;
              nextFlag = !!snap.finishFlag;
              nextLaps = snap.sessionLaps || nextLaps;
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
        setAnnItems(anns);
        let laps = nextLaps;
        if (!laps) laps = computeLaps(list || []);
        
        if (laps !== null && laps !== undefined) {
          const lapsNum = parseInt(laps, 10);
          const prevLapsNum = prevLapsRef.current !== null ? parseInt(prevLapsRef.current, 10) : -1;
          
          if (!isNaN(lapsNum)) {
            // Only animate if laps increased and we had a valid previous value
            if (prevLapsNum !== -1 && lapsNum > prevLapsNum) {
              setLapsChangeAnim(true);
              setTimeout(() => setLapsChangeAnim(false), 2000);
            }
            // Update ref if laps increased or if it's a reset (value dropped significantly)
            if (lapsNum > prevLapsNum || (prevLapsNum !== -1 && prevLapsNum - lapsNum > 5)) {
              prevLapsRef.current = String(lapsNum);
            }
            // Use the stored highest value to prevent flickering text
            if (prevLapsNum !== -1 && lapsNum < prevLapsNum && prevLapsNum - lapsNum <= 5) {
               laps = prevLapsNum;
            }
          }
        }

        setLapsLabel(laps ? `Vueltas: ${laps}` : "");
        setRows((prev) => {
          renderEffects(prev, list, nextFlag);
          return topLimit(list, limitParam);
        });
      } catch (e) {
        // no-op
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
      endLapCard();
    }
    return () => {
      mounted = false;
      if (t) clearInterval(t);
      if (mt) clearInterval(mt);
    };
  }, [limitParam, showOverlay]);

  useEffect(() => {
    let alive = true;
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        if (!alive) return;
        setShowOverlay(data.overlayEnabled !== false);
      } catch {}
    }
    loadConfig();
    const ci = setInterval(loadConfig, 3000);
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
          setRows(topLimit(snap.rows, limitParam));
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
        setRows(topLimit(snap.rows, limitParam));
        if (snap.title) setTitle(String(snap.title));
        setFinishFlag(!!snap.finishFlag);
        let laps = snap.sessionLaps;
        if (!laps) laps = computeLaps(snap.rows || []);
        setLapsLabel(laps ? `Vueltas: ${laps}` : "");
      }
    } catch {}
    // eslint-disable-next-line
  }, []);

  function topLimit(list, limitParam) {
    const maxRows = limitParam && parseInt(limitParam) > 0 ? parseInt(limitParam) : 23;
    return list.slice(0, maxRows);
  }
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
    }
    
    if (isFlagged) {
      if (trackingRef.current) {
        endLapCard();
      }
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

    if (nextRows.length > 0 && !trackingRef.current) {
      // Random fixed pilot for testing
      const valid = nextRows.filter(r => {
        if (!r.number || !r.name) return false;
        const p = parseInt(safe(r.position), 10);
        return !isNaN(p) && p <= 10;
      });
      if (valid.length > 0) {
        const pick = valid[Math.floor(Math.random() * valid.length)];
        startLapCard(pick);
      }
    } else if (trackingRef.current) {
       let me = nextRows.find((x) => idFor(x) === trackingRef.current.id);
       if (!me && trackingRef.current.number) {
         me = nextRows.find((x) => safe(x.number) === trackingRef.current.number);
       }

       if (me && !trackingRef.current.finished) {
         const curLaps = parseInt(me.laps ?? -1, 10);
         const startLaps = parseInt(trackingRef.current.lapsStart ?? -1, 10);
         const lapsChanged = curLaps > startLaps;
         
         const curLast = safe(me.lastLap);
         const startLast = safe(trackingRef.current.lastLapStart);
         const lastLapChanged = curLast !== startLast && curLast !== "" && !/lap/i.test(curLast);
         
         if (lapsChanged || lastLapChanged) {
           finishLapCard(me.lastLap, me.laps);
         }
       } else if (!me) {
         endLapCard();
       }
    }
    
    /*
    const opened = [];
    for (let i = 0; i < nextRows.length; i++) {
      const r = nextRows[i];
      const id = idFor(r);
      const prevPos = lastPositions.current.get(id);
      const curNum = Number.parseInt(safe(r.position), 10);
      const curPos = Number.isFinite(curNum) ? curNum : 9999;
      const prevVal = Number.isFinite(prevPos) ? prevPos : 9999;
      lastPositions.current.set(id, curPos);
      const prevLap = lastLaps.current.get(id);
      if (prevLap != null && (r.laps ?? -1) > prevLap) opened.push({ id, r });
      lastLaps.current.set(id, r.laps ?? prevLap ?? null);
    }
    if (opened.length) {
      if (!trackingRef.current) {
        const pick = opened[Math.floor(Math.random() * opened.length)];
        if (Math.random() < 0.6) startLapCard(pick.r);
      } else {
        const me = nextRows.find((x) => idFor(x) === trackingRef.current.id);
        if (me && (me.laps ?? -1) > trackingRef.current.lapsStart) endLapCard();
      }
    }
    */
  }

  function startLapCard(r) {
    const next = { id: idFor(r), number: safe(r.number), lapsStart: r.laps ?? 0, lastLapStart: r.lastLap, t0: Date.now() };
    const best = parseTime(r.bestLap);
    
    trackingRef.current = { ...next, bestLapMs: best != null ? best * 1000 : null };
    setTracking(trackingRef.current);
    setLapBadge(safe(r.number));
    setLapWho(safe(surname(r.name)));
    setLapTimerText("0:00.0");
    setLapDelta(null);
    setLapFinishAnim(false);
    setLapCardVisible(true);
    
    if (lapTickRef.current) clearInterval(lapTickRef.current);
    lapTickRef.current = setInterval(() => {
      setLapTimerText((prev) => {
        const now = Date.now();
        const ms = now - (trackingRef.current?.t0 ?? now);
        
        // Calculate delta only at finish
        setLapDelta(null);

        // Safety timeout: if time exceeds best lap by > 2 seconds, or absolute max 3 mins
        const bestMs = trackingRef.current?.bestLapMs;
        const limitMs = bestMs ? (bestMs + 2000) : 180000;
        
        if (ms > limitMs) {
          endLapCard();
        }
        return formatTimer(ms);
      });
    }, 100);
  }

  function finishLapCard(finalTime, newLaps) {
    if (trackingRef.current) trackingRef.current.finished = true;
    if (lapTickRef.current) clearInterval(lapTickRef.current);
    lapTickRef.current = null;
    
    let currentDelta = null;
    const finalTimeStr = safe(finalTime);
    
    // Only process if we have a valid time string (not "IN PIT" or empty)
    if (finalTimeStr && !/pit/i.test(finalTimeStr)) {
      setLapTimerText(finalTimeStr);
      // Calculate final delta
      if (trackingRef.current?.bestLapMs) {
        const finalMs = parseTime(finalTimeStr) * 1000;
        if (finalMs) {
          const d = finalMs - trackingRef.current.bestLapMs;
          setLapDelta(d);
          currentDelta = d;
        }
      }
    } else {
        // Invalid time or PIT -> close immediately
        endLapCard();
        return;
    }
    
    setLapFinishAnim(true);
    if (trackingRef.current) {
      trackingRef.current.lapsStart = newLaps ?? ((trackingRef.current.lapsStart ?? 0) + 1);
    }
    setTimeout(() => {
      endLapCard();
    }, 3000);
  }
  function endLapCard() {
    if (!trackingRef.current) return;
    if (lapTickRef.current) clearInterval(lapTickRef.current);
    lapTickRef.current = null;
    setLapCardVisible(false);
    setTimeout(() => {
      trackingRef.current = null;
      setTracking(null);
      setLapFinishAnim(false);
    }, 220);
  }

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
  const mountedLap = useMount(lapCardVisible && showOverlay, { from: 0, enter: 1, exit: 0 });

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
          <div className="rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm" style={{ background: "var(--panel)" }}>
            <div
              className="flex items-center gap-3 px-4 py-2.5 font-bold tracking-tight border-b border-white/10"
              style={{ background: "var(--header-bg)" }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
              <div>{title}</div>
              <div className="ml-auto opacity-90 font-bold flex gap-2">
                <span className="w-[60px] text-right inline-block">{MODE_LABELS[MODES[modeIdx]]}</span>
              </div>
            </div>
            <table className="w-full table-fixed border-collapse">
              <tbody>
                {rows.map((r, i) => {
                  const id = idFor(r);
                  const prevPos = lastPositions.current.get(id);
                  const curNum = Number.parseInt(safe(r.position), 10);
                  const curPos = Number.isFinite(curNum) ? curNum : 9999;
                  const prevVal = Number.isFinite(prevPos) ? prevPos : null;
                  const sname = surname(r.name);
                  const nlen = sname.replace(/\s+/g, "").length;
                  const nameClass = nlen > 18 ? "text-[14px] italic font-extrabold uppercase" : nlen > 14 ? "text-[15px] italic font-extrabold uppercase" : "text-[17px] italic font-extrabold uppercase";
                  const tdBase = "px-2.5 py-1.5 text-[14px] leading-tight border-b border-white/10 whitespace-nowrap overflow-hidden text-ellipsis relative";
                  const posBase = "px-2.5 py-1.5 text-[14px] leading-tight border-b border-white/10 text-right font-bold relative";
                  const arrow = (lastPositions.current.size > 0 && prevVal != null)
                    ? curPos < prevVal
                      ? <span className="text-[12px] ml-1" style={{ color: "var(--up)" }}>▲</span>
                      : curPos > prevVal
                        ? <span className="text-[12px] ml-1" style={{ color: "var(--down)" }}>▼</span>
                        : null
                    : null;
                  const fiTime = fi >= 0 ? parseTime(rows[fi]?.bestLap ?? rows[fi]?.lastLap) : null;
                  const fiId = fi >= 0 ? `${safe(rows[fi]?.number)}|${safe(surname(rows[fi]?.name))}` : null;
                  const shouldAnim = fi >= 0 && (fiId !== lastFastestKey || (fiTime != null && (lastFastestTime == null || fiTime < lastFastestTime)));
                  const isFastest = fi >= 0 && i === fi;
                  const trClass = isFastest && showFastest ? "fastest flash" : "";
                  
                  let metricVal = "";
                  const mode = MODES[modeIdx];
                  if (mode === "GAP") metricVal = r.gap || "-";
                  else if (mode === "DIFF") metricVal = r.diff || "-";
                  else if (mode === "TOTAL") metricVal = r.totalTime || "-";
                  else if (mode === "BEST") metricVal = r.bestLap || "-";
                  else if (mode === "LAST") metricVal = r.lastLap || "-";
                  
                  return (
                    <tr key={id} className={trClass}>
                      <td className={`${posBase} w-[78px]`}>
                        {r.hasFinishFlag && <span className="flag-icon flag-left show-left">🏁</span>}
                        {!r.hasFinishFlag && isFastest && showFastest && <span className="flag-icon flag-left show-left"><Timer color="#ffffff" style={{ width: "1.2em", height: "1.2em" }} /></span>}
                        <span className="inline-block">{safe(r.position)}</span>{arrow}
                      </td>
                      <td className={`${tdBase} w-[56px] text-center font-bold tabular-nums`}>
                        <span className="inline-block text-black rounded-md font-extrabold px-2 py-0.5 min-w-[36px]" style={{ background: colorFor(safe(r.number), safe(r.name)) }}>
                          {safe(r.number)}
                        </span>
                      </td>
                      <td className={`${tdBase} ${nameClass}`}>
                        {safe(sname)}
                      </td>
                      <td className={`${tdBase} w-[88px] text-right font-bold`}>
                        <span className="metric-swap" key={`${mode}:${id}`}>
                          {safe(metricVal)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="absolute top-0 left-full ml-3 flex gap-3 items-start">
            {lapsLabel && (
              <CurrentLap finishFlag={finishFlag} lapsLabel={lapsLabel} lapsChangeAnim={lapsChangeAnim} />
            )}
            <Overtakes badge={bestOver?.badge} who={bestOver?.who} gain={bestOver?.gain || 0} />
            <Announcements items={annItems} />
          </div>
        </div>
        </animate.div>
      ))}

      {mountedLap((a, isMounted) => (
        isMounted && (
          <animate.div
            style={{ opacity: a, translateY: a.to([0, 1], ["8px", "0px"]), background: "var(--panel)", color: "var(--text)" }}
            className="lap-card fixed right-[calc(var(--overlay-m)*1px)] bottom-[calc(var(--overlay-m)*1px)] w-[260px] rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.35)] border border-white/10"
          >
            {lapFinishAnim && (
              <div className={`absolute top-0 bottom-0 left-0 animate-progress z-0 pointer-events-none ${lapDelta > 0 ? "bg-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.6)]" : "bg-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.6)]"}`} />
            )}
            <div className="relative z-10 px-3 py-2 flex items-center gap-3 border-b border-white/10" style={{ background: "var(--header-bg)" }}>
               <div className="text-black rounded-md font-extrabold px-1.5 py-0.5 min-w-[32px] text-center text-[14px] shadow-lg" style={{ background: colorFor(lapBadge, lapWho) }}>
                  {lapBadge}
               </div>
               <div className="font-extrabold uppercase italic text-[16px] leading-none truncate flex-1 text-left drop-shadow-md">
                  {lapWho}
               </div>
            </div>
            <div className="relative z-10 p-3">
              <div className="flex flex-col items-center justify-center min-h-[50px]">
                <div className={`text-[56px] font-black tabular-nums leading-none tracking-tighter text-center transition-all duration-300 italic ${lapFinishAnim ? (lapDelta > 0 ? "scale-110 text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "scale-110 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]") : ""}`}>
                  {lapTimerText}
                </div>
              </div>
              <div className="flex items-center justify-center pt-2 mt-2 border-t border-white/10 min-h-[32px]">
                {lapDelta !== null && Math.abs(lapDelta) < 10000 ? (
                   <div className={`w-full text-center px-1.5 py-0.5 rounded-md text-[20px] font-bold tabular-nums leading-none tracking-tight shadow-lg italic ${lapDelta < 0 ? `bg-[#4ade80] ${lapFinishAnim ? "text-white" : "text-black"} shadow-green-900/40` : "bg-[#ef4444] text-white shadow-red-900/40"}`}>
                     {lapDelta > 0 ? "+" : ""}{(lapDelta / 1000).toFixed(2)}
                   </div>
                ) : (
                   <div className="text-white/20 text-[10px] font-bold italic uppercase tracking-widest">NO DELTA</div>
                )}
              </div>
            </div>
          </animate.div>
        )
      ))}
    </div>
  );
}
