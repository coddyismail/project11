import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

export default async function handler(req, res) {
  console.log("🎵 API convert triggered");

  if (req.method !== "POST") {
    return res.status(405).send({ error: "Method not allowed" });
  }

  let inputPath = null;
  let outputPath = null;

  try {
    const { fileUrl, speed = 0.8 } = req.body;
    
    if (!fileUrl) {
      return res.status(400).send({ error: "Missing fileUrl" });
    }

    console.log("🔗 File URL:", fileUrl);

    // Create unique file names
    const timestamp = Date.now();
    inputPath = path.join("/tmp", `input_${timestamp}.oga`);
    outputPath = path.join("/tmp", `output_${timestamp}.mp3`);

    // Download the audio file
    console.log("📥 Downloading audio...");
    const audioResp = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'arraybuffer',
      timeout: 30000
    });

    fs.writeFileSync(inputPath, audioResp.data);
    console.log("✅ Audio downloaded");

    // Convert audio with 8D effect using tremolo for panning
    console.log("🎧 Converting audio to 8D...");
    const clampedSpeed = Math.max(0.5, Math.min(parseFloat(speed), 2.0));
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters([
          // 8D audio effect using tremolo for auto-panning
          `tremolo=f=0.5:d=0.8`,
          `atempo=${clampedSpeed}`
        ])
        .audioCodec('libmp3lame')
        .audioFrequency(44100)
        .audioChannels(2)
        .audioBitrate('128k')
        .on("start", (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`Processing: ${Math.round(progress.percent)}% done`);
          }
        })
        .on("error", (err) => {
          console.error("❌ Conversion failed:", err);
          reject(err);
        })
        .on("end", () => {
          console.log("✅ Conversion complete");
          resolve(true);
        })
        .save(outputPath);
    });

    // Send the converted file
    const outputBuffer = fs.readFileSync(outputPath);
    console.log(`📁 Output size: ${outputBuffer.length} bytes`);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=8d_audio.mp3");
    res.send(outputBuffer);

  } catch (err) {
    console.error("❌ Processing failed:", err.message);
    console.error(err.stack);
    
    res.status(500).send({ 
      error: "Conversion failed: " + err.message 
    });
  } finally {
    // Clean up temporary files
    try {
      if (inputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
      if (outputPath && fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (cleanupErr) {
      console.error("Error cleaning up files:", cleanupErr.message);
    }
  }
}