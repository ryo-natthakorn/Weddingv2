import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useReducedMotion } from "motion/react";
import { COLORS } from "./shared";

type Disposable = { dispose: () => void };

// MRT Pink Line branding — the one sanctioned off-palette accent, used only
// for wayfinding (the station pin and its label).
const MRT_PINK = "#E0538A";

/* Small always-facing-camera pill label, baked as a canvas texture. Plain
   sans-serif rather than TT Interphases — these are tiny in-scene wayfinding
   tags, not page typography, and baking a texture shouldn't race font load. */
function createLabelSprite(disposables: Disposable[], text: string, textColor: string, bgColor: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontSize = 40;
  ctx.font = `600 ${fontSize}px sans-serif`;
  const paddingX = 26;
  const textWidth = ctx.measureText(text).width;
  canvas.width = Math.ceil(textWidth + paddingX * 2);
  canvas.height = fontSize + 26;
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const r = canvas.height / 2;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(canvas.width - r, 0);
  ctx.arcTo(canvas.width, 0, canvas.width, r, r);
  ctx.lineTo(canvas.width, canvas.height - r);
  ctx.arcTo(canvas.width, canvas.height, canvas.width - r, canvas.height, r);
  ctx.lineTo(r, canvas.height);
  ctx.arcTo(0, canvas.height, 0, canvas.height - r, r);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  disposables.push(texture, material);
  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  const height = 0.4;
  sprite.scale.set(height * aspect, height, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/* Straight flat strip between two ground points — used for the road. The
   flatten rotation is baked into the geometry itself (not the mesh), so the
   mesh's own rotation.y can be a clean, unambiguous yaw toward the target. */
function createGroundStrip(disposables: Disposable[], from: [number, number], to: [number, number], width: number, color: string) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const geo = new THREE.PlaneGeometry(width, length);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.9 });
  disposables.push(geo, mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.y = Math.atan2(dx, dz);
  mesh.position.set((from[0] + to[0]) / 2, 0.008, (from[1] + to[1]) / 2);
  return mesh;
}

function createCar(disposables: Disposable[], color: string) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5, metalness: 0.15, flatShading: true });
  const bodyGeo = new THREE.BoxGeometry(0.42, 0.16, 0.22);
  const cabinGeo = new THREE.BoxGeometry(0.24, 0.14, 0.19);
  disposables.push(mat, bodyGeo, cabinGeo);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.1;
  group.add(body);
  const cabin = new THREE.Mesh(cabinGeo, mat);
  cabin.position.set(-0.02, 0.21, 0);
  group.add(cabin);
  return group;
}

/* Low-poly gable roof: a triangular-prism wedge built from an extruded 2D
   shape, so the ridge and slope angle are fully explicit (no fighting
   THREE.CylinderGeometry's default vertex angles). The shape's local X/Y
   plane is the front gable face; extruding along Z gives the roof depth. */
