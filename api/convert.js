import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: true
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Convert API is running...");
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    console.error("❌ Invalid JSON body:", err);
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { fileUrl, speed, panDepth } = body || {};
  if (!fileUrl) {
    return res.status(400).json({ error: "fileUrl is missing" });
  }

  console.log("API convert triggered");
  console.log("📥 Downloading audio from:", fileUrl);
  console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

  const tempInput = path.join("/tmp", "input_audio");
  const tempOutput = path.join("/tmp", "output_audio.mp3");

  try {
    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(tempInput, Buffer.from(response.data));

    console.log("🎧 Converting audio...");
    ffmpeg(tempInput)
      .setFfmpegPath(ffmpegPath)
      .audioFilters(`apulsator=hz=${speed * 2}`)
      .save(tempOutput)
      .on("end", () => {
        console.log("✅ Conversion done");
        const fileData = fs.readFileSync(tempOutput);
        res.setHeader("Content-Type", "audio/mpeg");
        return res.send(fileData);
      })
      .on("error", (err) => {
        console.error("❌ Processing failed:", err.message);
        return res.status(500).json({ error: err.message });
      });

  } catch (err) {
    console.error("❌ Download or processing failed:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
