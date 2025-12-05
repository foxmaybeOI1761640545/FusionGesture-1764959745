import React from "react";

/**
 * GestureVisualizer
 * - 显示当前手势、FPS、加载状态
 */
const GestureVisualizer = ({ gesture, fps, ready, error }) => {
  const prettyGestureName = () => {
    switch (gesture) {
      case "open":
        return "Open Hand";
      case "fist":
        return "Fist";
      case "pinch":
        return "Pinch";
      case "wave":
        return "Wave";
      case "idle":
      default:
        return "Idle";
    }
  };

  const statusText = () => {
    if (error) return error;
    if (!ready) return "正在加载手势识别模型...";
    if (!gesture || gesture === "idle") return "请将手伸入摄像头范围。";
    return "已检测到手部动作。";
  };

  return (
    <div className="hud-overlay">
      <div className="hud-top">
        <div className="hud-gesture-pill">
          <div className="hud-gesture-name">{prettyGestureName()}</div>
          <div className="hud-gesture-status">{statusText()}</div>
        </div>
      </div>
      <div className="hud-bottom">
        <div className="hud-fps-pill">
          FPS: {fps ? fps.toFixed(0) : "—"}
        </div>
      </div>
    </div>
  );
};

export default GestureVisualizer;
