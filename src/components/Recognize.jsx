import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from "react-webcam";
import { connectWebSocket, sendFrame, closeWebSocket } from '../services/api';

function Recognize() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [challenge, setChallenge] = useState("");
  const [recognizedName, setRecognizedName] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const frameCountRef = useRef(0);

  const log = useCallback((...args) => {
    console.log(`[RECOGNIZE ${new Date().toLocaleTimeString()}]`, ...args);
  }, []);

  const startScanning = useCallback(() => {
    log("Start scanning requested");

    setStatus("connecting");
    setMessage("Connecting...");
    setChallenge("");
    setRecognizedName("");
    setFaceDetected(false);
    setWsConnected(false);
    frameCountRef.current = 0;

    const cleanup = connectWebSocket(
      'recognize',
      null,  // ← no payload needed – connectWebSocket will send {mode:"recognize"} automatically

      // onMessage
      (msg) => {
        log("←", msg);

        if (msg.startsWith("Challenge: ")) {
          const ch = msg.replace("Challenge: ", "").trim();
          setChallenge(ch);
          setMessage(`Please ${ch.replace(/_/g, " ")}`);
          setStatus("scanning");
        } else if (msg.startsWith("Liveness passed")) {
          setMessage("Verification passed • Processing...");
        } else if (msg.startsWith("Recognized: ")) {
          const name = msg.replace("Recognized: ", "").trim();
          setRecognizedName(name);
          setStatus("success");
          setMessage(`Welcome, ${name}!`);
        } else if (msg === "Not recognized") {
          setStatus("error");
          setMessage("Face not recognized");
        } else if (msg.includes("Spoof")) {
          setStatus("error");
          setMessage("Spoof detected");
        } else if (msg.includes("timeout")) {
          setStatus("error");
          setMessage("Session timed out");
        } else if (msg.startsWith("Server error") || msg.includes("Invalid JSON")) {
          setStatus("error");
          setMessage(msg.replace("Server error: ", ""));
        } else {
          setMessage(msg);
        }
      },

      // onOpen
      () => {
        log("WebSocket opened");
        setWsConnected(true);
        setStatus("scanning");
        setMessage("Connected • Looking for face...");

        // Start sending frames (base64 only)
        intervalRef.current = setInterval(() => {
          if (!webcamRef.current?.video?.videoWidth) return;

          const screenshot = webcamRef.current.getScreenshot({
            width: 320,
            height: 240,
          });

          if (screenshot) {
            const base64 = screenshot.split(',')[1];
            sendFrame(base64);
            frameCountRef.current += 1;

            if (frameCountRef.current % 25 === 0) {
              log(`frame ${frameCountRef.current}`);
            }
          }
        }, 120); // ~8 fps
      },

      // onClose
      () => {
        log("WebSocket closed");
        setWsConnected(false);
        if (status === "scanning" || status === "connecting") {
          setStatus("idle");
          setMessage("Connection lost");
        }
      },

      // onError
      (err) => {
        log("WS error", err);
        setStatus("error");
        setMessage("Connection failed");
      }
    );

    // Optional: store cleanup if you want to call it manually later
    // But useEffect cleanup will handle it anyway
  }, [log, status]);

  // Overlay drawing
  useEffect(() => {
    if (status !== "scanning" || !webcamRef.current?.video || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const draw = () => {
      if (video.videoWidth === 0) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const color = faceDetected ? "#22ff88" : wsConnected ? "#ffcc00" : "#ff4444";
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.setLineDash(faceDetected ? [] : [10, 5]);
      ctx.strokeRect(50, 35, canvas.width - 100, canvas.height - 70);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(25, 25, 10, 0, Math.PI * 2);
      ctx.fill();
    };

    const id = setInterval(draw, 50);
    return () => clearInterval(id);
  }, [status, faceDetected, wsConnected]);

  useEffect(() => {
    return () => {
      log("Cleaning up on unmount");
      if (intervalRef.current) clearInterval(intervalRef.current);
      closeWebSocket();
    };
  }, [log]);

  const cancelScan = () => {
    log("Cancel clicked");
    closeWebSocket();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus("idle");
    setMessage("");
    setChallenge("");
  };

  return (
    <div className="container my-5" style={{ maxWidth: "640px" }}>
      <h2 className="text-center mb-4 fw-bold">Face Recognition</h2>

      {status === "idle" && (
        <div className="text-center p-4 bg-light rounded-3 shadow">
          <p className="lead mb-4 text-muted">Position your face in front of the camera</p>
          <button className="btn btn-success btn-lg w-100 py-3" onClick={startScanning}>
            Start Scan
          </button>
        </div>
      )}

      {(status === "connecting" || status === "scanning") && (
        <div className="card shadow border-0">
          <div className="position-relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } }}
              className="w-100 rounded-top"
              onUserMediaError={() => {
                setStatus("error");
                setMessage("Camera access denied. Please allow permission.");
              }}
            />
            <canvas ref={canvasRef} className="position-absolute top-0 start-0 w-100 h-100" style={{ pointerEvents: "none" }} />

            <div className="position-absolute top-50 start-50 translate-middle text-center text-white w-75">
              <div className="bg-dark bg-opacity-75 px-4 py-4 rounded-4 shadow">
                {challenge ? (
                  <div>
                    <h3 className="mb-2 fw-bold text-warning text-uppercase">{challenge.replace(/_/g, " ")}</h3>
                    <p className="fs-5 mb-0">{message}</p>
                  </div>
                ) : (
                  <div>
                    <h5 className="mb-3">Detecting face...</h5>
                    <p className="mb-0">{message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card-body bg-dark text-white text-center">
            <div className="alert alert-info mb-3 small py-2">
              {wsConnected ? "Live scan in progress" : "Connecting..."}
            </div>
            <button className="btn btn-outline-danger w-100" onClick={cancelScan}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="alert alert-success p-5 text-center shadow">
          <h3 className="fw-bold mb-3">Success!</h3>
          <p className="fs-4 mb-3">{message}</p>
          <p className="lead">Attendance recorded • {new Date().toLocaleTimeString()}</p>
          <button className="btn btn-outline-success mt-3" onClick={() => setStatus("idle")}>
            Scan Again
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="alert alert-danger p-5 text-center shadow">
          <h3 className="fw-bold mb-3">Failed</h3>
          <p className="fs-5 mb-4">{message}</p>
          <button className="btn btn-outline-primary mt-3" onClick={() => setStatus("idle")}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default Recognize;