import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, useAnimationFrame, useMotionValueEvent, animate } from "motion/react";
import type { MotionValue, PanInfo } from "motion/react";
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
.pw-orbit { position:relative; width:100%; height:min(560px,70svh); overflow:hidden; overflow:clip; touch-action:pan-y; transition:filter .45s cubic-bezier(.22,1,.36,1), transform .45s cubic-bezier(.22,1,.36,1); }
.pw-orbit[data-zoomed="true"] { filter:blur(7px); transform:scale(.93); }
@media (prefers-reduced-motion: reduce) { .pw-orbit { transition:none; } }
.pw-orbit-card { position:absolute; left:50%; top:50%; padding:0; border:0; background:none; cursor:zoom-in; touch-action:pan-y; will-change:transform,opacity; }
.pw-orbit-card img { display:block; width:100%; height:100%; object-fit:cover; }
/* The print's shadow is a plain box-shadow on a sibling box rather than a
   drop-shadow filter over the perforated mask: the filter had to re-derive the
   silhouette's alpha every time perspective changed the print's scale, which is
   once per frame, and that single property cost about a quarter of the frame
   budget on a phone. A stamp is a rectangle to within a few notches, so the two
   look the same. */
.pw-orbit-card::before { content:""; position:absolute; inset:0; box-shadow:0 7px 8px rgba(61,34,21,.2); }
.pw-orbit-card .pw-stamp { position:relative; width:100%; height:100%; box-sizing:border-box; }
.pw-veil { position:absolute; inset:0; background:#F2E8D2; pointer-events:none; will-change:opacity; }
.pw-orbit-card:focus-visible { outline:2px solid #8A7030; outline-offset:3px; }
.pw-stamp {
  --stamp-pitch: 12px;
  --stamp-notch: 3.4px;
  /* The notch edge needs a real anti-aliasing ramp. A CSS gradient mask is
     sampled per pixel with no anti-aliasing of its own, so a 0.35px ramp is
     under one device pixel even on a dpr-3 phone: the arcs came out as visible
     stair steps, each step a half-lit paper pixel reading as a cream speck
     along the perforation. The drop-shadow filter used to blur that away; it is
     gone, so the ramp has to do the work itself. Costs nothing. */
  --stamp-edge: calc(var(--stamp-notch) + 0.9px);
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

/* Perspective factors at the front and back of the ring, and the print scale at
   the back — the projection below draws the front print at its natural size. */
const K_FRONT = 3.4/2.4, K_BACK = 3.4/4.4, S_BACK = 2.4/4.4;
const LIFT = .2664;                 // ring tilt, in card widths
const TOP = -LIFT*K_BACK - S_BACK*2/3, BOTTOM = LIFT*K_FRONT + 2/3;
const SPAN = BOTTOM - TOP, PAD = 40;
type Geometry = { width:number; maxHeight:number; height:number; card:number; radius:number; lift:number; offset:number };
/* The ring is sized from the viewport instead of being squeezed into it: only
   the front print has to fit across the screen and the rest of the ring runs
   past the stage edges, which clip it. Fitting all eleven prints inside a
   phone's width is what used to drive the radius below the print size, so every
   neighbour overlapped by half a stamp and the ring read as a pile. */
function geometryFor(width:number, maxHeight:number, total:number):Geometry {
  const target = width < 600 ? Math.max(180, width*.65) : Math.max(260, Math.min(360, width*.36));
  const card = Math.max(96, Math.min(target, width-24, (maxHeight-PAD)/SPAN));
  // Carousel radius: neighbours meet edge to edge at the front, plus a small gap.
  const radius = card/2/Math.tan(Math.PI/total)*1.06/K_FRONT;
  return { width, maxHeight, height: Math.round(card*SPAN+PAD), card, radius,
    lift: LIFT*card, offset: -(TOP+BOTTOM)/2*card };
}
/* The print whose angle is nearest the camera. */
export const frontIndex=(rotation:number,total:number)=>((Math.round(-rotation/(360/total))%total)+total)%total;
/* Blur changes in a few coarse steps: a filter repaints the whole print, so
   writing a new blur every frame made the ring stutter on phones. */
const BLUR_STEPS=["", "blur(1.2px) ", "blur(2.4px) "];
// Project the supplied circular layout as upright billboards, retaining real
// perspective without mirrored photo backs. Motion updates accessible DOM.
function CircularPrint({src,index,total,geometry,rotation,unfold,tabbable,onActivate}:{
  src:string; index:number; total:number; geometry:Geometry;
  rotation:MotionValue<number>; unfold:MotionValue<number>;
  tabbable:boolean; onActivate:()=>void;
}) {
  const {lang}=useLang();
  const position=useTransform(()=>{
    const p=unfold.get(), a=(index*360/total+rotation.get())*Math.PI/180;
    const z=Math.cos(a)*geometry.radius;
    // Perspective from a camera at distance d whose view spans the stage: k = d/(d-z).
    const d=geometry.radius*3.4, k=d/(d-z), scale=(d-geometry.radius)/(d-z);
    // Depth of field: the print nearest the camera is sharp and fully saturated;
    // the far side of the ring falls out of focus so it reads as a real circle.
    const focus=p*(z+geometry.radius)/(2*geometry.radius)+(1-p);
    return {x:Math.sin(a)*geometry.radius*k*p+(1-p)*(index%3-1)*3,
      y:(Math.cos(a)*geometry.lift*k+geometry.offset)*p+(1-p)*(index%4-1.5)*2,
      scale:1+(scale-1)*p, depth:Math.round(1000+z), rotate:(1-p)*(index%5-2)*2,
      opacity:.5+focus*.5, veil:(1-focus)*.45,
      filter:BLUR_STEPS[Math.min(2,Math.floor((1-focus)*3))]};
  });
  const x=useTransform(position,p=>p.x), y=useTransform(position,p=>p.y);
  const scale=useTransform(position,p=>p.scale), rotate=useTransform(position,p=>p.rotate), zIndex=useTransform(position,p=>p.depth);
  const opacity=useTransform(position,p=>p.opacity), filter=useTransform(position,p=>p.filter), veil=useTransform(position,p=>p.veil);
  return <motion.button type="button" className="pw-orbit-card" data-orbit-print="" tabIndex={tabbable?0:-1}
    aria-label={lang==="TH"?`เปิดรูปที่ ${index+1} จาก ${total}`:`Open photo ${index+1} of ${total}`}
    onFocus={e=>{if(e.currentTarget.matches(":focus-visible")) rotation.set(-index*360/total);}}
    onClick={onActivate} style={{x,y,scale,rotate,zIndex,opacity,filter,width:geometry.card,height:geometry.card*4/3,marginLeft:-geometry.card/2,marginTop:-geometry.card*2/3}}>
    <span className="pw-stamp"><img src={src} alt="" draggable={false} loading="eager" decoding="async"/><motion.span className="pw-veil" style={{opacity:veil}}/></span>
  </motion.button>;
}
export function GallerySection(){
  const {lang,t}=useLang();
  const total=PRE_WEDDING_IMAGES.length, step=360/total;
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const stage=useRef<HTMLDivElement>(null), started=useRef(false), lastFrame=useRef<number|null>(null), stageWidth=useRef(320);
  const [seen,setSeen]=useState(false), [visible,setVisible]=useState(false), [complete,setComplete]=useState(false);
  const [hover,setHover]=useState(false), [focused,setFocused]=useState(false), [touching,setTouching]=useState(false);
  const [hidden,setHidden]=useState(false), [scrolling,setScrolling]=useState(false);
  const [zoom,setZoom]=useState<number|null>(null);
  const [front,setFront]=useState(0), [interacted,setInteracted]=useState(false);
  const [geometry,setGeometry]=useState(()=>geometryFor(320,460,total));
  const rotation=useMotionValue(0), unfold=useMotionValue(reduced?1:0);
  /* Drag and throw live in refs, not state — they change every frame. */
  const spin=useRef<{x:number;y:number;r0:number;last:number;v:number;t:number;moved:number;locked:boolean}|null>(null);
  const inertia=useRef(0), suppressClick=useRef(false), turning=useRef<ReturnType<typeof animate>|null>(null);
  useMotionValueEvent(rotation,"change",r=>setFront(frontIndex(r,total)));
  const turnTo=useCallback((index:number)=>{
    const from=rotation.get(), delta=((-index*step-from)%360+540)%360-180;
    if(!delta)return;
    inertia.current=0;turning.current?.stop();
    turning.current=animate(rotation,from+delta,{duration:reduced?0:.6,ease:[.22,1,.36,1],onComplete:()=>{turning.current=null;}});
  },[rotation,step,reduced]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(media.matches);
    media.addEventListener('change',change);
    return ()=>media.removeEventListener('change',change);
  },[]);
  /* Recompositing eleven prints while the page is moving is what made the ring
     stutter exactly as a guest scrolled it into view. */
  useEffect(()=>{
    let idle:ReturnType<typeof setTimeout>;
    const onScroll=()=>{setScrolling(true);clearTimeout(idle);idle=setTimeout(()=>setScrolling(false),150);};
    window.addEventListener("scroll",onScroll,{passive:true});
    return ()=>{window.removeEventListener("scroll",onScroll);clearTimeout(idle);};
  },[]);
  useEffect(()=>{
    const node=stage.current;
    if(!node)return;
    /* Width drives the geometry; the stage's own height is an output of it, so
       reading it back here would feed the observer its own result. */
    const resize=new ResizeObserver(([entry])=>{
      const width=entry.contentRect.width||320;
      stageWidth.current=width;
      const maxHeight=Math.min(560,window.innerHeight*.7);
      setGeometry(current=>current.width===width&&current.maxHeight===maxHeight?current:geometryFor(width,maxHeight,total));
    });
    resize.observe(node);
    const observer=new IntersectionObserver(([entry])=>{
      setVisible(entry.intersectionRatio>=.4);
      if(entry.intersectionRatio>=.6)setSeen(true);
    },{threshold:[0,.4,.6]});
    observer.observe(node);
    const visibility=()=>setHidden(document.hidden);
    const move=(e:PointerEvent)=>{
      const s=spin.current;
      if(!s)return;
      const dx=e.clientX-s.x, dy=e.clientY-s.y, now=performance.now();
      if(!s.locked){
        if(Math.abs(dx)<8&&Math.abs(dy)<8)return;
        // A mostly vertical drag belongs to the page: hand it back to the scroller.
        if(Math.abs(dy)>Math.abs(dx)){spin.current=null;setTouching(false);return;}
        s.locked=true;s.last=e.clientX;s.t=now;
      }
      s.moved=Math.max(s.moved,Math.abs(dx));
      s.v=(e.clientX-s.last)/stageWidth.current*150/Math.max(8,now-s.t)*16;
      s.last=e.clientX;s.t=now;
      rotation.set((s.r0+dx/stageWidth.current*150)%360);
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
  },[rotation,total]);
  useEffect(()=>{
    if(reduced){unfold.set(1);setComplete(true);started.current=true;return;}
    if(!seen||started.current)return;
    started.current=true;
    const animation=animate(unfold,1,{duration:1.8,ease:[.22,1,.36,1],onComplete:()=>setComplete(true)});
    return ()=>{animation.stop();started.current=false;};
  },[seen,reduced,unfold]);
  const paused=!complete||!visible||hidden||hover||focused||touching||scrolling||zoom!==null||!!reduced;
  useEffect(()=>{lastFrame.current=null;},[paused]);
  useAnimationFrame(time=>{
    if(spin.current||turning.current){lastFrame.current=null;return;}
    if(!visible||hidden)inertia.current=0;
    if(Math.abs(inertia.current)>.02){
      rotation.set((rotation.get()+inertia.current)%360);
      inertia.current*=.94;lastFrame.current=null;return;
    }
    if(paused){lastFrame.current=null;return;}
    if(lastFrame.current!==null)rotation.set((rotation.get()+(time-lastFrame.current)*.003)%360);
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
      data-gallery-ready={complete} data-gallery-paused={paused} data-zoomed={zoom!==null} style={{height:geometry.height}}
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
        const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-orbit-print]"));
        const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next=e.key==="Home"?0:e.key==="End"?buttons.length-1:(current+(e.key==="ArrowRight"?1:-1)+buttons.length)%buttons.length;
        rotation.set(-next*360/buttons.length);buttons[next]?.focus({preventScroll:true});
      }}>
      {PRE_WEDDING_IMAGES.map((src,index)=><CircularPrint key={src} src={src} index={index} total={total} geometry={geometry} rotation={rotation} unfold={unfold} tabbable={index===front} onActivate={()=>activate(index)}/>)}
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
