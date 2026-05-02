import React, {useCallback, useEffect, useRef, useState} from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import "./DJDecks.css";


let sharedAC = null;

function getAC() {
    if (!sharedAC || sharedAC.state === "closed") {
        sharedAC = new (window.AudioContext || window.webkitAudioContext)();
    }
    return sharedAC;
}

const mediaSourceCache = new WeakMap();

export function buildEQChain(ws) {
    const mediaEl = ws.getMediaElement?.();
    if (!mediaEl) return null;

    const ac = getAC();
    if (ac.state === 'suspended') ac.resume();

    let source = mediaSourceCache.get(mediaEl);
    if (!source) {
        try {
            source = ac.createMediaElementSource(mediaEl);
            mediaSourceCache.set(mediaEl, source);
        } catch (e) {
            console.warn('buildEQChain: could not create source', e);
            return null;
        }
    }

    try { source.disconnect(); } catch (_) {}

    // EQ bands
    const high = ac.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 10000;
    high.gain.value = 0;

    const mid = ac.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 0.7;
    mid.gain.value = 0;

    const low = ac.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 100;
    low.gain.value = 0;

    const cfx = ac.createBiquadFilter();
    cfx.type = 'allpass';
    cfx.frequency.value = 20000;

    const masterGain = ac.createGain();
    masterGain.gain.value = 1;

    source.connect(high);
    high.connect(mid);
    mid.connect(low);
    low.connect(cfx);
    cfx.connect(masterGain);
    masterGain.connect(ac.destination);

    //db for tracks
    function knobToEQ(v) {
        if (v < 0.5) return -60 + (v / 0.5) * 60;
        else return (v - 0.5) * 24;
    }

    function applyCfx(v) {
        const center = 0.5;
        const deadzone = 0.05;
        if (Math.abs(v - center) < deadzone) {
            cfx.type = 'allpass';
            return;
        }
        if (v < center) {
            cfx.type = 'lowpass';
            const t = (center - v) / center;
            cfx.frequency.setTargetAtTime(20000 * Math.pow(1 - t, 3) + 200, ac.currentTime, 0.02);
        } else {
            cfx.type = 'highpass';
            const t = (v - center) / center;
            cfx.frequency.setTargetAtTime(20 + Math.pow(t, 3) * 4000, ac.currentTime, 0.02);
        }
    }

    return {
        setHigh:    (v) => high.gain.setTargetAtTime(knobToEQ(v), ac.currentTime, 0.01),
        setMid:     (v) => mid.gain.setTargetAtTime(knobToEQ(v), ac.currentTime, 0.01),
        setLow:     (v) => low.gain.setTargetAtTime(knobToEQ(v), ac.currentTime, 0.01),
        setCfx:     (v) => applyCfx(v),
        setVolume:  (v) => masterGain.gain.setTargetAtTime(v, ac.currentTime, 0.02),
        disconnect: () => {
            try {
                source.disconnect();
                high.disconnect();
                mid.disconnect();
                low.disconnect();
                cfx.disconnect();
                source.connect(ac.destination);
            } catch (_) {}
        },
    };
}


function Knob({label, value, onChange, size = 36, min = 0, max = 1}) {
    const startY = useRef(0);
    const startVal = useRef(value);

    const angle = -135 + ((value - min) / (max - min)) * 270;

    const onMouseDown = (e) => {
        e.preventDefault();
        startY.current = e.clientY;
        startVal.current = value;
        const onMove = (me) => {
            const delta = (startY.current - me.clientY) / 120;
            const next = Math.max(min, Math.min(max, startVal.current + delta * (max - min)));
            onChange(next);
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    const r = size / 2 - 4;
    const cx = size / 2;
    const cy = size / 2;
    const rad = (angle * Math.PI) / 180;
    const x2 = cx + r * 0.65 * Math.sin(rad);
    const y2 = cy - r * 0.65 * Math.cos(rad);

    return (
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 3}}>
            <svg className="knob-svg" width={size} height={size} onMouseDown={onMouseDown}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3a3a3a" strokeWidth={2}/>
                <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="lightgray" strokeWidth={2} strokeLinecap="round"/>
                <circle cx={cx} cy={cy} r={3} fill="var(--bg-raised)" stroke="#3a3a3a" strokeWidth={1}/>
            </svg>
            {label && <span className="eq-knob-label">{label}</span>}
        </div>
    );
}

