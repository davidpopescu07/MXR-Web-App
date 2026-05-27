const STARTER_TRACKS = [
    { title: "Xtal", artist: "Aphex Twin", album: "Selected Ambient Works 85-92", bpm: 115, length: "4:53", rating: 5 },
    { title: "Conceited", artist: "Remy Ma", album: "There's something about Remy", bpm: 100, length: "3:40", rating: 5 },
    { title: "Army of me", artist: "Bjork", album: "Post", bpm: 172, length: "3:45", rating: 5 },
    { title: "Born Slippy", artist: "Underworld", album: "1992-2012", bpm: 140, length: "7:36", rating: 5 },
    { title: "Bohemian Rhapsody", artist: "Queen", album: "A night at the Opera", bpm: 72, length: "5:55", rating: 5 },
];

async function createStarterPlaylist(prisma, userId) {
    return prisma.playlist.create({
        data: {
            name: "CoolPlaylist",
            userId,
            tracks: {
                create: STARTER_TRACKS,
            },
        },
    });
}

async function ensureStarterPlaylist(prisma, userId) {
    const count = await prisma.playlist.count({ where: { userId } });
    if (count > 0) return;

    await createStarterPlaylist(prisma, userId);
}

module.exports = { STARTER_TRACKS, createStarterPlaylist, ensureStarterPlaylist };
