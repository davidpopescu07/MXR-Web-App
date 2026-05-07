const { Router } = require("express");
const {
    listPlaylists,
    createPlaylist,
    getPlaylist,
    renamePlaylist,
    deletePlaylist,
} = require("../controllers/playlistController");

const trackRouter = require("./trackRoutes");

const router = Router();

router.get("/",          listPlaylists);
router.post("/",         createPlaylist);
router.get("/:name",     getPlaylist);
router.put("/:name",     renamePlaylist);
router.delete("/:name",  deletePlaylist);

router.use("/:name/tracks", (req, res, next) => {

    req.params.name = req.params.name;
    next();
}, trackRouter);

module.exports = router;