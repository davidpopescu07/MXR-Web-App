require("dotenv").config();
const fs = require("fs");
const https = require("https");
const app  = require("./app");

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const useHttps = process.env.HTTPS_ENABLED === "true";

if (useHttps) {
    const keyPath = process.env.SSL_KEY_PATH;
    const certPath = process.env.SSL_CERT_PATH;

    if (!keyPath || !certPath) {
        throw new Error("HTTPS_ENABLED=true requires SSL_KEY_PATH and SSL_CERT_PATH");
    }

    const credentials = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
    };

    https.createServer(credentials, app).listen(PORT, HOST, () => {
        console.log(`MXR backend running at https://${HOST}:${PORT}`);
    });
} else {
    app.listen(PORT, HOST, () => {
        console.log(`MXR backend running at http://${HOST}:${PORT}`);
    });
}
