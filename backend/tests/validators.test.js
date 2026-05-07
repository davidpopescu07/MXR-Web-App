const {
    validateCreateTrack,
    validateUpdateTrack,
    validatePlaylistName,
    parsePagination,
} = require("../validators/trackValidators");

describe("validateCreateTrack", () => {
    const valid = { title: "T", artist: "A", album: "AL", bpm: 120, length: "3:00", rating: 3 };

    it("passes a valid track", () => expect(validateCreateTrack(valid).valid).toBe(true));
    it("fails on null body", () => expect(validateCreateTrack(null).valid).toBe(false));
    it("fails on empty title", () => expect(validateCreateTrack({ ...valid, title: "" }).valid).toBe(false));
    it("fails on non-string title", () => expect(validateCreateTrack({ ...valid, title: 42 }).valid).toBe(false));
    it("fails on missing bpm", () => expect(validateCreateTrack({ ...valid, bpm: undefined }).valid).toBe(false));
    it("fails on bpm > 300", () => expect(validateCreateTrack({ ...valid, bpm: 301 }).valid).toBe(false));
    it("fails on bpm < 0", () => expect(validateCreateTrack({ ...valid, bpm: -1 }).valid).toBe(false));
    it("passes bpm = 0", () => expect(validateCreateTrack({ ...valid, bpm: 0 }).valid).toBe(true));
    it("passes bpm = 300", () => expect(validateCreateTrack({ ...valid, bpm: 300 }).valid).toBe(true));
    it("fails on rating > 5", () => expect(validateCreateTrack({ ...valid, rating: 6 }).valid).toBe(false));
    it("fails on rating < 0", () => expect(validateCreateTrack({ ...valid, rating: -1 }).valid).toBe(false));
    it("passes rating = 0", () => expect(validateCreateTrack({ ...valid, rating: 0 }).valid).toBe(true));
    it("fails on bad length format", () => expect(validateCreateTrack({ ...valid, length: "bad" }).valid).toBe(false));
    it("passes '--:--' length", () => expect(validateCreateTrack({ ...valid, length: "--:--" }).valid).toBe(true));
    it("passes '10:59' length", () => expect(validateCreateTrack({ ...valid, length: "10:59" }).valid).toBe(true));
    it("returns multiple errors", () => {
        const result = validateCreateTrack({ bpm: 999 });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
    });
});

describe("validateUpdateTrack", () => {
    it("passes empty body (all fields optional)", () => expect(validateUpdateTrack({}).valid).toBe(true));
    it("passes partial update", () => expect(validateUpdateTrack({ rating: 2 }).valid).toBe(true));
    it("fails on invalid rating", () => expect(validateUpdateTrack({ rating: 10 }).valid).toBe(false));
    it("fails on empty title string", () => expect(validateUpdateTrack({ title: "" }).valid).toBe(false));
    it("fails on null body", () => expect(validateUpdateTrack(null).valid).toBe(false));
    it("fails on bad length", () => expect(validateUpdateTrack({ length: "xx:yy" }).valid).toBe(false));
    it("passes valid bpm update", () => expect(validateUpdateTrack({ bpm: 140 }).valid).toBe(true));
});

describe("validatePlaylistName", () => {
    it("passes a valid name", () => expect(validatePlaylistName("MyPlaylist").valid).toBe(true));
    it("fails on empty string", () => expect(validatePlaylistName("").valid).toBe(false));
    it("fails on whitespace only", () => expect(validatePlaylistName("   ").valid).toBe(false));
    it("fails on null", () => expect(validatePlaylistName(null).valid).toBe(false));
    it("fails on undefined", () => expect(validatePlaylistName(undefined).valid).toBe(false));
    it("fails on name > 100 chars", () => expect(validatePlaylistName("a".repeat(101)).valid).toBe(false));
    it("passes name of exactly 100 chars", () => expect(validatePlaylistName("a".repeat(100)).valid).toBe(true));
});

describe("parsePagination", () => {
    it("returns defaults when no params given", () => {
        const r = parsePagination({});
        expect(r.valid).toBe(true);
        expect(r.page).toBe(1);
        expect(r.limit).toBe(5);
    });
    it("parses valid page and limit", () => {
        const r = parsePagination({ page: "2", limit: "10" });
        expect(r.valid).toBe(true);
        expect(r.page).toBe(2);
        expect(r.limit).toBe(10);
    });
    it("fails on page = 0", () => expect(parsePagination({ page: "0" }).valid).toBe(false));
    it("fails on page = -1", () => expect(parsePagination({ page: "-1" }).valid).toBe(false));
    it("fails on limit = 0", () => expect(parsePagination({ limit: "0" }).valid).toBe(false));
    it("fails on limit = 101", () => expect(parsePagination({ limit: "101" }).valid).toBe(false));
    it("fails on non-numeric page", () => expect(parsePagination({ page: "abc" }).valid).toBe(false));
    it("passes limit = 1", () => expect(parsePagination({ limit: "1" }).valid).toBe(true));
    it("passes limit = 100", () => expect(parsePagination({ limit: "100" }).valid).toBe(true));
});