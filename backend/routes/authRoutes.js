const { Router } = require("express");
const { signup, login, logout, me } = require("../controllers/authController");

const router = Router();

router.post("/signup", signup);
router.post("/login",  login);
router.post("/logout", logout);
router.get("/me",      me);

module.exports = router;