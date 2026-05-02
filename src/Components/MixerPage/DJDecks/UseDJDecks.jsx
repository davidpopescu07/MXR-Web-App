import { useState, useRef, useEffect, useCallback } from "react";
import { buildEQChain, getAC } from "./DJDecks";

export function useDJDecks() {

    // --- Deck state ---
    const [deckA, setDeckA] = useState(null);
    const [deckB, setDeckB] = useState(null);
    const [playingA, setPlayingA] = useState(false);
    const [playingB, setPlayingB] = useState(false);

    // --- EQ state + refs (refs avoid stale closures in callbacks) ---
    const [eqA, setEqA] = useState({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const [eqB, setEqB] = useState({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const eqARef = useRef({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const eqBRef = useRef({high: 0.5, mid: 0.5, low: 0.5, cfx: 0.5});
    const handleEqAChange = (v) => { setEqA(v); eqARef.current = v; };
    const handleEqBChange = (v) => { setEqB(v); eqBRef.current = v; };

    // --- Crossfader state + ref ---
    const [crossfader, setCrossfader] = useState(0.5);
    const crossfaderRef = useRef(0.5);
    const handleCrossfaderChange = (v) => { setCrossfader(v); crossfaderRef.current = v; };

    // --- WaveSurfer + regions refs ---
    const wsARef = useRef(null);
    const wsBRef = useRef(null);
    const regionsARef = useRef(null);
    const regionsBRef = useRef(null);

    // --- EQ chain refs ---
    const eqChainA = useRef(null);
    const eqChainB = useRef(null);

    // --- Play handlers: build EQ chain lazily on first play (guarantees user gesture) ---
    const handlePlayA = useCallback(async () => {
        const ac = getAC();
        if (ac.state === 'suspended') await ac.resume();

        if (!eqChainA.current && wsARef.current) {
            const chain = buildEQChain(wsARef.current);
            if (chain) {
                eqChainA.current = chain;
                chain.setHigh(eqARef.current.high);
                chain.setMid(eqARef.current.mid);
                chain.setLow(eqARef.current.low);
                chain.setCfx(eqARef.current.cfx);
                chain.setVolume(Math.cos(crossfaderRef.current * (Math.PI / 2)));
            }
        }
        setPlayingA(p => !p);
    }, []);

    const handlePlayB = useCallback(async () => {
        const ac = getAC();
        if (ac.state === 'suspended') await ac.resume();

        if (!eqChainB.current && wsBRef.current) {
            const chain = buildEQChain(wsBRef.current);
            if (chain) {
                eqChainB.current = chain;
                chain.setHigh(eqBRef.current.high);
                chain.setMid(eqBRef.current.mid);
                chain.setLow(eqBRef.current.low);
                chain.setCfx(eqBRef.current.cfx);
                chain.setVolume(Math.cos((1 - crossfaderRef.current) * (Math.PI / 2)));
            }
        }
        setPlayingB(p => !p);
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

    // --- Crossfader: constant-power taper ---
    // full left (0)  → gainA=1,     gainB=0
    // center   (0.5) → gainA=0.707, gainB=0.707
    // full right (1) → gainA=0,     gainB=1
    useEffect(() => {
        const gainA = Math.cos(crossfader * (Math.PI / 2));
        const gainB = Math.cos((1 - crossfader) * (Math.PI / 2));
        if (eqChainA.current) eqChainA.current.setVolume(gainA);
        if (eqChainB.current) eqChainB.current.setVolume(gainB);
    }, [crossfader]);

    // --- Drag and drop from playlist ---
    const onDeckRootDrop = useCallback((side) => async (e) => {
        e.preventDefault();
        const ac = getAC();
        if (ac.state === 'suspended') await ac.resume();

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
                    eqChainB.current = null;
                }
            }
        } catch (_) {}
    }, []);

    // --- BPM nudge ---
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

    return {
        // Deck state
        deckA, deckB,
        playingA, playingB,
        // EQ state + handlers
        eqA, eqB,
        handleEqAChange, handleEqBChange,
        // Crossfader
        crossfader, handleCrossfaderChange,
        // Refs
        wsARef, wsBRef, regionsARef, regionsBRef,
        // Handlers
        handlePlayA, handlePlayB,
        onDeckRootDrop, adjustBpm,
    };
}