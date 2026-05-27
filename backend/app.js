const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { requireAuth } = require("./middleware/auth");

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
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.set("trust proxy", 1);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
app.use("/uploads", express.static(uploadsDir));
app.use(express.json());

const isHttps = process.env.HTTPS_ENABLED === "true";
const cookieSecure = process.env.COOKIE_SECURE === "true" || isHttps;
const sessionMaxAgeMs = Number(process.env.SESSION_MAX_AGE_MS || 15 * 60 * 1000);

if ((isHttps || cookieSecure) && (!process.env.SESSION_SECRET || !process.env.AUTH_TOKEN_SECRET)) {
    throw new Error("Secure auth requires SESSION_SECRET and AUTH_TOKEN_SECRET");
}

const sessionStore = process.env.DATABASE_URL
    ? new pgSession({
        conString: process.env.DATABASE_URL,
        tableName: "user_sessions",
        createTableIfMissing: true,
    })
    : undefined;

app.use(session({
    secret: process.env.SESSION_SECRET || "replace-this-dev-session-secret",
    name: "mxr.sid",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        maxAge: sessionMaxAgeMs,
        sameSite: cookieSecure ? "none" : "lax",
        secure: cookieSecure,
    },
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// Stats: /api/playlists/:name/stats  (separate mount so mergeParams works cleanly)
app.use("/api/playlists/:name/stats", requireAuth, statsRoutes);
app.use("/api/playlists", requireAuth, playlistRoutes);

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
