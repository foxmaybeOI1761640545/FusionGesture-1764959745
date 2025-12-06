import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as handpose from "@tensorflow-models/handpose";

/**
 * @typedef {Object} HandPosition
 * @property {number} xNorm 归一化 X 坐标（0~1，0 在视频左边）
 * @property {number} yNorm 归一化 Y 坐标（0~1，0 在视频顶部）
 */

/**
 * 根据 21 个手部关键点做一个非常粗糙的静态手势分类。
 * 这里只处理 open / fist / pinch / idle，wave 由动态检测逻辑单独判断。
 * @param {number[][]} landmarks 形如 [[x,y,z], ...] 的数组
 * @returns {"open"|"fist"|"pinch"|"idle"}
 */
function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return "idle";

  const wrist = landmarks[0]; // 手腕
  // 指尖：食指(8)、中指(12)、无名指(16)、小指(20)、大拇指(4)
  const tipsIdx = [4, 8, 12, 16, 20];

  // 计算指尖与手腕的平均距离，用来区分张开 / 握拳
  let avgDist = 0;
  for (const idx of tipsIdx) {
    const p = landmarks[idx];
    const dx = p[0] - wrist[0];
    const dy = p[1] - wrist[1];
    const dz = p[2] - wrist[2];
    avgDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  avgDist /= tipsIdx.length;

  const OPEN_THRESH = 0.2;
  const FIST_THRESH = 0.12;

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
 * 检测“左右挥手 wave”：
 * - 传入最近一段时间（~0.9s 内）的手腕 X 轨迹
 * - 判断是否存在足够幅度的左右来回运动（多次速度符号翻转）
 *
 * @param {{t:number, x:number}[]} history 时间序列，t 为秒，x 为归一化坐标
 * @returns {boolean}
 */
function detectWave(history) {
  if (!history || history.length < 6) return false;

  const xs = history.map((p) => p.x);
  const maxX = Math.max(...xs);
  const minX = Math.min(...xs);

  // 挥手需要一定的横向幅度
  if (maxX - minX < 0.25) return false;

  let lastSign = 0;
  let changes = 0;

  for (let i = 1; i < history.length; i++) {
    const dx = history[i].x - history[i - 1].x;
    const dt = history[i].t - history[i - 1].t;
    if (dt <= 0) continue;

    const v = dx / dt; // 近似水平速度
    if (Math.abs(v) < 0.4) continue; // 过滤掉微小抖动

    const s = v > 0 ? 1 : -1;
    if (lastSign !== 0 && s !== lastSign) {
      changes++;
    }
    lastSign = s;
  }

  // 在时间窗口内至少 2 次方向翻转，认为是 wave
  return changes >= 2;
}

/**
 * 手势检测 Hook：
 * - 打开摄像头
 * - 使用 handpose 模型进行关键点检测
 * - 输出手势、手部位置、fps 等
 *
 * @returns {{
 *   videoRef: import("react").RefObject<HTMLVideoElement>,
 *   gesture: string | null,
 *   handPosition: HandPosition | null,
 *   landmarks: number[][] | null,
 *   fps: number,
 *   ready: boolean,
 *   error: string | null
 * }}
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
  const [handPosition, setHandPosition] = useState(null);
  const [landmarks, setLandmarks] = useState(null);

  // 记录最近一段时间手腕 X 位置，用于 wave 检测
  /** @type {import("react").MutableRefObject<{t:number,x:number}[]>} */
  const historyRef = useRef([]);

  useEffect(() => {
    let isMounted = true;

    // 打开摄像头
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

    // 加载 handpose 模型并启动推理循环
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
            // 简单的指数平滑
            setFps((prev) => prev * 0.8 + currentFps * 0.2);
          }
          lastFrameTimeRef.current = now;

          const predictions = await model.estimateHands(video, true);
          if (!predictions || predictions.length === 0) {
            setGesture("idle");
            setHandPosition(null);
            setLandmarks(null);
            historyRef.current = [];
            return;
          }

          const hand = predictions[0];
          const lm = hand.landmarks; // 21x3
          setLandmarks(lm);

          // 使用手腕（0 号点）作为整体位置
          const wrist = lm[0];
          const videoWidth = video.videoWidth || 640;
          const videoHeight = video.videoHeight || 480;

          const xNorm = wrist[0] / videoWidth;
          const yNorm = wrist[1] / videoHeight;
          setHandPosition({ xNorm, yNorm });

          // 更新左右位移历史
          const history = historyRef.current;
          const nowSec = now / 1000;
          history.push({ t: nowSec, x: xNorm });

          // 只保留最近 ~0.9 秒的数据
          const windowSec = 0.9;
          while (history.length && nowSec - history[0].t > windowSec) {
            history.shift();
          }

          // 先做静态手势分类
          let g = classifyGesture(lm);

          // 如果是张开手并且检测到左右挥动，则升级为 wave 手势
          if (g === "open" && detectWave(history)) {
            g = "wave";
          }

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

    // 清理：停止循环 + 关闭摄像头
    return () => {
      isMounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const video = videoRef.current;
      if (video && video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach((t) => t.stop());
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