function createGableRoof(width: number, rise: number, depth: number, overhangX: number, overhangZ: number) {
  const halfSpan = width / 2 + overhangX;
  const shape = new THREE.Shape();
  shape.moveTo(-halfSpan, 0);
  shape.lineTo(halfSpan, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const fullDepth = depth + overhangZ * 2;
  const geo = new THREE.ExtrudeGeometry(shape, { depth: fullDepth, bevelEnabled: false });
  geo.translate(0, 0, -fullDepth / 2);
  return geo;
}

/* Gold arched front door — a rectangle capped with a semicircle, extruded thin. */
function createArchedDoor(width: number, height: number, thickness: number) {
  const r = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-r, 0);
  shape.lineTo(-r, height - r);
  shape.absarc(0, height - r, r, Math.PI, 0, true);
  shape.lineTo(r, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

function buildVenue(disposables: Disposable[], label: string) {
  const group = new THREE.Group();

  const wallHeight = 1.7;
  const houseWidth = 2.6;
  const houseDepth = 2.0;
  const roofRise = 1.15;

  const wallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.white), roughness: 0.9, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.blush), roughness: 0.85, flatShading: true });
  const sageMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.sage), roughness: 0.8, flatShading: true });
  const goldMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.gold), roughness: 0.5, metalness: 0.2, flatShading: true });
  const brownMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.midBrown), roughness: 0.9, flatShading: true });
  const glassMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.tealDark), roughness: 0.3, flatShading: true });
  disposables.push(wallMat, roofMat, sageMat, goldMat, brownMat, glassMat);

  // Main two-story block
  const wallGeo = new THREE.BoxGeometry(houseWidth, wallHeight, houseDepth);
  disposables.push(wallGeo);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = wallHeight / 2;
  group.add(wall);

  // Steep front-facing gable roof (ridge along X, gable end faces +Z — the
  // photo's signature silhouette)
  const roofGeo = createGableRoof(houseWidth, roofRise, houseDepth, 0.22, 0.22);
  disposables.push(roofGeo);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = wallHeight;
  group.add(roof);

  // Round porthole window set into the gable end
  const windowGeo = new THREE.CircleGeometry(0.16, 20);
  disposables.push(windowGeo);
  const gableWindow = new THREE.Mesh(windowGeo, glassMat);
  gableWindow.position.set(0, wallHeight + roofRise * 0.32, houseDepth / 2 + 0.24);
  group.add(gableWindow);

  // Sage tiled accent panel on the upper facade, clear of the door (tops out
  // at y≈0.95) and the gable window (bottoms out at y≈1.91) below/above it
  const panelGeo = new THREE.BoxGeometry(1.1, 0.7, 0.05);
  disposables.push(panelGeo);
  const panel = new THREE.Mesh(panelGeo, sageMat);
  panel.position.set(0, wallHeight * 0.84, houseDepth / 2 + 0.03);
  group.add(panel);

  // Gold arched front door, centered at ground level
  const doorGeo = createArchedDoor(0.5, 0.95, 0.08);
  disposables.push(doorGeo);
  const door = new THREE.Mesh(doorGeo, goldMat);
  door.position.set(0, 0, houseDepth / 2 + 0.02);
  group.add(door);

  // A small shuttered window beside the door
  const paneGeo = new THREE.BoxGeometry(0.42, 0.5, 0.04);
  const shutterGeo = new THREE.BoxGeometry(0.12, 0.5, 0.05);
  disposables.push(paneGeo, shutterGeo);
  const windowX = 0.85;
  const paneY = 0.55;
  const pane = new THREE.Mesh(paneGeo, glassMat);
  pane.position.set(windowX, paneY, houseDepth / 2 + 0.02);
  group.add(pane);
  const shutterL = new THREE.Mesh(shutterGeo, brownMat);
  shutterL.position.set(windowX - 0.28, paneY, houseDepth / 2 + 0.02);
  group.add(shutterL);
  const shutterR = new THREE.Mesh(shutterGeo, brownMat);
  shutterR.position.set(windowX + 0.28, paneY, houseDepth / 2 + 0.02);
  group.add(shutterR);

  // Lower single-story wing on the right, with its own smaller roof
  const wingWidth = 1.3;
  const wingDepth = 1.5;
  const wingWallHeight = 1.0;
  const wingRoofRise = 0.55;
  const wingX = houseWidth / 2 + wingWidth / 2 - 0.15;

  const wingWallGeo = new THREE.BoxGeometry(wingWidth, wingWallHeight, wingDepth);
  disposables.push(wingWallGeo);
  const wingWall = new THREE.Mesh(wingWallGeo, wallMat);
  wingWall.position.set(wingX, wingWallHeight / 2, 0);
  group.add(wingWall);

  const wingRoofGeo = createGableRoof(wingWidth, wingRoofRise, wingDepth, 0.15, 0.15);
  disposables.push(wingRoofGeo);
  const wingRoof = new THREE.Mesh(wingRoofGeo, roofMat);
  wingRoof.position.set(wingX, wingWallHeight, 0);
  group.add(wingRoof);

  // Flanking trees
  const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6);
  const canopyGeo = new THREE.IcosahedronGeometry(0.55, 0);
  disposables.push(trunkGeo, canopyGeo);
  const makeTree = (x: number, z: number, scale: number) => {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, brownMat);
    trunk.position.y = 0.25;
    tree.add(trunk);
    const canopy = new THREE.Mesh(canopyGeo, sageMat);
    canopy.position.y = 0.75;
    tree.add(canopy);
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);
    return tree;
  };
  group.add(makeTree(-(houseWidth / 2 + 1.5), 0.4, 1.15));
  group.add(makeTree(wingX + wingWidth / 2 + 1.1, 0.7, 0.85));

  const venueLabel = createLabelSprite(disposables, label, COLORS.white, COLORS.navy);
  venueLabel.position.set(0, wallHeight + roofRise + 0.35, 0);
  group.add(venueLabel);

  return group;
}

