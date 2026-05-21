const {
    TOKEN_COOKIE_NAME,
    createAuthToken,
    getCookieOptions,
    readCookie,
    verifyAuthToken,
} = require("../utils/authToken");

function refreshAuth(req, res) {
    const token = createAuthToken({
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role,
    });

    req.session.authToken = token;
    res.cookie(TOKEN_COOKIE_NAME, token, getCookieOptions());
}

function requireAuth(req, res, next) {
    if (!req.session?.userId)
        return res.status(401).json({ errors: ["not authenticated"] });

    const claims = verifyAuthToken(readCookie(req, TOKEN_COOKIE_NAME));
    if (!claims || claims.sub !== req.session.userId || claims.role !== req.session.role)
        return res.status(401).json({ errors: ["invalid authentication token"] });

    refreshAuth(req, res);
    next();
}
function requireAdmin(req, res, next) {
    if (!req.session?.userId)
        return res.status(401).json({ errors: ["not authenticated"] });

    const claims = verifyAuthToken(readCookie(req, TOKEN_COOKIE_NAME));
    if (!claims || claims.sub !== req.session.userId || claims.role !== req.session.role)
        return res.status(401).json({ errors: ["invalid authentication token"] });

    if (req.session.role !== "ADMIN")
        return res.status(403).json({ errors: ["admin access required"] });

    refreshAuth(req, res);
    next();
}
module.exports = { requireAuth , requireAdmin};
