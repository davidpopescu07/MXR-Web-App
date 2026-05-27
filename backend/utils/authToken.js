const crypto = require("crypto");

const TOKEN_COOKIE_NAME = "mxr.auth";

function getTokenSecret() {
    return process.env.AUTH_TOKEN_SECRET || process.env.SESSION_SECRET || "replace-this-dev-auth-token-secret";
}

function getSessionMaxAgeMs() {
    return Number(process.env.SESSION_MAX_AGE_MS || 15 * 60 * 1000);
}

function getCookieOptions() {
    const isSecure = process.env.COOKIE_SECURE === "true" || process.env.HTTPS_ENABLED === "true";

    return {
        httpOnly: true,
        maxAge: getSessionMaxAgeMs(),
        sameSite: isSecure ? "none" : "lax",
        secure: isSecure,
    };
}

function base64Url(input) {
    return Buffer.from(input).toString("base64url");
}

function sign(payload) {
    return crypto
        .createHmac("sha256", getTokenSecret())
        .update(payload)
        .digest("base64url");
}

function createAuthToken(user) {
    const payload = base64Url(JSON.stringify({
        sub: user.id,
        username: user.username,
        role: user.role,
        exp: Date.now() + getSessionMaxAgeMs(),
    }));
    const signature = sign(payload);

    return `${payload}.${signature}`;
}

function verifyAuthToken(token) {
    if (!token || typeof token !== "string" || !token.includes(".")) return null;

    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;

    const expected = sign(payload);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return null;
    }

    let claims;
    try {
        claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
        return null;
    }

    if (!claims.exp || claims.exp < Date.now()) return null;
    if (!claims.sub || !claims.username || !claims.role) return null;

    return claims;
}

function readCookie(req, name) {
    const header = req.headers.cookie;
    if (!header) return null;

    const cookies = header.split(";").map((cookie) => cookie.trim());
    const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));

    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

module.exports = {
    TOKEN_COOKIE_NAME,
    createAuthToken,
    verifyAuthToken,
    readCookie,
    getCookieOptions,
    getSessionMaxAgeMs,
};
