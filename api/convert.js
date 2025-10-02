import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

export default async function handler(req, res) {
  console.log("API convert triggered");

  if (req.method !== "POST") {
    return res.status(200).send({ error: "Invalid method" });
  }

  try {
    const { fileUrl, speed = 1.0, panDepth = 0.8 } = req.body || {};
    if (!fileUrl) {
      return res.status(400).send({ error: "Missing fileUrl" });
    }

    console.log("🔗 File URL:", fileUrl);
    console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

    const inputPath = path.join("/tmp", "input_audio");
    const outputPath = path.join("/tmp", "output_audio.mp3");

    console.log("📥 Downloading audio...");
    const audioResp = await axios.get(fileUrl, { responseType: "arraybuffer" });
    fs.writeFileSync(inputPath, Buffer.from(audioResp.data));

    console.log("🎧 Converting audio...");
    const clampedSpeed = Math.max(0.5, Math.min(speed, 2.0));
    console.log("⚡ Using clamped speed:", clampedSpeed);

    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters([
          `apulsator=hz=0.3`,
          `atempo=${clampedSpeed}`,
        ])
        .on("error", (err) => {
          console.error("❌ Conversion failed", err);
          reject(err);
        })
        .on("end", () => {
          console.log("✅ Conversion complete");
          resolve(true);
        })
        .save(outputPath);
    });

    const outputBuffer = fs.readFileSync(outputPath);
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(outputBuffer);

    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

  } catch (err) {
    console.error("❌ Processing failed:", err);
    res.status(500).send({ error: err.message });
  }
}
