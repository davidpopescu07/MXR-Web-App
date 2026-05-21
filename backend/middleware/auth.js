function requireAuth(req, res, next) {
    if (!req.session?.userId)
        return res.status(401).json({ errors: ["not authenticated"] });
    next();
}
function requireAdmin(req, res, next) {
    if (!req.session?.userId)
        return res.status(401).json({ errors: ["not authenticated"] });
    if (req.session.role !== "ADMIN")
        return res.status(403).json({ errors: ["admin access required"] });
    next();
}
module.exports = { requireAuth , requireAdmin};