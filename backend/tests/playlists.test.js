const request = require("supertest");
const app = require("../app");
const store = require("../store");

beforeEach(() => store._reset());

describe("Playlist endpoints", () => {

    // ── GET /api/playlists ──────────────────────────────────────────────────────

    describe("GET /api/playlists", () => {
        it("200 – returns initial playlist names", async () => {
            const res = await request(app).get("/api/playlists");
            expect(res.status).toBe(200);
            expect(res.body.playlists).toContain("CoolPlaylist");
        });
    });

    // ── POST /api/playlists ─────────────────────────────────────────────────────

    describe("POST /api/playlists", () => {
        it("201 – creates a new playlist", async () => {
            const res = await request(app).post("/api/playlists").send({ name: "MyMix" });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe("MyMix");
            expect(res.body.tracks).toEqual([]);
        });

        it("400 – rejects missing name", async () => {
            const res = await request(app).post("/api/playlists").send({});
            expect(res.status).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        it("400 – rejects empty string name", async () => {
            const res = await request(app).post("/api/playlists").send({ name: "   " });
            expect(res.status).toBe(400);
        });

        it("400 – rejects name longer than 100 chars", async () => {
            const res = await request(app).post("/api/playlists").send({ name: "a".repeat(101) });
            expect(res.status).toBe(400);
        });

        it("409 – rejects duplicate playlist name", async () => {
            await request(app).post("/api/playlists").send({ name: "Dupe" });
            const res = await request(app).post("/api/playlists").send({ name: "Dupe" });
            expect(res.status).toBe(409);
        });
    });

    // ── GET /api/playlists/:name ────────────────────────────────────────────────

    describe("GET /api/playlists/:name", () => {
        it("200 – returns playlist metadata", async () => {
            const res = await request(app).get("/api/playlists/CoolPlaylist");
            expect(res.status).toBe(200);
            expect(res.body.name).toBe("CoolPlaylist");
            expect(typeof res.body.trackCount).toBe("number");
        });

        it("404 – unknown playlist", async () => {
            const res = await request(app).get("/api/playlists/NoSuchList");
            expect(res.status).toBe(404);
        });
    });

    // ── PUT /api/playlists/:name ────────────────────────────────────────────────

    describe("PUT /api/playlists/:name", () => {
        it("200 – renames a playlist", async () => {
            await request(app).post("/api/playlists").send({ name: "Old" });
            const res = await request(app).put("/api/playlists/Old").send({ name: "New" });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe("New");
        });

        it("200 – rename to same name is a no-op", async () => {
            const res = await request(app).put("/api/playlists/CoolPlaylist").send({ name: "CoolPlaylist" });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe("CoolPlaylist");
        });

        it("400 – invalid new name", async () => {
            const res = await request(app).put("/api/playlists/CoolPlaylist").send({ name: "" });
            expect(res.status).toBe(400);
        });

        it("404 – playlist not found", async () => {
            const res = await request(app).put("/api/playlists/Ghost").send({ name: "Other" });
            expect(res.status).toBe(404);
        });

        it("409 – new name already taken", async () => {
            await request(app).post("/api/playlists").send({ name: "Alpha" });
            await request(app).post("/api/playlists").send({ name: "Beta" });
            const res = await request(app).put("/api/playlists/Alpha").send({ name: "Beta" });
            expect(res.status).toBe(409);
        });
    });

    // ── DELETE /api/playlists/:name ─────────────────────────────────────────────

    describe("DELETE /api/playlists/:name", () => {
        it("204 – deletes a playlist", async () => {
            await request(app).post("/api/playlists").send({ name: "ToDelete" });
            const res = await request(app).delete("/api/playlists/ToDelete");
            expect(res.status).toBe(204);
        });

        it("404 – unknown playlist", async () => {
            const res = await request(app).delete("/api/playlists/NoSuchList");
            expect(res.status).toBe(404);
        });

        it("confirms deletion – subsequent GET returns 404", async () => {
            await request(app).post("/api/playlists").send({ name: "Gone" });
            await request(app).delete("/api/playlists/Gone");
            const res = await request(app).get("/api/playlists/Gone");
            expect(res.status).toBe(404);
        });
    });
});