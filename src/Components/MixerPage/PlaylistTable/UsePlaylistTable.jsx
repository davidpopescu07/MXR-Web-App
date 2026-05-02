import { useState, useRef, useEffect } from "react";
import { parseBlob } from "music-metadata-browser";
import { Buffer } from "buffer";
import Cookies from "js-cookie";
import { analyze } from "web-audio-beat-detector";
import { v4 as uuidv4 } from "uuid";

window.Buffer = Buffer;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

export const TRACKS_PER_PAGE = 5;

export const initialPlaylists = {
    CoolPlaylist: [
        { id: "fake-1", title: "Xtal",             artist: "Aphex Twin",  album: "Selected Ambient Works 85-92",  bpm: 115, length: "4:53", rating: 5, artwork: null, audioUrl: null },
        { id: "fake-2", title: "Conceited",         artist: "Remy Ma",     album: "There's something about Remy", bpm: 100, length: "3:40", rating: 5, artwork: null, audioUrl: null },
        { id: "fake-3", title: "Army of me",        artist: "Bjork",       album: "Post",                         bpm: 172, length: "3:45", rating: 5, artwork: null, audioUrl: null },
        { id: "fake-5", title: "Born Slippy",       artist: "Underworld",  album: "1992-2012",                    bpm: 140, length: "7:36", rating: 5, artwork: null, audioUrl: null },
        { id: "fake-6", title: "Bohemian Rhapsody", artist: "Queen",       album: "A night at the Opera",         bpm: 72,  length: "5:55", rating: 5, artwork: null, audioUrl: null },
    ],
};

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function usePlaylist() {

    // --- State ---
    const [playlists, setPlaylists] = useState(() => {
        try {
            const saved = Cookies.get('mxr-playlists');
            return saved ? JSON.parse(saved) : initialPlaylists;
        } catch { return initialPlaylists; }
    });
    const [currentPlaylist, setCurrentPlaylist] = useState(
        Cookies.get('mxr-current-playlist') || 'CoolPlaylist'
    );
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
    const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const fileInputRef = useRef(null);

    // --- Cookie persistence ---
    useEffect(() => {
        Cookies.set('mxr-current-playlist', currentPlaylist, { expires: 30 });
    }, [currentPlaylist]);

    useEffect(() => {
        const toSave = {};
        for (const [name, tracks] of Object.entries(playlists)) {
            toSave[name] = tracks.map(t => ({ ...t, audioUrl: null, artwork: null }));
        }
        Cookies.set('mxr-playlists', JSON.stringify(toSave), { expires: 30 });
    }, [playlists]);

    // --- Playlist management ---
    const switchPlaylist = (name) => {
        setCurrentPlaylist(name);
        Cookies.set('currentPlaylist', name, { expires: 30 });
    };

    const createPlaylist = () => {
        const name = newPlaylistName.trim();
        if (!name || playlists[name]) return;
        setPlaylists({ ...playlists, [name]: [] });
        switchPlaylist(name);
        setNewPlaylistName("");
        setShowNewPlaylistInput(false);
        setShowPlaylistDropdown(false);
        setCurrentPage(1);
    };

    // --- File processing ---
    const getAudioBuffer = async (file) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        return audioContext.decodeAudioData(arrayBuffer);
    };

    const processFile = async (file) => {
        try {
            const metadata = await parseBlob(file);
            const common = metadata.common;

            let bpm = "-";
            try {
                const audioBuffer = await getAudioBuffer(file);
                bpm = Math.round(await analyze(audioBuffer));
            } catch (err) {
                console.error("BPM failed", err);
            }

            let artworkUrl = null;
            if (common.picture && common.picture.length > 0) {
                const picture = common.picture[0];
                artworkUrl = URL.createObjectURL(new Blob([picture.data], { type: picture.format }));
            }

            let formattedLength = "--:--";
            if (metadata.format.duration) {
                const min = Math.floor(metadata.format.duration / 60);
                const sec = Math.floor(metadata.format.duration % 60).toString().padStart(2, "0");
                formattedLength = `${min}:${sec}`;
            }

            return {
                id: uuidv4(),
                title: common.title || file.name,
                artist: common.artist || "Unknown",
                album: common.album || "Unknown",
                bpm,
                length: formattedLength,
                rating: 0,
                artwork: artworkUrl,
                audioUrl: URL.createObjectURL(file),
            };
        } catch (err) {
            console.error("Error processing:", file.name, err);
            return null;
        }
    };

    const handleAddTrack = async (event) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;
        const newTracks = (await Promise.all(files.map(processFile))).filter(Boolean);
        setPlaylists((prev) => ({
            ...prev,
            [currentPlaylist]: [...(prev[currentPlaylist] || []), ...newTracks],
        }));
        event.target.value = "";
    };

    // --- Track CRUD ---
    const deleteTrack = (id) => {
        const newTracks = (playlists[currentPlaylist] || []).filter((t) => t.id !== id);
        setPlaylists({ ...playlists, [currentPlaylist]: newTracks });
        const newLastPage = Math.max(1, Math.ceil(newTracks.length / TRACKS_PER_PAGE));
        if (currentPage > newLastPage) setCurrentPage(newLastPage);
    };

    const startEdit = (track) => {
        setEditingId(track.id);
        setEditValues({ title: track.title, artist: track.artist, album: track.album, bpm: track.bpm });
    };

    const saveEdit = (id) => {
        const newTracks = (playlists[currentPlaylist] || []).map((t) =>
            t.id === id ? { ...t, ...editValues } : t
        );
        setPlaylists({ ...playlists, [currentPlaylist]: newTracks });
        setEditingId(null);
    };

    const updateRating = (id, rating) => {
        const newTracks = (playlists[currentPlaylist] || []).map((t) =>
            t.id === id ? { ...t, rating } : t
        );
        setPlaylists({ ...playlists, [currentPlaylist]: newTracks });
    };

    // --- Drag to deck ---
    const handleDragStart = (e, track) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("application/json", JSON.stringify({
            id: track.id, title: track.title, artist: track.artist,
            album: track.album, bpm: track.bpm, length: track.length,
            rating: track.rating, artwork: track.artwork, audioUrl: track.audioUrl,
        }));
    };

    // --- Search + pagination ---
    const tracks = playlists[currentPlaylist] || [];

    const filteredTracks = tracks.filter((t) => {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q)
            || t.artist.toLowerCase().includes(q)
            || t.album.toLowerCase().includes(q);
    });

    const totalPages = Math.max(1, Math.ceil(filteredTracks.length / TRACKS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedTracks = filteredTracks.slice((safePage - 1) * TRACKS_PER_PAGE, safePage * TRACKS_PER_PAGE);

    const goToPage = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

    const getPageNumbers = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages = [1];
        if (safePage > 3) pages.push("...");
        for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
        if (safePage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
        return pages;
    };

    // --- Footer totals ---
    let totalSeconds = 0;
    for (const t of tracks) {
        if (t.length && t.length !== "--:--") {
            const [m, s] = t.length.split(":").map(Number);
            totalSeconds += m * 60 + s;
        }
    }
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    return {
        // Playlist state
        playlists, currentPlaylist, tracks,
        playlistNames: Object.keys(playlists),
        // Playlist UI state + handlers
        showPlaylistDropdown, setShowPlaylistDropdown,
        showNewPlaylistInput, setShowNewPlaylistInput,
        newPlaylistName, setNewPlaylistName,
        switchPlaylist, createPlaylist,
        // Track state + handlers
        editingId, editValues, setEditValues,
        startEdit, saveEdit, deleteTrack, updateRating,
        handleAddTrack, handleDragStart,
        fileInputRef,
        // Search
        search, setSearch,
        // Pagination
        safePage, totalPages, pagedTracks,
        goToPage, getPageNumbers,
        // Footer
        totalSeconds, totalHours, totalMinutes,
    };
}