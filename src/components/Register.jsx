import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import { connectWebSocket, sendFrame, closeWebSocket } from "../services/api";

function Register() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [challenge, setChallenge] = useState("");

  const webcamRef = useRef(null);
  const intervalRef = useRef(null);

  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    closeWebSocket();
  };

  const startStreaming = () => {
    intervalRef.current = setInterval(() => {
      if (webcamRef.current?.video?.readyState === 4) {
        const screenshot = webcamRef.current.getScreenshot({
          width: 320,
          height: 240,
        });

        if (screenshot) {
          const base64 = screenshot.split(",")[1];
          sendFrame(base64);
        }
      }
    }, 400); // 5 FPS (stable)
  };

  const startScanning = () => {
    if (!name.trim()) {
      setMessage("Enter full name first");
      return;
    }

    setStatus("scanning");
    setMessage("Connecting...");
    setChallenge("");

    connectWebSocket(
      "register",
      { user_name: name.trim() },
      (msg) => {
        if (msg.startsWith("Challenge: ")) {
          const ch = msg.replace("Challenge: ", "").trim();
          setChallenge(ch);
          setMessage(`Do: ${ch.toUpperCase()}`);
        } else if (msg.includes("Registered:")) {
          setStatus("success");
          setMessage(msg);
          stopStreaming();
        } else if (
          msg.includes("Spoof") ||
          msg.includes("timed out") ||
          msg.includes("Error")
        ) {
          setStatus("error");
          setMessage(msg);
          stopStreaming();
        } else {
          setMessage(msg);
        }
      },
      () => {
        startStreaming();
      },
      () => {
        setStatus("idle");
        setMessage("Connection closed");
        stopStreaming();
      },
      () => {
        setStatus("error");
        setMessage("Connection failed");
        stopStreaming();
      }
    );
  };

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  const cancelScan = () => {
    stopStreaming();
    setStatus("idle");
    setMessage("");
    setChallenge("");
  };

  return (
    <div className="container my-5" style={{ maxWidth: "600px" }}>
      <h2 className="text-center mb-4 fw-bold">Register New User</h2>

      {status === "idle" && (
        <>
          <input
            type="text"
            className="form-control form-control-lg mb-4"
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="btn btn-primary btn-lg w-100"
            onClick={startScanning}
            disabled={!name.trim()}
          >
            Begin Registration
          </button>
        </>
      )}

      {status === "scanning" && (
        <div className="card shadow-lg border-0">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user", width: 320, height: 240 }}
            className="w-100 rounded-top"
          />

          <div className="card-body text-center">
            <h4>{challenge ? `Do: ${challenge}` : "Position face clearly"}</h4>
            <p>{message}</p>

            <button className="btn btn-danger w-100" onClick={cancelScan}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="alert alert-success text-center">
          <h4>Success</h4>
          <p>{message}</p>
          <button
            className="btn btn-outline-success"
            onClick={() => setStatus("idle")}
          >
            Register Another
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="alert alert-danger text-center">
          <h4>Failed</h4>
          <p>{message}</p>
          <button
            className="btn btn-outline-primary"
            onClick={() => setStatus("idle")}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default Register;