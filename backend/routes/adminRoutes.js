const { Router } = require("express");
const { requireAdmin } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const router = Router();

// All admin routes require admin role
router.use(requireAdmin);

// List all users
router.get("/users", async (req, res) => {
    const users = await prisma.user.findMany({
        select: { id: true, username: true, email: true, role: true, createdAt: true }
    });
    return res.status(200).json({ users });
});

// Delete a user
router.delete("/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (id === req.session.userId)
        return res.status(400).json({ errors: ["cannot delete yourself"] });
    await prisma.user.delete({ where: { id } });
    return res.status(204).send();
});

// List all playlists across all users
router.get("/playlists", async (req, res) => {
    const playlists = await prisma.playlist.findMany({
        include: {
            user: { select: { username: true } },
            _count: { select: { tracks: true } }
        },
        orderBy: { createdAt: "desc" }
    });
    return res.status(200).json({ playlists });
});

// Delete any playlist
router.delete("/playlists/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    await prisma.playlist.delete({ where: { id } });
    return res.status(204).send();
});

// Promote user to admin
router.put("/users/:id/role", async (req, res) => {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    if (!["USER", "ADMIN"].includes(role))
        return res.status(400).json({ errors: ["role must be USER or ADMIN"] });
    const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: { id: true, username: true, role: true }
    });
    return res.status(200).json(user);
});

module.exports = router;