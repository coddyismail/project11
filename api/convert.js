import formidable from "formidable";
import fs from "fs";
import lamejs from "lamejs";
import decodeAudio from "audio-decode";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: "Upload error" });
    }

    try {
      const speed = parseFloat(fields.speed || 0.05);
      const panDepth = parseFloat(fields.panDepth || 0.8);

      const fileData = fs.readFileSync(files.audio.filepath);
      const audioBuffer = await decodeAudio(fileData);

      const { numberOfChannels, length, sampleRate } = audioBuffer;
      const leftInput = audioBuffer.getChannelData(0);
      const rightInput =
        numberOfChannels > 1
          ? audioBuffer.getChannelData(1)
          : audioBuffer.getChannelData(0);

      const leftOutput = new Float32Array(length);
      const rightOutput = new Float32Array(length);

      for (let i = 0; i < length; i++) {
        const time = i / sampleRate;
        const panValue = Math.sin(time * 2 * Math.PI * speed) * panDepth;
        const leftGain = Math.max(0, 1 - panValue);
        const rightGain = Math.max(0, 1 + panValue);
        leftOutput[i] = leftInput[i] * leftGain;
        rightOutput[i] = rightInput[i] * rightGain;
      }

      const encoder = new lamejs.Mp3Encoder(2, sampleRate, 192);
      const mp3Data = [];
      const blockSize = 1152;

      const floatTo16BitPCM = (input) => {
        const buffer = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          let s = Math.max(-1, Math.min(1, input[i]));
          buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        return buffer;
      };

      const leftInt16 = floatTo16BitPCM(leftOutput);
      const rightInt16 = floatTo16BitPCM(rightOutput);

      for (let i = 0; i < leftInt16.length; i += blockSize) {
        const leftChunk = leftInt16.subarray(i, i + blockSize);
        const rightChunk = rightInt16.subarray(i, i + blockSize);
        const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) mp3Data.push(Buffer.from(mp3buf));
      }

      const end = encoder.flush();
      if (end.length > 0) mp3Data.push(Buffer.from(end));

      const mp3Buffer = Buffer.concat(mp3Data);

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", 'attachment; filename="converted-8d.mp3"');
      return res.status(200).send(mp3Buffer);

    } catch (e) {
      console.error("Processing error:", e);
      return res.status(500).json({ error: "Processing failed" });
    }
  });
}
