import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { registerUser } from "../services/api";
import { Camera } from "@mediapipe/camera_utils";
import { FaceMesh } from "@mediapipe/face_mesh";
import useLiveness from "../utils/useLiveness";

const FACE_OVAL = [
  10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,
  400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,
  54,103,67,109
];

function Register() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [livenessScore, setLivenessScore] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  const frameCounter = useRef(0);

  const REQUIRED_FRAMES = 60;

  const { check, reset, blinkCount } = useLiveness(setLivenessScore);

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

    cameraRef.current = new Camera(webcamRef.current.video, {
      onFrame: async () => {
        await faceMeshRef.current.send({
          image: webcamRef.current.video,
        });
      },
      width: 640,
      height: 480,
    });

    cameraRef.current.start();
  };

  const onResults = useCallback(
    (results) => {
      if (!canvasRef.current) return;

      if (!results.multiFaceLandmarks?.length) {
        setFaceDetected(false);
        setScanProgress(0);
        return;
      }

      setFaceDetected(true);

      const landmarks = results.multiFaceLandmarks[0];
      drawCanvas(landmarks);

      // Always increase progress when face detected
      frameCounter.current++;

      const progress = Math.min(
        (frameCounter.current / REQUIRED_FRAMES) * 100,
        100
      );
      setScanProgress(progress);

      const isLive = check(landmarks);

      if (
        frameCounter.current >= REQUIRED_FRAMES &&
        isLive &&
        !scanComplete
      ) {
        captureFrame();
      }
    },
    [scanComplete]
  );

  const drawCanvas = (landmarks) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = webcamRef.current.video;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    drawOval(ctx, landmarks, canvas.width, canvas.height);
    drawDots(ctx, landmarks, canvas.width, canvas.height);
  };

  const drawOval = (ctx, landmarks, width, height) => {
    ctx.strokeStyle = faceDetected ? "#00ff00" : "#ff0000";
    ctx.lineWidth = 3;
    ctx.beginPath();

    FACE_OVAL.forEach((i, index) => {
      const p = landmarks[i];
      const x = p.x * width;
      const y = p.y * height;

      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.closePath();
    ctx.stroke();
  };

  const drawDots = (ctx, landmarks, width, height) => {
    ctx.fillStyle = "#00ffff";

    landmarks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const captureFrame = () => {
    const image = webcamRef.current.getScreenshot();
    if (!image) return;

    stopCamera();
    setCapturedImage(image);
    setScanComplete(true);
    setScanning(false);

    fetch(image)
      .then((res) => res.blob())
      .then((blob) => {
        setSelectedImage(new File([blob], "face.jpg", { type: "image/jpeg" }));
      });
  };

  const startScanning = () => {
    reset();
    frameCounter.current = 0;
    setScanProgress(0);
    setScanComplete(false);
    setCapturedImage(null);
    setSelectedImage(null);
    setScanning(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim())
      return setMessage({ type: "danger", text: "Enter a name" });

    if (!selectedImage)
      return setMessage({ type: "danger", text: "Complete scanning first" });

    setLoading(true);

    try {
      const result = await registerUser(name, selectedImage);

      setMessage({
        type: "success",
        text: `User ${result.name} registered successfully`,
      });

      setName("");
      setScanComplete(false);
      setCapturedImage(null);
      setSelectedImage(null);
    } catch (error) {
      setMessage({
        type: "danger",
        text: error.response?.data?.detail || "Registration failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "auto", padding: 20 }}>
      <h3 style={{ textAlign: "center" }}>Face Registration</h3>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full Name"
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        {!scanning && !scanComplete && (
          <button type="button" onClick={startScanning} style={{ width: "100%" }}>
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
            <div>Scan Progress: {Math.round(scanProgress)}%</div>
            <div>Liveness Score: {Math.round(livenessScore * 100)}%</div>
           <div>Blink Count: {blinkCount}</div>
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
              <button type="button" onClick={startScanning}>
                Retake
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{ marginLeft: 10 }}
              >
                {loading ? "Processing..." : "Complete"}
              </button>
            </div>
          </>
        )}

        {message.text && (
          <p style={{ marginTop: 10, color: message.type === "danger" ? "red" : "green" }}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}

export default Register;