import React from "react";
import {useState} from "react";
import {useRef} from "react";
import {parseBlob} from "music-metadata-browser";
import {Buffer} from "buffer";
import {analyze} from "web-audio-beat-detector";
import "./PlaylistTable.css";
import {v4 as uuidv4} from "uuid";

window.Buffer = Buffer;

// call onChange whenever a star is clicked
// star will be filled either when hovering or when it is selected as a rating
const StarRating = (props) => {
    const rating = props.rating;
    const onChange = props.onChange;
    const [hover, setHover] = useState(0);

    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => {
                let className = "star ";
                if (star <= hover || star <= rating) {
                    className = className + "active";
                } else {
                    className = className + "inactive";
                }
                return (
                    <span
                        key={star}
                        className={className}
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHover(star)}
                        onMouseLeave={() => setHover(0)}
                    >
                        ★
                    </span>
                );
            })}
        </div>
    );
};

const TRACKS_PER_PAGE = 5;

const PlaylistTable = () => {
    const initialPlaylists = {"MyPlaylist #1": []};
    const [playlists, setPlaylists] = useState(initialPlaylists);
    const [currentPlaylist, setCurrentPlaylist] = useState("MyPlaylist #1");
    const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
    const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const fileInputRef = useRef(null);

    let tracks = playlists[currentPlaylist];
    if (tracks === undefined) {
        tracks = [];
    }



    // Creates a Web Audio API AudioContext,
    // reads the file as a raw ArrayBuffer, then decodes it into an AudioBuffer
    const getAudioBuffer = async (file) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    };


    const processFile = async (file) => {
        try {
            const metadata = await parseBlob(file);
            const common = metadata.common;

            // BPM Detection
            let bpm = "-";
            try {
                const audioBuffer = await getAudioBuffer(file);
                const detectedBpm = await analyze(audioBuffer);
                bpm = Math.round(detectedBpm);
            } catch (err) { console.error("BPM failed", err); }

            // Artwork
            let artworkUrl = null;
            if (common.picture && common.picture.length > 0) {
                const picture = common.picture[0];
                const blob = new Blob([picture.data], { type: picture.format });
                artworkUrl = URL.createObjectURL(blob);
            }

            // Duration
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
                bpm: bpm,
                length: formattedLength,
                rating: 0,
                artwork: artworkUrl,
            };
        } catch (err) {
            console.error("Error processing:", file.name, err);
            return null;
        }
    };

    // Gets the file from the input event
    // parseBlob() extracts metadata from the file
    // build the newTrack object and appends it to the current playlist
    const handleAddTrack = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const newTracksToAdd = [];

        for (const file of files) {
            const track = await processFile(file);
            if (track) newTracksToAdd.push(track);
        }
        setPlaylists(prev => {
            const updatedList = [...(prev[currentPlaylist] || []), ...newTracksToAdd];
            return {...prev, [currentPlaylist]: updatedList};
        });

        event.target.value = "";

    };



    // creates a new array of tracks excluding the one with the id selected for deletion
    const deleteTrack = (id) => {
        const currentTracks = playlists[currentPlaylist] || [];
        const newTracks = [];
        for (let i = 0; i < currentTracks.length; i++) {
            if (currentTracks[i].id != id) {
                newTracks.push(currentTracks[i]);
            }
        }
        const newPlaylists = Object.assign({}, playlists);
        newPlaylists[currentPlaylist] = newTracks;
        setPlaylists(newPlaylists);

        // If deleting the last track on a page (beyond page 1), go back one page
        const newTotal = newTracks.length;
        const newLastPage = Math.max(1, Math.ceil(newTotal / TRACKS_PER_PAGE));
        if (currentPage > newLastPage) {
            setCurrentPage(newLastPage);
        }
    };


    const startEdit = (track) => {
        setEditingId(track.id);
        const values = {
            title: track.title,
            artist: track.artist,
            album: track.album,
            bpm: track.bpm,
        };
        setEditValues(values);
    };

    const saveEdit = (id) => {
        const currentTracks = playlists[currentPlaylist] || [];
        const newTracks = [];
        for (let i = 0; i < currentTracks.length; i++) {
            const track = currentTracks[i];
            if (track.id == id) {
                const updatedTrack = {
                    id: track.id,
                    title: editValues.title,
                    artist: editValues.artist,
                    album: editValues.album,
                    bpm: editValues.bpm,
                    length: track.length,
                    rating: track.rating,
                    artwork: track.artwork,
                };
                newTracks.push(updatedTrack);
            } else {
                newTracks.push(track);
            }
        }
        const newPlaylists = Object.assign({}, playlists);
        newPlaylists[currentPlaylist] = newTracks;
        setPlaylists(newPlaylists);
        setEditingId(null);
    };

    const updateRating = (id, rating) => {
        const currentTracks = playlists[currentPlaylist] || [];
        const newTracks = [];
        for (let i = 0; i < currentTracks.length; i++) {
            const track = currentTracks[i];
            if (track.id == id) {
                const updatedTrack = {
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    bpm: track.bpm,
                    length: track.length,
                    rating: rating,
                    artwork: track.artwork,
                };
                newTracks.push(updatedTrack);
            } else {
                newTracks.push(track);
            }
        }
        const newPlaylists = Object.assign({}, playlists);
        newPlaylists[currentPlaylist] = newTracks;
        setPlaylists(newPlaylists);
    };

    const createPlaylist = () => {
        const name = newPlaylistName.trim();
        if (name == "") return;
        if (playlists[name] != undefined) return;
        const newPlaylists = Object.assign({}, playlists);
        newPlaylists[name] = [];
        setPlaylists(newPlaylists);
        setCurrentPlaylist(name);
        setNewPlaylistName("");
        setShowNewPlaylistInput(false);
        setShowPlaylistDropdown(false);
        setCurrentPage(1);
    };

    const filteredTracks = [];
    for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const titleMatch = track.title.toLowerCase().includes(search.toLowerCase());
        const artistMatch = track.artist.toLowerCase().includes(search.toLowerCase());
        const albumMatch = track.album.toLowerCase().includes(search.toLowerCase());
        if (titleMatch || artistMatch || albumMatch) {
            filteredTracks.push(track);
        }
    }

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredTracks.length / TRACKS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * TRACKS_PER_PAGE;
    const pageEnd = pageStart + TRACKS_PER_PAGE;
    const pagedTracks = filteredTracks.slice(pageStart, pageEnd);

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    // Build page number buttons (show up to 7 pages with ellipsis)
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safePage > 3) pages.push("...");
            for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
                pages.push(i);
            }
            if (safePage < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    let totalSeconds = 0;
    for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (track.length != "--:--" && track.length != undefined) {
            const parts = track.length.split(":");
            const m = parseInt(parts[0]);
            const s = parseInt(parts[1]);
            totalSeconds = totalSeconds + m * 60 + s;
        }
    }
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);

    const playlistNames = Object.keys(playlists);

    const truncate = (str, n) => {
        if (str == undefined) return "";
        if (str.length > n) {
            return str.slice(0, n - 2) + "..";
        }
        return str;
    };

    return (
        <div
            className="playlist-page"
            onClick={() => setShowPlaylistDropdown(false)}
        >

            <div className="playlist-table-container">
                <div className="playlist-topbar">
                    <div
                        className="playlist-dropdown-wrapper"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="playlist-dropdown-btn"
                            onClick={() => {
                                if (showPlaylistDropdown == true) {
                                    setShowPlaylistDropdown(false);
                                } else {
                                    setShowPlaylistDropdown(true);
                                }
                            }}
                        >
                            <span className="label">{currentPlaylist}</span>
                            <span className="arrow">▼</span>
                        </button>

                        {showPlaylistDropdown == true && (
                            <div className="playlist-dropdown-menu">
                                {playlistNames.map((name) => {
                                    let itemClass = "playlist-dropdown-item";
                                    if (name == currentPlaylist) {
                                        itemClass = itemClass + " active";
                                    }
                                    return (
                                        <div
                                            key={name}
                                            className={itemClass}
                                            onClick={() => {
                                                setCurrentPlaylist(name);
                                                setShowPlaylistDropdown(false);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {name}
                                        </div>
                                    );
                                })}
                                <div className="playlist-dropdown-footer">
                                    {showNewPlaylistInput == true ? (
                                        <div className="playlist-new-input-row">
                                            <input
                                                autoFocus
                                                className="edit-input"
                                                value={newPlaylistName}
                                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key == "Enter") {
                                                        createPlaylist();
                                                    }
                                                }}
                                                placeholder="Playlist name..."
                                            />
                                            <button className="btn-confirm" onClick={() => createPlaylist()}>

                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="playlist-new-btn"
                                            onClick={() => setShowNewPlaylistInput(true)}
                                        >
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
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <div className="playlist-spacer"/>

                    <button
                        className="add-track-btn"
                        onClick={() => fileInputRef.current.click()}
                    >
                        + Add Track
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="audio/*"
                        onChange={handleAddTrack}
                        style={{display: "none"}}
                    />
                </div>
                <table className="playlist-table">
                    <thead>
                    <tr>
                        {["Artwork", "Track title", "Artist", "Album", "BPM", "Length", "Rating", ""].map(
                            (h) => <th key={h}>{h}</th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {pagedTracks.map((track) => {
                        const isEditing = editingId === track.id;
                        return (
                            <tr key={track.id}>
                                <td className="cell-artwork">
                                    {track.artwork ? (
                                        <img
                                            className="track-artwork"
                                            src={track.artwork}
                                            alt=""
                                        />
                                    ) : (
                                        <div className="track-artwork-placeholder">♪</div>
                                    )}
                                </td>

                                <td>
                                    {isEditing ? (
                                        <input
                                            className="edit-input"
                                            value={editValues.title}
                                            onChange={(e) =>
                                                setEditValues((v) => ({...v, title: e.target.value}))
                                            }
                                        />
                                    ) : (
                                        <span className="track-title">
                                                {truncate(track.title, 22)}
                                            </span>
                                    )}
                                </td>

                                <td>
                                    {isEditing ? (
                                        <input
                                            className="edit-input"
                                            value={editValues.artist}
                                            onChange={(e) =>
                                                setEditValues((v) => ({...v, artist: e.target.value}))
                                            }
                                        />
                                    ) : (
                                        truncate(track.artist, 18)
                                    )}
                                </td>

                                <td>
                                    {isEditing ? (
                                        <input
                                            className="edit-input"
                                            value={editValues.album}
                                            onChange={(e) =>
                                                setEditValues((v) => ({...v, album: e.target.value}))
                                            }
                                        />
                                    ) : (
                                        truncate(track.album, 18)
                                    )}
                                </td>

                                <td className="cell-center">
                                    {track.bpm}
                                </td>

                                <td className="cell-center">{track.length}</td>

                                <td className="cell-rating">
                                    <StarRating
                                        rating={track.rating}
                                        onChange={(r) => updateRating(track.id, r)}
                                    />
                                </td>


                                <td className="cell-actions">
                                    <div className="actions-cell">
                                        {isEditing ? (
                                            <button
                                                className="btn-save"
                                                onClick={() => saveEdit(track.id)}
                                            >
                                                Save
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-edit"
                                                onClick={() => startEdit(track)}
                                            >
                                                Edit
                                            </button>
                                        )}
                                        <button
                                            className="btn-delete"
                                            onClick={() => deleteTrack(track.id)}
                                            title="Delete"
                                        >
                                            Remove
                                        </button>
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
                            ", " + (totalHours > 0 ? totalHours + " hour" + (totalHours !== 1 ? "s " : " ") : "") + totalMinutes + " minute" + (totalMinutes !== 1 ? "s" : "")}
                    </span>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => goToPage(safePage - 1)}
                                disabled={safePage === 1}
                            >
                                ‹
                            </button>

                            {getPageNumbers().map((page, idx) =>
                                page === "..." ? (
                                    <span key={"ellipsis-" + idx} className="pagination-ellipsis">…</span>
                                ) : (
                                    <button
                                        key={page}
                                        className={"pagination-btn" + (page === safePage ? " active" : "")}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </button>
                                )
                            )}

                            <button
                                className="pagination-btn"
                                onClick={() => goToPage(safePage + 1)}
                                disabled={safePage === totalPages}
                            >
                                ›
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlaylistTable;