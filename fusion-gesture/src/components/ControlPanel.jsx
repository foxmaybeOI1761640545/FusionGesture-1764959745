import React from "react";

const ControlPanel = ({
  intensity,
  onIntensityChange,
  color,
  onColorChange,
  effectType,
  onEffectTypeChange,
  performanceMode,
  onPerformanceModeChange,
  lang = "zh"
}) => {
  const isZh = lang === "zh";

  return (
    <div>
      {/* 粒子强度 */}
      <div className="control-group">
        <div className="control-label">
          <span>{isZh ? "粒子强度" : "Particle Intensity"}</span>
          <span>{Math.round(intensity * 100)}%</span>
        </div>
        <div className="control-input-row">
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.01}
            value={intensity}
            onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* 粒子颜色 */}
      <div className="control-group">
        <div className="control-label">
          <span>{isZh ? "粒子颜色" : "Particle Color"}</span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>{color}</span>
        </div>
        <div className="control-input-row">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
          />
        </div>
      </div>

      {/* 粒子的基础效果选择 */}
      <div className="control-group">
        <div className="control-label">
          <span>{isZh ? "基础效果" : "Base Effect"}</span>
        </div>
        <div className="control-input-row">
          <select
            value={effectType}
            onChange={(e) => onEffectTypeChange(e.target.value)}
          >
            <option value="pinkNova">
              {isZh ? "粉色能量云（默认）" : "Pink Nova (default)"}
            </option>
            <option value="trail">
              {isZh ? "拖尾轨迹" : "Glowing Trail"}
            </option>
            <option value="swirl">
              {isZh ? "旋转云团" : "Swirling Cloud"}
            </option>
            <option value="burst">
              {isZh ? "能量爆裂" : "Energy Burst"}
            </option>
          </select>
        </div>
      </div>

      {/* 性能模式 */}
      <div className="control-group">
        <div className="control-label">
          <span>{isZh ? "性能模式" : "Performance Mode"}</span>
        </div>
        <div className="control-input-row">
          <select
            value={performanceMode}
            onChange={(e) => onPerformanceModeChange(e.target.value)}
          >
            <option value="high">
              {isZh ? "高质量（更多粒子）" : "High (more particles)"}
            </option>
            <option value="balanced">
              {isZh ? "平衡（推荐）" : "Balanced (recommended)"}
            </option>
            <option value="low">
              {isZh ? "节能（更省电）" : "Low (battery saver)"}
            </option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
