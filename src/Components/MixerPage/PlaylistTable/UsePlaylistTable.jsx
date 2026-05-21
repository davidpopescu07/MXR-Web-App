import { useState, useRef, useEffect, useCallback } from "react";
import { parseBlob } from "music-metadata-browser";
import { Buffer } from "buffer";
import { analyze } from "web-audio-beat-detector";
import { api } from "../../../Api";

window.Buffer = Buffer;

export const TRACKS_PER_PAGE = 5;

const SEED_TRACKS = [
    { id: "fake-1", title: "Xtal",             artist: "Aphex Twin",  album: "Selected Ambient Works 85-92",  bpm: 115, length: "4:53", rating: 5 },
    { id: "fake-2", title: "Conceited",         artist: "Remy Ma",     album: "There's something about Remy", bpm: 100, length: "3:40", rating: 5 },
    { id: "fake-3", title: "Army of me",        artist: "Bjork",       album: "Post",                         bpm: 172, length: "3:45", rating: 5 },
    { id: "fake-5", title: "Born Slippy",       artist: "Underworld",  album: "1992-2012",                    bpm: 140, length: "7:36", rating: 5 },
    { id: "fake-6", title: "Bohemian Rhapsody", artist: "Queen",       album: "A night at the Opera",         bpm: 72,  length: "5:55", rating: 5 },
];

const SEED_PLAYLISTS = ["CoolPlaylist"];


