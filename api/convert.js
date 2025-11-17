import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { Readable } from "stream";

ffmpeg.setFfmpegPath(ffmpegPath);

export default async function handler(req, res) {
  console.log("🎵 API convert triggered");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileUrl, speed = 0.05, panDepth = 0.8 } = req.body;
    if (!fileUrl) {
      return res.status(400).json({ error: "Missing fileUrl" });
    }

    console.log("🔗 File URL:", fileUrl);
    console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

    // Download audio
    console.log("📥 Downloading audio...");
    const audioResponse = await axios({
      method: "GET",
      url: fileUrl,
      responseType: "arraybuffer",
      timeout: 45000
    });

    console.log("✅ Audio downloaded, size:", audioResponse.data.length, "bytes");

    const inputStream = Readable.from(audioResponse.data);

    // Process with ffmpeg (basic 8D pan effect)
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=8d_audio.mp3");

    ffmpeg(inputStream)
      .audioFilters([
        {
          filter: "apulsator",
          options: { hz: 0.125 } // creates rotating pan effect
        }
      ])
      .format("mp3")
      .on("start", cmd => console.log("🎧 FFmpeg started:", cmd))
      .on("error", err => {
        console.error("❌ Conversion failed:", err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: "Conversion failed: " + err.message });
        }
      })
      .on("end", () => console.log("✅ Conversion complete"))
      .pipe(res, { end: true });

  } catch (err) {
    console.error("❌ Processing failed:", err.message);

    if (err.code === "ECONNABORTED") {
      return res.status(408).json({ error: "Download timeout" });
    }
    if (err.response?.status === 404) {
      return res.status(404).json({ error: "Audio file not found" });
    }

    res.status(500).json({ error: "Conversion failed: " + err.message });
  }
}