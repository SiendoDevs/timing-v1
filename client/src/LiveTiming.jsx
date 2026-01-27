import React, { useEffect, useMemo, useRef, useState } from "react";
import { animate, useMount } from "react-ui-animate";
import { AnimatePresence, motion } from "framer-motion";
import Announcements from "./Announcements";
import CurrentLap from "./CurrentLap";
import Overtakes from "./Overtakes";
import VotingWidget from "./VotingWidget";
import FlagBanner from "./components/livetiming/FlagBanner";
import LapPopup from "./components/livetiming/LapPopup";
import TimingRow from "./components/livetiming/TimingRow";
import { 
  safe, 
  surname, 
  parseTime, 
  fastestIndex, 
  idFor, 
  formatTimer 
} from "./utils/formatting";

export default function LiveTiming() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const limitParam = params.get("limit");
  const widthParam = params.get("w");
  const widthPxParam = params.get("wp");
  const marginParam = params.get("m");

  const [title, setTitle] = useState("Tiempos en Vivo");
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
  const recentChanges = useRef(new Map());

  // Note: FlagBanner handles its own temporary green banner logic, 
  // but we still pass the raceFlag to it.

  useEffect(() => {
    const limit = limitParam && parseInt(limitParam) > 0 ? parseInt(limitParam) : 10;
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
      const now = Date.now();
      rows.forEach(r => {
        const id = idFor(r);
        const pos = parseInt(safe(r.position), 10);
        if (Number.isFinite(pos)) {
          const prev = lastPositions.current.get(id);
          if (prev != null && prev !== pos) {
            recentChanges.current.set(id, { diff: prev - pos, time: now });
          }
          lastPositions.current.set(id, pos);
        }
      });
      // Cleanup
      for (const [k, v] of recentChanges.current) {
        if (now - v.time > 8000) recentChanges.current.delete(k);
      }
    }
  }, [rows]);

  useEffect(() => {
    document.title = `LIVE | StreamRace ${__APP_VERSION__}`;
  }, []);

  useEffect(() => {
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
    // Only animate if the driver changes (ignore self-improvements to reduce spam)
    const shouldAnim = fi >= 0 && fiId !== lastFastestKey;
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
      eventQueue.current = eventQueue.current.filter(e => e.type !== 'FASTEST');
      if (activeCard?.type === 'FASTEST') {
        setActiveCard(null);
      }
    }
  }, [showFastestLap, activeCard]);

  useEffect(() => {
    if (!showLapFinish) {
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

        if (activeCard) return; 
        if (eventQueue.current.length === 0) return;

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

  // --- Main Data Loop (Optimized) ---
  const lastSessionNameRef = useRef("");

  useEffect(() => {
    let mounted = true;
    let timerId = null;

    async function loop() {
      if (!showOverlay) return;
      try {
        const apiOrigin = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiOrigin}/api/standings`);
        if (!res.ok) throw new Error("Fetch error");
        const data = await res.json();
        
        if (!mounted) return;

        let nextTitle = data.sessionName ? String(data.sessionName) : "Tiempos en Vivo";
        
        // Reset lastPositions if session changes
        if (data.sessionName && data.sessionName !== lastSessionNameRef.current) {
            lastSessionNameRef.current = data.sessionName;
            lastPositions.current.clear();
            recentChanges.current.clear(); // Clear persistent arrows
            eventQueue.current = []; // Clear queue on session change
            prevLapsRef.current = null;
        }

        let nextFlag = !!data.flagFinish;
        let nextRaceFlag = data.raceFlag || "GREEN";
        let list = (data.standings || []);
        const anns = Array.isArray(data.announcements) ? data.announcements : [];
        let nextLaps = data.sessionLaps;

        // Removing localStorage heavy I/O from critical loop
        
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
        // Silent error
      }

      // Recursive timeout for better flow control
      if (mounted) {
          timerId = setTimeout(loop, 1000);
      }
    }

    loop();

    // Mode cycler
    const mt = setInterval(() => {
      setModeIdx(prev => (prev + 1) % MODES.length);
    }, 6000);

    return () => {
      mounted = false;
      if (timerId) clearTimeout(timerId);
      clearInterval(mt);
    };
  }, [showOverlay]); 

  // --- Config Loop (Optimized) ---
  useEffect(() => {
    let mounted = true;
    let timerId = null;

    async function loadConfig() {
      try {
        const apiOrigin = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${apiOrigin}/api/config`);
        if (res.ok) {
            const data = await res.json();
            if (mounted) {
                setShowOverlay(data.overlayEnabled !== false);
                setShowComments(data.commentsEnabled !== false);
                setShowVotingWidget(data.votingWidgetEnabled !== false);
                setShowOvertakes(data.overtakesEnabled !== false);
                setShowCurrentLap(data.currentLapEnabled !== false);
                setShowFastestLap(data.fastestLapEnabled !== false);
                setShowLapFinish(data.lapFinishEnabled !== false);
            }
        }
      } catch {}
      
      if (mounted) {
          timerId = setTimeout(loadConfig, 3000); 
      }
    }
    
    loadConfig();
    return () => {
      mounted = false;
      if (timerId) clearTimeout(timerId);
    };
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
  const globalFastestIndex = fastestIndex(rows);
  const globalFastestRow = globalFastestIndex >= 0 ? rows[globalFastestIndex] : null;

  const limit = limitParam && parseInt(limitParam) > 0 ? parseInt(limitParam) : 10;
  const pageStart = page * limit;
  const visibleRows = rows.slice(pageStart, pageStart + limit);

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
          <div className="rounded-xl overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.5)] bg-[#141414]/90 border border-white/5">
            {/* Header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-white/10 bg-[#0a0a0a]/90 relative z-20">
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
            <FlagBanner raceFlag={raceFlag} />
            
            {/* Rows */}
            <div className="flex flex-col relative overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={page}
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "-100%", opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                  className="flex flex-col w-full"
                >
                  {visibleRows.map((r, i) => {
                    const id = idFor(r);
                    const isFastest = globalFastestRow && idFor(r) === idFor(globalFastestRow);
                    const mode = MODES[modeIdx];
                    
                    return (
                      <TimingRow 
                        key={id}
                        row={r}
                        prevPos={lastPositions.current.get(id)}
                        recentChange={recentChanges.current.get(id)}
                        isFastest={isFastest}
                        mode={mode}
                      />
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Floating Elements (Laps, Overtakes) */}
          <div className="absolute top-0 left-full ml-4 flex gap-3 items-start">
            {lapsLabel && showCurrentLap && (
              <CurrentLap finishFlag={finishFlag} lapsLabel={lapsLabel} lapsChangeAnim={lapsChangeAnim} />
            )}
            {showOvertakes && (
              <Overtakes badge={bestOver?.badge} who={bestOver?.who} gain={bestOver?.gain || 0} />
            )}
          </div>
          
        </div>
        </animate.div>
      ))}

      {/* Announcements Overlay - Bottom Left */}
      {showComments && (
        <div className="fixed bottom-[calc(var(--overlay-m)*1px)] left-[calc(var(--overlay-m)*1px)] z-50">
           <Announcements items={annItems} />
        </div>
      )}

      {/* Voting Widget */}
      {showVotingWidget && (
         <div className="fixed top-[150px] right-[calc(var(--overlay-m)*1px)] z-50">
            <VotingWidget />
         </div>
      )}

      {/* Lap Card Overlay */}
      <LapPopup 
        show={showOverlay} 
        activeCard={activeCard} 
        timerDisplay={cardTimerDisplay} 
      />
    </div>
  );
}
