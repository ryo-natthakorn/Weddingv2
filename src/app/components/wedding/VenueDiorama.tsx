import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useReducedMotion } from "motion/react";
import { COLORS } from "./shared";

/* Batch 1 — bare scene: ground, warm lights, drag-to-rotate / pinch-to-zoom
   camera. Building, parking, road and MRT marker land in later batches. */
export function VenueDiorama() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(9, 7, 11);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Warm, flat lighting — no photoreal textures
    const hemi = new THREE.HemisphereLight(
      new THREE.Color(COLORS.cream),
      new THREE.Color(COLORS.midBrown),
      1.15,
    );
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(new THREE.Color(COLORS.goldLight), 1.4);
    sun.position.set(6, 10, 4);
    scene.add(sun);

    // Ground — sage lawn placeholder; building/road/parking land in Batch 2-3
    const groundGeo = new THREE.CircleGeometry(9, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(COLORS.sage),
      roughness: 0.95,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Drag-to-rotate / pinch-to-zoom, clamped so guests can't get lost
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 16;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.6;
    controls.update();

    const stopAutoRotate = () => {
      controls.autoRotate = false;
    };
    controls.addEventListener("start", stopAutoRotate);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // Pause the render loop while the canvas itself is off-screen (battery)
    let isVisible = true;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(container);

    // iOS Safari can drop the WebGL context under memory pressure — degrade
    // to a static frame instead of throwing.
    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost, false);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored, false);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isVisible || contextLost) return;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      controls.removeEventListener("start", stopAutoRotate);
      controls.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      groundGeo.dispose();
      groundMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Interactive 3D view of the venue, parking, and nearest MRT station"
      style={{ width: "100%", height: "100%", clipPath: "inset(0)", borderRadius: 20 }}
    />
  );
}
