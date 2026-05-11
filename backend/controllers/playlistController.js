const store = require("../store");
const { validatePlaylistName } = require("../validators/trackValidators");

async function listPlaylists(req, res) {
    const names = await store.getPlaylistNames();
    return res.status(200).json({ playlists: names });
}

async function createPlaylist(req, res) {
    const validation = await validatePlaylistName(req.body?.name);
    if (!validation.valid) return res.status(400).json({ errors: validation.errors });

    const name = req.body.name.trim();
    if (await store.playlistExists(name))
        return res.status(409).json({ errors: [`Playlist "${name}" already exists`] });

    const playlist = await store.createPlaylist(name);
    return res.status(201).json(playlist);
}

async function getPlaylist(req, res) {
    const { name } = req.params;
    if (!await store.playlistExists(name))
        return res.status(404).json({ errors: [`Playlist "${name}" not found`] });

    const tracks = store.getPlaylist(name);
    return res.status(200).json({ name, trackCount: tracks.length });
}

async function renamePlaylist(req, res) {
    const { name } = req.params;
    if (!await store.playlistExists(name))
        return res.status(404).json({ errors: [`Playlist "${name}" not found`] });

    const validation = await validatePlaylistName(req.body?.name);
    if (!validation.valid) return res.status(400).json({ errors: validation.errors });

    const newName = req.body.name.trim();
    if (newName === name) return res.status(200).json({ name, trackCount: store.getPlaylist(name).length });

    if (await store.playlistExists(newName))
        return res.status(409).json({ errors: [`Playlist "${newName}" already exists`] });

    const updated = store.renamePlaylist(name, newName);
    return res.status(200).json({ name: updated.name, trackCount: updated.tracks.length });
}

async function deletePlaylist(req, res) {
    const { name } = req.params;
    if (!await store.playlistExists(name))
        return res.status(404).json({ errors: [`Playlist "${name}" not found`] });

    await store.deletePlaylist(name);
    return res.status(204).send();
}

module.exports = { listPlaylists, createPlaylist, getPlaylist, renamePlaylist, deletePlaylist };