function Crossfader({value, onChange}) {
    const trackRef = useRef(null);

    const onMouseDown = (e) => {
        e.preventDefault();
        const rect = trackRef.current.getBoundingClientRect();
        const move = (me) => {
            const pct = Math.max(0, Math.min(1, (me.clientX - rect.left) / rect.width));
            onChange(pct);
        };
        const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    };

    return (
        <>
            <span className="cf-label">CROSSFADER</span>
            <div ref={trackRef} className="cf-track" onMouseDown={onMouseDown}>
                <div className="cf-thumb" style={{left: `${value * 100}%`}}/>
            </div>
        </>
    );
}

function WaveformInner({track, isPlaying, wsRef, regionsRef, onReady}) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!track?.audioUrl || !containerRef.current) return;
        if (wsRef.current) {
            wsRef.current.destroy();
            wsRef.current = null;
        }

        const ac = getAC();
        const regions = RegionsPlugin.create();

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: "#f5a623",
            progressColor: "#F08000",
            cursorColor: "rgba(255,255,255,0.8)",
            cursorWidth: 3,
            height: 70,
            barHeight: 1,
            minPxPerSec: 100,
            normalize: true,
            audioContext: ac,
            url: track.audioUrl,
            plugins: [regions],
        });

        if (regionsRef) regionsRef.current = regions;

        ws.on("ready", () => {
            ws.setPlaybackRate(1);
            onReady?.(ws);
        });

        wsRef.current = ws;

        return () => {
            ws.destroy();
            wsRef.current = null;
            if (regionsRef) regionsRef.current = null;
        };
    }, [track?.audioUrl]);

    useEffect(() => {
        if (!wsRef.current) return;
        const ac = getAC();
        if (ac.state === "suspended") ac.resume();
        if (isPlaying) wsRef.current.play();
        else wsRef.current.pause();
    }, [isPlaying]);

    return <div ref={containerRef} style={{width: "100%", height: "100%"}}/>;
}

