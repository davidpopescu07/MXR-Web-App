const store = require("../store");
const { validatePlaylistName } = require("../validators/trackValidators");

function listPlaylists(req, res) {
    const names = store.getPlaylistNames();
    return res.status(200).json({ playlists: names });
}

function createPlaylist(req, res) {
    const validation = validatePlaylistName(req.body?.name);
    if (!validation.valid) return res.status(400).json({ errors: validation.errors });

    const name = req.body.name.trim();
    if (store.playlistExists(name))
        return res.status(409).json({ errors: [`Playlist "${name}" already exists`] });

    const playlist = store.createPlaylist(name);
    return res.status(201).json(playlist);
}

function getPlaylist(req, res) {
    const { name } = req.params;
    if (!store.playlistExists(name))
        return res.status(404).json({ errors: [`Playlist "${name}" not found`] });

    const tracks = store.getPlaylist(name);
    return res.status(200).json({ name, trackCount: tracks.length });
}

function renamePlaylist(req, res) {
    const { name } = req.params;
    if (!store.playlistExists(name))
        return res.status(404).json({ errors: [`Playlist "${name}" not found`] });

    const validation = validatePlaylistName(req.body?.name);
    if (!validation.valid) return res.status(400).json({ errors: validation.errors });

    const newName = req.body.name.trim();
    if (newName === name) return res.status(200).json({ name, trackCount: store.getPlaylist(name).length });

    if (store.playlistExists(newName))
        return res.status(409).json({ errors: [`Playlist "${newName}" already exists`] });

    const updated = store.renamePlaylist(name, newName);
    return res.status(200).json({ name: updated.name, trackCount: updated.tracks.length });
}

function deletePlaylist(req, res) {
    const { name } = req.params;
    if (!store.playlistExists(name))
        return res.status(404).json({ errors: [`Playlist "${name}" not found`] });

    store.deletePlaylist(name);
    return res.status(204).send();
}

module.exports = { listPlaylists, createPlaylist, getPlaylist, renamePlaylist, deletePlaylist };