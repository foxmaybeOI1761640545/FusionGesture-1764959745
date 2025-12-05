import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as handpose from "@tensorflow-models/handpose";

/**
 * 简单手势分类工具函数
 * landmarks: 21 个 3D 点
 */
function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return "idle";

  const wrist = landmarks[0]; // 手腕
  // 指尖：食指(8)、中指(12)、无名指(16)、小指(20)、大拇指(4)
  const tipsIdx = [4, 8, 12, 16, 20];

  // 计算指尖与手腕的平均距离
  let avgDist = 0;
  for (const idx of tipsIdx) {
    const p = landmarks[idx];
    const dx = p[0] - wrist[0];
    const dy = p[1] - wrist[1];
    const dz = p[2] - wrist[2];
    avgDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  avgDist /= tipsIdx.length;

  // 简单阈值：距离小 => 握拳，大 => 张开
  const OPEN_THRESH = 0.2;
  const FIST_THRESH = 0.12;

  // 粗略检测 wave（左右晃动）：比较最近几帧 x 坐标变化由外部逻辑处理会更好
  // 这里先返回 open / fist / idle
  if (avgDist > OPEN_THRESH) return "open";
  if (avgDist < FIST_THRESH) return "fist";

  // 检测 pinch：拇指(4) 与食指(8) 距离
  const thumb = landmarks[4];
  const indexTip = landmarks[8];
  const dx = thumb[0] - indexTip[0];
  const dy = thumb[1] - indexTip[1];
  const dz = thumb[2] - indexTip[2];
  const pinchDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (pinchDist < 0.05) return "pinch";

  return "idle";
}

/**
 * useGestureDetector
 * - 打开摄像头
 * - 使用 handpose 进行实时关键点检测
 * - 输出：手势、归一化位置、fps 等
 */
const useGestureDetector = () => {
  const videoRef = useRef(null);
  const modelRef = useRef(null);
  const rafRef = useRef(null);
  const lastFrameTimeRef = useRef(performance.now());
  const [fps, setFps] = useState(0);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const [gesture, setGesture] = useState(null);
  const [handPosition, setHandPosition] = useState(null); // { xNorm, yNorm }
  const [landmarks, setLandmarks] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
        if (!isMounted) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (isMounted) setError("无法访问摄像头，请检查浏览器权限。");
      }
    };

    const loadModelAndStart = async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();

        const model = await handpose.load();
        if (!isMounted) return;
        modelRef.current = model;
        setReady(true);

        const loop = async () => {
          rafRef.current = requestAnimationFrame(loop);
          const video = videoRef.current;
          const model = modelRef.current;
          if (!video || video.readyState < 2 || !model) return;

          const now = performance.now();
          const dt = now - lastFrameTimeRef.current;
          if (dt > 0) {
            const currentFps = 1000 / dt;
            setFps(prev => prev * 0.8 + currentFps * 0.2); // 平滑
          }
          lastFrameTimeRef.current = now;

          const predictions = await model.estimateHands(video, true);
          if (!predictions || predictions.length === 0) {
            setGesture("idle");
            setHandPosition(null);
            setLandmarks(null);
            return;
          }

          const hand = predictions[0];
          const lm = hand.landmarks; // 21x3
          setLandmarks(lm);

          // 使用手腕（或掌心平均）作为整体位置
          const wrist = lm[0];
          const videoWidth = video.videoWidth || 640;
          const videoHeight = video.videoHeight || 480;
          // 归一化坐标（0~1），注意视频是镜像显示的，但数据不是
          const xNorm = wrist[0] / videoWidth;
          const yNorm = wrist[1] / videoHeight;
          setHandPosition({ xNorm, yNorm });

          const g = classifyGesture(lm);
          setGesture(g);
        };

        loop();
      } catch (err) {
        console.error("Handpose model error:", err);
        if (isMounted) setError("手势识别模型加载失败。");
      }
    };

    setupCamera();
    loadModelAndStart();

    return () => {
      isMounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const video = videoRef.current;
      if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(t => t.stop());
        video.srcObject = null;
      }
    };
  }, []);

  return {
    videoRef,
    gesture,
    handPosition,
    landmarks,
    fps,
    ready,
    error
  };
};

export default useGestureDetector;
