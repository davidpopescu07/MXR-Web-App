const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const assetFolder = file.mimetype.startsWith("image/") ? "artwork" : "audio";
        const dir = path.join(
            __dirname,
            "uploads",
            assetFolder
        );
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + path.extname(file.originalname));
    },
});

module.exports = multer({ storage });
