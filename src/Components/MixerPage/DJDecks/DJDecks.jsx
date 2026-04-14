import React, {useCallback, useEffect, useRef, useState} from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import "./DJDecks.css";

// Shared AudioContext (one per app, created lazily on first user gesture)
let sharedAC = null;

function getAC() {
    if (!sharedAC || sharedAC.state === "closed") {
        sharedAC = new (window.AudioContext || window.webkitAudioContext)();
    }
    return sharedAC;
}

/**
 * WaveSurfer 7 exposes the underlying <audio> element via ws.getMediaElement().
 * We create a MediaElementSourceNode from it, route it through EQ filters,
 * and connect the chain to the AudioContext destination.
 *
 * IMPORTANT: A MediaElementSourceNode can only be created ONCE per element.
 * We track created sources in a WeakMap so we can reuse them across re-renders.
 */
const mediaSourceCache = new WeakMap();

export function buildEQChain(ws) {
    const mediaEl = ws.getMediaElement?.();
    if (!mediaEl) return null;

    const ac = getAC();

    // Resume context if suspended (browser autoplay policy)
    if (ac.state === "suspended") ac.resume();

    // Reuse existing source node or create a new one
    let source = mediaSourceCache.get(mediaEl);
    if (!source) {
        try {
            source = ac.createMediaElementSource(mediaEl);
            mediaSourceCache.set(mediaEl, source);
        } catch (e) {
            console.warn("buildEQChain: could not create source", e);
            return null;
        }
    }

    // Disconnect source from wherever it's currently connected
    try {
        source.disconnect();
    } catch (_) {
    }


    const masterGain = ac.createGain();
    masterGain.gain.value = 0.9;

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 20000;
    filter.Q.value = 0.8;

    const high = ac.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = 10000;
    high.gain.value = 0;

    const mid = ac.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1000;
    mid.Q.value = 0.7;
    mid.gain.value = 0;

    const low = ac.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 100;
    low.gain.value = 0;

    const cfxGain = ac.createGain();
    cfxGain.gain.value = 1;

    source.connect(high);
    high.connect(mid);
    mid.connect(low);
    low.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ac.destination);

    function setCfx(v) {
        if (v < 0.5) {
            filter.type = "lowpass";
            const freq = 20000 * Math.pow(v * 2, 2);
            filter.frequency.setTargetAtTime(freq, ac.currentTime, 0.01);
        } else {
            filter.type = "highpass";
            const freq = 20 + Math.pow((v - 0.5) * 2, 2) * 10000;
            filter.frequency.setTargetAtTime(freq, ac.currentTime, 0.01);
        }
    }

    function knobToEQ(v) {
        if (v < 0.5) {
            return -60 + (v / 0.5) * 60; // -60dB → 0dB
        } else {
            return (v - 0.5) * 12; // 0 → +6dB
        }
    }

    return {
        setHigh: (v) => {
            high.gain.setTargetAtTime(knobToEQ(v), ac.currentTime, 0.01);
        },
        setMid: (v) => {
            mid.gain.setTargetAtTime(knobToEQ(v), ac.currentTime, 0.01);
        },
        setLow: (v) => {
            low.gain.setTargetAtTime(knobToEQ(v), ac.currentTime, 0.01);
        },
        setCfx,
        setVolume:(v) => {
            masterGain.gain.setTargetAtTime(v, ac.currentTime, 0.01);
        },
        disconnect: () => {
            try {
                source.disconnect();
                high.disconnect();
                mid.disconnect();
                low.disconnect();
                cfxGain.disconnect();
                source.connect(ac.destination);
            } catch (_) {
            }
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
            <svg
                className="knob-svg"
                width={size}
                height={size}
                onMouseDown={onMouseDown}
            >
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3a3a3a" strokeWidth={2}/>
                <line
                    x1={cx} y1={cy} x2={x2} y2={y2}
                    stroke="lightgray" strokeWidth={2} strokeLinecap="round"
                />
                <circle cx={cx} cy={cy} r={3} fill="var(--bg-raised)" stroke="#3a3a3a" strokeWidth={1}/>
            </svg>
            {label && <span className="eq-knob-label">{label}</span>}
        </div>
    );
}

