import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { recognizeFace } from "../services/api";
import { Camera } from "@mediapipe/camera_utils";
import { FaceMesh } from "@mediapipe/face_mesh";
import useLiveness from "../utils/useLiveness";

const REQUIRED_FRAMES = 45;
const MIN_LIVENESS = 0.65;
const MIN_BLINKS = 1;

function Recognize() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [livenessScore, setLivenessScore] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [result, setResult] = useState(null);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  const frameCounter = useRef(0);

  // REAL-TIME refs (not React state)
  const livenessRef = useRef(0);
  const blinkRef = useRef(0);
  const capturedRef = useRef(false);

  const { check, reset, blinkCount } = useLiveness((score) => {
    livenessRef.current = score;
    setLivenessScore(score);
  });

  // keep blink count synced to ref
  useEffect(() => {
    blinkRef.current = blinkCount;
  }, [blinkCount]);

  useEffect(() => {
    if (scanning) initCamera();
    return () => stopCamera();
  }, [scanning]);

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
  };

  const initCamera = async () => {
    if (!webcamRef.current) return;

    const video = webcamRef.current.video;

    if (!video) {
      setTimeout(initCamera, 100);
      return;
    }

    faceMeshRef.current = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMeshRef.current.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    faceMeshRef.current.onResults(onResults);

    cameraRef.current = new Camera(video, {
      onFrame: async () => {
        if (!webcamRef.current?.video) return;
        await faceMeshRef.current.send({
          image: webcamRef.current.video,
        });
      },
      width: 480,
      height: 360,
    });

    cameraRef.current.start();
  };

  const onResults = useCallback((results) => {
    if (!canvasRef.current) return;

    if (!results.multiFaceLandmarks?.length) {
      frameCounter.current = 0;
      setScanProgress(0);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    drawCanvas(landmarks);

    frameCounter.current++;

    const progress = Math.min(
      (frameCounter.current / REQUIRED_FRAMES) * 100,
      100
    );
    setScanProgress(progress);

    check(landmarks);

    // capture only once
    if (
      !capturedRef.current &&
      frameCounter.current >= REQUIRED_FRAMES &&
      livenessRef.current >= MIN_LIVENESS &&
      blinkRef.current >= MIN_BLINKS
    ) {
      capturedRef.current = true;
      captureFrame();
    }
  }, []);

  const drawCanvas = (landmarks) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = webcamRef.current.video;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let minX = canvas.width,
      minY = canvas.height,
      maxX = 0,
      maxY = 0;

    landmarks.forEach((p) => {
      const x = p.x * canvas.width;
      const y = p.y * canvas.height;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    ctx.strokeStyle =
      livenessRef.current >= MIN_LIVENESS ? "#00ff00" : "#ffaa00";
    ctx.lineWidth = 3;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  };

  const captureFrame = async () => {
    const image = webcamRef.current.getScreenshot();
    if (!image) return;

    stopCamera();
    setCapturedImage(image);
    setScanComplete(true);
    setScanning(false);

    const blob = await fetch(image).then((res) => res.blob());

    const file = new File([blob], "recognize.jpg", {
      type: "image/jpeg",
    });

    setSelectedImage(file);
  };

  const startScanning = () => {
    reset();
    capturedRef.current = false;
    frameCounter.current = 0;
    livenessRef.current = 0;
    blinkRef.current = 0;

    setScanProgress(0);
    setScanComplete(false);
    setCapturedImage(null);
    setSelectedImage(null);
    setResult(null);
    setMessage({ type: "", text: "" });
    setScanning(true);
  };

  const handleRecognition = async () => {
    if (!selectedImage) {
      setMessage({ type: "danger", text: "Complete scan first" });
      return;
    }

    setLoading(true);

    try {
      const response = await recognizeFace(selectedImage);
      setResult(response);
      setMessage({
        type: "success",
        text: `Recognized: ${response.name}`,
      });
    } catch (error) {
      setMessage({
        type: "danger",
        text:
          error?.response?.data?.detail ||
          error?.message ||
          "Recognition failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "auto", padding: 20 }}>
      <h3 style={{ textAlign: "center" }}>Face Recognition</h3>

      {!scanning && !scanComplete && (
        <button onClick={startScanning} style={{ width: "100%" }}>
          Start Scan
        </button>
      )}

      {scanning && (
        <div style={{ position: "relative", marginTop: 15 }}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            style={{ width: "100%" }}
            videoConstraints={{ facingMode: "user" }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
            }}
          />
        </div>
      )}

      {scanning && (
        <div style={{ marginTop: 15 }}>
          <div>Progress: {Math.round(scanProgress)}%</div>
          <div>Liveness: {Math.round(livenessScore * 100)}%</div>
          <div>Blinks: {blinkCount}</div>
        </div>
      )}

      {scanComplete && capturedImage && (
        <>
          <img
            src={capturedImage}
            alt="Captured"
            style={{ width: "100%", marginTop: 15 }}
          />

          <div style={{ marginTop: 10 }}>
            <button onClick={startScanning}>Retake</button>

            <button
              onClick={handleRecognition}
              disabled={loading}
              style={{ marginLeft: 10 }}
            >
              {loading ? "Processing..." : "Recognize"}
            </button>
          </div>
        </>
      )}

      {message.text && (
        <p
          style={{
            marginTop: 10,
            color: message.type === "danger" ? "red" : "green",
          }}
        >
          {message.text}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 10 }}>
          <strong>User:</strong> {result.name}
        </div>
      )}
    </div>
  );
}

export default Recognize;