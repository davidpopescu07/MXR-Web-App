const express = require("express");
const cors = require("cors");
const session = require("express-session");

const playlistRoutes = require("./routes/playlistRoutes");
const statsRoutes = require("./routes/statsRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

const path = require("path");
const fs   = require("fs");

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Global middleware
app.use(cors({ origin: true, credentials: true }));
app.use("/uploads", express.static(uploadsDir));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || "mxr-dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        sameSite: "lax",
        secure: false,
    },
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
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
