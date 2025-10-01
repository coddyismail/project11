import axios from "axios";
import FormData from "form-data";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
<<<<<<< HEAD
const CONVERT_API = "https://project911-dusky.vercel.app/api/convert"; // deployed api URL
=======
const CONVERT_API = "https://project911-dusky.vercel.app/api/convert"; // Change to your actual deploy URL
>>>>>>> ed07c80 (Delete root bot.js and add updated api bot.js and convert.js)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Bot is running...");
  }

  try {
    const update = req.body;
    console.log("📩 Incoming update:", JSON.stringify(update, null, 2));

    if (!update.message) {
      console.log("⚠ No message found in update");
      return res.status(200).send("No message");
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      console.log("💬 Received /start command");
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
<<<<<<< HEAD
        text: "👋 Hello! Send me an audio file or voice note, and I'll return it in 8D format 🎧",
=======
        text: "👋 Hello! Send me an audio file or voice note and I'll return it in 8D format 🎧",
>>>>>>> ed07c80 (Delete root bot.js and add updated api bot.js and convert.js)
      });
      return res.status(200).send("Start command processed");
    }

    // Detect audio file
    let fileId = null;
    if (update.message.audio) fileId = update.message.audio.file_id;
    else if (update.message.voice) fileId = update.message.voice.file_id;
    else if (
      update.message.document &&
      update.message.document.mime_type.startsWith("audio")
    )
      fileId = update.message.document.file_id;

    if (!fileId) {
      console.log("⚠ No audio file found in message");
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: "📩 Please send me an audio file or voice note.",
      });
      return res.status(200).send("No file");
    }

    console.log("🎵 Received audio file with ID:", fileId);

    const fileInfo = await axios.get(
      `${TELEGRAM_API}/getFile?file_id=${fileId}`
    );
    const filePath = fileInfo.data.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

    console.log("🔗 File URL:", fileUrl);

<<<<<<< HEAD
=======
    // Send file to convert API
    console.log("⏳ Sending file URL to convert API...");
>>>>>>> ed07c80 (Delete root bot.js and add updated api bot.js and convert.js)
    const form = new FormData();
    form.append("fileUrl", fileUrl);
    form.append("speed", "0.05");
    form.append("panDepth", "0.8");

<<<<<<< HEAD
    console.log("⏳ Sending file to convert API...");
=======
>>>>>>> ed07c80 (Delete root bot.js and add updated api bot.js and convert.js)
    const apiRes = await axios.post(CONVERT_API, form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
    });

    console.log("✅ Audio processed successfully");

    const outBuffer = Buffer.from(apiRes.data);
    const form2 = new FormData();
    form2.append("chat_id", chatId);
<<<<<<< HEAD
    form2.append("audio", outBuffer, "converted-8d.mp3");

    console.log("📤 Sending converted audio...");
=======
    form2.append("audio", outBuffer, "converted-8d.wav");

    console.log("📤 Sending converted audio to user...");
>>>>>>> ed07c80 (Delete root bot.js and add updated api bot.js and convert.js)
    await axios.post(`${TELEGRAM_API}/sendAudio`, form2, {
      headers: form2.getHeaders(),
    });

    console.log("🎉 Audio sent successfully!");
    res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Error processing update:", err?.response?.data || err.message);

    try {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: req.body?.message?.chat?.id || 0,
        text: "❌ Sorry, something went wrong while processing your file.",
      });
    } catch (e) {
      console.error("❌ Failed to send error message to user", e.message);
    }

    res.status(200).send("Error");
  }
}
