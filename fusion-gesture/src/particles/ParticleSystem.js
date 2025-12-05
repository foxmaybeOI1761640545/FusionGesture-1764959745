import * as THREE from "three";

/**
 * 简单 GPU 粒子系统
 * - 在一个 2D 平面上（z 固定），粒子围绕 targetX, targetY 运动
 * - effectType 决定行为：拖尾 / 漩涡 / 爆裂
 */
class ParticleSystem {
  constructor(scene, options = {}) {
    this.scene = scene;

    const perf = options.performanceMode || "balanced";
    const intensity = options.intensity ?? 0.7;

    let baseCount = 3000;
    if (perf === "low") baseCount = 1200;
    if (perf === "high") baseCount = 5000;

    this.count = Math.floor(baseCount * (0.3 + intensity * 0.7));
    this.target = new THREE.Vector3(0, 0, 0);
    this.effectType = "trail";
    this.performanceMode = perf;
    this.intensity = intensity;
    this.color = new THREE.Color(options.baseColor || "#4f46e5");

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
  }

  _initParticles() {
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      // 初始在较大的圆盘中随机
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

  setEffectParams({ intensity, color, effectType, performanceMode }) {
    if (typeof intensity === "number") {
      this.intensity = intensity;
    }
    if (color) {
      this.color.set(color);
      this.material.color.set(this.color);
    }
    if (effectType) {
      this.effectType = effectType;
    }
    if (performanceMode && performanceMode !== this.performanceMode) {
      this.performanceMode = performanceMode;
      // 性能模式调整粒子尺寸与透明度，间接省性能
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
  }

  setTarget(x, y, gestureName) {
    // 平面 z = 0
    this.target.set(x * 1.2, y * 0.9, 0);
    this.currentGesture = gestureName;
  }

  _spawnParticle(i) {
    const i3 = i * 3;
    // 在 target 附近随机重生
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

    // 根据手势稍微改变 global scale
    let gestureScale = 1.0;
    if (gesture === "fist") gestureScale = 1.4;
    if (gesture === "open") gestureScale = 1.0;
    if (gesture === "pinch") gestureScale = 0.8;
    if (gesture === "wave") gestureScale = 1.2;

    const perfSkip =
      this.performanceMode === "low" ? 2 : this.performanceMode === "high" ? 1 : 1.5;

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

      // 基础吸引力（trail 模式最强）
      let fx = 0;
      let fy = 0;
      let fz = 0;

      if (isTrail) {
        const force = baseForce * gestureScale;
        fx += dirX * force * dt;
        fy += dirY * force * dt;
      }

      if (isSwirl) {
        const swirl = swirlStrength * gestureScale;
        // 垂直方向：(-dirY, dirX)
        fx += -dirY * swirl * dt;
        fy += dirX * swirl * dt;
        // 同时略微向中心吸引
        const inward = 0.6 * baseForce * dt;
        fx += dirX * inward;
        fy += dirY * inward;
      }

      if (isBurst) {
        // 从手部位置向外爆裂
        const outward = burstStrength * gestureScale;
        fx += dirX * outward * dt;
        fy += dirY * outward * dt;
        fz += (Math.random() - 0.5) * outward * 0.2 * dt;
      }

      // idle 时轻微漂浮
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

      // 若太远则重生
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
