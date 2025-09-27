import React, { useState, useRef } from "react";

export default function EightDConverter() {
  const [fileName, setFileName] = useState(null);
  const [status, setStatus] = useState("idle");
  const [audioURL, setAudioURL] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [speed, setSpeed] = useState(0.05);
  const [panDepth, setPanDepth] = useState(0.8);
  const fileRef = useRef(null);

  const loadLameJS = () => {
    return new Promise((resolve, reject) => {
      if (window.lamejs) {
        resolve(window.lamejs);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.0/lame.min.js';
      script.onload = () => resolve(window.lamejs);
      script.onerror = () => reject(new Error('Failed to load lamejs'));
      document.head.appendChild(script);
    });
  };

  const encodeToMP3 = async (leftChannel, rightChannel, sampleRate) => {
    const lamejs = await loadLameJS();
    
    const encoder = new lamejs.Mp3Encoder(2, sampleRate, 192);
    const mp3Data = [];
    const blockSize = 1152;

    // Convert Float32 to Int16
    const leftInt16 = new Int16Array(leftChannel.length);
    const rightInt16 = new Int16Array(rightChannel.length);
    
    for (let i = 0; i < leftChannel.length; i++) {
      leftInt16[i] = Math.max(-32768, Math.min(32767, leftChannel[i] * 32768));
      rightInt16[i] = Math.max(-32768, Math.min(32767, rightChannel[i] * 32768));
    }

    for (let i = 0; i < leftInt16.length; i += blockSize) {
      const leftChunk = leftInt16.subarray(i, Math.min(i + blockSize, leftInt16.length));
      const rightChunk = rightInt16.subarray(i, Math.min(i + blockSize, rightInt16.length));
      
      const mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf));
      }
    }

    const end = encoder.flush();
    if (end.length > 0) {
      mp3Data.push(new Int8Array(end));
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  };

  const normalizeAudio = (channelData) => {
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
  };

  const handleConvert = async () => {
    const audioFile = fileRef.current?.files?.[0];
    if (!audioFile) {
      alert("Please upload a file first!");
      return;
    }

    setStatus("Converting... Please wait");

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const originalBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const processedBuffer = audioCtx.createBuffer(2, originalBuffer.length, originalBuffer.sampleRate);
      const leftOutput = processedBuffer.getChannelData(0);
      const rightOutput = processedBuffer.getChannelData(1);

      const leftInput = originalBuffer.getChannelData(0);
      const rightInput = originalBuffer.numberOfChannels > 1 
        ? originalBuffer.getChannelData(1) 
        : originalBuffer.getChannelData(0);

      for (let i = 0; i < originalBuffer.length; i++) {
        const time = i / originalBuffer.sampleRate;
        const panValue = Math.sin(time * 2 * Math.PI * speed) * panDepth;
        const leftGain = Math.max(0, 1 - panValue);
        const rightGain = Math.max(0, 1 + panValue);
        leftOutput[i] = leftInput[i] * leftGain;
        rightOutput[i] = rightInput[i] * rightGain;
      }

      const normalizedLeft = normalizeAudio(leftOutput);
      const normalizedRight = normalizeAudio(rightOutput);

      setStatus("Encoding to MP3...");
      const mp3Blob = await encodeToMP3(normalizedLeft, normalizedRight, processedBuffer.sampleRate);
      const url = URL.createObjectURL(mp3Blob);

      setFileName(audioFile.name.replace(/\.[^/.]+$/, "") + "-8d.mp3");
      setAudioURL(url);
      setPreviewURL(url);
      setStatus("✅ Done! MP3 is ready");
      
      audioCtx.close();
    } catch (err) {
      console.error("Conversion error:", err);
      setStatus("❌ Error: " + err.message);
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (previewURL) URL.revokeObjectURL(previewURL);
    };
  }, [audioURL, previewURL]);

  // ... (UI component remains the same as above)
  return (
    <div
      style={{
        background: "#1e1e1e",
        padding: "20px 30px",
        borderRadius: "12px",
        textAlign: "center",
        color: "#fff",
        maxWidth: "450px",
        margin: "50px auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
      }}
    >
      {/* UI code remains exactly the same as the previous example */}
      <h1 style={{ marginBottom: "20px" }}>🎧 8D Audio Converter</h1>
      
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        style={{ 
          margin: "10px 0", 
          color: "#fff",
          background: "#333",
          padding: "8px",
          borderRadius: "4px",
          width: "100%"
        }}
      />

      <div style={{ margin: "20px 0", textAlign: "left" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Rotation speed: <strong>{speed.toFixed(3)} Hz</strong>
        </label>
        <input
          type="range"
          min="0.01"
          max="0.2"
          step="0.005"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
        <small style={{ color: "#ccc" }}>Lower = slower panning effect</small>

        <br />
        <br />

        <label style={{ display: "block", marginBottom: "5px" }}>
          Pan depth: <strong>{panDepth.toFixed(2)}</strong>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={panDepth}
          onChange={(e) => setPanDepth(parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
        <small style={{ color: "#ccc" }}>0 = no pan, 1 = full left/right pan</small>
      </div>

     <button
  onClick={handleConvert}
  disabled={status === "Converting... Please wait"}
  style={{
    padding: "12px 24px",
    background: status === "Converting... Please wait" ? "#666" : "#ff4d4d",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    fontWeight: "bold",
    cursor: status === "Converting... Please wait" ? "not-allowed" : "pointer",
    marginTop: "10px",
    width: "100%",
    fontSize: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "3px"
  }}
>
  {status === "Converting... Please wait" ? (
    <>
      ⏳ Converting
      <span className="dot">.</span>
      <span className="dot">.</span>
      <span className="dot">.</span>
    </>
  ) : (
    "🎵 Convert to 8D MP3"
  )}
</button>




      {status && (
        <div style={{ 
          marginTop: "15px", 
          padding: "10px",
          background: status.includes("✅") ? "#2d5a2d" : status.includes("❌") ? "#5a2d2d" : "#2d4a5a",
          borderRadius: "4px"
        }}>
          <strong>{status}</strong>
        </div>
      )}

     {previewURL && (
  <div className="preview-container">
    <h3 className="preview-title">Preview:</h3>
    <audio 
      controls 
      src={previewURL} 
      className="custom-audio"
    />
  </div>
)}


      {audioURL && (
        <div style={{ marginTop: "20px" }}>
          <a
            href={audioURL}
            download={fileName}
            style={{
              padding: "12px 24px",
              background: "#4CAF50",
              color: "#fff",
              borderRadius: "6px",
              display: "inline-block",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "16px"
            }}
          >
            📥 Download 8D MP3
          </a>
          <p style={{ fontSize: "12px", color: "#ccc", marginTop: "5px" }}>
            Best experienced with headphones!
          </p>
        </div>
        
      )}
    </div>
  );
}