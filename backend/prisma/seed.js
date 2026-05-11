const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const playlist = await prisma.playlist.upsert({
        where: { name: "CoolPlaylist" },
        update: {},
        create: {
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
    console.log("Seeded:", playlist.name);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());