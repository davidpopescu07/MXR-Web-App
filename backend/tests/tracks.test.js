const request = require("supertest");
const app = require("../app");
const store = require("../store");

beforeEach(() => store._reset());

const BASE = "/api/playlists/CoolPlaylist/tracks";

const validTrack = {
    title: "Test Track",
    artist: "Test Artist",
    album: "Test Album",
    bpm: 128,
    length: "3:45",
    rating: 4,
};

// Helper: create a track and return its id
async function createTrack(overrides = {}) {
    const res = await request(app).post(BASE).send({ ...validTrack, ...overrides });
    return res.body;
}

describe("Track endpoints", () => {

    // ── GET /tracks (list + pagination + search) ────────────────────────────────

    describe("GET /api/playlists/:name/tracks", () => {
        it("200 – returns paginated tracks", async () => {
            const res = await request(app).get(BASE);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.total).toBeGreaterThanOrEqual(5); // seed data
        });

        it("paginates correctly – page 1 has up to 5 items by default", async () => {
            const res = await request(app).get(`${BASE}?page=1&limit=5`);
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeLessThanOrEqual(5);
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(5);
        });

        it("paginates correctly – page 2", async () => {
            // Add 6 more tracks so page 2 has data (5 seeded + 6 new = 11 total)
            for (let i = 0; i < 6; i++) await createTrack({ title: `Extra ${i}` });
            const res = await request(app).get(`${BASE}?page=2&limit=5`);
            expect(res.status).toBe(200);
            expect(res.body.pagination.page).toBe(2);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it("search filters by title", async () => {
            const res = await request(app).get(`${BASE}?search=xtal`);
            expect(res.status).toBe(200);
            expect(res.body.data.some((t) => t.title.toLowerCase().includes("xtal"))).toBe(true);
        });

        it("search filters by artist", async () => {
            const res = await request(app).get(`${BASE}?search=bjork`);
            expect(res.status).toBe(200);
            expect(res.body.data.some((t) => t.artist.toLowerCase().includes("bjork"))).toBe(true);
        });

        it("search filters by album", async () => {
            const res = await request(app).get(`${BASE}?search=post`);
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it("400 – invalid page param", async () => {
            const res = await request(app).get(`${BASE}?page=0`);
            expect(res.status).toBe(400);
        });

        it("400 – invalid limit param", async () => {
            const res = await request(app).get(`${BASE}?limit=999`);
            expect(res.status).toBe(400);
        });

        it("400 – non-numeric page param", async () => {
            const res = await request(app).get(`${BASE}?page=abc`);
            expect(res.status).toBe(400);
        });

        it("404 – unknown playlist", async () => {
            const res = await request(app).get("/api/playlists/NoSuchList/tracks");
            expect(res.status).toBe(404);
        });

        it("returns empty data array when search has no matches", async () => {
            const res = await request(app).get(`${BASE}?search=zzznomatch`);
            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
            expect(res.body.pagination.total).toBe(0);
        });
    });

    // ── GET /tracks/:id ─────────────────────────────────────────────────────────

    describe("GET /api/playlists/:name/tracks/:id", () => {
        it("200 – returns a specific track", async () => {
            const res = await request(app).get(`${BASE}/fake-1`);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe("fake-1");
        });

        it("404 – unknown track id", async () => {
            const res = await request(app).get(`${BASE}/no-such-id`);
            expect(res.status).toBe(404);
        });

        it("404 – unknown playlist", async () => {
            const res = await request(app).get("/api/playlists/Ghost/tracks/fake-1");
            expect(res.status).toBe(404);
        });
    });

    // ── POST /tracks ─────────────────────────────────────────────────────────────

    describe("POST /api/playlists/:name/tracks", () => {
        it("201 – creates a track and returns it with an id", async () => {
            const res = await request(app).post(BASE).send(validTrack);
            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.title).toBe("Test Track");
        });

        it("400 – missing title", async () => {
            const { title, ...rest } = validTrack;
            const res = await request(app).post(BASE).send(rest);
            expect(res.status).toBe(400);
            expect(res.body.errors.some((e) => e.includes("title"))).toBe(true);
        });

        it("400 – missing artist", async () => {
            const { artist, ...rest } = validTrack;
            const res = await request(app).post(BASE).send(rest);
            expect(res.status).toBe(400);
        });

        it("400 – missing album", async () => {
            const { album, ...rest } = validTrack;
            const res = await request(app).post(BASE).send(rest);
            expect(res.status).toBe(400);
        });

        it("400 – bpm out of range (> 300)", async () => {
            const res = await request(app).post(BASE).send({ ...validTrack, bpm: 999 });
            expect(res.status).toBe(400);
        });

        it("400 – bpm negative", async () => {
            const res = await request(app).post(BASE).send({ ...validTrack, bpm: -1 });
            expect(res.status).toBe(400);
        });

        it("400 – rating out of range (> 5)", async () => {
            const res = await request(app).post(BASE).send({ ...validTrack, rating: 6 });
            expect(res.status).toBe(400);
        });

        it("400 – rating negative", async () => {
            const res = await request(app).post(BASE).send({ ...validTrack, rating: -1 });
            expect(res.status).toBe(400);
        });

        it("400 – invalid length format", async () => {
            const res = await request(app).post(BASE).send({ ...validTrack, length: "badformat" });
            expect(res.status).toBe(400);
        });

        it("accepts '--:--' as a valid length", async () => {
            const res = await request(app).post(BASE).send({ ...validTrack, length: "--:--" });
            expect(res.status).toBe(201);
        });

        it("400 – empty body", async () => {
            const res = await request(app).post(BASE).send({});
            expect(res.status).toBe(400);
        });

        it("404 – unknown playlist", async () => {
            const res = await request(app).post("/api/playlists/Ghost/tracks").send(validTrack);
            expect(res.status).toBe(404);
        });

        it("trims whitespace from string fields", async () => {
            const res = await request(app)
                .post(BASE)
                .send({ ...validTrack, title: "  Trimmed  ", artist: "  Artist  " });
            expect(res.status).toBe(201);
            expect(res.body.title).toBe("Trimmed");
            expect(res.body.artist).toBe("Artist");
        });
    });

    // ── PUT /tracks/:id ──────────────────────────────────────────────────────────

    describe("PUT /api/playlists/:name/tracks/:id", () => {
        it("200 – updates allowed fields", async () => {
            const created = await createTrack();
            const res = await request(app).put(`${BASE}/${created.id}`).send({ title: "Updated", rating: 3 });
            expect(res.status).toBe(200);
            expect(res.body.title).toBe("Updated");
            expect(res.body.rating).toBe(3);
        });

        it("200 – partial update leaves other fields unchanged", async () => {
            const created = await createTrack();
            const res = await request(app).put(`${BASE}/${created.id}`).send({ rating: 2 });
            expect(res.status).toBe(200);
            expect(res.body.title).toBe(validTrack.title);
            expect(res.body.rating).toBe(2);
        });

        it("400 – invalid rating in update", async () => {
            const created = await createTrack();
            const res = await request(app).put(`${BASE}/${created.id}`).send({ rating: 10 });
            expect(res.status).toBe(400);
        });

        it("400 – invalid bpm in update", async () => {
            const created = await createTrack();
            const res = await request(app).put(`${BASE}/${created.id}`).send({ bpm: -5 });
            expect(res.status).toBe(400);
        });

        it("400 – empty title in update", async () => {
            const created = await createTrack();
            const res = await request(app).put(`${BASE}/${created.id}`).send({ title: "   " });
            expect(res.status).toBe(400);
        });

        it("404 – unknown track", async () => {
            const res = await request(app).put(`${BASE}/no-such-id`).send({ rating: 3 });
            expect(res.status).toBe(404);
        });

        it("404 – unknown playlist", async () => {
            const res = await request(app).put("/api/playlists/Ghost/tracks/fake-1").send({ rating: 3 });
            expect(res.status).toBe(404);
        });
    });

    // ── DELETE /tracks/:id ───────────────────────────────────────────────────────

    describe("DELETE /api/playlists/:name/tracks/:id", () => {
        it("204 – deletes an existing track", async () => {
            const created = await createTrack();
            const res = await request(app).delete(`${BASE}/${created.id}`);
            expect(res.status).toBe(204);
        });

        it("confirms deletion – subsequent GET returns 404", async () => {
            const created = await createTrack();
            await request(app).delete(`${BASE}/${created.id}`);
            const res = await request(app).get(`${BASE}/${created.id}`);
            expect(res.status).toBe(404);
        });

        it("404 – unknown track", async () => {
            const res = await request(app).delete(`${BASE}/no-such-id`);
            expect(res.status).toBe(404);
        });

        it("404 – unknown playlist", async () => {
            const res = await request(app).delete("/api/playlists/Ghost/tracks/fake-1");
            expect(res.status).toBe(404);
        });
    });

    // ── GET /stats ───────────────────────────────────────────────────────────────

    describe("GET /api/playlists/:name/stats", () => {
        it("200 – returns stats object with expected fields", async () => {
            const res = await request(app).get("/api/playlists/CoolPlaylist/stats");
            expect(res.status).toBe(200);
            expect(typeof res.body.trackCount).toBe("number");
            expect(typeof res.body.totalDurationSeconds).toBe("number");
            expect(typeof res.body.totalDurationFormatted).toBe("string");
            expect(typeof res.body.averageRating).toBe("number");
            expect(typeof res.body.averageBpm).toBe("number");
            expect(Array.isArray(res.body.topRatedTracks)).toBe(true);
        });

        it("stats trackCount matches actual track count", async () => {
            const listRes = await request(app).get(`${BASE}?limit=100`);
            const statsRes = await request(app).get("/api/playlists/CoolPlaylist/stats");
            expect(statsRes.body.trackCount).toBe(listRes.body.pagination.total);
        });

        it("topRatedTracks has at most 5 items", async () => {
            const res = await request(app).get("/api/playlists/CoolPlaylist/stats");
            expect(res.body.topRatedTracks.length).toBeLessThanOrEqual(5);
        });

        it("averageRating is 0 for empty playlist", async () => {
            await request(app).post("/api/playlists").send({ name: "Empty" });
            const res = await request(app).get("/api/playlists/Empty/stats");
            expect(res.status).toBe(200);
            expect(res.body.averageRating).toBe(0);
            expect(res.body.trackCount).toBe(0);
        });

        it("404 – unknown playlist", async () => {
            const res = await request(app).get("/api/playlists/Ghost/stats");
            expect(res.status).toBe(404);
        });
    });

    // ── Misc ─────────────────────────────────────────────────────────────────────

    describe("Misc", () => {
        it("GET /api/health returns 200", async () => {
            const res = await request(app).get("/api/health");
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("ok");
        });

        it("unknown route returns 404", async () => {
            const res = await request(app).get("/api/nonexistent");
            expect(res.status).toBe(404);
        });
    });
});