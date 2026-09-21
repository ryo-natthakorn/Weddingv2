import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, animate } from "motion/react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import youtubeIcon from "../../../imports/youtube-icon.png";
import ringImg from "../../../imports/Ring.svg";
import captions from "../../../imports/pantika.sbv?raw";
import { parseSbv, lyricAt } from "./captions.mjs";
import { useLang, useMusicState } from "./wedding-context";
import { MusicNotes } from "./MusicNotes";

export type MusicPlayerHandle = { play: () => void; open: () => void };

const YT_VIDEO_ID = (import.meta.env.VITE_YOUTUBE_VIDEO_ID as string) || "p8iVeHphD3c";
const YT_WATCH_URL = `https://www.youtube.com/watch?v=${YT_VIDEO_ID}`;
const YT_THUMB = `https://img.youtube.com/vi/${YT_VIDEO_ID}/0.jpg`;

const TITLE = "Pantika";
const SUBTITLE = "เพลงที่เรียวแต่งให้ปันหยี";

// The couple's supplied SBV is local, so captions need no third-party request.
const LYRICS = parseSbv(captions);

const ACCENT = "#8A7030";       // olive gold
const ACCENT_DARK = "#6B5520";  // deeper gold
/* Nearly opaque: the card used to sit on a 16px backdrop blur, which smeared
   the paper grain behind it and read as a piece of app chrome dropped onto the
   invitation. Without the blur the surface has to carry legibility itself. */
const SURFACE = "rgba(253,250,245,0.97)";
const TEXT_PRIMARY = "#3A2C18";
const TEXT_MUTED = "rgba(58,44,24,0.55)";
const TEXT_DIM = "rgba(58,44,24,0.4)";

/* Each leg stays visible for three seconds, with a balanced ease so the
   distance is not spent in the first few frames. */
const LAND_EASE = [0.4, 0, 0.2, 1] as const;
const FLIGHT = { duration: 3, ease: LAND_EASE };

/* ── The ring's journey ──
   One ring makes one trip through the invitation, and it is the invitation's
   own ring the whole way: the slider thumb you drag to open the card, then the
   focal point between the two names, then the music control in the corner.

   `intro`  — the intro overlay owns the artwork (it has to stay draggable), so
              this component renders nothing at all.
   `names`  — parked between the bride's and the groom's names. NOT a control:
              no button, no glyph, no tap, no card. It is a wedding ring sitting
              in a wedding invitation.
   `corner` — bottom right, and from here on it is the player.
   `song`   — docked into "Our Song", as before.

   Sizes are resting sizes, expressed as a scale on a 56px box so that changing
   them is a transform rather than a layout: nothing here reflows mid-flight. */
type Home = "intro" | "names" | "corner" | "song";
/* 72, not the 56 the gold disc used. The artwork is a slim knot ring drawn
   inside a landscape frame, so `object-fit: contain` in a square box leaves the
   ring itself about two thirds of the box wide — at 56 it read as a speck in
   the corner rather than a control. 72 also keeps the tap target comfortably
   over the 44px minimum. */
const ORB = 72;
const INTRO_RING = 80;
const namesRingScale = () => Math.min(120, window.innerWidth * 0.28) / ORB;
/* Where the ring is a music control rather than a picture. */
const isPlayer = (home: Home) => home === "corner" || home === "song";
/* How far the orb bows off the straight line, at mid-flight. Sideways travel
   across the page, not a hop off it — the invitation is flat paper. */
const ARC = 20;
/* One warm shadow, identical at rest, in the air and after landing. A shadow
   that swells during the trip is the "airborne mass" cue this pass removes.
   It sits on the ring artwork, not on a disc, so it is a drop-shadow. */
