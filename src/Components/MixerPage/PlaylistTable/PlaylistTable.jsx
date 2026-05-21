import React, { useState } from "react";
import { usePlaylist } from "./UsePlaylistTable";
import "./PlaylistTable.css";


const StarRating = ({ rating, onChange }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={`star ${star <= hover || star <= rating ? "active" : "inactive"}`}
                    onClick={() => onChange(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                >★</span>
            ))}
        </div>
    );
};


const PlaylistTable = () => {
    const {
        currentPlaylist, tracks, playlistNames,
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
    } = usePlaylist();

    const truncate = (str, n) => (!str ? "" : str.length > n ? str.slice(0, n - 2) + ".." : str);

    return (
        <div className="playlist-page" onClick={() => setShowPlaylistDropdown(false)}>
            <div className="playlist-table-container">

                {/* API error banner */}
                {apiError && (
                    <div className="api-error-banner" style={{margin: "30px"}}>
                        {apiError}
                    </div>
                )}

                {/* Top bar */}
                <div className="playlist-topbar">

                    {/* Playlist dropdown */}
                    <div className="playlist-dropdown-wrapper" onClick={(e) => e.stopPropagation()}>
                        <button className="playlist-dropdown-btn" onClick={() => setShowPlaylistDropdown((v) => !v)}>
                            <span className="label">{currentPlaylist ?? "Loading..."}</span>
                            <span className="arrow">▼</span>
                        </button>

                        {showPlaylistDropdown && (
                            <div className="playlist-dropdown-menu">
                                {playlistNames.map((name) => (
                                    <div
                                        key={name}
                                        className={`playlist-dropdown-item${name === currentPlaylist ? " active" : ""}`}
                                        onClick={() => { switchPlaylist(name); setShowPlaylistDropdown(false); }}
                                    >{name}</div>
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
                                        <button className="playlist-new-btn" onClick={() => setShowNewPlaylistInput(true)}>+ New playlist</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <div className="playlist-search">
                        <input
                            type="text"
                            placeholder="search for tracks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="playlist-spacer"/>

                    {/* Add track */}
                    <button className="add-track-btn" onClick={() => fileInputRef.current.click()}>+ Add Track</button>
                    <input ref={fileInputRef} type="file" multiple accept="audio/*" onChange={handleAddTrack} style={{display: "none"}}/>
                </div>

                {/* Loading overlay */}
                {loading && <div className="playlist-loading">Loading…</div>}

                {/* Track table */}
                <table className="playlist-table">
                    <thead>
                    <tr>
                        {["Artwork", "Track title", "Artist", "Album", "BPM", "Length", "Rating", ""].map(
                            (h, i) => <th key={i}>{h}</th>
                        )}
                    </tr>
                    </thead>
                    <tbody>
                    {pagedTracks.map((track) => {
                        const isEditing = editingId === track.id;
                        return (
                            <tr key={track.id} draggable onDragStart={(e) => handleDragStart(e, track)} style={{cursor: "grab"}} title="Drag to a deck">

                                <td className="cell-artwork">
                                    {track.artwork
                                        ? <img className="track-artwork" src={track.artwork} alt=""/>
                                        : <div className="track-artwork-placeholder">♪</div>
                                    }
                                </td>

                                <td>
                                    {isEditing
                                        ? <input className="edit-input" value={editValues.title} onChange={(e) => setEditValues((v) => ({...v, title: e.target.value}))}/>
                                        : <span className="track-title">{truncate(track.title, 22)}</span>
                                    }
                                </td>

                                <td>
                                    {isEditing
                                        ? <input className="edit-input" value={editValues.artist} onChange={(e) => setEditValues((v) => ({...v, artist: e.target.value}))}/>
                                        : truncate(track.artist, 18)
                                    }
                                </td>

                                <td>
                                    {isEditing
                                        ? <input className="edit-input" value={editValues.album} onChange={(e) => setEditValues((v) => ({...v, album: e.target.value}))}/>
                                        : truncate(track.album, 18)
                                    }
                                </td>

                                <td className="cell-center">{track.bpm}</td>
                                <td className="cell-center">{track.length}</td>

                                <td className="cell-rating">
                                    <StarRating rating={track.rating} onChange={(r) => updateRating(track.id, r)}/>
                                </td>

                                <td className="cell-actions">
                                    <div className="actions-cell">
                                        {isEditing
                                            ? <button className="btn-save" onClick={() => saveEdit(track.id)}>Save</button>
                                            : <button className="btn-edit" onClick={() => startEdit(track)}>Edit</button>
                                        }
                                        <button className="btn-delete" onClick={() => deleteTrack(track.id)}>Remove</button>
                                    </div>
                                </td>

                            </tr>
                        );
                    })}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="playlist-footer">
                    <span id="total-playlist-length">
                        {tracks.length} Track{tracks.length !== 1 ? "s" : ""}
                        {totalSeconds > 0 && ", " + (totalHours > 0 ? `${totalHours} hour${totalHours !== 1 ? "s " : " "}` : "") + `${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`}
                    </span>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button className="pagination-btn" onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}>‹</button>
                            {getPageNumbers().map((page, idx) =>
                                page === "..." ? (
                                    <span key={"e" + idx} className="pagination-ellipsis">…</span>
                                ) : (
                                    <button key={page} className={`pagination-btn${page === safePage ? " active" : ""}`} onClick={() => goToPage(page)}>{page}</button>
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
