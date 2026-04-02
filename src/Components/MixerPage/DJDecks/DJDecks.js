import React, { useState, useRef, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom';
import "./DJDecks.css";

function Knob({ label, value, onChange, size = 36, min = 0, max = 1 }) {
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
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <svg
                className="knob-svg"
                width={size}
                height={size}
                onMouseDown={onMouseDown}
            >
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3a3a3a" strokeWidth={2} />
                <line
                    x1={cx} y1={cy} x2={x2} y2={y2}
                    stroke="lightgray" strokeWidth={2} strokeLinecap="round"
                />
                <circle cx={cx} cy={cy} r={3} fill="var(--bg-raised)" stroke="#3a3a3a" strokeWidth={1} />
            </svg>
            {label && <span className="eq-knob-label">{label}</span>}
        </div>
    );
}

function VertFader({ value, onChange, height = 80 }) {
    const trackRef = useRef(null);

    const onMouseDown = (e) => {
        e.preventDefault();
        const rect = trackRef.current.getBoundingClientRect();
        const move = (me) => {
            const pct = 1 - Math.max(0, Math.min(1, (me.clientY - rect.top) / rect.height));
            onChange(pct);
        };
        const up = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", up);
        };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
    };

    const topPct = (1 - value) * 100;

    return (
        <div
            ref={trackRef}
            className="fader-track"
            style={{ height }}
            onMouseDown={onMouseDown}
        >
            <div className="fader-thumb" style={{ top: `${topPct}%` }} />
        </div>
    );
}

function Crossfader({ value, onChange }) {
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
                <div className="cf-thumb" style={{ left: `${value * 100}%` }} />
            </div>
        </>
    );
}

function WaveformInner({ track, isPlaying, wsRef }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!track?.audioUrl || !containerRef.current) return;
        if (wsRef.current) { wsRef.current.destroy(); wsRef.current = null; }

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: "#f5a623",
            progressColor: "#F08000",
            cursorColor: "rgba(255,255,255,0.8)",
            cursorWidth: 3,
            height: 70,
            barHeight: 0.8,
            barWidth: 2,
            barGap: 2,
            barRadius: 2,
            backend: "WebAudio",
            normalize: true,
            responsive: true,
            url: track.audioUrl,
        });

        wsRef.current = ws;

        return () => { ws.destroy(); wsRef.current = null; };
    }, [track?.audioUrl]);

    useEffect(() => {
        if (!wsRef.current) return;
        if (isPlaying) wsRef.current.play();
        else wsRef.current.pause();
    }, [isPlaying]);

    return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

