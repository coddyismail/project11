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

    if (text === "/start") {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "👋 Send me an audio file and I'll return it in 8D format 🎧",
      });
      return res.status(200).send("Start processed");
    }

    let fileId = null;
    let fileName = "audio";

    if (update.message.audio) {
      fileId = update.message.audio.file_id;
      fileName = update.message.audio.file_name || "audio";
    } else if (update.message.voice) {
      fileId = update.message.voice.file_id;
      fileName = "voice.mp3";
    } else if (update.message.document && update.message.document.mime_type.startsWith("audio")) {
      fileId = update.message.document.file_id;
      fileName = update.message.document.file_name || "audio";
    }

    if (!fileId) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "📩 Please send me an audio file or voice note.",
      });
      return res.status(200).send("No file");
    }

    console.log("📁 File ID:", fileId);

    // Get file info from Telegram
    const fileInfo = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const filePath = fileInfo.data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

    console.log("🔗 File URL:", fileUrl);

    // Send to convert API
    console.log("⏳ Sending to convert API...");
    const convertResponse = await axios.post(CONVERT_API, {
      fileUrl,
      speed: 0.8,
      panDepth: 0.8
    }, {
      responseType: "arraybuffer"
    });

    console.log("✅ Conversion successful, sending audio back...");

    // Send converted audio back to user
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("audio", convertResponse.data, {
      filename: `8d_${fileName}`,
      contentType: "audio/mpeg"
    });

    await axios.post(`${TELEGRAM_API}/sendAudio`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log("✅ Audio sent successfully");
    res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Error processing update:", err.message);
    console.error(err.stack);
    
    try {
      if (req.body?.message?.chat?.id) {
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: req.body.message.chat.id,
          text: "❌ Sorry, something went wrong while processing your file. Please try again.",
        });
      }
    } catch (telegramErr) {
      console.error("Failed to send error message:", telegramErr.message);
    }
    
    res.status(200).send("Error");
  }
}