export function usePlaylist() {

    // Core state
    const [playlistNames, setPlaylistNames]           = useState([]);
    const [currentPlaylist, setCurrentPlaylist]       = useState(null);
    const [playlistsReady, setPlaylistsReady]         = useState(false);
    const [tracks, setTracks]                         = useState([]);          // current page tracks (merged with client assets)
    const [allTracks, setAllTracks]                   = useState([]);          // full list for footer totals + drag data
    const [pagination, setPagination]                 = useState({ page: 1, limit: TRACKS_PER_PAGE, total: 0, totalPages: 1 });
    const [currentPage, setCurrentPage]               = useState(1);
    const [search, setSearch]                         = useState("");

    // Edit state
    const [editingId, setEditingId]   = useState(null);
    const [editValues, setEditValues] = useState({});

    // Playlist UI state
    const [showPlaylistDropdown, setShowPlaylistDropdown]   = useState(false);
    const [showNewPlaylistInput, setShowNewPlaylistInput]   = useState(false);
    const [newPlaylistName, setNewPlaylistName]             = useState("");

    // Loading / error
    const [loading, setLoading]   = useState(false);
    const [apiError, setApiError] = useState(null);

    const fileInputRef = useRef(null);


    /** Normalize backend tracks for UI consumers */
    const mergeAssets = useCallback((backendTracks) =>
            backendTracks.map((t) => ({
                ...t,
                artwork: t.artwork ?? null,
                audioUrl: t.audioUrl ?? null,
            })),
        []);

    // Load playlist names

    useEffect(() => {
        let active = true;

        (async () => {
            try {
                const data = await api.getPlaylists();
                if (!active) return;

                setPlaylistNames(data.playlists);
                setCurrentPlaylist((current) =>
                    current && data.playlists.includes(current) ? current : data.playlists[0] ?? null
                );
            } catch (err) {
                if (!active) return;

                setPlaylistNames(SEED_PLAYLISTS);
                setCurrentPlaylist("CoolPlaylist");
                setApiError(err.message);
            } finally {
                if (active) setPlaylistsReady(true);
            }
        })();

        return () => {
            active = false;
        };
    }, []);


    const fetchTracks = useCallback(async (playlistName, page, searchTerm) => {
        setLoading(true);
        setApiError(null);
        try {
            const data = await api.getTracks(playlistName, { page, limit: TRACKS_PER_PAGE, search: searchTerm });
            setTracks(mergeAssets(data.data));
            setPagination(data.pagination);

            const all = await api.getTracks(playlistName, { page: 1, limit: 100, search: "" });
            setAllTracks(mergeAssets(all.data));
        } catch (err) {
            setTracks([]);
            setAllTracks([]);
            setPagination({ page: 1, limit: TRACKS_PER_PAGE, total: 0, totalPages: 1 });
            setApiError(err.message);
        } finally {
            setLoading(false);
        }
    }, [mergeAssets]);

    useEffect(() => {
        if (!playlistsReady || !currentPlaylist) return;
        fetchTracks(currentPlaylist, currentPage, search);
    }, [playlistsReady, currentPlaylist, currentPage, search, fetchTracks]);

    // Playlist management

    const switchPlaylist = (name) => {
        setCurrentPlaylist(name);
        setCurrentPage(1);
        setSearch("");
    };

    const createPlaylist = async () => {
        const name = newPlaylistName.trim();
        if (!name) return;
        try {
            await api.createPlaylist(name);
            const data = await api.getPlaylists();
            setPlaylistNames(data.playlists);
            switchPlaylist(name);
        } catch (err) {
            setApiError(err.message);
        }
        setNewPlaylistName("");
        setShowNewPlaylistInput(false);
        setShowPlaylistDropdown(false);
    };

    // File processing

    const getAudioBuffer = async (file) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        return audioContext.decodeAudioData(arrayBuffer);
    };

    const processFile = async (file) => {
        try {
            const metadata = await parseBlob(file);
            const common = metadata.common;

            let bpm = 0;
            try {
                const audioBuffer = await getAudioBuffer(file);
                bpm = Math.round(await analyze(audioBuffer));
            } catch (err) {
                console.error("BPM detection failed", err);
            }

            let artworkFile = null;
            if (common.picture?.length > 0) {
                const picture = common.picture[0];
                const artworkExtension = picture.format.split("/")[1] ?? "jpg";
                artworkFile = new File(
                    [picture.data],
                    `${file.name}-artwork.${artworkExtension}`,
                    { type: picture.format }
                );
            }

            let length = "--:--";
            if (metadata.format.duration) {
                const min = Math.floor(metadata.format.duration / 60);
                const sec = Math.floor(metadata.format.duration % 60).toString().padStart(2, "0");
                length = `${min}:${sec}`;
            }

            return {
                payload: {
                    title:  common.title  || file.name,
                    artist: common.artist || "Unknown",
                    album:  common.album  || "Unknown",
                    bpm:    bpm || 0,
                    length,
                    rating: 0,
                },
                files: { audioFile: file, artworkFile },
            };
        } catch (err) {
            console.error("Error processing file:", file.name, err);
            return null;
        }
    };

    const handleAddTrack = async (event) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        const processed = (await Promise.all(files.map(processFile))).filter(Boolean);

        for (const { payload, files: uploadedFiles } of processed) {
            try {
                const formData = new FormData();
                Object.entries(payload).forEach(([key, value]) => formData.append(key, String(value)));
                formData.append("audioFile", uploadedFiles.audioFile);
                if (uploadedFiles.artworkFile) formData.append("artworkFile", uploadedFiles.artworkFile);

                await api.createTrack(currentPlaylist, formData);
            } catch (err) {
                setApiError(err.message);
            }
        }

        await fetchTracks(currentPlaylist, currentPage, search);
        event.target.value = "";
    };

    // Track CRUD

    const deleteTrack = async (id) => {
        try {
            await api.deleteTrack(currentPlaylist, id);
            // If we deleted the last item on the page, go back one
            const newTotal = pagination.total - 1;
            const newTotalPages = Math.max(1, Math.ceil(newTotal / TRACKS_PER_PAGE));
            const safePage = Math.min(currentPage, newTotalPages);
            setCurrentPage(safePage);
            await fetchTracks(currentPlaylist, safePage, search);
        } catch (err) {
            setApiError(err.message);
        }
    };

    const startEdit = (track) => {
        setEditingId(track.id);
        setEditValues({ title: track.title, artist: track.artist, album: track.album, bpm: track.bpm });
    };

    const saveEdit = async (id) => {
        try {
            await api.updateTrack(currentPlaylist, id, editValues);
            setEditingId(null);
            await fetchTracks(currentPlaylist, currentPage, search);
        } catch (err) {
            setApiError(err.message);
        }
    };

    const updateRating = async (id, rating) => {
        try {
            await api.updateTrack(currentPlaylist, id, { rating });
            // Optimistic update — reflect immediately in UI
            setTracks((prev) => prev.map((t) => t.id === id ? { ...t, rating } : t));
            setAllTracks((prev) => prev.map((t) => t.id === id ? { ...t, rating } : t));
        } catch (err) {
            setApiError(err.message);
        }
    };

    // Drag to deck

    const handleDragStart = (e, track) => {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("application/json", JSON.stringify({
            id: track.id, title: track.title, artist: track.artist,
            album: track.album, bpm: track.bpm, length: track.length,
            rating: track.rating,
            artwork: track.artwork ?? null,
            audioUrl: track.audioUrl ?? null,
        }));
    };

    // Pagination helpers

    const safePage    = pagination.page;
    const totalPages  = pagination.totalPages;
    const pagedTracks = tracks;   // already paginated by the server

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages = [1];
        if (safePage > 3) pages.push("...");
        for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
        if (safePage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
        return pages;
    };

    // Footer totals

    let totalSeconds = 0;
    for (const t of allTracks) {
        if (t.length && t.length !== "--:--") {
            const [m, s] = t.length.split(":").map(Number);
            totalSeconds += m * 60 + s;
        }
    }
    const totalHours   = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);


    return {
        currentPlaylist,
        tracks: allTracks,
        playlistNames,
        showPlaylistDropdown, setShowPlaylistDropdown,
        showNewPlaylistInput, setShowNewPlaylistInput,
        newPlaylistName, setNewPlaylistName,
        switchPlaylist, createPlaylist,
        editingId, editValues, setEditValues,
        startEdit, saveEdit, deleteTrack, updateRating,
        handleAddTrack, handleDragStart,
        fileInputRef,
        search, setSearch,
        safePage, totalPages, pagedTracks,
        goToPage, getPageNumbers,
        totalSeconds, totalHours, totalMinutes,
        loading, apiError,
    };
}
