const { Router } = require("express");
const { signup, login, logout, me } = require("../controllers/authController");

const router = Router();
const attempts = new Map();

function authRateLimit(req, res, next) {
    const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
    const maxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX || 20);
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = attempts.get(key) || { count: 0, resetAt: now + windowMs };

    if (entry.resetAt <= now) {
        entry.count = 0;
        entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    attempts.set(key, entry);

    if (entry.count > maxAttempts) {
        return res.status(429).json({ errors: ["too many authentication attempts, try again later"] });
    }

    next();
}

router.post("/signup", authRateLimit, signup);
router.post("/login",  authRateLimit, login);
router.post("/logout", logout);
router.get("/me",      me);

module.exports = router;
