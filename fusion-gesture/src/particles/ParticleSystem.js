import * as THREE from "three";

/**
 * 简易 GPU 粒子系统：
 * - 在一个近似 2D 平面上（z 小范围波动）
 * - 根据手势 + 目标位置（target）改变粒子运动方式
 *
 * 预设逻辑：
 * - open  : 使用用户选择的效果类型（trail/swirl/burst）
 * - fist  : 强制使用 burst 预设，粒子更密集、能量感更强
 * - pinch : 使用 swirl 预设，偏向小范围旋转
 * - wave  : 主要为 trail，但附加轻微 swirl，形成“拖尾波纹”
 * - idle  : 粒子较为散开，轻微漂浮
 */
class ParticleSystem {
  /**
   * @param {THREE.Scene} scene three.js 场景
   * @param {{
   *   performanceMode?: "high"|"balanced"|"low",
   *   baseColor?: string,
   *   intensity?: number
   * }} options
   */
  constructor(scene, options = {}) {
    this.scene = scene;

    const perf = options.performanceMode || "balanced";
    const intensity = options.intensity ?? 0.7;

    let baseCount = 3000;
    if (perf === "low") baseCount = 1200;
    if (perf === "high") baseCount = 5000;

    this.count = Math.floor(baseCount * (0.3 + intensity * 0.7));

    // 目标点（由手势 Hook 传入）
    this.target = new THREE.Vector3(0, 0, 0);

    // 用户在 UI 中选择的效果类型
    this.userEffectType = "trail";
    // 当前真正生效的效果类型（会结合手势预设）
    this.effectType = "trail";

    this.performanceMode = perf;
    this.intensity = intensity;
    this.color = new THREE.Color(options.baseColor || "#4f46e5");

    /**
     * 根据手势调整的强度倍率（例如 fist > open）
     * @type {number}
     */
    this.gestureIntensityMultiplier = 1.0;

    /** @type {"open"|"fist"|"pinch"|"wave"|"idle"|string} */
    this.currentGesture = "idle";

    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.life = new Float32Array(this.count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3)
    );

    this.material = new THREE.PointsMaterial({
      size: 0.03,
      color: this.color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);

    this._initParticles();
    this._applyGesturePreset("idle");
  }

