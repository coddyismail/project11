import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);
<<<<<<< HEAD

export async function handler(req, res) {
  console.log("API convert triggered");
=======
>>>>>>> ed07c80 (Delete root bot.js and add updated api bot.js and convert.js)

export async function handler(req, res) {
  try {
<<<<<<< HEAD
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
=======
    console.log("API convert triggered");

    const { fileUrl, speed = 0.05, panDepth = 0.8 } = req.body;

    if (!fileUrl) {
      return res.status(400).send({ error: "fileUrl is required" });
    }

    console.log("📥 Downloading audio from:", fileUrl);

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });

    const inputPath = path.join("/tmp", "input_audio");
    const outputPath = path.join("/tmp", "converted_audio.wav");

    fs.writeFileSync(inputPath, Buffer.from(response.data));

    console.log("🎧 Converting with ffmpeg...");
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          "-vn",
          "-ar 44100",
          "-ac 2",
          "-filter_complex", `apulsator=hz=${speed}:depth=${panDepth}`
        ])
        .toFormat("wav")
        .save(outputPath)
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("✅ Conversion complete:", outputPath);

    const outputBuffer = fs.readFileSync(outputPath);
    res.setHeader("Content-Type", "audio/wav");
    return res.send(outputBuffer);
  } catch (err) {
    console.error("❌ Processing failed:", err);
    return res.status(500).send({ error: err.message });
>>>>>>> ed07c80 (Delete root bot.js and add updated api bot.js and convert.js)
  }
}
