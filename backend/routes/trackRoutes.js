const { Router } = require("express");
const {
    listTracks,
    getTrack,
    createTrack,
    updateTrack,
    deleteTrack,
    getStats,
} = require("../controllers/trackController");

const router = Router({ mergeParams: true });

router.get("/",      listTracks);
router.post("/",     createTrack);
router.get("/:id",   getTrack);
router.put("/:id",   updateTrack);
router.delete("/:id", deleteTrack);

module.exports = router;