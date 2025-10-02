import fs from "fs";
import path from "path";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Convert API is running...");
  }

  try {
    const { fileUrl, speed, panDepth } = req.body;
    if (!fileUrl) return res.status(400).json({ error: "fileUrl is required" });

    console.log("API convert triggered");
    console.log("🔗 File URL:", fileUrl);
    console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

    // Download file
    console.log("📥 Downloading audio...");
    const audioResponse = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const inputBuffer = Buffer.from(audioResponse.data);

    const inputPath = path.join("/tmp", "input.mp3");
    const outputPath = path.join("/tmp", "output.mp3");

    fs.writeFileSync(inputPath, inputBuffer);

    console.log("🎧 Converting audio...");
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters([
          `apulsator=hz=0.3`,
          `atempo=${speed || 1.0}`,
        ])
        .on("error", (err) => reject(err))
        .on("end", () => resolve(true))
        .save(outputPath);
    });

    console.log("✅ Conversion complete");
    const outputBuffer = fs.readFileSync(outputPath);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(outputBuffer);
  } catch (err) {
    console.error("❌ Conversion failed", err);
    res.status(500).json({ error: err.message });
  }
}
