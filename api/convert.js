import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

export default async function handler(req, res) {
  console.log("API convert triggered");

  if (req.method !== "POST") {
    return res.status(200).send("Convert API is running...");
  }

  try {
    const { fileUrl, speed, panDepth } = req.body;
    console.log("🔗 File URL:", fileUrl);
    console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

    console.log("📥 Downloading audio...");
    const audioRes = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const inputBuffer = Buffer.from(audioRes.data);

    const inputPath = path.join("/tmp", "input_audio");
    const outputPath = path.join("/tmp", "output_audio.mp3");
    fs.writeFileSync(inputPath, inputBuffer);

    console.log("🎧 Converting audio...");
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(`apulsator=hz=${speed}`)
        .outputOptions("-y")
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ Conversion complete");
    const outputBuffer = fs.readFileSync(outputPath);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(outputBuffer);
  } catch (err) {
    console.error("❌ Processing failed:", err.message);
    res.status(500).json({ error: err.message });
  }
}