const RING_SHADOW = "drop-shadow(0 6px 14px rgba(138,112,48,0.4))";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const MusicPlayer = forwardRef<MusicPlayerHandle, {
  /* Where the ring rests between the names, and where it docks in "Our Song". */
  namesSlot?: HTMLElement | null;
  songSlot?: HTMLElement | null;
  /* The slider thumb's last box, handed over when the intro finishes. Null
     until then, which is also what keeps the ring off the screen while the
     intro still owns it. */
  released?: DOMRect | null;
}>(({ namesSlot, songSlot, released }, ref) => {
  const { t, lang } = useLang();
  const { setMusic } = useMusicState();
  const reduceMotion = useReducedMotion();
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const readyRef = useRef(false);
  const playbackWantedRef = useRef(false);
  /* True once the guest has hit pause themselves, as opposed to playback never
     having started. */
  const userPausedRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  /* `home` is the intent (which anchor the ring belongs to now); `landed` is
     the fact (the flight has finished). The two are kept apart because the
     specs — and the song section — care about the moment of arrival, not the
     decision. */
  const [home, setHome] = useState<Home>("intro");
  const [landed, setLanded] = useState(false);
  const player = isPlayer(home);
  const orbRef = useRef<HTMLDivElement>(null);
  /* The element the FLIP actually moves. It wraps both the orb and the card and
     is rendered in every state, so it can always be measured — unlike `orbRef`,
     which is attached to the collapsed branch only and is null (or a rect of
     zeroes, mid-unmount) whenever the ring's home flips while the card is
     open. Measuring that was what sent the orb flying in from the top-left
     corner of the viewport. */
  const stageRef = useRef<HTMLDivElement>(null);
  /* Where the stage was standing when the ring's home flipped: the "first"
     box of the FLIP below. */
  const flightBox = useRef<DOMRect | null>(null);
  const homeRef = useRef<Home>("intro");
  /* Which anchor the ring is leaving. The scroll correction needs both ends of
     the trip, not just the destination. */
  const fromRef = useRef<Home>("intro");
  /* A move decided while the card was open, held until the card has finished
     closing. See the measure loop and `onExitComplete` below. */
  const pendingHomeRef = useRef<Home | null>(null);
  /* The ring's size, as a scale on the 56px stage. Animated on the same tween
     as the travel, so a leg changes position and size as one movement. */
  const ringScale = useMotionValue(1);
  const measureRef = useRef<(() => void) | null>(null);
  const placeRef = useRef<(() => void) | null>(null);
  /* The beat between the card finishing its close and the orb setting off —
     see onCardExited. Held so an unmount mid-beat cannot call into a dead
     component. */
  const resumeTimer = useRef(0);
  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;
  /* The flight is driven by one value: 1 at the departure box, 0 on arrival.
     Keeping it as a fraction rather than two pixel offsets is what lets the
     scroll correction below fade out exactly in step with the travel. */
  const flightT = useMotionValue(0);
  const flightDelta = useRef({ dx: 0, dy: 0, arcX: 0, arcY: 0 });
  /* Scroll travelled since the flight began. The FLIP's two boxes are
     viewport-relative but one end of the trip is in normal flow, so without
     this the orb drifts by however far the page moved during the 0.62s — and
     the page is always moving, since scrolling is what triggers the flight. */
  const scrollAdj = useMotionValue(0);
  /* The travel, plus a bow off the straight line that peaks at mid-flight and
     is exactly zero at both ends, so the FLIP still lands on the pixel. This is
     where the flight's playfulness lives now that the lift is gone — the orb
     curves across the page instead of hopping above it. */
  const bow = (t: number) => Math.sin(Math.PI * (1 - t));
  const stageX = useTransform(flightT, (t) => t * flightDelta.current.dx + bow(t) * flightDelta.current.arcX);
  const stageY = useTransform(
    [flightT, scrollAdj] as const,
    ([t, adj]: number[]) => t * (flightDelta.current.dy + adj) + bow(t) * flightDelta.current.arcY,
  );
  const noteProgress = useMotionValue(0);

  /* ── Where does the ring belong now? ──
     One decision, read off both slots, with hysteresis on each boundary so a
     ring sitting near a threshold does not flutter while the guest nudges the
     page. The ring never leaves `intro` on scroll — that leg is the handover
     from the slider, below. */
  useEffect(() => {
    if (homeRef.current === "intro") return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const current = homeRef.current;
      const song = songSlot?.getBoundingClientRect();
      const names = namesSlot?.getBoundingClientRect();
      /* "Our Song" claims the ring while its slot is properly on screen, and
         gives it back once the slot is leaving in either direction — a control
         above the fold is one the guest can no longer reach. */
      const songRisen = !!song && song.top < window.innerHeight - 140 && song.bottom > 160;
      const songGone = !song || song.top > window.innerHeight - 60 || song.bottom < 100;
      /* The ring stays between the names until that block has been read and
         scrolled past; it comes back if the guest scrolls up to the names
         again. 60px of hysteresis between the two. */
      const namesHome = !!names && names.bottom > 140;
      const namesLeft = !names || names.bottom < 80;

      let next: Home;
      if (current === "song") next = songGone ? (namesHome ? "names" : "corner") : "song";
      else if (songRisen) next = "song";
      else if (current === "names") next = namesLeft ? "corner" : "names";
      else next = namesHome ? "names" : "corner";

      if (next === current) return;
      if (expandedRef.current) {
        // Reading the names must not dismiss the floating player. Remember
        // the return, but wait for the guest to close the card themselves.
        if (current === "corner" && next === "names") {
          pendingHomeRef.current = next;
          return;
        }
        /* Never move house while the card is open, in either direction. The
           card closes first and the decision waits in `pendingHomeRef` until
           AnimatePresence reports the exit finished — a single rAF is not
           enough, because the 300px card is still occupying the slot then and
           the flight would be measured against a layout nobody ever sees.
           Only the corner <-> song legs can reach this: the card cannot be
           open anywhere else. */
        pendingHomeRef.current = next;
        setExpanded(false);
        return;
      }
      placeRef.current?.();
      flightBox.current = stageRef.current?.getBoundingClientRect() ?? null;
      fromRef.current = current;
      homeRef.current = next;
      setHome(next);
    };
    /* Held on a ref so the card's onExitComplete can resume a deferred
       decision without re-subscribing this effect. */
    measureRef.current = measure;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    if (songSlot) observer.observe(songSlot);
    if (namesSlot) observer.observe(namesSlot);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      measureRef.current = null;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [namesSlot, songSlot, home]);

  /* ── The handover from the slider ──
     The intro keeps its own ring, because that one has to be draggable. When
     the overlay is finished it reports where the thumb was standing, and the
     ring picks the journey up from exactly that box. */
  useLayoutEffect(() => {
    if (!released || homeRef.current !== "intro") return;
    flightBox.current = released;
    ringScale.set(INTRO_RING / ORB);
    fromRef.current = "intro";
    homeRef.current = "names";
    setHome("names");
  }, [released, ringScale]);

  /* ── Where the ring's layer sits ──
     One portal and one stage for every home; only the anchor changes, so
     section clipping and stacking contexts never contain the travelling ring.

     The anchor comes in two kinds, and the difference is the whole of the
     stutter Ryo reported:

     - **Parked in a slot** the host is `position: absolute` in DOCUMENT
       coordinates, written once on arrival. The browser then scrolls it with
       the page, on the compositor, and JS does nothing at all.
     - **Flying, or standing in the corner**, it is `position: fixed`, tracked
       per frame — the corner genuinely is viewport-fixed, and a leg is three
       seconds of something that is supposed to be moving anyway.

     It used to be `fixed` always, with `translate3d` rewritten from the slot's
     live viewport rect on EVERY animation frame, forever. That is the textbook
     way to make an element lag a scrolling page: iOS Safari always scrolls on
     the compositor thread, as does trackpad and touch momentum on desktop, so
     the page's real content moves immediately while the ring's position is
     computed on the main thread and lands at least a frame later. The ring
     shears against the names around it, in both directions, on both platforms.

     Nothing in this repo's test harness can see it — `mouse.wheel` in headless
     Chromium scrolls on the main thread, in lockstep with JS, which is why
     every offset measurement here read a flat 0px. The guard below tests the
     mechanism instead: while parked, this writes no style at all. */
  const hostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let frame = 0;
    const slot = home === "names" ? namesSlot : home === "song" ? songSlot : null;
    /* `landed` is the fact of arrival. Until then the leg is in the air and the
       host has to keep up with a moving target. */
    const travelling = !landed || !slot;

    const place = () => {
      const host = hostRef.current;
      if (!host) return;
      const box = slot?.getBoundingClientRect();
      const w = host.offsetWidth, h = host.offsetHeight;
      const x = box ? box.left + (box.width - w) / 2 : window.innerWidth - 24 - w;
      const y = box ? home === "names" ? box.top + (box.height - h) / 2 : box.top : window.innerHeight - 24 - h;
      if (travelling) {
        host.style.position = "fixed";
        host.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      } else {
        /* Document coordinates, set once. From here the compositor owns it. */
        host.style.position = "absolute";
        host.style.transform = `translate3d(${x + window.scrollX}px, ${y + window.scrollY}px, 0)`;
      }
      /* The dock slot reserves the height of whatever is standing in it, so
         the footer moves when the card opens. Only written when it actually
         changes: this runs from a ResizeObserver that watches the host, and an
         unconditional write would feed itself. */
      if (songSlot) {
        const next = home === "song" ? `${Math.max(72, h)}px` : "";
        if (songSlot.style.height !== next) songSlot.style.height = next;
      }
    };
    placeRef.current = place;
    place();

    if (travelling) {
      // Only while the leg is actually in the air.
      window.addEventListener("scroll", place, { passive: true });
      const tick = () => { place(); frame = requestAnimationFrame(tick); };
      frame = requestAnimationFrame(tick);
    }
    /* Parked, the position is only wrong if the page relayouts under it — the
       slot moving or changing size, or the viewport resizing. Scroll is
       deliberately NOT one of those: reacting to scroll is the bug. */
    const relayout = new ResizeObserver(place);
    if (slot) relayout.observe(slot);
    relayout.observe(document.body);
    /* …and the host itself: opening the card changes its size, which both
       re-centres it in the slot and is what the slot reserves room for. The
       per-frame loop used to cover this incidentally. */
    if (hostRef.current) relayout.observe(hostRef.current);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
      relayout.disconnect();
      placeRef.current = null;
      cancelAnimationFrame(frame);
      if (songSlot) songSlot.style.height = "";
    };
  }, [home, namesSlot, songSlot, landed]);

  /* Measure the same stage before and after changing its fixed-layer anchor.
     Animate that offset to zero; no reparenting or entry fade during travel. */
  useLayoutEffect(() => {
    const el = stageRef.current;
    const first = flightBox.current;
    flightBox.current = null;
    /* The ring's resting size at this anchor. Everything is expressed against
       the 56px stage, so the size change is a transform on the same tween as
       the travel — one movement, no reflow. */
    const targetScale = home === "names" ? namesRingScale() : 1;
    if (!el || home === "intro") return;
    const settleSize = () => {
      if (reduceMotion) { ringScale.set(targetScale); return null; }
      return animate(ringScale, targetScale, FLIGHT);
    };
    const noteStart = noteProgress.get();
    const noteEnd = home === "song" ? 1 : 0;
    if (!first) { noteProgress.set(noteEnd); setLanded(true); settleSize(); return; }
    scrollAdj.set(0);
    el.style.transform = "none";
    const last = el.getBoundingClientRect();
    /* Centres, not corners: the ring changes size between anchors (80px on the
       slider, up to 120 between the names, 56 in the corner) and it grows about
       its own middle, so matching top-left corners would make it jump sideways
       at the handover. */
    const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
    const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
    el.style.transform = "";
    const arrive = () => {
      noteProgress.set(noteEnd);
      setLanded(true);
      if (home === "song") {
        setMusic({ landedAt: Date.now() });
      }
    };
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { arrive(); settleSize(); return; }
    /* Bow across whichever axis the trip does NOT mostly travel along, in the
       direction it is already drifting: an arc out and back in, rather than a
       slide. Never a rotation — the ring does not spin on any leg. */
    const vertical = Math.abs(dy) >= Math.abs(dx);
    flightDelta.current = {
      dx, dy,
      arcX: vertical ? (dx <= 0 ? -ARC : ARC) : 0,
      arcY: vertical ? 0 : (dy <= 0 ? -ARC : ARC),
    };
    if (reduceMotion) { flightT.set(0); arrive(); settleSize(); return; }
    setLanded(false);
    flightT.set(1);
    // Bridge this one frame by hand: motion values are flushed on the next
    // animation frame, and without this the ring would flash at its new place.
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    /* ── The scroll correction ──
       The FLIP's two boxes are viewport-relative, but the page keeps moving
       during the flight, so the gap between departure and arrival has to be
       re-derived as it goes. It depends on BOTH ends, not just the
       destination:

         corner -> slot   the start is pinned to the viewport while the slot
                          rides up with the page                          +1
         slot -> corner   the start rides up while the corner stays put    -1
         slot -> slot     both ends ride with the page, so the gap between
                          them never changes                                0

       The corner is the only viewport-fixed anchor. The two slots ride with
       the page, and so does the box the slider hands over: the overlay has
       unmounted and the page is back at the top, so that frozen rect is a
       position on the page like any other. The hand-over is therefore the
       slot->slot case, and giving it a corner departure's +1 is what dragged
       its start point down the screen — the ring descending, reversing, and
       coming back, which is what Ryo reported. names->song and song->names
       carried the same latent error.

       The correction is multiplied by the same remaining fraction as the
       travel itself (see `stageY`), so it reaches zero on arrival instead of
       leaving the ring offset. */
    const startScroll = window.scrollY;
    const fromFixed = fromRef.current === "corner";
    const toFixed = home === "corner";
    const direction = fromFixed === toFixed ? 0 : fromFixed ? 1 : -1;
    const onScroll = () => scrollAdj.set((window.scrollY - startScroll) * direction);
    if (direction !== 0) window.addEventListener("scroll", onScroll, { passive: true });
    const settle = () => {
      window.removeEventListener("scroll", onScroll);
      scrollAdj.set(0);
    };
    const size = settleSize();
    const fly = animate(flightT, 0, {
      ...FLIGHT,
      // One clock: notes reach the staff on the same frame as the ring lands.
      onUpdate: remaining => noteProgress.set(noteStart + (noteEnd - noteStart) * (1 - remaining)),
      onComplete: () => {
        settle();
        arrive();
      },
    });
    return () => { fly.stop(); size?.stop(); settle(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home]);

  /* The discovery cue: the ring nudges and says "play me". It replaces the
     petal/note trail outright — the ring drawing its own attention is the cue
     now. It only runs where the ring is a control, and it retires on a timer
     or the moment the guest engages. */
  const [showCue, setShowCue] = useState(true);
  const cueShake = showCue && landed && home === "corner" && !expanded && !reduceMotion;
  /* Notes leaving the ring on the press that starts the song — the tap's own
     acknowledgement. They are the only notes outside the song section, and
     they exist only while the song is playing. */


  // Entry autoplay is best-effort in the unlock gesture. Never queue it for
  // later: a slow connection must not unexpectedly start music mid-invitation.
  const startPlayback = useCallback((explicit = false) => {
    if (!readyRef.current && !explicit) return;
    if (playbackWantedRef.current) return;
    if (explicit) userPausedRef.current = false;
    playbackWantedRef.current = true;
    setBuffering(true);
    if (readyRef.current && playerRef.current) {
      try { playerRef.current.playVideo(); }
      catch { playbackWantedRef.current = false; setBuffering(false); setFailed(true); }
    }
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => startPlayback(),
    /* Used by the "Our Song" section. Unlike autoplay-on-entry, this follows a
       deliberate tap partway down the page, so the card is expanded too —
       otherwise sound simply starts from a corner button with no visible
       cause. Expanding also retires the note trail (see the effect below). */
    open: () => {
      /* Guarded like the tap: the handle is public, and the ring is not a
         player until it has reached the corner. */
      if (!isPlayer(homeRef.current)) return;
      setShowCue(false);
      setExpanded(true);
      startPlayback(true);
    },
  }), [startPlayback]);

  /* ── Init YouTube IFrame API ── */
  useEffect(() => {
    let disposed = false;
    let loadTimeout: ReturnType<typeof setTimeout>;
    const host = playerDivRef.current;
    const stopPending = () => {
      if (disposed) return;
      playbackWantedRef.current = false;
      setPlaying(false);
      setBuffering(false);
    };
    const onError = () => { clearTimeout(loadTimeout); stopPending(); if (!disposed) setFailed(true); };
    loadTimeout = setTimeout(onError, 12000);
    const initPlayer = () => {
      if (disposed || !host || playerRef.current) return;
      // YouTube replaces its mount node. React owns the stable outer host so
      // cleanup/remount (including StrictMode) always gets a connected node.
      const mount = document.createElement("div");
      host.replaceChildren(mount);
      try { playerRef.current = new window.YT.Player(mount, {
        videoId: YT_VIDEO_ID,
        width: 200,
        height: 200,
        playerVars: {
          autoplay: 0,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (disposed) return;
            clearTimeout(loadTimeout);
            readyRef.current = true;
            setReady(true);
            setFailed(false);
            setDuration(event.target.getDuration?.() ?? 0);
            event.target.setVolume(45);
            if (playbackWantedRef.current) event.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (disposed) return;
            if (e.data === 1) {
              playbackWantedRef.current = true;
              setPlaying(true);
              setBuffering(false);
              setFailed(false);
            } else if (e.data === 3) {
              setBuffering(playbackWantedRef.current);
            } else if (e.data === 2 || e.data === 0) {
              stopPending();
            }
            if (e.data === 0) {
              setProgress(0);
              setCurrentTime(0);
            }
          },
          onAutoplayBlocked: stopPending,
          onError,
        },
      }); } catch { onError(); }
    };
    const prevCallback = window.onYouTubeIframeAPIReady;
    const onApiReady = () => {
      prevCallback?.();
      initPlayer();
    };
    let tag = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (attempt > 0 && !window.YT?.Player) { tag?.remove(); tag = null; }
    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = onApiReady;
      if (!tag) {
        tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      tag.addEventListener("error", onError);
    }
    return () => {
      disposed = true;
      clearTimeout(loadTimeout);
      readyRef.current = false;
      setReady(false);
      tag?.removeEventListener("error", onError);
      if (window.onYouTubeIframeAPIReady === onApiReady) window.onYouTubeIframeAPIReady = prevCallback;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      host?.replaceChildren();
    };
  }, [attempt]);

  useEffect(() => {
    if (!buffering) return;
    const timeout = setTimeout(() => {
      playbackWantedRef.current = false;
      try { playerRef.current?.pauseVideo(); } catch {}
      setPlaying(false);
      setBuffering(false);
      setFailed(true);
    }, 12000);
    return () => clearTimeout(timeout);
  }, [buffering, attempt]);

  const retry = () => {
    playbackWantedRef.current = false;
    readyRef.current = false;
    setReady(false); setFailed(false); setPlaying(false); setBuffering(false);
    setAttempt(value => value + 1);
  };

  /* ── The discovery cue retires after 30s, or once the player is engaged.
     It deliberately does NOT stop on autoplay alone — autoplay fires before
     the guest has had a chance to notice the drifting notes. ── */
  useEffect(() => {
    const id = setTimeout(() => setShowCue(false), 30000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (expanded) setShowCue(false);
  }, [expanded]);

  /* ── Progress + lyric polling while playing ──
     Runs whenever the song is playing, not only while the card is open: the
     song section's notes follow the lyric cues through MusicStateContext. */
  useEffect(() => {
    if (!playing || buffering) return;
    const interval = setInterval(() => {
      if (!playerRef.current || draggingRef.current) return;
      try {
        const cur = playerRef.current.getCurrentTime?.() ?? 0;
        const dur = playerRef.current.getDuration?.() ?? 0;
        setCurrentTime(cur);
        setDuration(dur);
        setProgress(dur > 0 ? (cur / dur) * 100 : 0);
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [playing, buffering]);

  const togglePlay = useCallback(() => {
    if (failed) return;
    setShowCue(false); // explicit user engagement retires the discovery cue
    try {
      if (playbackWantedRef.current) {
        playbackWantedRef.current = false;
        // Remembered so that re-opening the card does not undo a deliberate
        // pause — see openPlayer below.
        userPausedRef.current = true;
        setPlaying(false);
        setBuffering(false);
        if (readyRef.current) playerRef.current?.pauseVideo();
      } else startPlayback(true);
    } catch {}
  }, [failed, startPlayback]);

  const skipBy = (sec: number) => {
    if (!playerRef.current || !ready) return;
    try {
      const cur = playerRef.current.getCurrentTime?.() ?? 0;
      const dur = playerRef.current.getDuration?.() ?? 0;
      const next = Math.max(0, Math.min(dur, cur + sec));
      playerRef.current.seekTo(next, true);
      setCurrentTime(next);
      setProgress(dur > 0 ? next / dur * 100 : 0);
    } catch {}
  };

  /* ── Draggable progress bar ── */
  const seekToClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el || !playerRef.current || !readyRef.current) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const dur = (() => { try { return playerRef.current.getDuration?.() ?? duration; } catch { return duration; } })();
    if (dur <= 0 || rect.width <= 0) return;
    pendingSeekRef.current = ratio * dur;
    setProgress(ratio * 100);
    setCurrentTime(ratio * dur);
  };
  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!readyRef.current) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekToClientX(e.clientX);
  };
  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekToClientX(e.clientX);
  };
  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (e.type === "pointerup" && pendingSeekRef.current !== null) {
      try { playerRef.current?.seekTo(pendingSeekRef.current, true); } catch {}
    }
    pendingSeekRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /* Current lyric line from playback time */
  let currentLyric = "";
  let lyricKey = -1;
  const cue = lyricAt(LYRICS, currentTime);
  if (cue) { currentLyric = cue.line; lyricKey = cue.t; }

  /* What the rest of the page is allowed to know about the player. */
  useEffect(() => {
    setMusic({ playing, docked: home === "song" && landed, cueAt: lyricKey });
  }, [playing, home, landed, lyricKey, setMusic]);

  /* Tapping the ring starts the song, wherever it is standing. A tap on a play
     button means "play" — making the guest open the card and then find the
     play button inside it was a step nobody took. The one exception is a
     guest who deliberately paused: re-opening the card must not restart.

     Only where the ring IS a player, though. Between the names it is a wedding
     ring in a wedding invitation, and nothing about it opens a card. */
  const openPlayer = () => {
    if (!isPlayer(homeRef.current)) return;
    setShowCue(false);
    setExpanded(true);
    if (!userPausedRef.current) { startPlayback(true); }
  };

  const playbackActive = playing || buffering;
  const playbackIcon = (size: number) => buffering
    ? <LoaderCircle size={size} color="white" style={{ animation: reduceMotion ? undefined : "music-loading 1s linear infinite" }} />
    : playing ? <Pause size={size} fill="white" color="white" /> : <Play size={size} fill="white" color="white" />;

  /* A move decided while the card was open resumes here, once the card
     has actually left the layout — measuring any earlier reads a frame the
     guest never sees, which is what used to throw the flight off course.

     The beat before the flight is deliberate: closing the card and launching
     the orb in the same frame reads as one violent event, as if scrolling had
     broken something. A short pause makes it two — the card folds back into the
     orb, then the orb sets off. */
  const onCardExited = () => {
    if (pendingHomeRef.current === null) return;
    pendingHomeRef.current = null;
    if (reduceMotion) { measureRef.current?.(); return; }
    resumeTimer.current = window.setTimeout(() => {
      resumeTimer.current = 0;
      measureRef.current?.();
    }, 140);
  };

  const ring = (
    /* The stage is the element the FLIP moves, and the only one rendered in
       every state: the same node stays in the fixed layer
       for every anchor, so it is always measurable. Column layout in both homes means the
       orb's centre never shifts sideways when the card comes and goes. */
    <motion.div
      ref={stageRef}
      style={{
        x: stageX,
        y: stageY,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: home === "corner" ? "flex-end" : "center",
      }}
    >
      {/* "play me" — the other half of the discovery cue. It sits above the
          ring rather than beside it so it cannot be pushed off the right edge,
          and it is aria-hidden: the button already has a label. */}
      <AnimatePresence>
        {showCue && landed && home === "corner" && !expanded && (
          <motion.span
            key="play-me"
            aria-hidden
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif",
              fontSize: "0.68rem",
              fontWeight: 400,
              letterSpacing: "0.08em",
              color: ACCENT,
              marginBottom: 6,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {t.music_play_me}
          </motion.span>
        )}
      </AnimatePresence>

      {/* One presence for both faces, `mode="wait"`: the ring is fully gone
          before the card arrives and vice-versa. Running them as two
          independent presences meant a stretch where both were on screen and
          fighting for the same space — the "glimpse of the player" on open. */}
      <AnimatePresence initial={false} mode="wait" onExitComplete={onCardExited}>
        {!expanded ? (
          /* COLLAPSED — 56px gold circle: bottom-right, or standing in the song
             section's slot once it has flown there. */
          <motion.div
            key="collapsed"
            ref={orbRef}
            initial={reduceMotion ? { opacity: 1 } : { scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
            /* 0.3s, not 0.18s: the orb and the card trade places under
               `mode="wait"`, so anything quicker reads as a cut. */
            transition={{ duration: 0.3, ease: "easeOut" }}
            data-music-docked={home === "song" && landed && noteProgress.get() === 1}
            data-music-docking={home === "song"}
            data-ring-home={home}
            style={{ position: "relative", width: ORB, height: ORB, zIndex: 2 }}
          >
            {/* THE RING.
                One artwork, scaled between its resting sizes, and the only
                thing the guest ever sees travelling. Where it is a control it
                lives inside a real 56px button — the artwork is open in the
                middle, so relying on its own pixels for the hit area would
                leave a button with a hole in it. Where it is not, it is an
                image and nothing more: no button, no glyph, not focusable.

                The nudge (`cueShake`) is the whole discovery cue now that the
                petal trail is gone; it runs at the corner only. It is a
                wobble, never a turn — the ring does not spin anywhere. */}
            <motion.div
              data-ring-art
              style={{ scale: ringScale, width: ORB, height: ORB, transformOrigin: "50% 50%" }}
              animate={cueShake ? { rotate: [0, -5, 5, -3.5, 2, 0], x: [0, -3, 3, -2, 1, 0] } : { rotate: 0, x: 0 }}
              transition={cueShake
                ? { duration: 0.7, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }
                : { duration: 0.3 }}
            >
              {player ? (
                <button
                  type="button"
                  onClick={openPlayer}
                  aria-label="Open music player"
                  style={{
                    position: "relative",
                    width: ORB, height: ORB, borderRadius: "50%",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <img src={ringImg} alt="" aria-hidden draggable={false}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: RING_SHADOW, pointerEvents: "none" }} />
                  {/* No play glyph on the ring. The artwork is pale metal with
                      a knot across its middle, and a triangle laid over that
                      read as a smudge rather than a control — which is also
                      what the "no solid gold disc" instruction rules out, since
                      a glyph needs a disc behind it to be legible. The state is
                      carried instead by "play me" below while idle, and by the
                      notes while the song runs. Buffering keeps a mark,
                      because silence after a tap needs an answer. */}
                  {buffering && (
                    <LoaderCircle
                      size={16}
                      color={ACCENT_DARK}
                      style={{ position: "relative", animation: reduceMotion ? undefined : "music-loading 1s linear infinite" }}
                    />
                  )}
                </button>
              ) : (
                <img src={ringImg} alt="" aria-hidden draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "contain", filter: RING_SHADOW, pointerEvents: "none" }} />
              )}
            </motion.div>
          </motion.div>
        ) : (
          /* EXPANDED — 300px card. It grows from wherever the orb is standing:
             in the page inside the dock slot (pushing the footer down), or up
             out of the bottom-right corner. No backdrop blur either way. */
          <motion.div
            key="expanded"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.88, y: home === "corner" ? 28 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            /* The exit carries its own short tween: with `mode="wait"` the orb
               cannot come back until this finishes, and a spring's tail would
               make closing the card feel like it stuck. */
            exit={reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.9, y: home === "corner" ? 28 : -10, transition: { duration: 0.34, ease: LAND_EASE } }}
            /* Softened from 260/26: the card used to snap open and shut too
               fast to follow, and when a move closes it on the guest's
               behalf (below) they need to see it fold, not find it gone. */
            transition={reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 190, damping: 24, restDelta: 0.5 }}
            style={{
              transformOrigin: home === "corner" ? "bottom right" : "top center",
              width: "min(300px, calc(100vw - 32px))",
              margin: home === "corner" ? undefined : "0 auto",
              background: SURFACE,
              borderRadius: 20,
              boxShadow: "0 16px 50px rgba(61,34,21,0.22)",
              border: "1px solid rgba(138,112,48,0.18)",
              overflow: "hidden",
              padding: "13px 14px 14px",
            }}
          >
            {/* Header: thumbnail + title/subtitle + close */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <img
                src={YT_THUMB}
                alt={TITLE}
                style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 8px rgba(61,34,21,0.2)" }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.95rem", fontWeight: 600, color: TEXT_PRIMARY, lineHeight: 1.2 }}>
                  {TITLE}
                </p>
                <p style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.65rem", fontStyle: "italic", color: TEXT_MUTED, lineHeight: 1.35, marginTop: 2 }}>
                  {SUBTITLE}
                </p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_DIM, fontSize: "1.2rem", lineHeight: 1, width: 32, height: 32, margin: "-6px -8px 0 0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                ×
              </button>
            </div>

            <p role="status" style={{ color: TEXT_PRIMARY, fontSize: "0.8rem", marginTop: 12 }}>
              {failed ? (lang === "TH" ? "โหลดเพลงไม่สำเร็จ ลองใหม่หรือฟังบน YouTube" : "Unable to load. Retry or listen on YouTube.") : !ready ? (lang === "TH" ? "กำลังโหลดเพลง" : "Loading song") : buffering ? (lang === "TH" ? "กำลังเริ่มเล่น" : "Starting playback") : ""}
            </p>
            {failed && <button type="button" onClick={retry} style={{ color: ACCENT, background: "transparent", border: `1px solid ${ACCENT}`, padding: "8px 16px", minHeight: 44, borderRadius: 6, cursor: "pointer" }}>{lang === "TH" ? "ลองใหม่" : "Retry"}</button>}

            {/* Lyric line — one at a time, gold, fading */}
            {LYRICS.length > 0 && (
              <div data-song-lyrics style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", margin: "14px 0 4px" }}>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={lyricKey}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "14px", color: ACCENT, lineHeight: 1.6, whiteSpace: "pre-line" }}
                  >
                    {currentLyric}
                  </motion.p>
                </AnimatePresence>
              </div>
            )}

            {/* Progress — 4px draggable, gold fill */}
            <div
              ref={trackRef}
              onPointerDown={onTrackPointerDown}
              onPointerMove={onTrackPointerMove}
              onPointerUp={onTrackPointerUp}
              onPointerCancel={onTrackPointerUp}
              role="slider"
              aria-label="Song progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") { e.preventDefault(); skipBy(-10); }
                if (e.key === "ArrowRight") { e.preventDefault(); skipBy(10); }
              }}
              style={{ height: 4, background: "rgba(138,112,48,0.15)", borderRadius: 4, cursor: "pointer", position: "relative", marginTop: 12, touchAction: "none" }}
            >
              <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(to right, ${ACCENT}, ${ACCENT_DARK})`, borderRadius: 4 }} />
              <div style={{ position: "absolute", left: `${progress}%`, top: "50%", transform: "translate(-50%, -50%)", width: 11, height: 11, borderRadius: "50%", background: ACCENT, boxShadow: "0 1px 4px rgba(138,112,48,0.5)" }} />
            </div>

            {/* Time */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 8 }}>
              <span style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.6rem", color: TEXT_MUTED, letterSpacing: "0.05em" }}>{formatTime(currentTime)}</span>
              <span style={{ fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "0.6rem", color: TEXT_MUTED, letterSpacing: "0.05em" }}>{duration > 0 ? formatTime(duration) : "--:--"}</span>
            </div>

            {/* Controls: back 10 · play/pause · forward 10 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
              <button onClick={() => skipBy(-10)} aria-label="Back 10 seconds" style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, display: "flex", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3V1L5 4l4 3V5a5 5 0 1 1-5 5H2a7 7 0 1 0 7-7z" fill="currentColor" />
                </svg>
              </button>
              <button
                onClick={togglePlay}
                disabled={failed}
                aria-label={playbackActive ? "Pause" : "Play"}
                aria-busy={buffering}
                style={{ width: 48, height: 48, borderRadius: "50%", background: ready ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` : "rgba(138,112,48,0.2)", border: "none", cursor: ready ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: ready ? "0 4px 16px rgba(138,112,48,0.4)" : "none" }}
              >
                {playbackIcon(18)}
              </button>
              <button onClick={() => skipBy(10)} aria-label="Forward 10 seconds" style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, display: "flex", padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 3V1l4 3-4 3V5a5 5 0 1 0 5 5h2A7 7 0 1 1 9 3z" fill="currentColor" />
                </svg>
              </button>
            </div>

            {/* Prominent YouTube pill — full width of the card interior */}
            <a
              href={YT_WATCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                marginTop: 16,
                padding: "10px 0",
                borderRadius: 100,
                border: `1px solid ${ACCENT}`,
                background: "transparent",
                color: ACCENT,
                textDecoration: "none",
                fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                boxSizing: "border-box",
              }}
            >
              <img src={youtubeIcon} alt="" aria-hidden style={{ width: 40, height: 34, objectFit: "contain", flexShrink: 0 }} />
              {t.music_youtube}
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <>
      <style>{`@keyframes music-loading { to { transform: rotate(360deg); } }`}</style>
      {/* Hidden YouTube player div — must stay in the DOM */}
      <div style={{ position: "fixed", left: "-9999px", top: 0, width: 2, height: 2, overflow: "hidden", pointerEvents: "none" }}>
        <div ref={playerDivRef} />
      </div>

      {createPortal(<MusicNotes dockTarget={songSlot} orbRef={orbRef} progress={noteProgress}
        playing={playing && player} expanded={expanded} reduceMotion={!!reduceMotion}
        /* Arrival re-renders via landed. Also require completed note travel:
           a new home can briefly inherit the previous home's landed=true. */
        docked={home === "song" && landed && noteProgress.get() === 1} />, document.body)}

      {home !== "intro" && createPortal(
        <div ref={hostRef} data-music-layer="" style={{ position: "fixed", left: 0, top: 0, width: "max-content", zIndex: home === "names" && !landed ? 10000 : 1000, willChange: "transform" }}>
          {ring}
        </div>, document.body)}
    </>
  );
});

MusicPlayer.displayName = "MusicPlayer";
