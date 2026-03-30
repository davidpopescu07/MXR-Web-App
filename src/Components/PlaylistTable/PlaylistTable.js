import React, {useState} from "react";
import {parseBlob} from "music-metadata-browser";
import {Buffer} from "buffer";

window.Buffer = Buffer;


const PlaylistTable = () => {
    const [tracks, setTracks] = useState([]);

    const deleteTrack = (id) => {
        setTracks(tracks.filter((t) => t.id !== id));
    };

    const handleAddTrack = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const metadata = await parseBlob(file);

            const common = metadata.common;

            const picture = common.picture?.[0];
            let artworkUrl = null;

            if (picture) {
                const blob = new Blob([picture.data], {type: picture.format});
                artworkUrl = URL.createObjectURL(blob);
            }

            const duration = metadata.format.duration;
            const formattedLength = duration ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60)
                .toString()
                .padStart(2, "0")}` : "--:--";

            const newTrack = {
                id: Date.now(),
                title: common.title || file.name,
                artist: common.artist || "Unknown",
                album: common.album || "Unknown",
                bpm: common.bpm || "-",
                length: formattedLength,
                rating: 0,
                key: common.key || "-",
                artwork: artworkUrl,
                file
            };

            setTracks((prev) => [...prev, newTrack]);
        } catch (err) {
            console.error("Error reading metadata:", err);
        }
    };
    return (<div style={{padding: "20px", background: "#111", color: "#fff"}}>
            <h2>My Playlist</h2>

            {/* Add Track */}
            <input
                type="file"
                accept="audio/*"
                onChange={handleAddTrack}
                style={{marginBottom: "10px"}}
            />

            {/* Table */}
            <table width="100%" cellPadding="10" style={{borderCollapse: "collapse"}}>
                <thead style={{background: "#222"}}>
                <tr>
                    <th>Artwork</th>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Album</th>
                    <th>BPM</th>
                    <th>Key</th>
                    <th>Rating</th>
                    <th>Length</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {tracks.map((track) => (<tr key={track.id} style={{borderBottom: "1px solid #333"}}>
                        <td>
                            {track.artwork ? (<img
                                    src={track.artwork}
                                    alt="art"
                                    width="50"
                                    height="50"
                                />) : ("—")}
                        </td>

                        <td>{track.title}</td>
                        <td>{track.artist}</td>
                        <td>{track.album}</td>
                        <td>{track.bpm}</td>
                        <td>{track.key}</td>
                        <td>{track.length}</td>
                        <td>
                            <button onClick={() => deleteTrack(track.id)}>
                                Delete
                            </button>
                        </td>

                        <td>
                            <button onClick={() => deleteTrack(track.id)}>
                                Delete
                            </button>
                        </td>
                    </tr>))}
                </tbody>
            </table>
        </div>);
}

export default PlaylistTable