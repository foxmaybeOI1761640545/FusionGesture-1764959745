import React from "react";

const GestureVisualizer = ({ gesture, fps, ready, error, lang = "zh" }) => {
  const isZh = lang === "zh";

  const prettyGestureName = () => {
    switch (gesture) {
      case "open":
        return isZh ? "张开手掌" : "Open Hand";
      case "fist":
        return isZh ? "握拳" : "Fist";
      case "pinch":
        return isZh ? "捏合" : "Pinch";
      case "wave":
        return isZh ? "挥手 Wave" : "Wave";
      case "idle":
      case null:
      case undefined:
        return isZh ? "未检测到手势" : "No gesture";
      default:
        return gesture;
    }
  };

  const statusText = () => {
    if (error) {
      // error 文案由 Hook 给出（当前为中文），这里直接展示
      return error;
    }
    if (!ready) {
      return isZh ? "正在加载手势识别模型..." : "Loading hand pose model...";
    }
    if (gesture === "wave") {
      return isZh
        ? "检测到左右挥手 Wave 手势！"
        : "Wave gesture detected!";
    }
    if (!gesture || gesture === "idle") {
      return isZh
        ? "请将手伸入摄像头范围，并尝试左右挥手。"
        : "Put your hand into the camera view and try waving it left/right.";
    }
    return isZh ? "已检测到手部动作。" : "Hand motion detected.";
  };

  const fpsText = ready
    ? `${Number.isFinite(fps) ? fps.toFixed(0) : 0} FPS`
    : isZh
    ? "加载中..."
    : "Loading...";

  const tipText = isZh
    ? "左右挥手可触发 Wave 拖尾波纹效果。"
    : "Wave your open hand left and right to trigger the Wave trail effect.";

  return (
    <div className="hud-overlay">
      <div className="hud-top">
        <div className="hud-gesture-pill">
          <div className="hud-gesture-name">{prettyGestureName()}</div>
          <div className="hud-gesture-status">{statusText()}</div>
        </div>
        <div
          className="hud-gesture-status"
          style={{ maxWidth: 180, textAlign: "right" }}
        >
          {tipText}
        </div>
      </div>
      <div className="hud-bottom">
        <div className="hud-fps-pill">{fpsText}</div>
      </div>
    </div>
  );
};

export default GestureVisualizer;