export function Deck({side, track, isPlaying, onPlay, onBpmChange, wsRef, regionsRef}) {
    const [dragOver, setDragOver] = useState(false);
    const [syncActive, setSyncActive] = useState(false);
    const [loop, setLoop] = useState({active: false, start: null, end: null});
    const [cues, setCues] = useState([null, null, null]);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);
    const activeRegionRef = useRef(null);
    const regionOutUnsubRef = useRef(null);

    //Elapsed timer
    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(() => {
                if (wsRef.current) setElapsed(wsRef.current.getCurrentTime());
            }, 500);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isPlaying]);

    const clearLoopRegion = useCallback(() => {
        if (regionOutUnsubRef.current) {
            regionOutUnsubRef.current();
            regionOutUnsubRef.current = null;
        }
        if (activeRegionRef.current) {
            try { activeRegionRef.current.remove(); } catch (_) {}
            activeRegionRef.current = null;
        }
    }, []);

    const createLoopRegion = useCallback((start, end) => {
        const regions = regionsRef?.current;
        const ws = wsRef.current;
        if (!regions || !ws) return;

        clearLoopRegion();

        const region = regions.addRegion({
            start,
            end,
            color: "rgba(245, 166, 35, 0.25)",
            drag: true,
            resize: true,
        });
        activeRegionRef.current = region;

        regionOutUnsubRef.current = ws.on("timeupdate", (currentTime) => {
            if (currentTime >= region.end) {
                ws.setTime(region.start);
            }
        });

        ws.setTime(start);
    }, [regionsRef, wsRef, clearLoopRegion]);

    useEffect(() => {
        return () => { clearLoopRegion(); };
    }, [track?.audioUrl, clearLoopRegion]);

    //  Loop button handlers
    const handleIn = useCallback(() => {
        if (!wsRef.current || !track) return;
        const t = wsRef.current.getCurrentTime();
        clearLoopRegion();
        setLoop({active: false, start: t, end: null});
    }, [wsRef, track, clearLoopRegion]);

    const handleOut = useCallback(() => {
        if (!wsRef.current || !track) return;
        if (loop.active) {
            clearLoopRegion();
            setLoop({active: false, start: null, end: null});
            return;
        }
        const t = wsRef.current.getCurrentTime();
        if (loop.start == null) return;
        const start = Math.min(loop.start, t);
        const end = Math.max(loop.start, t);
        if (end - start < 0.05) return;
        setLoop({active: true, start, end});
        createLoopRegion(start, end);
    }, [wsRef, track, loop, clearLoopRegion, createLoopRegion]);


    const handleCue = (idx) => {
        if (!wsRef.current || !track) return;
        if (cues[idx] === null) {
            const t = wsRef.current.getCurrentTime();
            setCues(prev => { const c = [...prev]; c[idx] = t; return c; });
        } else {
            wsRef.current.setTime(cues[idx]);
            if (!isPlaying) onPlay();
        }
    };

    const clearCue = (e, idx) => {
        e.preventDefault();
        setCues(prev => { const c = [...prev]; c[idx] = null; return c; });
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    const timeDisplay = `${track ? formatTime(elapsed) : "--:--"} / ${track?.length ?? "--:--"}`;
    const bpm = track?.bpm ?? null;

    return (
        <div
            className={`deck ${side}${dragOver ? " drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                try {
                    const data = JSON.parse(e.dataTransfer.getData("application/json"));
                    if (data && typeof data === "object") {
                        e.currentTarget.dispatchEvent(new CustomEvent("trackdrop", {detail: data, bubbles: true}));
                    }
                } catch (_) {}
            }}
        >
            <div className="deck-controls-bar">
                <div className="deck-btns">
                    <button className={`deck-btn${loop.start != null ? " active" : ""}`} onClick={handleIn} title="Set loop start point">IN</button>
                    <button className={`deck-btn${loop.active ? " active" : ""}`} onClick={handleOut} title={loop.active ? "Cancel loop" : "Set loop end point"}>OUT</button>
                </div>
            </div>

            {/* Track info */}
            <div className="track-info-row">
                <div className="track-artwork-box">
                    {track?.artwork ? <img src={track.artwork} alt=""/> : "♪"}
                </div>
                <div className="track-meta">
                    <div className="track-title" style={!track ? {color: "var(--text-lo)"} : {}}>{track?.title ?? "—"}</div>
                    {track && <div className="track-artist">{track.artist}</div>}
                </div>
                {track && <span className="track-timer">{timeDisplay}</span>}
            </div>

            {/* Cue points */}
            <div className="cue-row">
                {[0, 1, 2].map((i) => (
                    <button
                        key={i}
                        className={`cue-btn${cues[i] !== null ? ' set' : ''}`}
                        disabled={!track}
                        onClick={() => handleCue(i)}
                        onContextMenu={(e) => clearCue(e, i)}
                        title={cues[i] !== null ? `Jump to ${formatTime(cues[i])} — right-click to clear` : 'Set cue point'}
                    >
                        {cues[i] !== null ? `CUE ${formatTime(cues[i])}` : `CUE #${i}`}
                    </button>
                ))}
            </div>

            {/* BPM + Play */}
            <div className="bpm-play-row">
                <div className="bpm-display">
                    <span className="bpm-label">BPM</span>
                    <span className="bpm-number">{bpm ?? "—"}</span>
                    <div className="bpm-adjust">
                        <button className="bpm-adj-btn" disabled={!track} onClick={() => onBpmChange && onBpmChange(1)} title="+1 BPM">+</button>
                        <button className="bpm-adj-btn" disabled={!track} onClick={() => onBpmChange && onBpmChange(-1)} title="-1 BPM">−</button>
                    </div>
                </div>
                <button className={`play-btn${isPlaying ? " playing" : ""}`} disabled={!track} onClick={onPlay} style={{paddingBottom: 5}} title={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? "⏸" : "▶"}
                </button>
            </div>
        </div>
    );
}

