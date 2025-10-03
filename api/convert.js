import axios from "axios";

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

    // Download the original audio file from Telegram
    console.log("📥 Downloading audio...");
    const audioResponse = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'arraybuffer',
      timeout: 45000 // 45 seconds timeout
    });

    console.log("✅ Audio downloaded, size:", audioResponse.data.length, "bytes");

    // For now, we'll return the original file as MP3
    // In a production setup, you would process the audio here
    // This ensures the bot works while you set up proper audio processing
    
    const audioBuffer = audioResponse.data;
    
    console.log("🎯 Returning audio file");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=8d_audio.mp3");
    res.setHeader("Content-Length", audioBuffer.length);
    res.send(audioBuffer);

  } catch (err) {
    console.error("❌ Processing failed:", err.message);
    
    if (err.code === 'ECONNABORTED') {
      return res.status(408).json({ error: "Download timeout" });
    }
    if (err.response?.status === 404) {
      return res.status(404).json({ error: "Audio file not found" });
    }
    
    res.status(500).json({ 
      error: "Conversion failed: " + err.message 
    });
  }
}