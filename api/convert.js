import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

export async function handler(req, res) {
  console.log("API convert triggered");

  try {
    const { fileUrl, speed, panDepth } = req.body;
    console.log("🔗 File URL:", fileUrl);
    console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

    console.log("📥 Downloading audio...");
    const audioResp = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const inputBuffer = Buffer.from(audioResp.data);

    const inputFilePath = path.join("/tmp", "input_audio");
    const outputFilePath = path.join("/tmp", "output_audio.mp3");

    fs.writeFileSync(inputFilePath, inputBuffer);

    console.log("🎧 Converting with ffmpeg...");
    await new Promise((resolve, reject) => {
      ffmpeg(inputFilePath)
        .audioFilters(`apulsator=hz=${speed}`)
        .on("error", (err) => reject(err))
        .on("end", () => resolve())
        .save(outputFilePath);
    });

    console.log("✅ Conversion complete");

    const outputBuffer = fs.readFileSync(outputFilePath);
    res.status(200).send(outputBuffer);

  } catch (err) {
    console.error("❌ Processing failed:", err.message);
    res.status(500).send({ error: err.message });
  }
}
