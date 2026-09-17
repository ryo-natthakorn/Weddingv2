import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, useAnimationFrame, useMotionValueEvent, animate } from "motion/react";
import type { MotionValue, PanInfo } from "motion/react";
import { PerspectiveCamera, Vector3 } from "three";
import { useLang } from "./wedding-context";
import { Divider, COLORS } from "./shared";
const PRE_WEDDING_MODULES = import.meta.glob(
  "../../../imports/pre-wedding/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const PHOTO_GROUPS = [
  ["01-ring-box.jpg"],
  ["11-suan-ben.jpg", "10-suan-ben.jpg", "09-suan-ben.jpg", "08-suan-ben.jpg", "02-rings.jpg", "07-suan-ben.jpg"],
  ["03-saphan-phut.jpg", "04-saphan-phut.jpg", "05-saphan-phut.jpg", "06-saphan-phut.jpg"],
];
const photosByName = new Map(Object.entries(PRE_WEDDING_MODULES).map(([path, src]) => [path.split("/").pop()!, src]));
const assignedNames = new Set(PHOTO_GROUPS.flat());
const PRE_WEDDING_GROUPS = [
  ...PHOTO_GROUPS.map(names => names.flatMap(name => photosByName.has(name) ? [photosByName.get(name)!] : [])),
  [...photosByName.entries()].filter(([name]) => !assignedNames.has(name)).sort(([a], [b]) => a.localeCompare(b)).map(([, src]) => src),
];
const PRE_WEDDING_IMAGES = PRE_WEDDING_GROUPS.flat();


const STAMP_CSS = `
.pw-orbit { position:relative; width:100%; height:min(560px,70svh); touch-action:pan-y; transition:filter .45s cubic-bezier(.22,1,.36,1), transform .45s cubic-bezier(.22,1,.36,1); }
.pw-orbit[data-zoomed="true"] { filter:blur(7px); transform:scale(.93); }
@media (prefers-reduced-motion: reduce) { .pw-orbit { transition:none; } }
.pw-orbit-card { position:absolute; left:50%; top:50%; padding:0; border:0; background:none; cursor:zoom-in; touch-action:pan-y; }
.pw-orbit-card img { display:block; width:100%; height:100%; object-fit:cover; }
.pw-orbit-card .pw-stamp { width:100%; height:100%; box-sizing:border-box; }
.pw-stamp {
  --stamp-pitch: 12px;
  --stamp-notch: 3.4px;
  --stamp-edge: calc(var(--stamp-notch) + 0.35px);
  display: block;
  padding: 11px;
  background: #FFFDF7;
  -webkit-mask-image:
    radial-gradient(circle at 50% 0,    rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 50% 100%, rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 0 50%,    rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 100% 50%, rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge));
  -webkit-mask-size: var(--stamp-pitch) 100%, var(--stamp-pitch) 100%, 100% var(--stamp-pitch), 100% var(--stamp-pitch);
  -webkit-mask-position: 0 0, 0 100%, 0 0, 100% 0;
  -webkit-mask-repeat: round no-repeat, round no-repeat, no-repeat round, no-repeat round;
  -webkit-mask-composite: source-in;
  mask-image:
    radial-gradient(circle at 50% 0,    rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 50% 100%, rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 0 50%,    rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge)),
    radial-gradient(circle at 100% 50%, rgba(0,0,0,0) var(--stamp-notch), #000 var(--stamp-edge));
  mask-size: var(--stamp-pitch) 100%, var(--stamp-pitch) 100%, 100% var(--stamp-pitch), 100% var(--stamp-pitch);
  mask-position: 0 0, 0 100%, 0 0, 100% 0;
  mask-repeat: round no-repeat, round no-repeat, no-repeat round, no-repeat round;
  mask-composite: intersect;
}
.pw-stamp img {
  border: 0;
}
@media (min-width: 640px) { .pw-stamp { --stamp-pitch: 14px; --stamp-notch: 4px; padding: 13px; } }

`;
function ArrowButton({
  direction,
  onClick,
  disabled,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "1px solid rgba(138,112,48,0.35)",
        background: "rgba(255,248,240,0.9)",
        boxShadow: "0 6px 16px rgba(138,112,48,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {direction === "prev" ? <ArrowLeft size={18} color={COLORS.gold} /> : <ArrowRight size={18} color={COLORS.gold} />}
    </button>
  );
}

