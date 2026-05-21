import React, { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import { useDJDecks } from "./UseDJDecks";
import "./DJDecks.css";


let sharedAC = null;

export function getAC() {
    if (!sharedAC || sharedAC.state === "closed") {
        sharedAC = new (window.AudioContext || window.webkitAudioContext)();
    }
    return sharedAC;
}

// EQ Chain

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

    function knobToEQ(v) {
        if (v < 0.5) return -60 + (v / 0.5) * 60;
        else return (v - 0.5) * 24;
    }

    function applyCfx(v) {
        const center = 0.5;
        const deadzone = 0.05;
        if (Math.abs(v - center) < deadzone) { cfx.type = 'allpass'; return; }
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

    const updateFromClientY = useCallback((clientY) => {
        const delta = (startY.current - clientY) / 120;
        const next = Math.max(min, Math.min(max, startVal.current + delta * (max - min)));
        onChange(next);
    }, [max, min, onChange]);

    const startDrag = (clientY) => {
        startY.current = clientY;
        startVal.current = value;
    };

    const onPointerDown = (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        startDrag(e.clientY);
    };

    const onPointerMove = (e) => {
        if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
        e.preventDefault();
        updateFromClientY(e.clientY);
    };

    const onPointerUp = (e) => {
        e.preventDefault();
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    };

    const r = size / 2 - 4;
    const cx = size / 2;
    const cy = size / 2;
    const rad = (angle * Math.PI) / 180;
    const x2 = cx + r * 0.65 * Math.sin(rad);
    const y2 = cy - r * 0.65 * Math.cos(rad);

    return (
        <div
            className="eq-knob-control"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            <svg
                className="knob-svg"
                width={size}
                height={size}
            >
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

    const updateFromClientX = useCallback((clientX) => {
        const rect = trackRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        onChange(pct);
    }, [onChange]);

    const onPointerDown = (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        updateFromClientX(e.clientX);
    };

    const onPointerMove = (e) => {
        if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
        e.preventDefault();
        updateFromClientX(e.clientX);
    };

    const onPointerUp = (e) => {
        e.preventDefault();
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    };

    return (
        <>
            <span className="cf-label">CROSSFADER</span>
            <div
                ref={trackRef}
                className="cf-track"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <div className="cf-thumb" style={{left: `${value * 100}%`}}/>
            </div>
        </>
    );
}


function WaveformInner({track, isPlaying, wsRef, regionsRef}) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!track?.audioUrl || !containerRef.current) return;
        if (wsRef.current) { wsRef.current.destroy(); wsRef.current = null; }

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
        ws.on("ready", () => ws.setPlaybackRate(1));
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
    const [loop, setLoop] = useState({active: false, start: null, end: null});
    const [cues, setCues] = useState([null, null, null]);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);
    const activeRegionRef = useRef(null);
    const regionOutUnsubRef = useRef(null);

    // Elapsed timer
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

    // Loop helpers
    const clearLoopRegion = useCallback(() => {
        if (regionOutUnsubRef.current) { regionOutUnsubRef.current(); regionOutUnsubRef.current = null; }
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
        const region = regions.addRegion({start, end, color: "rgba(245, 166, 35, 0.25)", drag: true, resize: true});
        activeRegionRef.current = region;
        regionOutUnsubRef.current = ws.on("timeupdate", (currentTime) => {
            if (currentTime >= region.end) ws.setTime(region.start);
        });
        ws.setTime(start);
    }, [regionsRef, wsRef, clearLoopRegion]);

    useEffect(() => { return () => { clearLoopRegion(); }; }, [track?.audioUrl, clearLoopRegion]);

    // Loop handlers
    const handleIn = useCallback(() => {
        if (!wsRef.current || !track) return;
        clearLoopRegion();
        setLoop({active: false, start: wsRef.current.getCurrentTime(), end: null});
    }, [wsRef, track, clearLoopRegion]);

    const handleOut = useCallback(() => {
        if (!wsRef.current || !track) return;
        if (loop.active) { clearLoopRegion(); setLoop({active: false, start: null, end: null}); return; }
        const t = wsRef.current.getCurrentTime();
        if (loop.start == null) return;
        const start = Math.min(loop.start, t);
        const end = Math.max(loop.start, t);
        if (end - start < 0.05) return;
        setLoop({active: true, start, end});
        createLoopRegion(start, end);
    }, [wsRef, track, loop, clearLoopRegion, createLoopRegion]);

    // Cue handlers
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

    const formatTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
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
            {/* Loop controls */}
            <div className="deck-controls-bar">
                <div className="deck-btns">
                    <button className={`deck-btn${loop.start != null ? " active" : ""}`} onClick={handleIn} title="Set loop start">IN</button>
                    <button className={`deck-btn${loop.active ? " active" : ""}`} onClick={handleOut} title={loop.active ? "Cancel loop" : "Set loop end"}>OUT</button>
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
                        <button className="bpm-adj-btn" disabled={!track} onClick={() => onBpmChange?.(1)}>+</button>
                        <button className="bpm-adj-btn" disabled={!track} onClick={() => onBpmChange?.(-1)}>−</button>
                    </div>
                </div>
                <button className={`play-btn${isPlaying ? " playing" : ""}`} disabled={!track} onClick={onPlay} style={{paddingBottom: 5}}>
                    {isPlaying ? "⏸" : "▶"}
                </button>
            </div>
        </div>
    );
}


export default function DJDecks() {
    const {
        deckA, deckB,
        playingA, playingB,
        eqA, eqB,
        handleEqAChange, handleEqBChange,
        crossfader, handleCrossfaderChange,
        wsARef, wsBRef, regionsARef, regionsBRef,
        handlePlayA, handlePlayB,
        onDeckRootDrop, adjustBpm,
    } = useDJDecks();

    return (
        <div className="dj-root">

            {/* Top row: waveforms + crossfader */}
            <div className="dj-top-row">
                <div className="waveform-panel left" onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("left")}>
                    {deckA
                        ? <WaveformInner track={deckA} isPlaying={playingA} wsRef={wsARef} regionsRef={regionsARef}/>
                        : <div className="waveform-empty">— deck A —</div>
                    }
                </div>

                <div className="crossfader-col">
                    <Crossfader value={crossfader} onChange={handleCrossfaderChange}/>
                </div>

                <div className="waveform-panel right" onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("right")}>
                    {deckB
                        ? <WaveformInner track={deckB} isPlaying={playingB} wsRef={wsBRef} regionsRef={regionsBRef}/>
                        : <div className="waveform-empty">— deck B —</div>
                    }
                </div>
            </div>

            {/* Main row: deck A | mixer | deck B */}
            <div className="dj-main-row">

                <div onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("left")}>
                    <Deck side="left" track={deckA} isPlaying={playingA} onPlay={handlePlayA} onBpmChange={(d) => adjustBpm("left", d)} wsRef={wsARef} regionsRef={regionsARef}/>
                </div>

                {/* Mixer: left column = deck A, right column = deck B */}
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
                    <Deck side="right" track={deckB} isPlaying={playingB} onPlay={handlePlayB} onBpmChange={(d) => adjustBpm("right", d)} wsRef={wsBRef} regionsRef={regionsBRef}/>
                </div>

            </div>
        </div>
    );
}
