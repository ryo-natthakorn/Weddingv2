import { useEffect, useRef } from "react";
import type { MouseEvent, MutableRefObject } from "react";
import type { MotionValue } from "motion/react";
import {
  CanvasTexture, Group, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, NoColorSpace,
  PerspectiveCamera, PlaneGeometry, Raycaster, Scene, ShaderMaterial, Vector2, Vector3, WebGLRenderer,
} from "three";

/* WebGL version of the stamp ring. Prints stand tangent to the ring (like a
   real carousel) and the GPU resolves overlaps per pixel with a depth buffer,
   so neighbours never swap stacking order in a single frame the way DOM
   elements must. Interaction state stays in GallerySection; this component
   only draws `rotation` and `unfold` and answers "which print is under the
   pointer". */

const CARD_W = 1, CARD_H = 4 / 3;
const TEX_W = 512, TEX_H = 1024, LAYOUT_H = TEX_W * CARD_H;
const PAD = .075, PITCH = .08, NOTCH = .023;
const ELEVATION = 34 * Math.PI / 180;

/* Draw a perforated stamp in 3:4 layout space onto a power-of-two canvas
   (mipmaps need POT on WebGL1), photo cover-fitted inside the paper border. */
function drawStamp(canvas: HTMLCanvasElement, photo: HTMLImageElement | null, paper: string) {
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, TEX_H / LAYOUT_H, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, TEX_W, LAYOUT_H);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, TEX_W, LAYOUT_H);
  const pad = TEX_W * PAD;
  if (photo) {
    const w = TEX_W - pad * 2, h = LAYOUT_H - pad * 2;
    const s = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const sw = w / s, sh = h / s;
    ctx.drawImage(photo, (photo.naturalWidth - sw) / 2, (photo.naturalHeight - sh) / 2, sw, sh, pad, pad, w, h);
  } else {
    ctx.strokeStyle = "rgba(138,112,48,0.18)";
    ctx.lineWidth = 3;
    ctx.strokeRect(pad, pad, TEX_W - pad * 2, LAYOUT_H - pad * 2);
  }
  ctx.globalCompositeOperation = "destination-out";
  const r = TEX_W * NOTCH;
  const across = Math.round(1 / PITCH), stepX = TEX_W / across;
  const down = Math.round(LAYOUT_H / (TEX_W * PITCH)), stepY = LAYOUT_H / down;
  ctx.beginPath();
  for (let i = 0; i < across; i++) {
    const x = (i + .5) * stepX;
    ctx.moveTo(x + r, 0); ctx.arc(x, 0, r, 0, Math.PI * 2);
    ctx.moveTo(x + r, LAYOUT_H); ctx.arc(x, LAYOUT_H, r, 0, Math.PI * 2);
  }
  for (let i = 0; i < down; i++) {
    const y = (i + .5) * stepY;
    ctx.moveTo(r, y); ctx.arc(0, y, r, 0, Math.PI * 2);
    ctx.moveTo(TEX_W + r, y); ctx.arc(TEX_W, y, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

function stampCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W; canvas.height = TEX_H;
  return canvas;
}

/* Depth of field on the GPU: far prints sample a blurrier mip level and fade
   toward the cream page. Alpha-to-coverage keeps the perforations smooth. */
const printShader = (texture: CanvasTexture) => new ShaderMaterial({
  uniforms: { map: { value: texture }, focus: { value: 1 } },
  vertexShader: `varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D map; uniform float focus; varying vec2 vUv;
void main(){
  float d = 1.0 - focus;
  vec4 c = texture2D(map, vUv, d * 2.2);
  if (c.a < 0.02) discard;
  float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 rgb = mix(c.rgb, vec3(l), d * 0.25);
  rgb = mix(rgb, vec3(0.949, 0.910, 0.824), d * 0.42);
  gl_FragColor = vec4(rgb, smoothstep(0.35, 0.65, c.a));
}`,
  alphaToCoverage: true,
});

function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 32, 0, 64, 32, 64);
  g.addColorStop(0, "rgba(61,34,21,0.55)");
  g.addColorStop(1, "rgba(61,34,21,0)");
  ctx.setTransform(1, 0, 0, .5, 0, 16);
  ctx.fillStyle = g;
  ctx.fillRect(0, -32, 128, 128);
  return new CanvasTexture(canvas);
}

type Print = { group: Group; face: Mesh; back: Mesh; shadow: Mesh; faceMat: ShaderMaterial; backMat: ShaderMaterial; shadowMat: MeshBasicMaterial };