/* Full-screen viewer. Portaled to document.body so its `position: fixed`
   always covers the real viewport — nesting it under the section's own reveal
   animation would otherwise put it inside a transformed ancestor (Framer
   Motion's animated `y` becomes an inline transform), which turns "fixed" into
   "fixed to that ancestor". */
function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const last = images.length - 1;
  const [paged, setPaged] = useState(false);
  /* Hand focus back the moment the guest closes, not after the exit animation
     unmounts the viewer — otherwise keyboard focus floats for a few frames. */
  const [returnFocus] = useState(() => document.activeElement as HTMLElement | null);
  const close = useCallback(() => { returnFocus?.focus({ preventScroll: true }); onClose(); }, [returnFocus, onClose]);
  const go = useCallback(
    (next: number) => { setPaged(true); onIndex(Math.max(0, Math.min(last, next))); },
    [last, onIndex],
  );

  /* The body scroll lock runs once for the life of the viewer. Keeping it out
     of the key handler's effect matters — that one re-subscribes whenever the
     index changes, and locking/unlocking on every arrow press would let the
     page jump behind the overlay. */
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      if (!document.activeElement || document.activeElement === document.body) returnFocus?.focus({ preventScroll: true });
    };
  }, [returnFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, close]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(index + 1);
    else if (info.offset.x > 60) go(index - 1);
  };

  return createPortal(
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={lang === "TH" ? "ดูรูปขนาดเต็ม" : "Photo viewer"}
      /* Opens with depth: the backdrop darkens and blurs in while the print
         rises and rotates flat toward the camera. */
      initial={{ backgroundColor: "rgba(42,26,10,0)", backdropFilter: "blur(0px)" }}
      animate={{ backgroundColor: "rgba(42,26,10,0.94)", backdropFilter: "blur(14px)" }}
      exit={reduceMotion ? undefined : { backgroundColor: "rgba(42,26,10,0)", backdropFilter: "blur(0px)", opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.38, ease: "easeOut" }}
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "24px 16px",
      }}
    >
      {/* Only the photo swaps between steps — the overlay itself is not keyed
          on the image, so paging never re-fades the backdrop. */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: 0, perspective: 1200 }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={images[index]}
            src={images[index]}
            alt=""
            drag={images.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            draggable={false}
            initial={reduceMotion ? { opacity: 0 } : paged ? { opacity: 0, scale: 0.97 } : { opacity: 0, y: 26, scale: 0.84, rotateX: 9 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={reduceMotion ? { duration: 0 } : paged
              ? { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.46, ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.32, ease: "easeOut" } }}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "92vw",
              maxHeight: "74vh",
              objectFit: "contain",
              borderRadius: 10,
              boxShadow: "0 24px 60px rgba(42,26,10,0.55)",
              display: "block",
              cursor: images.length > 1 ? "grab" : "default",
              touchAction: "pan-y",
            }}
          />
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, paddingTop: 18, paddingBottom: "max(4px, env(safe-area-inset-bottom))" }}
        >
          <ArrowButton
            direction="prev"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            label={lang === "TH" ? "รูปก่อนหน้า" : "Previous photo"}
          />
          <span
            aria-live="polite"
            style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.72rem", letterSpacing: "0.16em", color: "rgba(255,248,240,0.75)", minWidth: 62, textAlign: "center" }}
          >
            {index + 1} / {images.length}
          </span>
          <ArrowButton
            direction="next"
            onClick={() => go(index + 1)}
            disabled={index === last}
            label={lang === "TH" ? "รูปถัดไป" : "Next photo"}
          />
        </div>
      )}

      <button
        ref={closeRef}
        type="button"
        onClick={close}
        aria-label={lang === "TH" ? "ปิด" : "Close"}
        style={{
          position: "absolute",
          top: "max(16px, env(safe-area-inset-top))",
          right: 16,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "1px solid rgba(255,248,240,0.4)",
          background: "rgba(255,248,240,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <X size={18} color="#FFF8F0" />
      </button>
    </motion.div>,
    document.body,
  );
}

