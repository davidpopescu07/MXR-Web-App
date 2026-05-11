const store = require("../store");
const {
    validateCreateTrack,
    validateUpdateTrack,
    parsePagination,
} = require("../validators/trackValidators");

async function playlistGuard(res, name) {
    if (!await store.playlistExists(name)) {
        res.status(404).json({ errors: [`Playlist "${name}" not found`] });
        return false;
    }
    return true;
}

async function listTracks(req, res) {
    if (!await playlistGuard(res, req.params.name)) return;

    const pagination = parsePagination(req.query);
    if (!pagination.valid) return res.status(400).json({ errors: pagination.errors });

    const { page, limit } = pagination;
    const search = (req.query.search ?? "").toLowerCase().trim();

    let tracks = store.getTracks(req.params.name);

    if (search) {
        tracks = tracks.filter(
            (t) =>
                t.title.toLowerCase().includes(search) ||
                t.artist.toLowerCase().includes(search) ||
                t.album.toLowerCase().includes(search)
        );
    }

    const total = tracks.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const data = tracks.slice((safePage - 1) * limit, safePage * limit);

    return res.status(200).json({
        data,
        pagination: { page: safePage, limit, total, totalPages },
    });
}

async function getTrack(req, res) {
    if (!await playlistGuard(res, req.params.name)) return;

    const track = await store.getTrack(req.params.name, req.params.id);
    if (!track) return res.status(404).json({ errors: [`Track "${req.params.id}" not found`] });

    return res.status(200).json(track);
}

async function createTrack(req, res) {
    if (!await playlistGuard(res, req.params.name)) return;

    const validation = await validateCreateTrack(req.body);
    if (!validation.valid) return res.status(400).json({ errors: validation.errors });

    const { title, artist, album, bpm, length, rating, artwork = null } = req.body;
    const track = await store.addTrack(req.params.name, {
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
        bpm: Number(bpm),
        length,
        rating: Number(rating),
        artwork,
    });

    return res.status(201).json(track);
}

async function updateTrack(req, res) {
    if (!await playlistGuard(res, req.params.name)) return;

    const existing = await store.getTrack(req.params.name, req.params.id);
    if (!existing) return res.status(404).json({ errors: [`Track "${req.params.id}" not found`] });

    const validation = await validateUpdateTrack(req.body);
    if (!validation.valid) return res.status(400).json({ errors: validation.errors });

    const allowed = ["title", "artist", "album", "bpm", "length", "rating", "artwork"];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) {
            updates[key] =
                typeof req.body[key] === "string" && ["title", "artist", "album"].includes(key)
                    ? req.body[key].trim()
                    : ["bpm", "rating"].includes(key)
                        ? Number(req.body[key])
                        : req.body[key];
        }
    }

    const updated = await store.updateTrack(req.params.name, req.params.id, updates);
    return res.status(200).json(updated);
}

async function deleteTrack(req, res) {
    if (!await playlistGuard(res, req.params.name)) return;

    const deleted = await store.deleteTrack(req.params.name, req.params.id);
    if (!deleted) return res.status(404).json({ errors: [`Track "${req.params.id}" not found`] });

    return res.status(204).send();
}

async function getStats(req, res) {
    if (!await playlistGuard(res, req.params.name)) return;

    const tracks = await store.getTracks(req.params.name);

    let totalSeconds = 0;
    for (const t of tracks) {
        if (t.length && t.length !== "--:--") {
            const [m, s] = t.length.split(":").map(Number);
            totalSeconds += m * 60 + s;
        }
    }

    const ratings = tracks.filter((t) => t.rating > 0).map((t) => t.rating);
    const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const bpms = tracks.filter((t) => t.bpm && t.bpm !== "-").map((t) => Number(t.bpm));
    const avgBpm = bpms.length ? bpms.reduce((a, b) => a + b, 0) / bpms.length : 0;

    return res.status(200).json({
        trackCount: tracks.length,
        totalDurationSeconds: totalSeconds,
        totalDurationFormatted: `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`,
        averageRating: Math.round(avgRating * 100) / 100,
        averageBpm: Math.round(avgBpm * 100) / 100,
        topRatedTracks: [...tracks]
            .filter((t) => t.rating > 0)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 5)
            .map(({ id, title, artist, rating }) => ({ id, title, artist, rating })),
    });
}

module.exports = { listTracks, getTrack, createTrack, updateTrack, deleteTrack, getStats };