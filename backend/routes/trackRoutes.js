const { Router } = require("express");
const {
    listTracks,
    getTrack,
    createTrack,
    updateTrack,
    deleteTrack,
    getStats,
} = require("../controllers/trackController");
const upload = require("../upload");

const router = Router({ mergeParams: true });

router.get("/",      listTracks);
router.post(
    "/",
    upload.fields([
        { name: "audioFile", maxCount: 1 },
        { name: "artworkFile", maxCount: 1 },
    ]),
    createTrack
);
router.get("/:id",   getTrack);
router.put("/:id",   updateTrack);
router.delete("/:id", deleteTrack);

module.exports = router;
