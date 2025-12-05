import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import ParticleSystem from "../particles/ParticleSystem";

/**
 * Three.js 粒子画布
 * props:
 * - gesture: 当前手势类型
 * - handPosition: { xNorm, yNorm } (0~1) 归一化坐标
 * - intensity: 0~1 粒子强度
 * - color: "#rrggbb"
 * - effectType: "trail" | "swirl" | "burst"
 * - performanceMode: "high" | "balanced" | "low"
 */
const ParticleCanvas = ({
  gesture,
  handPosition,
  intensity,
  color,
  effectType,
  performanceMode
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const particleSystemRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 正交相机，方便将 0~1 映射到 -1~1 之类
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 3;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 柔和背景
    scene.background = new THREE.Color(0x020617);

    const particleSystem = new ParticleSystem(scene, {
      performanceMode,
      baseColor: color,
      intensity
    });
    particleSystemRef.current = particleSystem;

    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = now;

      if (particleSystemRef.current) {
        particleSystemRef.current.update(dt);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("resize", onResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, []);

  // 响应粒度 / 性能模式 / 颜色变化
  useEffect(() => {
    if (!particleSystemRef.current) return;
    particleSystemRef.current.setEffectParams({
      intensity,
      color,
      effectType,
      performanceMode
    });
  }, [intensity, color, effectType, performanceMode]);

  // 响应手势和手部位置变化
  useEffect(() => {
    if (!particleSystemRef.current) return;
    let xNorm = 0.5;
    let yNorm = 0.5;
    if (handPosition) {
      xNorm = handPosition.xNorm;
      yNorm = handPosition.yNorm;
    }
    // 将 0~1 映射到 [-1, 1]
    const tx = xNorm * 2 - 1;
    // 注意屏幕 Y 轴向下，因此取反
    const ty = (1 - yNorm) * 2 - 1;

    particleSystemRef.current.setTarget(tx, ty, gesture || "idle");
  }, [handPosition, gesture]);

  return <div ref={containerRef} className="visual-layer" />;
};

export default ParticleCanvas;
