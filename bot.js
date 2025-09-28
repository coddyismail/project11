import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const TOKEN = "YOUR_BOT_TOKEN"; // ← Put your Telegram bot token here
const API_URL = "https://YOUR_VERCEL_DOMAIN.vercel.app/api/convert"; // ← Your Vercel API endpoint

const bot = new TelegramBot(TOKEN, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.audio || msg.document) {
    bot.sendMessage(chatId, "🎵 Processing your audio, please wait...");

    try {
      const fileId = msg.audio?.file_id || msg.document?.file_id;
      const file = await bot.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

      const tempPath = path.join(__dirname, "temp_audio");
      const writer = fs.createWriteStream(tempPath);

      const response = await axios({
        url: fileUrl,
        method: "GET",
        responseType: "stream",
      });

      response.data.pipe(writer);

      writer.on("finish", async () => {
        try {
          const form = new FormData();
          form.append("audio", fs.createReadStream(tempPath));
          form.append("speed", "0.05"); // default speed
          form.append("panDepth", "0.8"); // default pan depth

          const apiRes = await axios.post(API_URL, form, {
            headers: form.getHeaders(),
            responseType: "arraybuffer",
          });

          const outputPath = path.join(__dirname, "converted.mp3");
          fs.writeFileSync(outputPath, Buffer.from(apiRes.data));

          await bot.sendAudio(chatId, outputPath);

          fs.unlinkSync(tempPath); // clean temp audio
          fs.unlinkSync(outputPath); // clean converted file
        } catch (err) {
          console.error("Error converting audio:", err);
          bot.sendMessage(chatId, "❌ Failed to convert audio.");
        }
      });

      writer.on("error", () => {
        bot.sendMessage(chatId, "❌ Error downloading the file.");
      });
    } catch (error) {
      console.error("Bot processing error:", error);
      bot.sendMessage(chatId, "❌ Error processing your audio.");
    }
  } else {
    bot.sendMessage(chatId, "ℹ️ Please send me an audio file.");
  }
});

console.log("🤖 Telegram bot is running...");
