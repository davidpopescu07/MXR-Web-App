require("dotenv").config();
const { PrismaClient } = require("./generated/prisma/");
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
});

// ── Playlist operations ────────────────────────────────────────────────────────

async function getPlaylistNames() {
    const playlists = await prisma.playlist.findMany({ select: { name: true }, orderBy: { createdAt: "asc" } });
    return playlists.map((p) => p.name);
}

async function playlistExists(name) {
    const p = await prisma.playlist.findUnique({ where: { name } });
    return p !== null;
}

async function getPlaylist(name) {
    return prisma.playlist.findUnique({ where: { name }, include: { tracks: true } });
}

async function createPlaylist(name) {
    const p = await prisma.playlist.create({ data: { name }, include: { tracks: true } });
    return { name: p.name, tracks: p.tracks };
}

async function deletePlaylist(name) {
    await prisma.playlist.delete({ where: { name } });
}

async function renamePlaylist(oldName, newName) {
    const p = await prisma.playlist.update({
        where: { name: oldName },
        data:  { name: newName },
        include: { tracks: true },
    });
    return { name: p.name, tracks: p.tracks };
}

// ── Track operations ───────────────────────────────────────────────────────────

async function getTracks(playlistName) {
    const playlist = await prisma.playlist.findUnique({
        where: { name: playlistName },
        include: { tracks: { orderBy: { createdAt: "asc" } } },
    });
    return playlist ? playlist.tracks : null;
}

async function getTrack(playlistName, id) {
    const playlist = await prisma.playlist.findUnique({ where: { name: playlistName } });
    if (!playlist) return null;
    return prisma.track.findFirst({ where: { id, playlistId: playlist.id } });
}

async function addTrack(playlistName, trackData) {
    const playlist = await prisma.playlist.findUnique({ where: { name: playlistName } });
    if (!playlist) return null;
    return prisma.track.create({
        data: {
            ...trackData,
            artworkPath: trackData.artworkPath ?? null,
            audioPath:   trackData.audioPath   ?? null,
            playlistId:  playlist.id,
        },
    });
}

async function updateTrack(playlistName, id, updates) {
    const playlist = await prisma.playlist.findUnique({ where: { name: playlistName } });
    if (!playlist) return null;
    return prisma.track.update({ where: { id }, data: updates });
}

async function deleteTrack(playlistName, id) {
    const playlist = await prisma.playlist.findUnique({ where: { name: playlistName } });
    if (!playlist) return false;
    const track = await prisma.track.findFirst({ where: { id, playlistId: playlist.id } });
    if (!track) return false;
    await prisma.track.delete({ where: { id } });
    return true;
}

// ── Test helper ────────────────────────────────────────────────────────────────

async function _reset() {
    await prisma.track.deleteMany();
    await prisma.playlist.deleteMany();
    await prisma.playlist.create({
        data: {
            name: "CoolPlaylist",
            tracks: {
                create: [
                    { id: "fake-1", title: "Xtal",             artist: "Aphex Twin", album: "Selected Ambient Works 85-92",  bpm: 115, length: "4:53", rating: 5 },
                    { id: "fake-2", title: "Conceited",         artist: "Remy Ma",    album: "There's something about Remy", bpm: 100, length: "3:40", rating: 5 },
                    { id: "fake-3", title: "Army of me",        artist: "Bjork",      album: "Post",                         bpm: 172, length: "3:45", rating: 5 },
                    { id: "fake-5", title: "Born Slippy",       artist: "Underworld", album: "1992-2012",                    bpm: 140, length: "7:36", rating: 5 },
                    { id: "fake-6", title: "Bohemian Rhapsody", artist: "Queen",      album: "A night at the Opera",         bpm: 72,  length: "5:55", rating: 5 },
                ],
            },
        },
    });
}

module.exports = {
    getPlaylistNames, playlistExists, getPlaylist,
    createPlaylist, deletePlaylist, renamePlaylist,
    getTracks, getTrack, addTrack, updateTrack, deleteTrack,
    _reset,
};