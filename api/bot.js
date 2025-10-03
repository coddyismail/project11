import axios from "axios";
import FormData from "form-data";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const CONVERT_API = "https://project911-flame.vercel.app/api/convert";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Bot is running...");
  }

  try {
    const update = req.body;
    console.log("📨 Update received:", JSON.stringify(update, null, 2));

    if (!update.message) {
      return res.status(200).send("No message");
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    // Handle /start command
    if (text === "/start") {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Welcome to 8D Audio Converter Bot!\n\nSend me an audio file (MP3, voice message, or any audio) and I'll convert it to amazing 8D audio! 🎧\n\nJust upload any audio file and wait for the magic! ✨",
        parse_mode: "HTML"
      });
      return res.status(200).send("Start processed");
    }

    // Handle /help command
    if (text === "/help") {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "🤖 <b>How to use:</b>\n\n• Send any audio file (MP3, OGG, etc.)\n• Send a voice message\n• Send audio as document\n\nI'll convert it to 8D audio with that cool rotating effect! 🎵\n\n<b>Pro tip:</b> Use headphones for the best experience! 🎧",
        parse_mode: "HTML"
      });
      return res.status(200).send("Help processed");
    }

    let fileId = null;
    let fileName = "audio";
    let fileType = "audio";

    // Detect audio file type
    if (update.message.audio) {
      fileId = update.message.audio.file_id;
      fileName = update.message.audio.file_name || "audio";
      fileType = "audio";
      console.log("🎵 Audio file detected:", fileName);
    } else if (update.message.voice) {
      fileId = update.message.voice.file_id;
      fileName = "voice-message.mp3";
      fileType = "voice";
      console.log("🎤 Voice message detected");
    } else if (update.message.document && update.message.document.mime_type.startsWith("audio")) {
      fileId = update.message.document.file_id;
      fileName = update.message.document.file_name || "audio";
      fileType = "document";
      console.log("📄 Audio document detected:", fileName);
    }

    if (!fileId) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "📩 Please send me an audio file, voice note, or audio document to convert to 8D audio!\n\nUse /help for more info.",
        parse_mode: "HTML"
      });
      return res.status(200).send("No file");
    }

    // Send "processing" message
    const processingMessage = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "⏳ Processing your audio... This may take a moment depending on the file size. Please wait! 🔄",
      parse_mode: "HTML"
    });

    try {
      // Get file info from Telegram
      console.log("📁 Getting file info...");
      const fileInfo = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const filePath = fileInfo.data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

      console.log("🔗 File URL:", fileUrl);
      console.log("📊 File size:", fileInfo.data.result.file_size, "bytes");

      // Prepare conversion parameters (same as React component)
      const convertParams = {
        fileUrl,
        speed: 0.05,    // Same as React component default
        panDepth: 0.8   // Same as React component default
      };

      console.log("⚙️ Conversion parameters:", convertParams);

      // Send to convert API
      console.log("⏳ Sending to convert API...");
      const convertResponse = await axios.post(CONVERT_API, convertParams, {
        responseType: "arraybuffer",
        timeout: 120000 // 2 minutes timeout for conversion
      });

      console.log("✅ Conversion successful!");
      console.log("📦 Converted file size:", convertResponse.data.length, "bytes");

      // Generate output filename
      const originalName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      const outputFileName = `8D_${originalName}.mp3`;

      // Send converted audio back to user
      console.log("📤 Sending converted audio to user...");
      
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("audio", convertResponse.data, {
        filename: outputFileName,
        contentType: "audio/mpeg"
      });
      formData.append("title", "8D Audio Converted");
      formData.append("caption", "🎧 Your 8D audio is ready! Best experienced with headphones. Enjoy! ✨");

      await axios.post(`${TELEGRAM_API}/sendAudio`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000
      });

      console.log("✅ Audio sent successfully!");

      // Delete processing message
      await axios.post(`${TELEGRAM_API}/deleteMessage`, {
        chat_id: chatId,
        message_id: processingMessage.data.result.message_id
      });

      // Send success message
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "✅ <b>Conversion Complete!</b>\n\nYour 8D audio has been successfully processed and sent! 🎉\n\n<b>Tip:</b> Use headphones for the full immersive experience! 🎧\n\nSend another audio file to convert more!",
        parse_mode: "HTML"
      });

      res.status(200).send("OK");

    } catch (conversionError) {
      console.error("❌ Conversion error:", conversionError.message);
      
      // Delete processing message
      await axios.post(`${TELEGRAM_API}/deleteMessage`, {
        chat_id: chatId,
        message_id: processingMessage.data.result.message_id
      });

      // Send specific error messages based on error type
      let errorMessage = "❌ Sorry, something went wrong while processing your file. Please try again with a different audio file.";
      
      if (conversionError.code === 'ECONNABORTED') {
        errorMessage = "⏰ The conversion took too long. Please try again with a shorter audio file.";
      } else if (conversionError.response?.status === 413) {
        errorMessage = "📁 The audio file is too large. Please try with a smaller file (under 20MB).";
      } else if (conversionError.message?.includes('decode')) {
        errorMessage = "🎵 I couldn't process this audio format. Please try with a different audio file (MP3, OGG, etc.).";
      }

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: errorMessage,
        parse_mode: "HTML"
      });

      res.status(200).send("Conversion error");
    }

  } catch (err) {
    console.error("❌ General bot error:", err.message);
    console.error(err.stack);
    
    try {
      if (req.body?.message?.chat?.id) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: req.body.message.chat.id,
          text: "❌ Sorry, something went wrong with the bot. Please try again later.",
          parse_mode: "HTML"
        });
      }
    } catch (telegramErr) {
      console.error("Failed to send error message:", telegramErr.message);
    }
    
    res.status(200).send("Error");
  }
}