  /**
   * 初始化粒子到一个圆盘区域
   * @private
   */
  _initParticles() {
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      // 初始在较大的圆盘中随机分布
      const r = Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      this.positions[i3] = r * Math.cos(theta);
      this.positions[i3 + 1] = r * Math.sin(theta);
      this.positions[i3 + 2] = (Math.random() - 0.5) * 0.4;

      this.velocities[i3] = 0;
      this.velocities[i3 + 1] = 0;
      this.velocities[i3 + 2] = 0;

      this.life[i] = Math.random();
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * 根据当前手势应用一组粒子预设（size / opacity / effectType / 强度倍率）
   * @param {"open"|"fist"|"pinch"|"wave"|"idle"|string} gestureName
   * @private
   */
  _applyGesturePreset(gestureName) {
    this.currentGesture = gestureName || "idle";
    const g = this.currentGesture;

    switch (g) {
      case "open":
        // 用户自由选择主要效果
        this.effectType = this.userEffectType || "trail";
        this.material.size = 0.032;
        this.material.opacity = 0.9;
        this.gestureIntensityMultiplier = 1.0;
        break;
      case "fist":
        // 握拳：能量爆裂型
        this.effectType = "burst";
        this.material.size = 0.04;
        this.material.opacity = 1.0;
        this.gestureIntensityMultiplier = 1.5;
        break;
      case "pinch":
        // 捏合：小范围漩涡
        this.effectType = "swirl";
        this.material.size = 0.028;
        this.material.opacity = 0.85;
        this.gestureIntensityMultiplier = 0.85;
        break;
      case "wave":
        // 左右挥手：拖尾 + 轻微漩涡
        this.effectType = "trail";
        this.material.size = 0.03;
        this.material.opacity = 0.95;
        this.gestureIntensityMultiplier = 1.3;
        break;
      case "idle":
      default:
        // 空闲：较弱的漂浮
        this.effectType = this.userEffectType || "trail";
        this.material.size = 0.03;
        this.material.opacity = 0.8;
        this.gestureIntensityMultiplier = 0.9;
        break;
    }
  }

  /**
   * 在指定索引处重生一个粒子，使其在 target 附近发射
   * @param {number} i
   * @private
   */
  _spawnParticle(i) {
    const i3 = i * 3;
    const radius = 0.05 + Math.random() * 0.18;
    const angle = Math.random() * Math.PI * 2;

    this.positions[i3] = this.target.x + radius * Math.cos(angle);
    this.positions[i3 + 1] = this.target.y + radius * Math.sin(angle);
    this.positions[i3 + 2] = (Math.random() - 0.5) * 0.18;

    this.velocities[i3] = 0;
    this.velocities[i3 + 1] = 0;
    this.velocities[i3 + 2] = 0;

    this.life[i] = 0;
  }

  /**
   * 更新用户可调参数（强度 / 颜色 / 效果类型 / 性能模式）
   */
  setEffectParams({ intensity, color, effectType, performanceMode }) {
    if (typeof intensity === "number") {
      this.intensity = intensity;
    }
    if (color) {
      this.color.set(color);
      this.material.color.set(this.color);
    }
    if (effectType) {
      this.userEffectType = effectType;
    }
    if (performanceMode && performanceMode !== this.performanceMode) {
      this.performanceMode = performanceMode;
      // 性能模式下略微调节粒子尺寸与透明度
      if (performanceMode === "low") {
        this.material.size = 0.024;
        this.material.opacity = 0.8;
      } else if (performanceMode === "high") {
        this.material.size = 0.036;
        this.material.opacity = 1.0;
      } else {
        this.material.size = 0.03;
        this.material.opacity = 0.9;
      }
    }

    // 参数变化后，重新应用当前手势的预设（保证逻辑统一）
    this._applyGesturePreset(this.currentGesture || "idle");
  }

  /**
   * 设置粒子吸引的目标点，以及当前手势（用于切换预设）
   *
   * @param {number} x 已经映射到 [-1, 1] 左右范围的 X
   * @param {number} y 已经映射到 [-1, 1] 上下范围的 Y
   * @param {"open"|"fist"|"pinch"|"wave"|"idle"|string} gestureName
   */
  setTarget(x, y, gestureName) {
    // 这里对 target 做一点缩放，使可视区域更加居中
    this.target.set(x * 1.2, y * 0.9, 0);

    if (gestureName && gestureName !== this.currentGesture) {
      this._applyGesturePreset(gestureName);
    } else if (!gestureName) {
      this._applyGesturePreset("idle");
    }
  }

  /**
   * 每帧更新粒子位置
   * @param {number} dt 与上一帧的时间差（秒）
   */
  update(dt) {
    if (!dt) return;

    const drag = 0.9;
    const baseForce = 1.5 + this.intensity * 3.0;
    const swirlStrength = 1.5 + this.intensity * 2.5;
    const burstStrength = 3.0 + this.intensity * 5.0;

    const isTrail = this.effectType === "trail";
    const isSwirl = this.effectType === "swirl";
    const isBurst = this.effectType === "burst";

    const gesture = this.currentGesture || "idle";

    // 手势强度倍率（握拳/挥手会更躁动）
    let gestureScale = this.gestureIntensityMultiplier || 1.0;

    const perfSkip =
      this.performanceMode === "low"
        ? 2
        : this.performanceMode === "high"
        ? 1
        : 1.5;

    for (let i = 0; i < this.count; i++) {
      if (this.performanceMode === "low" && i % perfSkip !== 0) continue;

      const i3 = i * 3;

      let px = this.positions[i3];
      let py = this.positions[i3 + 1];
      let pz = this.positions[i3 + 2];

      let vx = this.velocities[i3];
      let vy = this.velocities[i3 + 1];
      let vz = this.velocities[i3 + 2];

      const dx = this.target.x - px;
      const dy = this.target.y - py;

      const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
      const dirX = dx / dist;
      const dirY = dy / dist;

      let fx = 0;
      let fy = 0;
      let fz = 0;

      // 基础吸引力（trail 模式最强）
      if (isTrail) {
        const force = baseForce * gestureScale;
        fx += dirX * force * dt;
        fy += dirY * force * dt;
      }

      // 漩涡效果（swirl 模式 / wave 附加）
      if (isSwirl) {
        let swirl = swirlStrength * gestureScale;
        fx += -dirY * swirl * dt;
        fy += dirX * swirl * dt;
        const inward = 0.6 * baseForce * dt;
        fx += dirX * inward;
        fy += dirY * inward;
      }

      // wave 手势下，即使当前主效果不是 swirl，也叠加轻微旋转效果
      if (!isSwirl && gesture === "wave") {
        const swirl = swirlStrength * 0.6 * gestureScale;
        fx += -dirY * swirl * dt;
        fy += dirX * swirl * dt;
      }

      // 爆裂效果：从手部位置向外发散
      if (isBurst) {
        const outward = burstStrength * gestureScale;
        fx += dirX * outward * dt;
        fy += dirY * outward * dt;
        fz += (Math.random() - 0.5) * outward * 0.2 * dt;
      }

      // idle 时轻微随机漂浮
      if (gesture === "idle") {
        fx += (Math.random() - 0.5) * 0.05;
        fy += (Math.random() - 0.5) * 0.05;
      }

      vx = vx * drag + fx;
      vy = vy * drag + fy;
      vz = vz * drag + fz;

      px += vx * dt;
      py += vy * dt;
      pz += vz * dt;

      // 太远的粒子直接重生
      const maxR = 3.2;
      if (Math.sqrt(px * px + py * py) > maxR) {
        this._spawnParticle(i);
        continue;
      }

      this.positions[i3] = px;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = pz;

      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;

      this.life[i] += dt * 0.2;
      if (this.life[i] > 1.0) {
        this._spawnParticle(i);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    if (this.points) {
      this.scene.remove(this.points);
    }
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
  }
}

export default ParticleSystem;
