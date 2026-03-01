import { useRef, useState } from "react";

export default function useLiveness(setLivenessScore) {
  const baselineEAR = useRef(null);
  const lastBlinkTime = useRef(0);
  const blinkCooldown = useRef(false);
  const blinkCountRef = useRef(0);

  const [blinkCount, setBlinkCount] = useState(0);

  const movementScoreRef = useRef(0);
  const lastNose = useRef(null);
  const scanStartTime = useRef(null);

  const reset = () => {
    baselineEAR.current = null;
    lastBlinkTime.current = 0;
    blinkCooldown.current = false;
    blinkCountRef.current = 0;
    movementScoreRef.current = 0;
    lastNose.current = null;
    scanStartTime.current = null;
    setBlinkCount(0);
    setLivenessScore(0);
  };

  const calculateEAR = (landmarks, eye) => {
    const p1 = landmarks[eye[0]];
    const p2 = landmarks[eye[1]];
    const p3 = landmarks[eye[2]];
    const p4 = landmarks[eye[3]];
    const p5 = landmarks[eye[4]];
    const p6 = landmarks[eye[5]];

    const h1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const h2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
    const w = Math.hypot(p1.x - p4.x, p1.y - p4.y);

    return (h1 + h2) / (2 * w);
  };

  const check = (landmarks) => {
    const now = Date.now();
    if (!scanStartTime.current) scanStartTime.current = now;

    const leftEAR = calculateEAR(landmarks, [33,160,158,133,153,144]);
    const rightEAR = calculateEAR(landmarks, [362,385,387,263,373,380]);
    const avgEAR = (leftEAR + rightEAR) / 2;

    if (!baselineEAR.current) {
      baselineEAR.current = avgEAR;
      return false;
    }

    baselineEAR.current =
      baselineEAR.current * 0.9 + avgEAR * 0.1;

    const blinkThreshold = baselineEAR.current * 0.7;

    if (
      avgEAR < blinkThreshold &&
      !blinkCooldown.current &&
      now - lastBlinkTime.current > 500
    ) {
      blinkCountRef.current++;
      setBlinkCount(blinkCountRef.current); // 🔥 update UI
      lastBlinkTime.current = now;
      blinkCooldown.current = true;
    }

    if (avgEAR > baselineEAR.current * 0.9) {
      blinkCooldown.current = false;
    }

    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const faceWidth = Math.abs(leftEye.x - rightEye.x);

    if (faceWidth > 0 && lastNose.current) {
      const dx = Math.abs(nose.x - lastNose.current.x) / faceWidth;
      const dy = Math.abs(nose.y - lastNose.current.y) / faceWidth;
      const magnitude = Math.sqrt(dx * dx + dy * dy);

      movementScoreRef.current =
        movementScoreRef.current * 0.85 + magnitude * 0.15;
    }

    lastNose.current = nose;

    const elapsed = now - scanStartTime.current;

    const blinkScore = Math.min(blinkCountRef.current, 1) * 0.4;
    const movementScore = Math.min(movementScoreRef.current * 15, 1) * 0.4;
    const timeScore = Math.min(elapsed / 2500, 1) * 0.2;

    const score = blinkScore + movementScore + timeScore;

    setLivenessScore(score);

    return score >= 0.65;
  };

  return { check, reset, blinkCount };
}