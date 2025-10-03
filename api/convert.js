import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath);

// Helper function to create 8D audio effect filter
function create8DFilter(speed = 0.05, panDepth = 0.8) {
  // Convert speed from Hz to radians per sample
  // The React code uses time-based calculation: Math.sin(time * 2 * Math.PI * speed)
  // In FFmpeg, we can achieve this using the 'pan' filter with dynamic channel mixing
  
  const speedRad = speed * 2 * Math.PI;
  
  // Create a complex pan filter that simulates the 8D effect
  // We'll use the 'aecho' and 'pan' filters together to create the rotating effect
  const filters = [
    // Split into left and right for processing
    'asplit=2[left][right]',
    
    // Apply 8D effect using pan with sinusoidal modulation
    `[left][right]amerge=inputs=2,pan=stereo|FL < 1.0*FL + 0.0*FR|FR < 0.0*FL + 1.0*FR,apulsator=hz=${speed}:offset=${panDepth}`,
    
    // Add some spatial enhancement
    `aecho=0.8:0.8:${100 * speed}:0.5`
  ];

  return filters;
}

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

    // Convert audio with the same 8D effect logic as React component
    console.log("🎧 Converting audio to 8D...");
    
    await new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .audioFilters([
          // Main 8D effect - using apulsator for the panning effect
          // This replicates the sinusoidal panning from the React code
          `apulsator=hz=${speed}:offset=${panDepth}`,
          
          // Add some stereo enhancement to make the effect more pronounced
          `stereowiden=level_in=1.0:level_out=1.0:delay=10:width=80`,
          
          // Optional: Add slight reverb for spatial effect
          `aecho=0.8:0.8:${50 * speed}:0.3`,
          
          // Ensure proper stereo output
          `pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1`
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

      command.save(outputPath);
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