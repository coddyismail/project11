import axios from "axios";
import fs from "fs";

const API_URL = "https://8-daudio-bot-ztw3.vercel.app/api/convert.js";
const TEST_FILE_URL = "https://api.telegram.org/file/bot8426195629:AAHSEL67F1OBNG2vqRtRVla7zX4AQLrSb9E/music/file_2.m4a";

(async () => {
  try {
    console.log("🔗 Sending file URL to API...");

    const response = await axios.post(
      API_URL,
      { fileUrl: TEST_FILE_URL, speed: 0.05, panDepth: 0.8 },
      { responseType: "arraybuffer" }
    );

    fs.writeFileSync("test-converted.mp3", Buffer.from(response.data));
    console.log("✅ Conversion succeeded — saved as test-converted.mp3");
  } catch (error) {
    console.error("❌ API test failed:", error.response?.data || error.message);
  }
})();
