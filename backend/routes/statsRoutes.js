const { Router } = require("express");
const { getStats } = require("../controllers/trackController");

const router = Router({ mergeParams: true });

router.get("/", getStats);

module.exports = router;