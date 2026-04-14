import React from "react";
import { useState } from "react";
import { useRef } from "react";
import { parseBlob } from "music-metadata-browser";
import { Buffer } from "buffer";
import { analyze } from "web-audio-beat-detector";
import "./PlaylistTable.css";
import { v4 as uuidv4 } from "uuid";

window.Buffer = Buffer;

const StarRating = (props) => {
    const currentRating = props.rating;
    const onRatingChange = props.onChange;
    const [hoveredStar, setHoveredStar] = useState(0);

    const getStarClassName = (thisStar) => {
        const isHovered  = thisStar <= hoveredStar;
        const isSelected = thisStar <= currentRating;
        const isHighlighted = isHovered || isSelected;
        return "star " + (isHighlighted ? "active" : "inactive");
    };
    const handleStarClick = (clickedStar) => {
        onRatingChange(clickedStar);
    };
    const handleMouseEnter = (enteredStar) => {
        setHoveredStar(enteredStar);
    };
    const handleMouseLeave = () => {
        setHoveredStar(0);
    };

    const renderStar = (starNumber) => (
        <span
            key={starNumber}
            className={getStarClassName(starNumber)}
            onClick={() => handleStarClick(starNumber)}
            onMouseEnter={() => handleMouseEnter(starNumber)}
            onMouseLeave={() => handleMouseLeave()}
        >
            ★
        </span>
    );

    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map(renderStar)}
        </div>
    );
};

const TRACKS_PER_PAGE = 5;