export default function DJDecks() {

    const [deckA, setDeckA] = useState(null);
    const [deckB, setDeckB] = useState(null);
    const [playingA, setPlayingA] = useState(false);
    const [playingB, setPlayingB] = useState(false);

    const [eqA, setEqA] = useState({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const [eqB, setEqB] = useState({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const eqARef = useRef({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const eqBRef = useRef({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const handleEqAChange = (v) => { setEqA(v); eqARef.current = v; };
    const handleEqBChange = (v) => { setEqB(v); eqBRef.current = v; };

    const [crossfader, setCrossfader] = useState(0.5);
    const crossfaderRef = useRef(0.5);
    const handleCrossfaderChange = (v) => { setCrossfader(v); crossfaderRef.current = v; };

    const wsARef = useRef(null);
    const wsBRef = useRef(null);
    const regionsARef = useRef(null);
    const regionsBRef = useRef(null);

    const eqChainA = useRef(null);
    const eqChainB = useRef(null);

    const handleReadyA = useCallback((ws) => {
        if (eqChainA.current) { eqChainA.current.disconnect(); eqChainA.current = null; }
        const chain = buildEQChain(ws);
        if (chain) {
            eqChainA.current = chain;
            chain.setHigh(eqARef.current.high);
            chain.setMid(eqARef.current.mid);
            chain.setLow(eqARef.current.low);
            chain.setCfx(eqARef.current.cfx);
            chain.setVolume(Math.cos(crossfaderRef.current * (Math.PI / 2)));
        }
    }, []);

    const handleReadyB = useCallback((ws) => {
        if (eqChainB.current) { eqChainB.current.disconnect(); eqChainB.current = null; }
        const chain = buildEQChain(ws);
        if (chain) {
            eqChainB.current = chain;
            chain.setHigh(eqBRef.current.high);
            chain.setMid(eqBRef.current.mid);
            chain.setLow(eqBRef.current.low);
            chain.setCfx(eqBRef.current.cfx);
            chain.setVolume(Math.cos((1 - crossfaderRef.current) * (Math.PI / 2)));
        }
    }, []);

    // --- Apply EQ changes to live chains ---
    useEffect(() => {
        const chain = eqChainA.current;
        if (!chain) return;
        chain.setHigh(eqA.high);
        chain.setMid(eqA.mid);
        chain.setLow(eqA.low);
        chain.setCfx(eqA.cfx);
    }, [eqA]);

    useEffect(() => {
        const chain = eqChainB.current;
        if (!chain) return;
        chain.setHigh(eqB.high);
        chain.setMid(eqB.mid);
        chain.setLow(eqB.low);
        chain.setCfx(eqB.cfx);
    }, [eqB]);

    useEffect(() => {
        const gainA = Math.cos(crossfader * (Math.PI / 2));
        const gainB = Math.cos((1 - crossfader) * (Math.PI / 2));
        if (eqChainA.current) eqChainA.current.setVolume(gainA);
        if (eqChainB.current) eqChainB.current.setVolume(gainB);
    }, [crossfader]);

    const onDeckRootDrop = useCallback((side) => (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data && typeof data === 'object') {
                if (side === 'left') {
                    setDeckA({...data, originalBpm: parseInt(data.bpm) || 0});
                    setPlayingA(false);
                    eqChainA.current = null;
                }
                if (side === 'right') {
                    setDeckB({...data, originalBpm: parseInt(data.bpm) || 0});
                    setPlayingB(false);
                }
            }
        } catch (_) {}
    }, []);

    const adjustBpm = (side, delta) => {
        if (side === 'left' && deckA?.bpm) {
            const newBpm = (parseInt(deckA.bpm) || 0) + delta;
            setDeckA(d => ({...d, bpm: newBpm}));
            if (wsARef.current) {
                wsARef.current.setPlaybackRate(newBpm / (deckA.originalBpm || parseInt(deckA.bpm)));
            }
        }
        if (side === 'right' && deckB?.bpm) {
            const newBpm = (parseInt(deckB.bpm) || 0) + delta;
            setDeckB(d => ({...d, bpm: newBpm}));
            if (wsBRef.current) {
                wsBRef.current.setPlaybackRate(newBpm / (deckB.originalBpm || parseInt(deckB.bpm)));
            }
        }
    };

    return (
        <div className="dj-root">

            {/* Top row: waveforms + crossfader */}
            <div className="dj-top-row">
                <div className="waveform-panel left" onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("left")}>
                    {deckA
                        ? <WaveformInner track={deckA} isPlaying={playingA} wsRef={wsARef} regionsRef={regionsARef} onReady={handleReadyA}/>
                        : <div className="waveform-empty">— deck A —</div>
                    }
                </div>

                <div className="crossfader-col">
                    <Crossfader value={crossfader} onChange={handleCrossfaderChange}/>
                </div>

                <div className="waveform-panel right" onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("right")}>
                    {deckB
                        ? <WaveformInner track={deckB} isPlaying={playingB} wsRef={wsBRef} regionsRef={regionsBRef} onReady={handleReadyB}/>
                        : <div className="waveform-empty">— deck B —</div>
                    }
                </div>
            </div>

            {/* Main row: deck A | mixer (EQ knobs) | deck B */}
            <div className="dj-main-row">

                <div onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("left")}>
                    <Deck side="left" track={deckA} isPlaying={playingA} onPlay={() => setPlayingA(p => !p)} onBpmChange={(d) => adjustBpm("left", d)} wsRef={wsARef} regionsRef={regionsARef}/>
                </div>

                {/* Mixer column: EQ knobs for both decks, left column = deck A, right column = deck B */}
                <div className="mixer-col">
                    <div className="eq-section">
                        <div className="eq-knob-group"><Knob label="HIGH" value={eqA.high} onChange={(v) => handleEqAChange({...eqA, high: v})} size={32}/></div>
                        <div className="eq-knob-group"><Knob label="HIGH" value={eqB.high} onChange={(v) => handleEqBChange({...eqB, high: v})} size={32}/></div>
                        <div className="eq-knob-group"><Knob label="MID"  value={eqA.mid}  onChange={(v) => handleEqAChange({...eqA, mid: v})}  size={32}/></div>
                        <div className="eq-knob-group"><Knob label="MID"  value={eqB.mid}  onChange={(v) => handleEqBChange({...eqB, mid: v})}  size={32}/></div>
                        <div className="eq-knob-group"><Knob label="LOW"  value={eqA.low}  onChange={(v) => handleEqAChange({...eqA, low: v})}  size={32}/></div>
                        <div className="eq-knob-group"><Knob label="LOW"  value={eqB.low}  onChange={(v) => handleEqBChange({...eqB, low: v})}  size={32}/></div>
                        <div className="eq-knob-group"><Knob label="CFX"  value={eqA.cfx}  onChange={(v) => handleEqAChange({...eqA, cfx: v})}  size={32}/></div>
                        <div className="eq-knob-group"><Knob label="CFX"  value={eqB.cfx}  onChange={(v) => handleEqBChange({...eqB, cfx: v})}  size={32}/></div>
                    </div>
                </div>

                <div onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("right")}>
                    <Deck side="right" track={deckB} isPlaying={playingB} onPlay={() => setPlayingB(p => !p)} onBpmChange={(d) => adjustBpm("right", d)} wsRef={wsBRef} regionsRef={regionsBRef}/>
                </div>

            </div>
        </div>
    );
}