import React, { useState, useRef, useEffect, useCallback } from 'react';
import { recognizeFace } from '../services/api';
import Webcam from 'react-webcam';
import { Camera } from '@mediapipe/camera_utils';
import { FaceMesh } from '@mediapipe/face_mesh';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// LANDMARKS for face mesh
const FACEMESH_CONTOURS = {
  FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
};

function Recognize() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Liveness state
  const [scanning, setScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [livenessScore, setLivenessScore] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);

  // Refs
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  const detectionCounter = useRef(0);
  const requiredDetections = 45; // Frames required for recognition
  const frameHistory = useRef([]);
  const lastBlinkTime = useRef(Date.now());
  const blinkCount = useRef(0);
  const lastMovementRef = useRef({ x: 0, y: 0 });
  const movementHistory = useRef([]);

  // Auto-submit effect
  useEffect(() => {
    if (scanComplete && selectedImage && !loading && !result) {
      handleRecognize();
    }
  }, [scanComplete, selectedImage, loading, result]);

  // Initialize MediaPipe FaceMesh
  useEffect(() => {
    if (scanning) {
      initMediaPipe();
    }
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
    };
  }, [scanning]);

  const initMediaPipe = async () => {
    try {
      // Create FaceMesh instance
      faceMeshRef.current = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });

      // Set face detection options
      faceMeshRef.current.setOptions({
        maxNumFaces: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        refineLandmarks: true, // Get more accurate landmarks for liveness
      });

      // Set callback for results
      faceMeshRef.current.onResults(onResults);

      // Initialize camera
      if (webcamRef.current && canvasRef.current) {
        cameraRef.current = new Camera(webcamRef.current.video, {
          onFrame: async () => {
            if (faceMeshRef.current) {
              await faceMeshRef.current.send({ image: webcamRef.current.video });
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.current.start();
      }
    } catch (error) {
      console.error('Error initializing MediaPipe:', error);
      alert('Failed to initialize face detection');
      setScanning(false);
    }
  };

  // Calculate Eye Aspect Ratio (EAR) for blink detection
  const calculateEAR = (landmarks, eyeIndices) => {
    try {
      const p1 = landmarks[eyeIndices[0]];
      const p2 = landmarks[eyeIndices[1]];
      const p3 = landmarks[eyeIndices[2]];
      const p4 = landmarks[eyeIndices[3]];
      const p5 = landmarks[eyeIndices[4]];
      const p6 = landmarks[eyeIndices[5]];

      const height1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
      const height2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
      const width = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

      return (height1 + height2) / (2 * width);
    } catch (error) {
      return 0.3; // Default value
    }
  };

  // Check if it's a static image (photo spoofing)
  const checkLiveness = (landmarks) => {
    const leftEyeEAR = calculateEAR(landmarks, [33, 160, 158, 133, 153, 144]);
    const rightEyeEAR = calculateEAR(landmarks, [362, 385, 387, 263, 373, 380]);
    const avgEAR = (leftEyeEAR + rightEyeEAR) / 2;

    // Add to frame history
    frameHistory.current.push({ avgEAR, landmarks, timestamp: Date.now() });

    // Keep last 30 frames
    if (frameHistory.current.length > 30) {
      frameHistory.current.shift();
    }

    // Check for blinks (EAR drops significantly)
    if (frameHistory.current.length > 5) {
      const recentEARs = frameHistory.current.slice(-5).map(f => f.avgEAR);
      const avgRecentEAR = recentEARs.reduce((a, b) => a + b, 0) / recentEARs.length;

      if (avgEAR < 0.2 && avgRecentEAR > 0.25) { // Blink detected
        blinkCount.current++;
        lastBlinkTime.current = Date.now();
      }
    }

    // Check for head movement (3D pose estimation)
    if (landmarks) {
      const noseTip = landmarks[1];
      const leftEyeCorner = landmarks[33];
      const rightEyeCorner = landmarks[263];

      // Calculate movement from previous frame
      const movement = {
        x: Math.abs(noseTip.x - lastMovementRef.current.x),
        y: Math.abs(noseTip.y - lastMovementRef.current.y)
      };

      movementHistory.current.push(movement);
      if (movementHistory.current.length > 15) {
        movementHistory.current.shift();
      }

      lastMovementRef.current = { x: noseTip.x, y: noseTip.y };
    }

    // Calculate liveness score (0-1)
    let score = 0;

    // Blink score (30%)
    const blinkScore = Math.min(blinkCount.current / 3, 1) * 0.3;

    // Movement score (40%)
    const avgMovement = movementHistory.current.reduce(
      (acc, m) => ({ x: acc.x + m.x, y: acc.y + m.y }),
      { x: 0, y: 0 }
    );
    const movementScore = movementHistory.current.length > 0
      ? Math.min(((avgMovement.x / movementHistory.current.length) * 100), 1) * 0.4
      : 0;

    // Frame consistency score (30%)
    const frameCountScore = Math.min(detectionCounter.current / requiredDetections, 1) * 0.3;

    score = blinkScore + movementScore + frameCountScore;

    setLivenessScore(score);

    return score > 0.5; // Consider live if score > 0.5
  };

  // Handle face detection results
  const onResults = useCallback((results) => {
    if (!canvasRef.current || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      setFaceDetected(false);
      return;
    }

    setFaceDetected(true);

    const landmarks = results.multiFaceLandmarks[0];
    const isLive = checkLiveness(landmarks);

    // Draw on canvas
    const canvas = canvasRef.current;
    if (!canvas) return; // double check
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    if (webcamRef.current && webcamRef.current.video) {
      ctx.drawImage(webcamRef.current.video, 0, 0, canvas.width, canvas.height);
    }

    // Draw scanning overlay
    drawScanningOverlay(ctx, canvas.width, canvas.height);

    // Draw face mesh if face is detected
    if (landmarks) {
      drawFaceMesh(ctx, landmarks, canvas.width, canvas.height);

      // Draw bounding box
      drawBoundingBox(ctx, landmarks, canvas.width, canvas.height);
    }

    // Increment detection counter if liveness check passes
    if (isLive && detectionCounter.current < requiredDetections) {
      detectionCounter.current++;
      setScanProgress((detectionCounter.current / requiredDetections) * 100);

      // Capture image when enough frames are detected
      if (detectionCounter.current === requiredDetections && !scanComplete) {
        captureBestFrame();
      }
    }
  }, [scanComplete]);

  // Draw scanning line animation
  const drawScanningOverlay = (ctx, width, height) => {
    const time = Date.now() / 1000;
    const scanY = height * (0.3 + 0.4 * Math.sin(time * 2)); // Moving scan line

    // Add semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Draw scanning line
    ctx.beginPath();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.moveTo(0, scanY);
    ctx.lineTo(width, scanY);
    ctx.stroke();

    // Add glow effect
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
  };

  // Draw face mesh
  const drawFaceMesh = (ctx, landmarks, width, height) => {
    ctx.fillStyle = '#00ff00';
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;

    // Draw landmarks
    for (let i = 0; i < landmarks.length; i += 3) {
      const x = landmarks[i].x * width;
      const y = landmarks[i].y * height;

      ctx.beginPath();
      ctx.arc(x, y, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw face contour
    const faceOval = FACEMESH_CONTOURS.FACE_OVAL;
    ctx.beginPath();
    for (let i = 0; i < faceOval.length; i++) {
      const point = landmarks[faceOval[i]];
      const x = point.x * width;
      const y = point.y * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Draw bounding box
  const drawBoundingBox = (ctx, landmarks, width, height) => {
    let minX = width, minY = height, maxX = 0, maxY = 0;

    for (let i = 0; i < landmarks.length; i++) {
      const x = landmarks[i].x * width;
      const y = landmarks[i].y * height;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    // Add padding
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    // Draw animated corners
    const cornerLength = 30;
    ctx.strokeStyle = faceDetected ? '#00ff00' : '#ff0000';
    ctx.lineWidth = 3;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(minX, minY + cornerLength);
    ctx.lineTo(minX, minY);
    ctx.lineTo(minX + cornerLength, minY);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(maxX - cornerLength, minY);
    ctx.lineTo(maxX, minY);
    ctx.lineTo(maxX, minY + cornerLength);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(minX, maxY - cornerLength);
    ctx.lineTo(minX, maxY);
    ctx.lineTo(minX + cornerLength, maxY);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(maxX - cornerLength, maxY);
    ctx.lineTo(maxX, maxY);
    ctx.lineTo(maxX, maxY - cornerLength);
    ctx.stroke();
  };

  // Capture the best frame for recognition
  const captureBestFrame = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setPreview(imageSrc);
        setScanComplete(true);
        setScanning(false);

        // Convert base64 to file for recognition
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "face-capture.jpg", { type: "image/jpeg" });
            setSelectedImage(file);
          });
      }
    }
  };

  const startScanning = () => {
    setScanning(true);
    setScanComplete(false);
    setFaceDetected(false);
    setScanProgress(0);
    setLivenessScore(0);
    detectionCounter.current = 0;
    frameHistory.current = [];
    blinkCount.current = 0;
    movementHistory.current = [];
    setPreview(null);
    setSelectedImage(null);
    setResult(null);
  };

  const handleRecognize = async () => {
    if (!selectedImage) {
      alert('Please select an image first');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await recognizeFace(selectedImage);
      setResult(data);
    } catch (error) {
      alert('Error recognizing face: ' + (error.response?.data?.detail || error.message));
      // Optionally reset scan so they can try again if it fails
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Marked': 'success',
      'Already Marked': 'info',
      'No Match': 'warning',
      'No Face Detected': 'danger',
      'No Users': 'secondary'
    };

    const color = statusColors[status] || 'secondary';
    return <span className={`badge bg-${color}`}>{status}</span>;
  };

  return (
    <div className="container mt-4 mb-5 animate-fade-in-up">
      <div className="row justify-content-center">
        <div className="col-md-9 col-lg-7">
          <div className="glass-panel p-4 p-md-5">
            <div className="text-center mb-4">
              <h3 className="text-gradient fw-bold mb-2">Live Recognition</h3>
              <p className="text-muted small">Scan securely to mark attendance</p>
            </div>

            <div className="mb-4">
              <label className="form-label text-muted fw-medium small text-uppercase tracking-wide mb-3">Biometric Scan</label>

              {!scanning && !scanComplete && (
                <div className="text-center p-5 border border-secondary border-opacity-25 rounded-4 bg-dark bg-opacity-25 transition-all hover-shadow">
                  <div className="mb-3">
                    <i className="bi bi-person-bounding-box text-primary fs-1 opacity-75"></i>
                  </div>
                  <button
                    type="button"
                    className="btn-premium mb-2"
                    onClick={startScanning}
                  >
                    <i className="bi bi-camera-video"></i> Start Scanner
                  </button>
                  <p className="text-muted mt-2 small mb-0">
                    Center your face and blink naturally for liveness detection
                  </p>
                </div>
              )}

              {(scanning || scanComplete) && (
                <div className="position-relative bg-dark rounded-4 overflow-hidden border border-secondary border-opacity-25 shadow-lg">
                  <div style={{ position: 'relative', width: '100%', height: 'auto', backgroundColor: '#000' }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{
                        facingMode: "user",
                        width: 640,
                        height: 480
                      }}
                      style={{ width: '100%', display: scanComplete ? 'none' : 'block' }}
                    />

                    <canvas
                      ref={canvasRef}
                      width={640}
                      height={480}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: scanComplete ? 'none' : 'block'
                      }}
                    />

                    {scanComplete && preview && (
                      <img
                        src={preview}
                        alt="Captured face"
                        className="img-fluid w-100"
                      />
                    )}
                  </div>

                  {scanning && (
                    <div className="p-4 bg-dark bg-opacity-75 border-top border-secondary border-opacity-25">
                      <div className="row g-3">
                        <div className="col-12 col-sm-6">
                          <div className="d-flex justify-content-between mb-1 small fw-medium">
                            <span className="text-muted">Scan Progress</span>
                            <span className="text-primary">{Math.round(scanProgress)}%</span>
                          </div>
                          <div className="progress rounded-pill bg-dark" style={{ height: '8px' }}>
                            <div
                              className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                              role="progressbar"
                              style={{ width: `${scanProgress}%` }}
                              aria-valuenow={scanProgress}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </div>

                        <div className="col-12 col-sm-6">
                          <div className="d-flex justify-content-between mb-1 small fw-medium">
                            <span className="text-muted">Liveness Score</span>
                            <span className={livenessScore > 0.5 ? 'text-success' : 'text-warning'}>{Math.round(livenessScore * 100)}%</span>
                          </div>
                          <div className="progress rounded-pill bg-dark" style={{ height: '8px' }}>
                            <div
                              className={`progress-bar ${livenessScore > 0.5 ? 'bg-success' : 'bg-warning'}`}
                              role="progressbar"
                              style={{ width: `${livenessScore * 100}%` }}
                              aria-valuenow={livenessScore * 100}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex flex-wrap gap-2 justify-content-center mt-3 pt-3 border-top border-secondary border-opacity-25">
                        {faceDetected ? (
                          <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-2 rounded-pill">
                            <i className="bi bi-check-circle me-1"></i> Face Detected
                          </span>
                        ) : (
                          <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50 px-3 py-2 rounded-pill">
                            <i className="bi bi-x-circle me-1"></i> No Face
                          </span>
                        )}

                        {livenessScore > 0.5 && (
                          <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-3 py-2 rounded-pill">
                            <i className="bi bi-person-check me-1"></i> Live Person
                          </span>
                        )}

                        {blinkCount.current > 0 && (
                          <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-50 px-3 py-2 rounded-pill">
                            <i className="bi bi-eye me-1"></i> Blinks: {blinkCount.current}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {scanComplete && loading && (
              <div className="text-center my-4">
                <span className="spinner-border text-primary me-2" role="status"></span>
                <span className="text-muted">Analyzing Biometrics...</span>
              </div>
            )}

            {scanComplete && !loading && !result && (
              <button
                type="button"
                className="btn-outline-glass me-3"
                onClick={startScanning}
                disabled={loading}
              >
                <i className="bi bi-arrow-counterclockwise"></i> Retake
              </button>
            )}

            {result && (
              <div className="glass-panel p-4 bg-dark bg-opacity-50 mt-4 border-primary border-opacity-25 animate-fade-in-up">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="mb-0 fw-semibold text-primary">Recognition Result</h5>
                  <button onClick={startScanning} className="btn btn-sm btn-outline-secondary rounded-pill">
                    <i className="bi bi-arrow-counterclockwise"></i> Scan Again
                  </button>
                </div>

                <div className="glass-table-container">
                  <table className="table table-borderless glass-table mb-0">
                    <tbody>
                      <tr>
                        <th className="w-50 text-muted">Identified As:</th>
                        <td className="fw-bold fs-5">
                          <span className={result.name === 'Unknown' ? 'text-warning' : 'text-success'}>
                            {result.name}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <th className="text-muted align-middle">Confidence Score:</th>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div className="progress rounded-pill bg-dark flex-grow-1 me-3" style={{ height: '8px' }}>
                              <div
                                className={`progress-bar rounded-pill ${result.confidence > 0.8 ? 'bg-success' : result.confidence > 0.5 ? 'bg-info' : 'bg-warning'}`}
                                role="progressbar"
                                style={{ width: `${result.confidence * 100}%` }}
                                aria-valuenow={result.confidence * 100}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              ></div>
                            </div>
                            <span className="small fw-semibold">{(result.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th className="text-muted align-middle">Attendance Status:</th>
                        <td className="align-middle">{getStatusBadge(result.status)}</td>
                      </tr>
                      {result.user_id && (
                        <tr>
                          <th className="text-muted">User ID:</th>
                          <td className="font-monospace text-secondary">{result.user_id}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Recognize;