function VertFader({value, onChange, height = 80}) {
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
            style={{height}}
            onMouseDown={onMouseDown}
        >
            <div className="fader-thumb" style={{top: `${topPct}%`}}/>
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

/**
 * WaveformInner — WaveSurfer 7 compatible with RegionsPlugin.
 * Registers a RegionsPlugin instance on each WaveSurfer, exposed via regionsRef.
 * After 'ready', notifies the parent so it can build the EQ chain.
 */
function WaveformInner({track, isPlaying, wsRef, regionsRef, onReady}) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!track?.audioUrl || !containerRef.current) return;
        if (wsRef.current) {
            wsRef.current.destroy();
            wsRef.current = null;
        }

        const ac = getAC();

        // Create the Regions plugin instance
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

        // Expose the regions plugin to the parent Deck via ref
        if (regionsRef) regionsRef.current = regions;

        ws.on("ready", () => {
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
    // loop state: start (number|null), end (number|null), active (bool)
    const [loop, setLoop] = useState({active: false, start: null, end: null});
    const [cues, setCues] = useState([null, null, null]);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef(null);

    // Keep a ref to the active WS region object so we can remove/update it
    const activeRegionRef = useRef(null);
    // Unsubscribe handle for the region-out listener
    const regionOutUnsubRef = useRef(null);

    // --- Elapsed timer ---
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

    // --- Loop management via RegionsPlugin ---
    // Removes the current loop region and its listener
    const clearLoopRegion = useCallback(() => {
        if (regionOutUnsubRef.current) {
            regionOutUnsubRef.current(); // call the unsubscribe fn returned by ws.on()
            regionOutUnsubRef.current = null;
        }
        if (activeRegionRef.current) {
            try { activeRegionRef.current.remove(); } catch (_) {}
            activeRegionRef.current = null;
        }
    }, []);

    // Creates the WaveSurfer region and wires the loop-back listener
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

        // WaveSurfer v7 RegionsPlugin fires 'region-out' when playback leaves a region.
        // We listen for it and seek back to the region start to create a seamless loop.
        regionOutUnsubRef.current = ws.on("timeupdate", (currentTime) => {
            // Use the region's live start/end (user may have dragged/resized it)
            if (currentTime >= region.end) {
                ws.setTime(region.start);
            }
        });

        // Seek to the loop start so playback enters the region immediately
        ws.setTime(start);
    }, [regionsRef, wsRef, clearLoopRegion]);

    // Clean up when track changes or component unmounts
    useEffect(() => {
        return () => {
            clearLoopRegion();
        };
    }, [track?.audioUrl, clearLoopRegion]);

    // --- IN button: set loop start point ---
    const handleIn = useCallback(() => {
        if (!wsRef.current || !track) return;
        const t = wsRef.current.getCurrentTime();

        // If a loop region exists, remove it (we're resetting the start)
        clearLoopRegion();
        setLoop({active: false, start: t, end: null});
    }, [wsRef, track, clearLoopRegion]);

    // --- OUT button: set end point and activate loop, or cancel if already looping ---
    const handleOut = useCallback(() => {
        if (!wsRef.current || !track) return;

        if (loop.active) {
            // Second press: cancel the loop
            clearLoopRegion();
            setLoop({active: false, start: null, end: null});
            return;
        }

        const t = wsRef.current.getCurrentTime();

        // Need a start point set first
        if (loop.start == null) return;

        // Ensure start < end
        const start = Math.min(loop.start, t);
        const end = Math.max(loop.start, t);
        if (end - start < 0.05) return; // too short, ignore

        setLoop({active: true, start, end});
        createLoopRegion(start, end);
    }, [wsRef, track, loop, clearLoopRegion, createLoopRegion]);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60).toString().padStart(2, "0");
        return `${m}:${sec}`;
    };

    const timeDisplay = `${track ? formatTime(elapsed) : "--:--"} / ${track?.length ?? "--:--"}`;

    const setCuePoint = (idx) => {
        if (!wsRef.current || !track) return;
        const t = wsRef.current.getCurrentTime();
        setCues((prev) => {
            const c = [...prev];
            c[idx] = t;
            return c;
        });
    };

    const bpm = track?.bpm ?? null;

    return (
        <div
            className={`deck ${side}${dragOver ? " drag-over" : ""}`}
            onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                try {
                    const data = JSON.parse(e.dataTransfer.getData("application/json"));
                    if (data && typeof data === "object") {
                        e.currentTarget.dispatchEvent(
                            new CustomEvent("trackdrop", {detail: data, bubbles: true})
                        );
                    }
                } catch (_) {
                }
            }}
        >

            {/* IN / OUT / SYNC + timer */}
            <div className="deck-controls-bar">
                <div className="deck-btns">
                    <button
                        className={`deck-btn${loop.start != null ? " active" : ""}`}
                        onClick={handleIn}
                        title="Set loop start point"
                    >
                        IN
                    </button>
                    <button
                        className={`deck-btn${loop.active ? " active" : ""}`}
                        onClick={handleOut}
                        title={loop.active ? "Cancel loop" : "Set loop end point"}
                    >
                        OUT
                    </button>
                    <button
                        className={`deck-btn${syncActive ? " active" : ""}`}
                        onClick={() => setSyncActive(!syncActive)}
                    >
                        SYNC
                    </button>
                </div>
            </div>

            {/* Track info */}
            <div className="track-info-row">
                <div className="track-artwork-box">
                    {track?.artwork ? <img src={track.artwork} alt=""/> : "♪"}
                </div>
                <div className="track-meta">
                    <div className="track-title" style={!track ? {color: "var(--text-lo)"} : {}}>
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
                        onClick={() => setCuePoint(i)}
                        title={cues[i] != null ? `Jump to ${formatTime(cues[i])}` : "Set cue point"}
                    >
                        {cues[i] != null ? `CUE ${formatTime(cues[i])}` : "CUE #" + i}
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
                        >+
                        </button>
                        <button
                            className="bpm-adj-btn"
                            disabled={!track}
                            onClick={() => onBpmChange && onBpmChange(-1)}
                            title="-1 BPM"
                        >−
                        </button>
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
    const [eqA, setEqA] = useState({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const [eqB, setEqB] = useState({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const [faderA, setFaderA] = useState(0.8);
    const [faderB, setFaderB] = useState(0.8);
    const wsARef = useRef(null);
    const wsBRef = useRef(null);
    // Regions plugin refs — populated by WaveformInner after WS is created
    const regionsARef = useRef(null);
    const regionsBRef = useRef(null);
    const eqChainA = useRef(null);
    const eqChainB = useRef(null);

    // Build (or rebuild) EQ chain after WaveSurfer signals ready
    const handleReadyA = useCallback((ws) => {
        if (eqChainA.current) {
            eqChainA.current.disconnect();
            eqChainA.current = null;
        }
        const chain = buildEQChain(ws);
        if (chain) {
            eqChainA.current = chain;
            chain.setHigh(eqA.high);
            chain.setMid(eqA.mid);
            chain.setLow(eqA.low);
            chain.setCfx(eqA.cfx);
        }
    }, []);

    const handleReadyB = useCallback((ws) => {
        if (eqChainB.current) {
            eqChainB.current.disconnect();
            eqChainB.current = null;
        }
        const chain = buildEQChain(ws);
        if (chain) {
            eqChainB.current = chain;
            chain.setHigh(eqB.high);
            chain.setMid(eqB.mid);
            chain.setLow(eqB.low);
            chain.setCfx(eqB.cfx);
        }
    }, []);

    // Apply EQ knob changes to the live chain for Deck A
    useEffect(() => {
        const chain = eqChainA.current;
        if (!chain) return;
        chain.setHigh(eqA.high);
        chain.setMid(eqA.mid);
        chain.setLow(eqA.low);
        chain.setCfx(eqA.cfx);
    }, [eqA]);

    // Apply EQ knob changes to the live chain for Deck B
    useEffect(() => {
        const chain = eqChainB.current;
        if (!chain) return;
        chain.setHigh(eqB.high);
        chain.setMid(eqB.mid);
        chain.setLow(eqB.low);
        chain.setCfx(eqB.cfx);
    }, [eqB]);

    // Crossfader — constant-power taper
    useEffect(() => {
        const gainA = Math.cos((crossfader) * (Math.PI / 2));
        const gainB = Math.cos((1 - crossfader) * (Math.PI / 2));

        if (eqChainA.current) {
            eqChainA.current.setCfx(gainA * faderA);
        }
        if (eqChainB.current) {
            eqChainB.current.setCfx(gainB * faderB);
        }
    }, [crossfader, faderA, faderB]);

    const onDeckRootDrop = useCallback((side) => (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data && typeof data === "object") {
                if (side === "left") {
                    setDeckA({...data});
                    setPlayingA(false);
                    eqChainA.current = null;
                }
                if (side === "right") {
                    setDeckB({...data});
                    setPlayingB(false);
                    eqChainB.current = null;
                }
            }
        } catch (_) {
        }
    }, []);

    const adjustBpm = (side, delta) => {
        if (side === "left" && deckA?.bpm) setDeckA(d => ({...d, bpm: (parseInt(d.bpm) || 0) + delta}));
        if (side === "right" && deckB?.bpm) setDeckB(d => ({...d, bpm: (parseInt(d.bpm) || 0) + delta}));
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
                        ? <WaveformInner
                            track={deckA}
                            isPlaying={playingA}
                            wsRef={wsARef}
                            regionsRef={regionsARef}
                            onReady={handleReadyA}
                        />
                        : <div className="waveform-empty">— deck A —</div>
                    }
                </div>

                <div className="crossfader-col">
                    <Crossfader value={crossfader} onChange={setCrossfader}/>
                </div>

                <div
                    className="waveform-panel right"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDeckRootDrop("right")}
                >
                    {deckB
                        ? <WaveformInner
                            track={deckB}
                            isPlaying={playingB}
                            wsRef={wsBRef}
                            regionsRef={regionsBRef}
                            onReady={handleReadyB}
                        />
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
                        regionsRef={regionsARef}
                    />
                </div>

                <div className="mixer-col">
                    <div className="eq-section">
                        <div className="eq-knob-group"><Knob label="HIGH" value={eqA.high}
                                                             onChange={(v) => setEqA(e => ({...e, high: v}))}
                                                             size={32}/></div>
                        <div className="eq-knob-group"><Knob label="HIGH" value={eqB.high}
                                                             onChange={(v) => setEqB(e => ({...e, high: v}))}
                                                             size={32}/></div>
                        <div className="eq-knob-group"><Knob label="MID" value={eqA.mid}
                                                             onChange={(v) => setEqA(e => ({...e, mid: v}))} size={32}/>
                        </div>
                        <div className="eq-knob-group"><Knob label="MID" value={eqB.mid}
                                                             onChange={(v) => setEqB(e => ({...e, mid: v}))} size={32}/>
                        </div>
                        <div className="eq-knob-group"><Knob label="LOW" value={eqA.low}
                                                             onChange={(v) => setEqA(e => ({...e, low: v}))} size={32}/>
                        </div>
                        <div className="eq-knob-group"><Knob label="LOW" value={eqB.low}
                                                             onChange={(v) => setEqB(e => ({...e, low: v}))} size={32}/>
                        </div>
                        <div className="eq-knob-group"><Knob label="CFX" value={eqA.cfx}
                                                             onChange={(v) => setEqA(e => ({...e, cfx: v}))} size={32}/>
                        </div>
                        <div className="eq-knob-group"><Knob label="CFX" value={eqB.cfx}
                                                             onChange={(v) => setEqB(e => ({...e, cfx: v}))} size={32}/>
                        </div>
                    </div>

                    <div className="faders-row">
                        <div className="fader-group"><VertFader value={faderA} onChange={setFaderA} height={60}/></div>
                        <div className="fader-group"><VertFader value={faderB} onChange={setFaderB} height={60}/></div>
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
                        regionsRef={regionsBRef}
                    />
                </div>

            </div>
        </div>
    );
}