const PlaylistTable = () => {
    const initialPlaylists = {
        CoolPlaylist: [
            { id: "fake-1", title: "Xtal", artist: "Aphex Twin", album: "Selected Ambient Works 85-92", bpm: 115, length: "4:53", rating: 5, artwork: null, audioUrl: null },
            { id: "fake-2", title: "Conceited", artist: "Remy Ma", album: "There's something about Remy", bpm: 100, length: "3:40", rating: 5, artwork: null, audioUrl: null },
            { id: "fake-3", title: "Army of me", artist: "Bjork", album: "Post", bpm: 172, length: "3:45", rating: 5, artwork: null, audioUrl: null },
            { id: "fake-5", title: "Born Slippy", artist: "Underworld", album: "1992-2012", bpm: 140, length: "7:36", rating: 5, artwork: null, audioUrl: null },
            { id: "fake-6", title: "Bohemian Rhapsody", artist: "Queen", album: "A night at the Opera", bpm: 72, length: "5:55", rating: 5, artwork: null, audioUrl: null },
        ],
    };

    const [playlists, setPlaylists] = useState(initialPlaylists);
    const [currentPlaylist, setCurrentPlaylist] = useState("CoolPlaylist");
    const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
    const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const fileInputRef = useRef(null);

    let tracks = playlists[currentPlaylist] || [];

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

            const audioUrl = URL.createObjectURL(file);

            return {
                id: uuidv4(),
                title: common.title || file.name,
                artist: common.artist || "Unknown",
                album: common.album || "Unknown",
                bpm,
                length: formattedLength,
                rating: 0,
                artwork: artworkUrl,
                audioUrl,
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
        setPlaylists((previousPlaylists) => {
            const existingTracks     = previousPlaylists[currentPlaylist] || [];
            const updatedTrackList   = [...existingTracks, ...newTracks];

            return {
                ...previousPlaylists,           // keep all other playlists untouched
                [currentPlaylist]: updatedTrackList,  // replace only this playlist
            };
        });
        event.target.value = "";
    };

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

    const createPlaylist = () => {
        const name = newPlaylistName.trim();
        if (!name || playlists[name]) return;
        setPlaylists({ ...playlists, [name]: [] });
        setCurrentPlaylist(name);
        setNewPlaylistName("");
        setShowNewPlaylistInput(false);
        setShowPlaylistDropdown(false);
        setCurrentPage(1);
    };

    const filteredTracks = tracks.filter((t) => {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q);
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

    let totalSeconds = 0;
    for (const t of tracks) {
        if (t.length && t.length !== "--:--") {
            const [m, s] = t.length.split(":").map(Number);
            totalSeconds += m * 60 + s;
        }
    }
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    const truncate = (str, n) => {
        if (!str) return "";
        return str.length > n ? str.slice(0, n - 2) + ".." : str;
    };

    const handleDragStart = (e, track) => {
        e.dataTransfer.effectAllowed = "copy";
        const payload = {
            id: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            bpm: track.bpm,
            length: track.length,
            rating: track.rating,
            artwork: track.artwork,
            audioUrl: track.audioUrl,
        };
        e.dataTransfer.setData("application/json", JSON.stringify(payload));
    };

    const playlistNames = Object.keys(playlists);

    return (
        <div className="playlist-page" onClick={() => setShowPlaylistDropdown(false)}>
            <div className="playlist-table-container">
                <div className="playlist-topbar">
                    <div className="playlist-dropdown-wrapper" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="playlist-dropdown-btn"
                            onClick={() => setShowPlaylistDropdown((v) => !v)}
                        >
                            <span className="label">{currentPlaylist}</span>
                            <span className="arrow">▼</span>
                        </button>

                        {showPlaylistDropdown && (
                            <div className="playlist-dropdown-menu">
                                {playlistNames.map((name) => (
                                    <div
                                        key={name}
                                        className={`playlist-dropdown-item${name === currentPlaylist ? " active" : ""}`}
                                        onClick={() => { setCurrentPlaylist(name); setShowPlaylistDropdown(false); setCurrentPage(1); }}
                                    >
                                        {name}
                                    </div>
                                ))}
                                <div className="playlist-dropdown-footer">
                                    {showNewPlaylistInput ? (
                                        <div className="playlist-new-input-row">
                                            <input
                                                autoFocus
                                                className="edit-input"
                                                value={newPlaylistName}
                                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
                                                placeholder="Playlist name..."
                                            />
                                            <button className="btn-confirm" onClick={createPlaylist}>✓</button>
                                        </div>
                                    ) : (
                                        <button className="playlist-new-btn" onClick={() => setShowNewPlaylistInput(true)}>
                                            + New playlist
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="playlist-search">
                        <input
                            type="text"
                            placeholder="search for tracks..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="playlist-spacer" />

                    <button className="add-track-btn" onClick={() => fileInputRef.current.click()}>
                        + Add Track
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="audio/*"
                        onChange={handleAddTrack}
                        style={{ display: "none" }}
                    />
                </div>

                <table className="playlist-table">
                    <thead>
                    <tr>
                        {[ "Artwork", "Track title", "Artist", "Album", "BPM", "Length", "Rating", ""].map(
                            (h, i) => <th key={i}>{h}</th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {pagedTracks.map((track) => {
                        const isEditing = editingId === track.id;
                        return (
                            <tr
                                key={track.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, track)}
                                style={{ cursor: "grab" }}
                                title="Drag to a deck"
                            >

                                <td className="cell-artwork">
                                    {track.artwork ? (
                                        <img className="track-artwork" src={track.artwork} alt="" />
                                    ) : (
                                        <div className="track-artwork-placeholder">♪</div>
                                    )}
                                </td>

                                <td>
                                    {isEditing ? (
                                        <input className="edit-input" value={editValues.title}
                                               onChange={(e) => setEditValues((v) => ({ ...v, title: e.target.value }))} />
                                    ) : (
                                        <span className="track-title">{truncate(track.title, 22)}</span>
                                    )}
                                </td>

                                <td>
                                    {isEditing ? (
                                        <input className="edit-input" value={editValues.artist}
                                               onChange={(e) => setEditValues((v) => ({ ...v, artist: e.target.value }))} />
                                    ) : truncate(track.artist, 18)}
                                </td>

                                <td>
                                    {isEditing ? (
                                        <input className="edit-input" value={editValues.album}
                                               onChange={(e) => setEditValues((v) => ({ ...v, album: e.target.value }))} />
                                    ) : truncate(track.album, 18)}
                                </td>

                                <td className="cell-center">{track.bpm}</td>
                                <td className="cell-center">{track.length}</td>

                                <td className="cell-rating">
                                    <StarRating rating={track.rating} onChange={(r) => updateRating(track.id, r)} />
                                </td>

                                <td className="cell-actions">
                                    <div className="actions-cell">
                                        {isEditing ? (
                                            <button className="btn-save" onClick={() => saveEdit(track.id)}>Save</button>
                                        ) : (
                                            <button className="btn-edit" onClick={() => startEdit(track)}>Edit</button>
                                        )}
                                        <button className="btn-delete" onClick={() => deleteTrack(track.id)}>Remove</button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>

                <div className="playlist-footer">
          <span id="total-playlist-length">
            {tracks.length} Track{tracks.length !== 1 ? "s" : ""}
              {totalSeconds > 0 &&
                  ", " + (totalHours > 0 ? `${totalHours} hour${totalHours !== 1 ? "s " : " "}` : "") +
                  `${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`}
          </span>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button className="pagination-btn" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>‹</button>
                            {getPageNumbers().map((page, idx) =>
                                page === "..." ? (
                                    <span key={"e" + idx} className="pagination-ellipsis">…</span>
                                ) : (
                                    <button
                                        key={page}
                                        className={`pagination-btn${page === safePage ? " active" : ""}`}
                                        onClick={() => goToPage(page)}
                                    >{page}</button>
                                )
                            )}
                            <button className="pagination-btn" onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}>›</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaylistTable;