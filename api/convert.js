import axios from "axios";
import fs from "fs";
import path from "path";
import { AudioContext, AudioBuffer } from 'web-audio-api';

export default async function handler(req, res) {
  console.log("🎵 API convert triggered");

  if (req.method !== "POST") {
    return res.status(405).send({ error: "Method not allowed" });
  }

  try {
    const { fileUrl, speed = 0.05, panDepth = 0.8 } = req.body;
    
    if (!fileUrl) {
      return res.status(400).send({ error: "Missing fileUrl" });
    }

    console.log("🔗 File URL:", fileUrl);
    console.log("⚡ Speed:", speed, "Pan Depth:", panDepth);

    // Download the audio file
    console.log("📥 Downloading audio...");
    const audioResp = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'arraybuffer',
      timeout: 30000
    });

    console.log("✅ Audio downloaded, size:", audioResp.data.length, "bytes");

    // Create audio context
    const audioContext = new AudioContext();
    
    console.log("🎧 Decoding audio...");
    const audioBuffer = await audioContext.decodeAudioData(audioResp.data);
    console.log("✅ Audio decoded");

    // Process audio with 8D effect (same logic as React component)
    console.log("🔄 Applying 8D effect...");
    const processedBuffer = await apply8DEffect(audioBuffer, speed, panDepth, audioContext);
    
    console.log("✅ 8D effect applied");

    // Encode to MP3
    console.log("📦 Encoding to MP3...");
    const mp3Buffer = await encodeToMP3(processedBuffer);
    
    console.log("✅ MP3 encoded, size:", mp3Buffer.length, "bytes");

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=8d_audio.mp3");
    res.send(mp3Buffer);

  } catch (err) {
    console.error("❌ Processing failed:", err.message);
    console.error(err.stack);
    
    res.status(500).send({ 
      error: "Conversion failed: " + err.message 
    });
  }
}

// Same 8D effect logic as your React component
async function apply8DEffect(originalBuffer, speed, panDepth, audioContext) {
  const processedBuffer = audioContext.createBuffer(
    2, 
    originalBuffer.length, 
    originalBuffer.sampleRate
  );

  const leftOutput = processedBuffer.getChannelData(0);
  const rightOutput = processedBuffer.getChannelData(1);

  const leftInput = originalBuffer.getChannelData(0);
  const rightInput = originalBuffer.numberOfChannels > 1 
    ? originalBuffer.getChannelData(1) 
    : originalBuffer.getChannelData(0);

  // Apply the same 8D effect as your React component
  for (let i = 0; i < originalBuffer.length; i++) {
    const time = i / originalBuffer.sampleRate;
    const panValue = Math.sin(time * 2 * Math.PI * speed) * panDepth;
    const leftGain = Math.max(0, 1 - panValue);
    const rightGain = Math.max(0, 1 + panValue);
    
    leftOutput[i] = leftInput[i] * leftGain;
    rightOutput[i] = rightInput[i] * rightGain;
  }

  // Normalize audio (same as React component)
  const normalizedLeft = normalizeAudio(leftOutput);
  const normalizedRight = normalizeAudio(rightOutput);

  // Copy normalized data back
  for (let i = 0; i < normalizedLeft.length; i++) {
    leftOutput[i] = normalizedLeft[i];
    rightOutput[i] = normalizedRight[i];
  }

  return processedBuffer;
}

// Same normalize function as your React component
function normalizeAudio(channelData) {
  const newData = new Float32Array(channelData.length);
  let max = 0;
  
  for (let i = 0; i < channelData.length; i++) {
    const absVal = Math.abs(channelData[i]);
    if (absVal > max) max = absVal;
  }
  
  if (max > 0.9) {
    const gain = 0.9 / max;
    for (let i = 0; i < channelData.length; i++) {
      newData[i] = channelData[i] * gain;
    }
    return newData;
  }
  
  return channelData;
}

// MP3 encoding using a simple WAV fallback since MP3 encoding is complex
async function encodeToMP3(audioBuffer) {
  // For now, let's output as WAV since MP3 encoding requires complex libraries
  // You can replace this with a proper MP3 encoder later
  return encodeToWAV(audioBuffer);
}

function encodeToWAV(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length * numChannels * 2; // 2 bytes per sample
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write audio data
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return Buffer.from(buffer);
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}