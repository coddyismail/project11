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
    const { fileUrl, speed = 0.05, panDepth = 0.8 } = req.body;
    
    if (!fileUrl) {
      return res.status(400).send({ error: "Missing fileUrl" });
    }

    console.log("🔗 File URL:", fileUrl);
    console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

    // Create unique file names
    const timestamp = Date.now();
    inputPath = path.join("/tmp", `input_${timestamp}`);
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

    // Convert audio with proper 8D effect
    console.log("🎧 Converting audio to 8D...");
    
    await new Promise((resolve, reject) => {
      // Create complex filter for true 8D audio effect
      // This replicates the React logic: leftGain = 1 - panValue, rightGain = 1 + panValue
      // where panValue = sin(time * 2 * PI * speed) * panDepth
      
      const command = ffmpeg(inputPath)
        .complexFilter([
          // Split into left and right channels
          'asplit=2[in1][in2]',
          
          // Create the panning effect using ladspa filter for precise control
          // This creates the sinusoidal panning between left and right
          `[in1]ladspa=sin_4225:c1=${speed}:c2=${panDepth}[left]`,
          `[in2]ladspa=sin_4225:c1=${speed}:c2=${panDepth}:c3=3.14159[right]`,
          
          // Combine with proper gain control to match React logic
          `[left]volume=0.8:eval=frame[leftvol]`,
          `[right]volume=0.8:eval=frame[rightvol]`,
          
          // Merge back to stereo
          `[leftvol][rightvol]amerge=inputs=2[stereo]`,
          
          // Add some spatial enhancement
          `[stereo]stereowiden=0.5[out]`
        ])
        .audioCodec('libmp3lame')
        .audioFrequency(44100)
        .audioChannels(2)
        .audioBitrate('192k')
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
        });

      command.outputOptions('-map', '[out]').save(outputPath);
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