export function GalleryWebGL({ images, rotation, unfold, pick, onFail, onClick }: {
  images: string[];
  rotation: MotionValue<number>;
  unfold: MotionValue<number>;
  pick: MutableRefObject<((clientX: number, clientY: number) => number | null) | null>;
  onFail: () => void;
  onClick: (e: MouseEvent<HTMLCanvasElement>) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const failRef = useRef(onFail);
  failRef.current = onFail;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      failRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const total = images.length, step = Math.PI * 2 / total;
    // DeSandro's carousel radius: neighbours meet edge to edge, plus a small gap.
    const radius = (CARD_W / 2) / Math.tan(Math.PI / total) * 1.06;
    const distance = radius * 2.7;
    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, .1, distance * 10);
    camera.position.set(0, distance * Math.tan(ELEVATION), distance);
    camera.lookAt(0, 0, 0);

    const plane = new PlaneGeometry(CARD_W, CARD_H);
    const shadowPlane = new PlaneGeometry(CARD_W * 1.15, CARD_W * .38);
    const shadowMap = shadowTexture();
    const backCanvas = stampCanvas();
    drawStamp(backCanvas, null, "#F1E7D4");
    const backTexture = new CanvasTexture(backCanvas);
    const textures: CanvasTexture[] = [shadowMap, backTexture];
    for (const t of textures) { t.colorSpace = NoColorSpace; t.minFilter = LinearMipmapLinearFilter; t.anisotropy = anisotropy; }

    let frame = 0;
    const request = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; layout(rotation.get(), unfold.get()); renderer.render(scene, camera); });
    };

    const prints: Print[] = images.map((src, index) => {
      const faceCanvas = stampCanvas();
      drawStamp(faceCanvas, null, "#FFFDF7");
      const texture = new CanvasTexture(faceCanvas);
      texture.colorSpace = NoColorSpace; texture.minFilter = LinearMipmapLinearFilter; texture.anisotropy = anisotropy;
      textures.push(texture);
      const photo = new Image();
      photo.decoding = "async";
      photo.onload = () => { drawStamp(faceCanvas, photo, "#FFFDF7"); texture.needsUpdate = true; request(); };
      photo.src = src;
      const faceMat = printShader(texture), backMat = printShader(backTexture);
      const shadowMat = new MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: .2 });
      const face = new Mesh(plane, faceMat), back = new Mesh(plane, backMat), shadow = new Mesh(shadowPlane, shadowMat);
      back.rotation.y = Math.PI;
      back.position.z = -.002;
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, -CARD_H / 2 - .02, .06);
      shadow.renderOrder = -1;
      face.userData.index = back.userData.index = index;
      const group = new Group();
      group.add(shadow, back, face);
      scene.add(group);
      return { group, face, back, shadow, faceMat, backMat, shadowMat };
    });

    function layout(rot: number, p: number) {
      prints.forEach((print, i) => {
        const a = i * step + rot * Math.PI / 180;
        // Before the unfold the prints sit in a loose pile at the front of the ring.
        const pileX = ((i % 3) - 1) * .02, pileY = ((i % 4) - 1.5) * .015, pileTilt = ((i % 5) - 2) * .035;
        print.group.position.set(
          Math.sin(a) * radius * p + pileX * (1 - p),
          pileY * (1 - p),
          Math.cos(a) * radius * p + (radius + i * .006) * (1 - p),
        );
        const ringAngle = Math.atan2(Math.sin(a), Math.cos(a));
        print.group.rotation.set(0, ringAngle * p, pileTilt * (1 - p));
        const focus = p * (Math.cos(a) + 1) / 2 + (1 - p);
        print.faceMat.uniforms.focus.value = focus;
        print.backMat.uniforms.focus.value = focus;
        print.shadowMat.opacity = .08 + .16 * focus;
      });
    }

    /* Fit the whole ring (both rest phases) inside the canvas, cap the front
       print at the same on-screen width the DOM ring uses, and centre it. */
    const corners = [new Vector3(-.5, -.5, 0), new Vector3(.5, -.5, 0), new Vector3(.5, .5, 0), new Vector3(-.5, .5, 0)]
      .map(v => v.set(v.x * CARD_W, v.y * CARD_H, 0));
    function fit(width: number, height: number) {
      camera.aspect = width / height;
      camera.zoom = 1;
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, frontW = 0;
      for (const phase of [0, 180 / total]) {
        layout(phase, 1);
        scene.updateMatrixWorld(true);
        prints.forEach((print, i) => {
          let fx0 = Infinity, fx1 = -Infinity;
          for (const c of corners) {
            const v = c.clone().applyMatrix4(print.face.matrixWorld).project(camera);
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            fx0 = Math.min(fx0, v.x); fx1 = Math.max(fx1, v.x);
          }
          if (phase === 0 && i === 0) frontW = (fx1 - fx0) * width / 2;
        });
      }
      const margin = 10;
      const availX = 1 - 2 * margin / width, availY = 1 - 2 * margin / height;
      const fitZoom = Math.min(availX / Math.max(maxX, -minX), availY * 2 / (maxY - minY));
      const target = width < 600 ? Math.max(118, Math.min(150, width * .36)) : Math.max(220, Math.min(280, width * .3));
      const zoom = Math.min(fitZoom, target / frontW);
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      const centerY = (minY + maxY) / 2 * zoom;
      camera.setViewOffset(width, height, 0, -centerY * height / 2, width, height);
      camera.updateProjectionMatrix();
    }

    const stage = canvas.parentElement!;
    const resize = new ResizeObserver(() => {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      fit(width, height);
      request();
    });
    resize.observe(stage);

    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const targets = prints.flatMap(p => [p.face, p.back]);
    pick.current = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      scene.updateMatrixWorld(true);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(targets, false)[0];
      return hit ? hit.object.userData.index as number : null;
    };

    const lost = (e: Event) => { e.preventDefault(); failRef.current(); };
    canvas.addEventListener("webglcontextlost", lost);
    const offRotation = rotation.on("change", request);
    const offUnfold = unfold.on("change", request);
    request();

    return () => {
      cancelAnimationFrame(frame);
      offRotation(); offUnfold();
      resize.disconnect();
      canvas.removeEventListener("webglcontextlost", lost);
      pick.current = null;
      prints.forEach(p => { p.faceMat.dispose(); p.backMat.dispose(); p.shadowMat.dispose(); });
      textures.forEach(t => t.dispose());
      plane.dispose(); shadowPlane.dispose();
      renderer.dispose();
    };
  }, [images, rotation, unfold, pick]);

  return <canvas ref={canvasRef} className="pw-orbit-canvas" aria-hidden="true" onClick={onClick} />;
}
