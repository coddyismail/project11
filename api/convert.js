import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";

ffmpeg.setFfmpegPath(ffmpegPath);

export default async function handler(req, res) {
  console.log("🎵 API convert triggered");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ error: "Missing fileUrl" });

    console.log("🔗 File URL:", fileUrl);

    // Temp file paths
    const tempInput = path.join(os.tmpdir(), `input_${Date.now()}.ogg`);
    const tempOutput = path.join(os.tmpdir(), `output_${Date.now()}.mp3`);

    // Step 1: Download Telegram file to disk
    console.log("📥 Downloading...");
    const response = await axios({
      url: fileUrl,
      method: "GET",
      responseType: "stream",
      timeout: 60000,
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tempInput);
      response.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log("✅ File saved locally:", tempInput);

    // Step 2: Convert to proper MP3 first (fixes Telegram-encoded OGG)
    const fixedInput = path.join(os.tmpdir(), `fixed_${Date.now()}.mp3`);
    await new Promise((resolve, reject) => {
      ffmpeg(tempInput)
        .setFfmpegPath(ffmpegPath)
        .noVideo()
        .audioCodec("libmp3lame")
        .audioBitrate("192k")
        .on("end", resolve)
        .on("error", reject)
        .save(fixedInput);
    });

    console.log("🔧 Pre-conversion successful:", fixedInput);

    // Step 3: Apply 8D effect
    await new Promise((resolve, reject) => {
      ffmpeg(fixedInput)
        .setFfmpegPath(ffmpegPath)
        .audioFilters("apulsator=hz=0.08")
        .audioCodec("libmp3lame")
        .audioBitrate("192k")
        .toFormat("mp3")
        .on("error", reject)
        .on("end", resolve)
        .save(tempOutput);
    });

    console.log("✅ 8D Conversion complete:", tempOutput);

    // Step 4: Send final audio
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=8d_audio.mp3");

    const stream = fs.createReadStream(tempOutput);
    stream.pipe(res);

    stream.on("close", () => {
      fs.unlink(tempInput, () => {});
      fs.unlink(tempOutput, () => {});
      fs.unlink(fixedInput, () => {});
    });
  } catch (err) {
    console.error("❌ Conversion failed:", err.message);
    res.status(500).json({ error: "Conversion failed: " + err.message });
  }
}