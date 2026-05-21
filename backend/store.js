require("dotenv").config();
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { ensureStarterPlaylist } = require("./starterPlaylist");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const INVALID_ADMIN_PASSWORDS = new Set(["hashed_not_used_here", "hashed_not_used_in_tests"]);

async function resolveUserId(userId) {
    return userId ?? getDefaultUserId();
}

async function getDefaultUserId() {
    const existingUser = await prisma.user.findUnique({
        where: { email: "admin@mxr.com" },
        select: { id: true, password: true },
    });

    if (!existingUser) {
        const user = await prisma.user.create({
            data: {
                username: "admin",
                email: "admin@mxr.com",
                password: await bcrypt.hash("admin123", 10),
                role: "ADMIN",
            },
            select: { id: true },
        });

        return user.id;
    }

    if (INVALID_ADMIN_PASSWORDS.has(existingUser.password)) {
        await prisma.user.update({
            where: { email: "admin@mxr.com" },
            data: { password: await bcrypt.hash("admin123", 10) },
        });
    }

    return existingUser.id;
}

async function getPlaylistNames(userId) {
    userId = await resolveUserId(userId);
    await ensureStarterPlaylist(prisma, userId);

    let playlists = await prisma.playlist.findMany({
        where: { userId },
        select: { name: true },
        orderBy: { createdAt: "asc" },
    });

    return playlists.map((p) => p.name);
}

async function playlistExists(name, userId) {
    userId = await resolveUserId(userId);
    await ensureStarterPlaylist(prisma, userId);

    const playlist = await prisma.playlist.findUnique({
        where: { userId_name: { userId, name } },
    });

    return playlist !== null;
}

async function getPlaylist(name, userId) {
    userId = await resolveUserId(userId);
    await ensureStarterPlaylist(prisma, userId);

    return prisma.playlist.findUnique({
        where: { userId_name: { userId, name } },
        include: { tracks: true },
    });
}

async function createPlaylist(name, userId) {
    userId = await resolveUserId(userId);
    const playlist = await prisma.playlist.create({
        data: { name, userId },
        include: { tracks: true },
    });

    return { name: playlist.name, tracks: playlist.tracks };
}

async function deletePlaylist(name, userId) {
    userId = await resolveUserId(userId);
    await prisma.playlist.delete({
        where: { userId_name: { userId, name } },
    });
}

async function renamePlaylist(oldName, newName, userId) {
    userId = await resolveUserId(userId);
    const playlist = await prisma.playlist.update({
        where: { userId_name: { userId, name: oldName } },
        data: { name: newName },
        include: { tracks: true },
    });

    return { name: playlist.name, tracks: playlist.tracks };
}

async function getTracks(playlistName, userId) {
    userId = await resolveUserId(userId);
    await ensureStarterPlaylist(prisma, userId);

    const playlist = await prisma.playlist.findUnique({
        where: { userId_name: { userId, name: playlistName } },
        include: { tracks: { orderBy: { createdAt: "asc" } } },
    });

    return playlist ? playlist.tracks : null;
}

async function getTrack(playlistName, id, userId) {
    userId = await resolveUserId(userId);
    const playlist = await prisma.playlist.findUnique({
        where: { userId_name: { userId, name: playlistName } },
    });
    if (!playlist) return null;

    return prisma.track.findFirst({ where: { id, playlistId: playlist.id } });
}

async function addTrack(playlistName, trackData, userId) {
    userId = await resolveUserId(userId);
    const playlist = await prisma.playlist.findUnique({
        where: { userId_name: { userId, name: playlistName } },
    });
    if (!playlist) return null;

    return prisma.track.create({
        data: {
            title: trackData.title,
            artist: trackData.artist,
            album: trackData.album,
            bpm: trackData.bpm,
            length: trackData.length,
            rating: trackData.rating,
            artworkPath: trackData.artworkPath ?? trackData.artwork ?? null,
            audioPath: trackData.audioPath ?? null,
            playlistId: playlist.id,
        },
    });
}

async function updateTrack(playlistName, id, updates, userId) {
    userId = await resolveUserId(userId);
    const playlist = await prisma.playlist.findUnique({
        where: { userId_name: { userId, name: playlistName } },
    });
    if (!playlist) return null;

    const { artwork, ...safeUpdates } = updates;
    if (artwork !== undefined) safeUpdates.artworkPath = artwork;

    const track = await prisma.track.findFirst({ where: { id, playlistId: playlist.id } });
    if (!track) return null;

    return prisma.track.update({ where: { id }, data: safeUpdates });
}

async function deleteTrack(playlistName, id, userId) {
    userId = await resolveUserId(userId);
    const playlist = await prisma.playlist.findUnique({
        where: { userId_name: { userId, name: playlistName } },
    });
    if (!playlist) return false;

    const track = await prisma.track.findFirst({ where: { id, playlistId: playlist.id } });
    if (!track) return false;

    await prisma.track.delete({ where: { id } });
    return true;
}

async function _reset() {
    await prisma.track.deleteMany();
    await prisma.playlist.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
        data: {
            username: "admin",
            email: "admin@mxr.com",
            password: "hashed_not_used_in_tests",
            role: "ADMIN",
        },
    });

    await prisma.playlist.create({
        data: {
            name: "CoolPlaylist",
            userId: user.id,
            tracks: {
                create: [
                    { id: "fake-1", title: "Xtal", artist: "Aphex Twin", album: "Selected Ambient Works 85-92", bpm: 115, length: "4:53", rating: 5 },
                    { id: "fake-2", title: "Conceited", artist: "Remy Ma", album: "There's something about Remy", bpm: 100, length: "3:40", rating: 5 },
                    { id: "fake-3", title: "Army of me", artist: "Bjork", album: "Post", bpm: 172, length: "3:45", rating: 5 },
                    { id: "fake-5", title: "Born Slippy", artist: "Underworld", album: "1992-2012", bpm: 140, length: "7:36", rating: 5 },
                    { id: "fake-6", title: "Bohemian Rhapsody", artist: "Queen", album: "A night at the Opera", bpm: 72, length: "5:55", rating: 5 },
                ],
            },
        },
    });
}

module.exports = {
    getPlaylistNames,
    playlistExists,
    getPlaylist,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    getTracks,
    getTrack,
    addTrack,
    updateTrack,
    deleteTrack,
    _reset,
};
