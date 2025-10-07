import axios from "axios";
import FormData from "form-data";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const CONVERT_API = "https://project911-flame.vercel.app/api/convert";

export default async function handler(req, res) {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(200).json({ status: "Bot is running..." });
  }

  try {
    const update = req.body;
    console.log("📨 Update received");

    if (!update.message) {
      return res.status(200).json({ status: "No message" });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text || "";
    const firstName = update.message.chat.first_name || "there";

    // Handle commands
    if (text.startsWith('/')) {
      if (text === '/start') {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: chatId,
          text: `👋 Hello ${firstName}! Welcome to the 8D Audio Converter Bot! 🎧\n\nJust send me any audio file (MP3, voice message, etc.) and I'll process it for you.\n\nFeatures:\n• Convert audio to 8D effect\n• Support for various audio formats\n• Fast processing\n\nSend an audio file to get started! 🎵`,
          parse_mode: "HTML"
        });
        return res.status(200).json({ status: "Start processed" });
      }
// for help command
      if (text === '/help') {
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: `🤖 <b>How to use this bot:</b>\n\n1. Send an audio file (MP3, OGG, M4A, etc.)\n2. Send a voice message\n3. Send audio as a document\n\nI'll process it and send back the audio with enhanced sound!\n\n<b>Supported formats:</b>\n• Audio files (up to 20MB)\n• Voice messages\n• Audio documents\n\n<b>Commands:</b>\n/start - Welcome message\n/help - This help message\n\nEnjoy the music! 🎧\n\n💬 Drop your issues at @coder_ismail`,
    parse_mode: "HTML"
  });
  return res.status(200).json({ status: "Help processed" });
}


      // Unknown command
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "❓ Unknown command. Send /help for instructions or just send me an audio file! 🎵"
      });
      return res.status(200).json({ status: "Unknown command" });
    }

    // Handle audio files
    let fileId = null;
    let fileName = "audio";
    let fileType = "unknown";

    if (update.message.audio) {
      fileId = update.message.audio.file_id;
      fileName = update.message.audio.file_name || "audio_file";
      fileType = "audio";
      console.log("🎵 Audio file detected:", fileName);
    } else if (update.message.voice) {
      fileId = update.message.voice.file_id;
      fileName = "voice_message";
      fileType = "voice";
      console.log("🎤 Voice message detected");
    } else if (update.message.document) {
      const mimeType = update.message.document.mime_type || "";
      if (mimeType.startsWith("audio/")) {
        fileId = update.message.document.file_id;
        fileName = update.message.document.file_name || "audio_document";
        fileType = "document";
        console.log("📄 Audio document detected:", fileName);
      }
    }

    if (!fileId) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "🎵 Please send me an audio file, voice message, or audio document to process!\n\nUse /help for more information."
      });
      return res.status(200).json({ status: "No audio file" });
    }

    // Send processing message
    const processingMessage = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: "⏳ Downloading and processing your audio... Please wait a moment! 🔄",
      parse_mode: "HTML"
    });

    let processingMessageId = processingMessage.data.result.message_id;

    try {
      // Get file info from Telegram
      console.log("📁 Getting file info from Telegram...");
      const fileInfoResponse = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
      const fileInfo = fileInfoResponse.data;
      
      if (!fileInfo.ok) {
        throw new Error("Failed to get file info from Telegram");
      }

      const filePath = fileInfo.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
      const fileSize = fileInfo.result.file_size;

      console.log("🔗 File URL:", fileUrl);
      console.log("📊 File size:", fileSize, "bytes");
      console.log("🗂️ File type:", fileType);

      // Update processing message
      await axios.post(`${TELEGRAM_API}/editMessageText`, {
        chat_id: chatId,
        message_id: processingMessageId,
        text: "⏳ Processing your audio... Converting to 8D effect 🎧"
      });

      // Prepare conversion parameters
      const convertParams = {
        fileUrl: fileUrl,
        speed: 0.05,
        panDepth: 0.8
      };

      console.log("⚙️ Sending to converter API...");

      // Send to convert API
      const convertResponse = await axios.post(CONVERT_API, convertParams, {
        responseType: "arraybuffer",
        timeout: 60000 // 60 seconds timeout
      });

      console.log("✅ Conversion successful! Response size:", convertResponse.data.length, "bytes");

      // Update processing message
      await axios.post(`${TELEGRAM_API}/editMessageText`, {
        chat_id: chatId,
        message_id: processingMessageId,
        text: "⏳ Extractong processed audio from Cloud... 📤"
      });

      // Prepare output filename
      const baseName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
      const outputFileName = `8D_${baseName}.mp3`;

      // Send converted audio back to user
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("audio", convertResponse.data, {
        filename: outputFileName,
        contentType: "audio/mpeg"
      });
      formData.append("title", "8D Audio Processed");
      formData.append("performer", "8D Audio Bot");
      formData.append("caption", "🎧 Your processed audio is ready! Enjoy the enhanced sound experience!");

      console.log("📤 Sending audio to Telegram...");
      await axios.post(`${TELEGRAM_API}/sendAudio`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
      });

      console.log("✅ Audio sent successfully!");

      // Update processing message to success
      await axios.post(`${TELEGRAM_API}/editMessageText`, {
        chat_id: chatId,
        message_id: processingMessageId,
        text: "✅ <b>Processing Complete!</b>\n\nYour audio has been successfully processed! 🎉\n\nSend another audio file to continue! 🎵",
        parse_mode: "HTML"
      });

      return res.status(200).json({ status: "Success" });

    } catch (conversionError) {
      console.error("❌ Conversion error:", conversionError.message);

      // Error handling with specific messages
      let errorMessage = "❌ Sorry, I couldn't process your audio file. Please try again with a different file.";

      if (conversionError.code === 'ECONNABORTED') {
        errorMessage = "⏰ Processing took too long. Please try again with a shorter audio file.";
      } else if (conversionError.response?.status === 413) {
        errorMessage = "📁 File too large. Please try with a smaller audio file (under 20MB).";
      } else if (conversionError.response?.status === 404) {
        errorMessage = "🔍 Could not find the audio file. Please send it again.";
      } else if (conversionError.message?.includes('format') || conversionError.message?.includes('decode')) {
        errorMessage = "🎵 Unsupported audio format. Please try with MP3, OGG, or other common audio formats.";
      }

      // Update processing message with error
      await axios.post(`${TELEGRAM_API}/editMessageText`, {
        chat_id: chatId,
        message_id: processingMessageId,
        text: errorMessage
      });

      return res.status(200).json({ status: "Conversion error" });
    }

  } catch (error) {
    console.error("❌ Bot handler error:", error.message);

    try {
      // Try to send error message to user
      if (req.body?.message?.chat?.id) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: req.body.message.chat.id,
          text: "❌ Sorry, something went wrong with the bot. Please try again later.",
          parse_mode: "HTML"
        });
      }
    } catch (telegramError) {
      console.error("Failed to send error message:", telegramError.message);
    }

    return res.status(200).json({ status: "Server error" });
  }
}