const PARKING_CENTER: [number, number] = [-5.25, 0];

function buildParking(disposables: Disposable[], label: string) {
  const group = new THREE.Group();
  const [px, pz] = PARKING_CENTER;

  const lotGeo = new THREE.PlaneGeometry(2.6, 3.0);
  const lotMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.paperShadow), roughness: 0.95 });
  disposables.push(lotGeo, lotMat);
  const lot = new THREE.Mesh(lotGeo, lotMat);
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(px, 0.005, pz);
  group.add(lot);

  const carColors = [COLORS.navy, COLORS.gold, COLORS.midBrown];
  const carOffsets = [-0.85, 0, 0.85];
  carOffsets.forEach((offset, i) => {
    const car = createCar(disposables, carColors[i]);
    car.position.set(px + offset, 0, pz + 0.7);
    car.rotation.y = Math.PI;
    group.add(car);
  });

  const parkingLabel = createLabelSprite(disposables, label, COLORS.white, COLORS.gold);
  parkingLabel.position.set(px, 1.1, pz);
  group.add(parkingLabel);

  return group;
}

const MRT_MARKER: [number, number] = [-6, 6];

function buildMrtMarker(disposables: Disposable[], label: string) {
  const group = new THREE.Group();
  const [mx, mz] = MRT_MARKER;

  const pinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(MRT_PINK), roughness: 0.4, flatShading: true });
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
  const headGeo = new THREE.SphereGeometry(0.13, 16, 12);
  disposables.push(pinMat, stemGeo, headGeo);
  const stem = new THREE.Mesh(stemGeo, pinMat);
  stem.position.set(mx, 0.25, mz);
  group.add(stem);
  const head = new THREE.Mesh(headGeo, pinMat);
  head.position.set(mx, 0.55, mz);
  group.add(head);

  const mrtLabel = createLabelSprite(disposables, label, COLORS.white, MRT_PINK);
  mrtLabel.position.set(mx, 1.05, mz);
  group.add(mrtLabel);

  return group;
}

function buildGroundAndPath(disposables: Disposable[]) {
  const group = new THREE.Group();

  const groundGeo = new THREE.CircleGeometry(11, 48);
  const groundMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.sage), roughness: 0.95 });
  disposables.push(groundGeo, groundMat);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Straight path from the approach edge up to the front door
  const pathLength = 5.5;
  const pathGeo = new THREE.PlaneGeometry(0.6, pathLength);
  const pathMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.white), roughness: 0.9 });
  disposables.push(pathGeo, pathMat);
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 1 + pathLength / 2);
  group.add(path);

  // Road from the parking lot out to the MRT marker
  const road = createGroundStrip(disposables, [PARKING_CENTER[0], PARKING_CENTER[1] + 1.5], MRT_MARKER, 0.5, COLORS.paperShadow);
  group.add(road);

  return group;
}

export type VenueDioramaLabels = {
  venue: string;
  parking: string;
  mrt: string;
};

/* The SailomSangdad building (matched to the real photo's silhouette), the
   sage lawn and approach path, a parking area with a few cars, a road out to
   the nearest MRT station, and always-facing-camera wayfinding labels. */
export function VenueDiorama({ labels }: { labels: VenueDioramaLabels }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { venue: venueLabel, parking: parkingLabel, mrt: mrtLabel } = labels;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const disposables: Disposable[] = [];
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(7, 8, 13);

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

    scene.add(buildGroundAndPath(disposables));
    scene.add(buildVenue(disposables, venueLabel));
    scene.add(buildParking(disposables, parkingLabel));
    scene.add(buildMrtMarker(disposables, mrtLabel));

    // Drag-to-rotate / pinch-to-zoom, clamped so guests can't get lost
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 25;
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
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reduceMotion, venueLabel, parkingLabel, mrtLabel]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Interactive 3D view of the venue, parking, and nearest MRT station"
      style={{ width: "100%", height: "100%", clipPath: "inset(0)", borderRadius: 20 }}
    />
  );
}
