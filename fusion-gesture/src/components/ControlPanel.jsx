import React from "react";

/**
 * ControlPanel
 * props:
 * - intensity, onIntensityChange
 * - color, onColorChange
 * - effectType, onEffectTypeChange
 * - performanceMode, onPerformanceModeChange
 */
const ControlPanel = ({
  intensity,
  onIntensityChange,
  color,
  onColorChange,
  effectType,
  onEffectTypeChange,
  performanceMode,
  onPerformanceModeChange
}) => {
  return (
    <div>
      {/* 粒子强度 */}
      <div className="control-group">
        <div className="control-label">
          <span>Particle Intensity</span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            {Math.round(intensity * 100)}%
          </span>
        </div>
        <div className="control-input-row">
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={intensity}
            onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
          />
        </div>
      </div>

      {/* 粒子颜色 */}
      <div className="control-group">
        <div className="control-label">
          <span>Particle Color</span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>Hue</span>
        </div>
        <div className="control-input-row">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
          />
        </div>
      </div>

      {/* 效果类型 */}
      <div className="control-group">
        <div className="control-label">
          <span>Effect Style</span>
        </div>
        <div className="control-input-row">
          <select
            value={effectType}
            onChange={(e) => onEffectTypeChange(e.target.value)}
          >
            <option value="trail">Glowing Trail</option>
            <option value="swirl">Swirling Cloud</option>
            <option value="burst">Energy Burst</option>
          </select>
        </div>
      </div>

      {/* 性能模式 */}
      <div className="control-group">
        <div className="control-label">
          <span>Performance Mode</span>
        </div>
        <div className="control-input-row">
          <button
            className={
              "toggle-button" + (performanceMode === "high" ? " active" : "")
            }
            onClick={() => onPerformanceModeChange("high")}
          >
            High
          </button>
          <button
            className={
              "toggle-button" +
              (performanceMode === "balanced" ? " active" : "")
            }
            onClick={() => onPerformanceModeChange("balanced")}
          >
            Balanced
          </button>
          <button
            className={
              "toggle-button" + (performanceMode === "low" ? " active" : "")
            }
            onClick={() => onPerformanceModeChange("low")}
          >
            Low
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
