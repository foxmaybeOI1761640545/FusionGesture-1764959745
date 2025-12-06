import React, { useState } from "react";
import ParticleCanvas from "./components/ParticleCanvas";
import GestureVisualizer from "./components/GestureVisualizer";
import ControlPanel from "./components/ControlPanel";
import useGestureDetector from "./hooks/useGestureDetector";

/**
 * App 根组件：
 * - 左侧：粒子 WebGL 场景 + HUD + 摄像头画面
 * - 右侧：控制面板 + 状态信息
 */
const App = () => {
  // 粒子参数（可由 UI 控制）
  const [intensity, setIntensity] = useState(0.7); // 0 ~ 1
  const [color, setColor] = useState("#4f46e5");
  const [effectType, setEffectType] = useState("trail"); // "trail" | "swirl" | "burst"
  const [performanceMode, setPerformanceMode] = useState("balanced"); // "high" | "balanced" | "low"

  // 手势识别 hook
  const {
    videoRef,
    gesture,
    handPosition,
    landmarks,
    fps,
    ready,
    error
  } = useGestureDetector();

  // 打开使用说明新页面
  const openUsagePage = () => {
    // 使用相对路径即可，由 webpack-dev-server 提供静态文件
    window.open("/usage.html", "_blank");
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <div>
          <div className="app-title">Fusion Gesture</div>
          <div className="app-subtitle">
            Real-time hand gestures + GPU particles
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="app-badge">
            WebGL · Media-based Gesture · React
          </div>
          <button className="toggle-button" onClick={openUsagePage}>
            使用说明
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* 左侧：粒子画布 + HUD + 摄像头预览 */}
        <section className="app-left">
          <div className="visual-layer">
            <ParticleCanvas
              gesture={gesture}
              handPosition={handPosition}
              intensity={intensity}
              color={color}
              effectType={effectType}
              performanceMode={performanceMode}
            />
            <GestureVisualizer
              gesture={gesture}
              fps={fps}
              ready={ready}
              error={error}
            />
          </div>
          {/* 摄像头预览视频（镜像） */}
          <video
            ref={videoRef}
            className="gesture-video"
            autoPlay
            playsInline
            muted
          />
        </section>

        {/* 右侧：控制面板 + 状态信息 */}
        <section className="app-right">
          <div className="app-card">
            <div className="app-card-header">
              <div className="app-card-title">Particle Controls</div>
              <div className="app-chip">Customizable effects</div>
            </div>
            <ControlPanel
              intensity={intensity}
              onIntensityChange={setIntensity}
              color={color}
              onColorChange={setColor}
              effectType={effectType}
              onEffectTypeChange={setEffectType}
              performanceMode={performanceMode}
              onPerformanceModeChange={setPerformanceMode}
            />
            <p className="hint-text">
              提示：允许摄像头权限后，伸出手、握拳、捏合、左右挥手等动作，
              根据不同手势会自动切换不同粒子预设。
            </p>
          </div>

          <div className="app-card">
            <div className="app-card-header">
              <div className="app-card-title">Status</div>
              <div className="app-chip">Realtime</div>
            </div>
            <div className="info-row">
              <span className="info-key">Gesture</span>
              <span className="info-value">{gesture || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Hand X / Y</span>
              <span className="info-value">
                {handPosition
                  ? `${handPosition.xNorm.toFixed(2)} / ${handPosition.yNorm.toFixed(
                      2
                    )}`
                  : "—"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Landmarks</span>
              <span className="info-value">
                {landmarks ? landmarks.length : 0}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">FPS</span>
              <span className="info-value">
                {fps ? fps.toFixed(0) : "—"}
              </span>
            </div>

            <footer className="app-footer" style={{ marginTop: 8 }}>
              <span>Browser: WebGL + webcam</span>
              <span>Mobile & Desktop ready</span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