type Geometry = { width:number; height:number; card:number; radius:number; lift:number; camera:PerspectiveCamera };
function geometryFor(width:number, height:number):Geometry {
  const target = width < 600 ? Math.max(140, Math.min(180,width*.46)) : Math.max(220, Math.min(280,width*.3));
  const card = Math.min(target,(height-32)*.48,width-32);
  const radius = Math.max(12,(width-32-card*.8)*.425);
  const distance = radius*3.4;
  const camera = new PerspectiveCamera(2*Math.atan(height/(2*distance))*180/Math.PI,width/height,1,distance*10);
  camera.position.z=distance;
  camera.updateMatrixWorld();
  const lift = Math.max(0, Math.min(radius * 1.2, height / 2 - card * 2 / 3 - 20)) * (distance-radius) / distance;
  return { width,height,card,radius,lift,camera };
}
/* The print whose angle is nearest the camera. */
const frontIndex=(rotation:number,total:number)=>((Math.round(-rotation/(360/total))%total)+total)%total;
/* Crossfade for the print leaving the front. Neighbours share the same depth
   at the midpoint between them, so their zIndex flips in one frame while they
   overlap heavily — the stamp edge visibly jumped. Fading the leaving print out
   around that point (and back in behind) hides the flip. */
const CROSS_DEPTH=.9, CROSS_WIDTH=.35;
// Project the supplied circular layout as upright billboards, retaining real
// perspective without mirrored photo backs. Motion updates accessible DOM.
function CircularPrint({src,index,total,geometry,rotation,unfold,direction,tabbable,onActivate}:{
  src:string; index:number; total:number; geometry:Geometry;
  rotation:MotionValue<number>; unfold:MotionValue<number>; direction:MotionValue<number>;
  tabbable:boolean; onActivate:()=>void;
}) {
  const {lang}=useLang();
  const position=useTransform(()=>{
    const p=unfold.get(), step=360/total, deg=index*step+rotation.get(), a=deg*Math.PI/180;
    const z=Math.cos(a)*geometry.radius;
    const v=new Vector3(Math.sin(a)*geometry.radius,-Math.cos(a)*geometry.lift,z).project(geometry.camera);
    const d=geometry.radius*3.4, scale=(d-geometry.radius)/(d-z);
    // Depth of field: the print nearest the camera is sharp and fully saturated;
    // the far side of the ring falls out of focus so it reads as a real circle.
    const focus=p*(z+geometry.radius)/(2*geometry.radius)+(1-p);
    const signed=((deg%360)+540)%360-180, off=Math.abs(signed)-step/2;
    const leaving=Math.abs(signed)<90&&Math.sign(signed)===Math.sign(direction.get());
    const t=leaving?Math.max(0,1-Math.abs(off)/(step*CROSS_WIDTH)):0;
    const cross=1-CROSS_DEPTH*t*t*(3-2*t)*p;
    return {x:v.x*geometry.width/2*p+(1-p)*(index%3-1)*3,
      y:-v.y*geometry.height/2*p+(1-p)*(index%4-1.5)*2,
      scale:1+(scale-1)*p, depth:Math.round(1000+z), rotate:(1-p)*(index%5-2)*2,
      opacity:(.5+focus*.5)*cross,
      filter:`blur(${((1-focus)*2.6).toFixed(2)}px) brightness(${(.84+focus*.16).toFixed(3)}) saturate(${(.78+focus*.22).toFixed(3)}) drop-shadow(0 ${(5+focus*6).toFixed(1)}px ${(7+focus*7).toFixed(1)}px rgba(61,34,21,${(.12+focus*.14).toFixed(3)}))`};
  });
  const x=useTransform(position,p=>p.x), y=useTransform(position,p=>p.y);
  const scale=useTransform(position,p=>p.scale), rotate=useTransform(position,p=>p.rotate), zIndex=useTransform(position,p=>p.depth);
  const opacity=useTransform(position,p=>p.opacity), filter=useTransform(position,p=>p.filter);
  return <motion.button type="button" className="pw-orbit-card" tabIndex={tabbable?0:-1}
    aria-label={lang==="TH"?`เปิดรูปที่ ${index+1} จาก ${total}`:`Open photo ${index+1} of ${total}`}
    onFocus={e=>{if(e.currentTarget.matches(":focus-visible")) rotation.set(-index*360/total);}}
    onClick={onActivate} style={{x,y,scale,rotate,zIndex,opacity,filter,width:geometry.card,height:geometry.card*4/3,marginLeft:-geometry.card/2,marginTop:-geometry.card*2/3}}>
    <span className="pw-stamp"><img src={src} alt="" draggable={false} loading="eager" decoding="async"/></span>
  </motion.button>;
}
export function GallerySection(){
  const {lang,t}=useLang();
  const total=PRE_WEDDING_IMAGES.length, step=360/total;
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stage=useRef<HTMLDivElement>(null), started=useRef(false), lastFrame=useRef<number|null>(null);
  const [seen,setSeen]=useState(false), [visible,setVisible]=useState(false), [complete,setComplete]=useState(false);
  const [hover,setHover]=useState(false), [focused,setFocused]=useState(false), [touching,setTouching]=useState(false), [hidden,setHidden]=useState(false);
  const [zoom,setZoom]=useState<number|null>(null);
  const [front,setFront]=useState(0), [interacted,setInteracted]=useState(false);
  const [geometry,setGeometry]=useState(()=>geometryFor(320,460));
  const rotation=useMotionValue(0), unfold=useMotionValue(reduced?1:0), direction=useMotionValue(1);
  /* Drag and throw live in refs, not state — they change every frame. */
  const spin=useRef<{x:number;r0:number;last:number;v:number;t:number;moved:number}|null>(null);
  const inertia=useRef(0), suppressClick=useRef(false), turning=useRef<ReturnType<typeof animate>|null>(null);
  useMotionValueEvent(rotation,"change",r=>setFront(frontIndex(r,total)));
  const turnTo=useCallback((index:number)=>{
    const from=rotation.get(), delta=((-index*step-from)%360+540)%360-180;
    if(!delta)return;
    inertia.current=0;turning.current?.stop();
    direction.set(Math.sign(delta));
    turning.current=animate(rotation,from+delta,{duration:reduced?0:.6,ease:[.22,1,.36,1],onComplete:()=>{turning.current=null;}});
  },[rotation,direction,step,reduced]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(media.matches);
    media.addEventListener('change',change);
    return ()=>media.removeEventListener('change',change);
  },[]);
  useEffect(()=>{
    const node=stage.current;
    if(!node)return;
    const resize=new ResizeObserver(([entry])=>setGeometry(geometryFor(entry.contentRect.width,entry.contentRect.height)));
    resize.observe(node);
    const observer=new IntersectionObserver(([entry])=>{
      setVisible(entry.isIntersecting);
      if(entry.intersectionRatio>=.6)setSeen(true);
    },{threshold:[0,.6]});
    observer.observe(node);
    const visibility=()=>setHidden(document.hidden);
    const move=(e:PointerEvent)=>{
      const s=spin.current;
      if(!s)return;
      const width=node.getBoundingClientRect().width||320, dx=e.clientX-s.x, now=performance.now();
      s.moved=Math.max(s.moved,Math.abs(dx));
      if(s.moved<=8)return;
      s.v=(e.clientX-s.last)/width*150/Math.max(8,now-s.t)*16;
      if(e.clientX!==s.last)direction.set(Math.sign(e.clientX-s.last));
      s.last=e.clientX;s.t=now;
      rotation.set((s.r0+dx/width*150)%360);
      setInteracted(true);
    };
    const release=()=>{
      setTouching(false);
      const s=spin.current;
      if(!s)return;
      spin.current=null;lastFrame.current=null;
      if(s.moved>8){
        // A real drag must not also fire the photo's click-to-zoom.
        suppressClick.current=true;
        setTimeout(()=>{suppressClick.current=false;},60);
        inertia.current=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.max(-6,Math.min(6,s.v));
      }
    };
    document.addEventListener("visibilitychange",visibility);
    window.addEventListener("pointermove",move,{passive:true});
    window.addEventListener("pointerup",release);window.addEventListener("pointercancel",release);
    visibility();
    return ()=>{resize.disconnect();observer.disconnect();document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",release);window.removeEventListener("pointercancel",release);};
  },[rotation,direction]);
  useEffect(()=>{
    if(reduced){unfold.set(1);setComplete(true);started.current=true;return;}
    if(!seen||started.current)return;
    started.current=true;
    const animation=animate(unfold,1,{duration:1.8,ease:[.22,1,.36,1],onComplete:()=>setComplete(true)});
    return ()=>{animation.stop();started.current=false;};
  },[seen,reduced,unfold]);
  const paused=!complete||!visible||hidden||hover||focused||touching||zoom!==null||!!reduced;
  useEffect(()=>{lastFrame.current=null;},[paused]);
  useAnimationFrame(time=>{
    if(spin.current||turning.current){lastFrame.current=null;return;}
    if(!visible||hidden)inertia.current=0;
    if(Math.abs(inertia.current)>.02){
      direction.set(Math.sign(inertia.current));
      rotation.set((rotation.get()+inertia.current)%360);
      inertia.current*=.94;lastFrame.current=null;return;
    }
    if(paused){lastFrame.current=null;return;}
    if(lastFrame.current!==null){direction.set(1);rotation.set((rotation.get()+(time-lastFrame.current)*.003)%360);}
    lastFrame.current=time;
  });
  const activate=(index:number)=>{
    if(suppressClick.current)return;
    setInteracted(true);
    // Only the print facing the guest opens; tapping one behind brings it round.
    if(index===frontIndex(rotation.get(),total))setZoom(index);
    else turnTo(index);
  };
  const arrow=(by:number)=>{setInteracted(true);turnTo((frontIndex(rotation.get(),total)+by+total)%total);};
  return <section id="gallery-section" style={{padding:"40px 16px",maxWidth:1000,margin:"0 auto"}}>
    <style>{STAMP_CSS}</style>
    <p style={{fontSize:30,fontWeight:600,color:COLORS.navy,textAlign:"center",marginBottom:4}}>{t.gallery_label}</p>
    <Divider className="mb-4"/>
    <div ref={stage} className="pw-orbit" role="region" aria-label={lang==="TH"?"แกลเลอรีภาพถ่าย":"Photo gallery"}
      data-gallery-ready={complete} data-gallery-paused={paused} data-zoomed={zoom!==null}
      onPointerEnter={e=>{if(e.pointerType==="mouse")setHover(true);}}
      onPointerLeave={e=>{if(e.pointerType==="mouse")setHover(false);}}
      onPointerDown={e=>{
        setTouching(true);
        if(e.pointerType==="mouse"&&e.button!==0)return;
        turning.current?.stop();turning.current=null;inertia.current=0;
        spin.current={x:e.clientX,r0:rotation.get(),last:e.clientX,v:0,t:performance.now(),moved:0};
      }}
      onFocusCapture={()=>setFocused(true)}
      onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}
      onKeyDown={e=>{
        if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
        e.preventDefault();
        const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>(".pw-orbit-card"));
        const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next=e.key==="Home"?0:e.key==="End"?buttons.length-1:(current+(e.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length;
        rotation.set(-next*360/buttons.length);buttons[next]?.focus({preventScroll:true});
      }}>
      {PRE_WEDDING_IMAGES.map((src,index)=><CircularPrint key={src} src={src} index={index} total={total} geometry={geometry} rotation={rotation} unfold={unfold} direction={direction} tabbable={index===front} onActivate={()=>activate(index)}/>)}
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,marginTop:12}}>
      <ArrowButton direction="prev" onClick={()=>arrow(-1)} disabled={false} label={lang==="TH"?"รูปก่อนหน้า":"Previous photo"}/>
      <span aria-live="polite" data-gallery-counter="" style={{fontSize:"0.72rem",letterSpacing:"0.2em",color:COLORS.lightBrown,minWidth:62,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>
        {front+1} / {total}
      </span>
      <ArrowButton direction="next" onClick={()=>arrow(1)} disabled={false} label={lang==="TH"?"รูปถัดไป":"Next photo"}/>
    </div>
    <p data-gallery-hint="" aria-hidden={interacted} style={{margin:"12px 0 0",textAlign:"center",fontSize:"0.85rem",fontWeight:300,color:COLORS.lightBrown,opacity:interacted?0:1,transition:"opacity .4s ease"}}>
      {t.gallery_hint}
    </p>
    <AnimatePresence>{zoom!==null&&<Lightbox images={PRE_WEDDING_IMAGES} index={zoom} onIndex={setZoom} onClose={()=>setZoom(null)}/>}</AnimatePresence>
  </section>;
}
