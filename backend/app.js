const express = require("express");
const cors = require("cors");

const playlistRoutes = require("./routes/playlistRoutes");
const statsRoutes = require("./routes/statsRoutes");

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/playlists", playlistRoutes);

// Stats: /api/playlists/:name/stats  (separate mount so mergeParams works cleanly)
app.use("/api/playlists/:name/stats", statsRoutes);

// Health check
app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok" }));

// 404 catch-all
app.use((_req, res) => res.status(404).json({ errors: ["Route not found"] }));

//  Global error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ errors: ["Internal server error"] });
});

module.exports = app;