import React, { useState, useEffect } from "react";
import ParticleCanvas from "./components/ParticleCanvas";
import GestureVisualizer from "./components/GestureVisualizer";
import ControlPanel from "./components/ControlPanel";
import useGestureDetector from "./hooks/useGestureDetector";
import "./styles/App.css";

const TEXTS = {
  zh: {
    appTitle: "Fusion Gesture",
    appSubtitle: "用手势控制 WebGL 粒子特效",
    badge: "WebGL · TensorFlow.js · React",
    usageButton: "使用说明",
    particleCardTitle: "粒子控制",
    particleCardChip: "可调特效",
    hint:
      "提示：允许摄像头权限后，伸出手、握拳、捏合、左右挥手等动作，根据不同手势会自动切换不同粒子预设。",
    statusTitle: "状态",
    statusChip: "实时",
    infoGestureLabel: "手势",
    infoHandXYLabel: "手部 X / Y",
    infoLandmarksLabel: "关键点数",
    infoFpsLabel: "帧率",
    footerLeft: "浏览器：WebGL + 摄像头",
    footerRight: "适配移动端与桌面端",
    langLabel: "语言",
    langToggleZh: "中文",
    langToggleEn: "English"
  },
  en: {
    appTitle: "Fusion Gesture",
    appSubtitle: "Control WebGL particle effects with your hand",
    badge: "WebGL · TensorFlow.js · React",
    usageButton: "Usage Guide",
    particleCardTitle: "Particle Controls",
    particleCardChip: "Customizable effects",
    hint:
      "Tip: After granting camera permission, open your hand, make a fist, pinch, or wave left/right — different gestures will trigger different particle presets.",
    statusTitle: "Status",
    statusChip: "Realtime",
    infoGestureLabel: "Gesture",
    infoHandXYLabel: "Hand X / Y",
    infoLandmarksLabel: "Landmarks",
    infoFpsLabel: "FPS",
    footerLeft: "Browser: WebGL + webcam",
    footerRight: "Mobile & desktop ready",
    langLabel: "Language",
    langToggleZh: "中文",
    langToggleEn: "English"
  }
};

const App = () => {
  // 粒子参数（可由 UI 控制）

  // 颜色：从 localStorage 读取上一次使用的颜色（没有则使用默认粉色）
  const [color, setColor] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("fg_last_color");
      if (saved) return saved;
    }
    // 默认粉色
    return "#f472b6";
  });

  const [intensity, setIntensity] = useState(0.7); // 0 ~ 1

  // 默认使用新的粉色粒子模型
  const [effectType, setEffectType] = useState("pinkNova"); // "pinkNova" | "trail" | "swirl" | "burst"

  const [performanceMode, setPerformanceMode] = useState("balanced"); // "high" | "balanced" | "low"

  // 语言：中 / 英，并持久化
  const [lang, setLang] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("fg_lang");
      if (saved === "zh" || saved === "en") return saved;
    }
    return "zh";
  });

  // 手势检测 Hook
  const { videoRef, gesture, handPosition, landmarks, fps, ready, error } =
    useGestureDetector();

  // 颜色变化时持久化
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fg_last_color", color);
    }
  }, [color]);

  // 语言变化时持久化
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("fg_lang", lang);
    }
  }, [lang]);

  const t = TEXTS[lang];

  // 打开使用说明新页面
  const openUsagePage = () => {
    window.open("./usage.html", "_blank");
  };

  return (
    <div className="app-root">
      {/* 顶部标题栏 */}
      <header className="app-header">
        <div>
          <div className="app-title">{t.appTitle}</div>
          <div className="app-subtitle">{t.appSubtitle}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="app-badge">{t.badge}</span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 8
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.75 }}>{t.langLabel}</span>
            <button
              type="button"
              className={`toggle-button${lang === "zh" ? " active" : ""}`}
              onClick={() => setLang("zh")}
            >
              {t.langToggleZh}
            </button>
            <button
              type="button"
              className={`toggle-button${lang === "en" ? " active" : ""}`}
              onClick={() => setLang("en")}
            >
              {t.langToggleEn}
            </button>
          </div>

          <button
            type="button"
            className="toggle-button"
            onClick={openUsagePage}
            style={{ marginLeft: 8 }}
          >
            {t.usageButton}
          </button>
        </div>
      </header>

      {/* 主体区域：左侧粒子 + 摄像头，右侧控制与状态 */}
      <main className="app-main">
        {/* 左侧：粒子效果 + 摄像头 */}
        <section className="app-left">
          {/* Three.js 粒子画布 */}
          <div style={{ position: "relative", flex: 1 }}>
            <ParticleCanvas
              intensity={intensity}
              color={color}
              effectType={effectType}
              performanceMode={performanceMode}
              gesture={gesture}
              handPosition={handPosition}
            />
          </div>

          {/* 摄像头画面 + HUD 叠加 */}
          <section className="camera-layer">
            <GestureVisualizer
              gesture={gesture}
              fps={fps}
              ready={ready}
              error={error}
              lang={lang}
            />
            {/* 摄像头预览视频（镜像） */}
            <video
              ref={videoRef}
              className="gesture-video"
              autoPlay
              playsInline
              muted
            />
          </section>
        </section>

        {/* 右侧：控制面板 + 状态信息 */}
        <section className="app-right">
          <div className="app-card">
            <div className="app-card-header">
              <div className="app-card-title">{t.particleCardTitle}</div>
              <div className="app-chip">{t.particleCardChip}</div>
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
              lang={lang}
            />
            <p className="hint-text">{t.hint}</p>
          </div>

          <div className="app-card">
            <div className="app-card-header">
              <div className="app-card-title">{t.statusTitle}</div>
              <div className="app-chip">{t.statusChip}</div>
            </div>
            <div className="info-row">
              <span className="info-key">{t.infoGestureLabel}</span>
              <span className="info-value">{gesture || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-key">{t.infoHandXYLabel}</span>
              <span className="info-value">
                {handPosition
                  ? `${handPosition.xNorm.toFixed(2)} / ${handPosition.yNorm.toFixed(
                      2
                    )}`
                  : "—"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">{t.infoLandmarksLabel}</span>
              <span className="info-value">{landmarks ? landmarks.length : 0}</span>
            </div>
            <div className="info-row">
              <span className="info-key">{t.infoFpsLabel}</span>
              <span className="info-value">
                {Number.isFinite(fps) ? fps.toFixed(0) : 0}
              </span>
            </div>
          </div>

          <div className="app-footer">
            <span>{t.footerLeft}</span>
            <span>{t.footerRight}</span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
