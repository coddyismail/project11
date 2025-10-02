import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

ffmpeg.setFfmpegPath(ffmpegPath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  console.log("API convert triggered");

  try {
    const { fileUrl, speed, panDepth } = req.body;
    console.log("🔗 File URL:", fileUrl);
    console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

    console.log("📥 Downloading audio...");
    const audioResp = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const inputPath = path.join(__dirname, "input_audio");
    fs.writeFileSync(inputPath, Buffer.from(audioResp.data));

    const outputPath = path.join(__dirname, "output_8d.mp3");

    console.log("🎧 Processing with ffmpeg...");
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilter(`apulsator=hz=${panDepth * 0.5}:depth=${speed}`)
        .on("end", () => {
          console.log("✅ Conversion complete");
          resolve();
        })
        .on("error", (err) => {
          console.error("❌ ffmpeg processing error:", err);
          reject(err);
        })
        .save(outputPath);
    });

    const outputBuffer = fs.readFileSync(outputPath);
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(outputBuffer);

    // Clean up temp files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

  } catch (err) {
    console.error("❌ Processing failed:", err.message || err);
    res.status(500).json({ error: err.message || "Processing failed" });
  }
}
