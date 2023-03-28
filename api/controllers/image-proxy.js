const bent = require("bent");
const getBuffer = bent("buffer");
const { http, https } = require("follow-redirects");
const icoToPng = require("ico-to-png");
const path = require("path");
const fs = require("fs");

module.exports = async function proxy(req, res) {
  let url = req.params[0];
  const httpClient = url.startsWith("https") ? https : http;
  const request = httpClient.get(url, async (response) => {
    try {
      let buffer = await getBuffer(response.responseUrl);
      const mimeType = response.headers["content-type"];
      if (mimeType === "image/x-icon" || url.endsWith(".ico")) {
        const pngData = await icoToPng(buffer, 48);
        res.set("Content-Type", "image/png");
        res.send(pngData);
      } else {
        res.set("Content-Type", mimeType);
        res.send(buffer);
      }
    } catch (error) {
      res.status(500).send("Error retrieving the image");
    }
  });
  request.on("error", (e) => {
    switch (e.code) {
      case "ETIMEDOUT":
        res.status(408);
        break;
      case "ENOTFOUND":
        console.log(`Cannot retrieve ${url}`);
        const filePath = path.join(
          __dirname,
          "/assets/images/",
          "weakness.png"
        );
        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.status(404);
          } else {
            res.set("Content-Type", "image/png");
            res.send(data);
          }
        });
        break;
      default:
        res.status(500);
    }
    console.log(`code: ${e.code}`);
    console.log(`name: ${e.name}`);
    console.log(`message: ${e.message}`);
    res.send("Error retrieving the image");
  });
};
