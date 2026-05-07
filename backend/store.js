

const { v4: uuidv4 } = require("uuid");


const initialTracks = () => [
    { id: "fake-1", title: "Xtal",             artist: "Aphex Twin",  album: "Selected Ambient Works 85-92",  bpm: 115, length: "4:53", rating: 5, artwork: null },
    { id: "fake-2", title: "Conceited",         artist: "Remy Ma",     album: "There's something about Remy", bpm: 100, length: "3:40", rating: 5, artwork: null },
    { id: "fake-3", title: "Army of me",        artist: "Bjork",       album: "Post",                         bpm: 172, length: "3:45", rating: 5, artwork: null },
    { id: "fake-5", title: "Born Slippy",       artist: "Underworld",  album: "1992-2012",                    bpm: 140, length: "7:36", rating: 5, artwork: null },
    { id: "fake-6", title: "Bohemian Rhapsody", artist: "Queen",       album: "A night at the Opera",         bpm: 72,  length: "5:55", rating: 5, artwork: null },
];


let playlists = {
    CoolPlaylist: initialTracks(),
};


const store = {

    getPlaylistNames: () => Object.keys(playlists),

    playlistExists: (name) => Object.prototype.hasOwnProperty.call(playlists, name),

    getPlaylist: (name) => playlists[name] ?? null,

    createPlaylist: (name) => {
        playlists[name] = [];
        return { name, tracks: [] };
    },

    deletePlaylist: (name) => {
        delete playlists[name];
    },

    renamePlaylist: (oldName, newName) => {
        playlists[newName] = playlists[oldName];
        delete playlists[oldName];
        return { name: newName, tracks: playlists[newName] };
    },


    getTracks: (playlistName) => playlists[playlistName] ?? null,

    getTrack: (playlistName, id) =>
        (playlists[playlistName] ?? []).find((t) => t.id === id) ?? null,

    addTrack: (playlistName, trackData) => {
        const track = { id: uuidv4(), ...trackData };
        playlists[playlistName].push(track);
        return track;
    },

    updateTrack: (playlistName, id, updates) => {
        const idx = playlists[playlistName].findIndex((t) => t.id === id);
        if (idx === -1) return null;
        playlists[playlistName][idx] = { ...playlists[playlistName][idx], ...updates };
        return playlists[playlistName][idx];
    },

    deleteTrack: (playlistName, id) => {
        const before = playlists[playlistName].length;
        playlists[playlistName] = playlists[playlistName].filter((t) => t.id !== id);
        return playlists[playlistName].length < before;
    },

    _reset: () => {
        playlists = { CoolPlaylist: initialTracks() };
    },
};

module.exports = store;