function Deck({ side, track, isPlaying, onPlay, onBpmChange, wsRef }) {
    const [dragOver, setDragOver] = useState(false);
    const [inActive, setInActive] = useState(false);
    const [outActive, setOutActive] = useState(false);
    const [syncActive, setSyncActive] = useState(false);
    const [cues, setCues] = useState([null, null, null]);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);

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

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    const timeDisplay = `${track ? formatTime(elapsed) : "--:--"} / ${track?.length ?? "--:--"}`;

    const setCuePoint = (idx) => {
        if (!wsRef.current || !track) return;
        const t = wsRef.current.getCurrentTime();
        setCues((prev) => { const c = [...prev]; c[idx] = t; return c; });
    };

    const jumpToCue = (idx) => {
        if (cues[idx] == null || !wsRef.current) return;
        wsRef.current.seekTo(cues[idx] / wsRef.current.getDuration());
    };

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
                        e.currentTarget.dispatchEvent(
                            new CustomEvent("trackdrop", { detail: data, bubbles: true })
                        );
                    }
                } catch (_) {}
            }}
        >

            {/* IN / OUT / SYNC + timer */}
            <div className="deck-controls-bar">
                <div className="deck-btns">
                    <button className={`deck-btn${inActive ? " active" : ""}`} onClick={() => setInActive(!inActive)}>IN</button>
                    <button className={`deck-btn${outActive ? " active" : ""}`} onClick={() => setOutActive(!outActive)}>OUT</button>
                    <button className={`deck-btn${syncActive ? " active" : ""}`} onClick={() => setSyncActive(!syncActive)}>SYNC</button>
                </div>
            </div>

            {/* Track info */}
            <div className="track-info-row">
                <div className="track-artwork-box">
                    {track?.artwork ? <img src={track.artwork} alt="" /> : "♪"}
                </div>
                <div className="track-meta">
                    <div className="track-title" style={!track ? { color: "var(--text-lo)" } : {}}>
                        {track?.title ?? "—"}
                    </div>
                    {track && <div className="track-artist">{track.artist}</div>}
                </div>
                {track && <span className="track-timer">{timeDisplay}</span>}

            </div>

            <div className="cue-row">
                {[0, 1, 2].map((i) => (
                    <button
                        key={i}
                        className={`cue-btn${cues[i] != null ? " set" : ""}`}
                        disabled={!track}
                        onClick={() =>  setCuePoint(i)}
                        title={cues[i] != null ? `Jump to ${formatTime(cues[i])}` : "Set cue point"}
                    >
                        {cues[i] != null ? `CUE ${formatTime(cues[i])}` : "CUE #"+i}
                    </button>
                ))}
            </div>

            <div className="bpm-play-row">
                <div className="bpm-display">
                    <span className="bpm-label">BPM</span>
                    <span className="bpm-number">{bpm ?? "—"}</span>
                    <div className="bpm-adjust">
                        <button
                            className="bpm-adj-btn"
                            disabled={!track}
                            onClick={() => onBpmChange && onBpmChange(1)}
                            title="+1 BPM"
                        >+</button>
                        <button
                            className="bpm-adj-btn"
                            disabled={!track}
                            onClick={() => onBpmChange && onBpmChange(-1)}
                            title="-1 BPM"
                        >−</button>
                    </div>
                </div>

                <button
                    className={`play-btn${isPlaying ? " playing" : ""}`}
                    disabled={!track}
                    onClick={onPlay}
                    style={{paddingBottom: 5}}
                    title={isPlaying ? "Pause" : "Play"}
                >
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
    const [crossfader, setCrossfader] = useState(0.5);
    const [eqA, setEqA] = useState({ high: 0.75, mid: 0.75, low: 0.75, cfx: 0.5 });
    const [eqB, setEqB] = useState({ high: 0.75, mid: 0.75, low: 0.75, cfx: 0.5 });
    const [faderA, setFaderA] = useState(0.8);
    const [faderB, setFaderB] = useState(0.8);
    const wsARef = useRef(null);
    const wsBRef = useRef(null);

    const onDeckRootDrop = useCallback((side) => (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data && typeof data === "object") {
                if (side === "left")  { setDeckA({ ...data }); setPlayingA(false); wsARef.current = null; }
                if (side === "right") { setDeckB({ ...data }); setPlayingB(false); wsBRef.current = null; }
            }
        } catch (_) {}
    }, []);

    const adjustBpm = (side, delta) => {
        if (side === "left"  && deckA?.bpm) setDeckA(d => ({ ...d, bpm: (parseInt(d.bpm) || 0) + delta }));
        if (side === "right" && deckB?.bpm) setDeckB(d => ({ ...d, bpm: (parseInt(d.bpm) || 0) + delta }));
    };

    return (
        <div className="dj-root">

            <div className="dj-top-row">
                <div
                    className="waveform-panel left"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDeckRootDrop("left")}
                >
                    {deckA
                        ? <WaveformInner track={deckA} isPlaying={playingA} wsRef={wsARef} />
                        : <div className="waveform-empty">— deck A —</div>
                    }
                </div>

                <div className="crossfader-col">
                    <Crossfader value={crossfader} onChange={setCrossfader} />
                </div>

                <div
                    className="waveform-panel right"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDeckRootDrop("right")}
                >
                    {deckB
                        ? <WaveformInner track={deckB} isPlaying={playingB} wsRef={wsBRef} />
                        : <div className="waveform-empty">— deck B —</div>
                    }
                </div>
            </div>

            <div className="dj-main-row">

                <div onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("left")}>
                    <Deck
                        side="left"
                        track={deckA}
                        isPlaying={playingA}
                        onPlay={() => setPlayingA(p => !p)}
                        onBpmChange={(d) => adjustBpm("left", d)}
                        wsRef={wsARef}
                    />
                </div>

                <div className="mixer-col">
                    <div className="eq-section">
                        <div className="eq-knob-group"><Knob label="HIGH" value={eqA.high} onChange={(v) => setEqA(e => ({ ...e, high: v }))} size={32} /></div>
                        <div className="eq-knob-group"><Knob label="HIGH" value={eqB.high} onChange={(v) => setEqB(e => ({ ...e, high: v }))} size={32} /></div>
                        <div className="eq-knob-group"><Knob label="MID"  value={eqA.mid}  onChange={(v) => setEqA(e => ({ ...e, mid:  v }))} size={32} /></div>
                        <div className="eq-knob-group"><Knob label="MID"  value={eqB.mid}  onChange={(v) => setEqB(e => ({ ...e, mid:  v }))} size={32} /></div>
                        <div className="eq-knob-group"><Knob label="LOW"  value={eqA.low}  onChange={(v) => setEqA(e => ({ ...e, low:  v }))} size={32} /></div>
                        <div className="eq-knob-group"><Knob label="LOW"  value={eqB.low}  onChange={(v) => setEqB(e => ({ ...e, low:  v }))} size={32} /></div>
                        <div className="eq-knob-group"><Knob label="CFX"  value={eqA.cfx}  onChange={(v) => setEqA(e => ({ ...e, cfx:  v }))} size={32} /></div>
                        <div className="eq-knob-group"><Knob label="CFX"  value={eqB.cfx}  onChange={(v) => setEqB(e => ({ ...e, cfx:  v }))} size={32} /></div>
                    </div>

                    <div className="faders-row">
                        <div className="fader-group"><VertFader value={faderA} onChange={setFaderA} height={60} /></div>
                        <div className="fader-group"><VertFader value={faderB} onChange={setFaderB} height={60} /></div>
                    </div>
                </div>

                <div onDragOver={(e) => e.preventDefault()} onDrop={onDeckRootDrop("right")}>
                    <Deck
                        side="right"
                        track={deckB}
                        isPlaying={playingB}
                        onPlay={() => setPlayingB(p => !p)}
                        onBpmChange={(d) => adjustBpm("right", d)}
                        wsRef={wsBRef}
                    />
                </div>

            </div>
        </div>
    );
}