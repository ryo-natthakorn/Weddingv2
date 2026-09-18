import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useMotionTemplate, useTransform, animate } from "motion/react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import youtubeIcon from "../../../imports/youtube-icon.png";
import ringImg from "../../../imports/Ring.svg";
import { PlayMeNote } from "./PlayMeNote";
import captions from "../../../imports/pantika.sbv?raw";
import { parseSbv, lyricAt } from "./captions.mjs";
import { useLang, useMusicState } from "./wedding-context";

export type MusicPlayerHandle = { play: () => void; open: () => void };

/* The ring has three homes on the page; see `home` in the component below. */
type Home = "name" | "float" | "song";

/* The ring artwork's own aspect. Everything that frames it — the glow, the
   pulse, the landing ripple — is sized off the same box, so none of them
   enclose a circle's worth of empty space around a 16:9 picture. */
const RING_RATIO = "1440 / 810";
/* The bottom-right corner: where the ring floats, and where the card opens
   whenever it is not opening inside the song section.

   z-index 1300 puts it above the gallery's orbit cards, which are page content
   stacked from 1000 up (GallerySection's `depth`) and were painting over the
   floating player, and below that section's fullscreen lightbox at 1400, which
   is a modal and should cover it. */
const CORNER = {
  position: "fixed" as const,
  right: 24,
  bottom: 24,
  zIndex: 1300,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-end" as const,
};
/* Between the names it keeps the size the printed-card layout gave it; away
   from them it is a control, and a control is smaller. */
const RING_WIDTH: Record<Home, string> = {
  name: "min(120px, 28vw)",
  float: "96px",
  song: "96px",
};

const YT_VIDEO_ID = (import.meta.env.VITE_YOUTUBE_VIDEO_ID as string) || "p8iVeHphD3c";
const YT_WATCH_URL = `https://www.youtube.com/watch?v=${YT_VIDEO_ID}`;
const YT_THUMB = `https://img.youtube.com/vi/${YT_VIDEO_ID}/0.jpg`;

const TITLE = "Pantika";
const SUBTITLE = "เพลงที่เรียวแต่งให้หยีตอนขอแต่งงาน";

// The couple's supplied SBV is local, so captions need no third-party request.
const LYRICS = parseSbv(captions);
/* Lyric lines are shown this many seconds early, to cover the lag between what
   YouTube is actually sounding and what getCurrentTime() reports. It is applied
   where lyricAt is CALLED, never inside it: captions.mjs owns the cue boundary
   semantics and specs/captions-check.mjs pins them exactly. */
const LYRIC_LEAD = 0.12;

const ACCENT = "#8A7030";       // olive gold
const ACCENT_DARK = "#6B5520";  // deeper gold
/* Nearly opaque: the card used to sit on a 16px backdrop blur, which smeared
   the paper grain behind it and read as a piece of app chrome dropped onto the
   invitation. Without the blur the surface has to carry legibility itself. */
const SURFACE = "rgba(253,250,245,0.97)";
const TEXT_PRIMARY = "#3A2C18";
const TEXT_MUTED = "rgba(58,44,24,0.55)";
const TEXT_DIM = "rgba(58,44,24,0.4)";

/* The orb flies between the bottom-right corner and the song section's slot.
   A tween, not a spring: the flight happens while the guest is mid-scroll, and
   a spring's overshoot on top of the page's own movement reads as a yank. One
   long ease-out is the "picked up and put down" arc DESIGN.md asks for, and it
   lands exactly once. */
const LAND_EASE = [0.22, 1, 0.36, 1] as const;
const FLIGHT = { duration: 0.62, ease: LAND_EASE };
/* Leaving the names — or going back to them — the ring screws through space
   rather than sliding: a turn and a half about its own vertical axis, over a
   slightly longer trip so the turn has room to read. The float↔song leg is
   left exactly as it was, glide and all, because that ending is the one the
   client asked to keep.

   One full turn, not one and a half: the artwork is a flat picture of a ring,
   so it passes edge-on at every quarter turn, and three of those in 0.8s reads
   as a flicker rather than a screw. 360 also means both ends of the trip are
   face-on, where half a turn extra would have it sitting mirrored at the
   moment it leaves. */
const NAME_FLIGHT = { duration: 0.8, ease: LAND_EASE };
const SPIN = 360;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const MusicPlayer = forwardRef<
  MusicPlayerHandle,
  { dockSlot?: HTMLElement | null; ringSlot?: HTMLElement | null }
>(({ dockSlot, ringSlot }, ref) => {
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
  /* The last real reading off the player, stamped with the wall clock it came
     in at. Lyrics are timed from this plus the time elapsed since, because a
     500ms poll on its own can only ever put a line up to half a second late —
     which, sung, is a whole word out. */
  const clockRef = useRef<{ t: number; at: number } | null>(null);
  const [lyric, setLyric] = useState<{ t: number; line: string } | null>(null);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  /* Where the ring belongs right now. "name" is its resting place between the
     bride's and groom's names, "float" the bottom-right corner, "song" the
     song section's slot. `home` is the intent; `landed` is the fact that the
     flight has finished — the specs and the song section care about the moment
     of arrival, not the decision. */
  const [home, setHome] = useState<Home>("name");
  const [landed, setLanded] = useState(false);
  const dock = home === "song";
  const orbRef = useRef<HTMLDivElement>(null);
  /* The element the FLIP actually moves. It wraps both the orb and the card and
     is rendered in every state, so it can always be measured — unlike `orbRef`,
     which is attached to the collapsed branch only and is null (or a rect of
     zeroes, mid-unmount) whenever the dock decision flips while the card is
     open. Measuring that was what sent the orb flying in from the top-left
     corner of the viewport. */
  const stageRef = useRef<HTMLDivElement>(null);
  /* Where the stage was standing when the dock decision flipped: the "first"
     box of the FLIP below. */
  const flightBox = useRef<DOMRect | null>(null);
  const homeRef = useRef<Home>("name");
  /* Which home it flew in from, so the flight can tell a name↔float trip (the
     corkscrew) from a float↔song one (the original glide). */
  const fromHomeRef = useRef<Home>("name");
  /* A move decided while the card was open, held until the card has finished
     closing. See the measure loop and `onExitComplete` below. */
  const pendingHomeRef = useRef<Home | null>(null);
  const measureRef = useRef<(() => void) | null>(null);
  /* True only for the one move that a closing card releases — see the
     off-screen check in the flight below. */
  const deferredMoveRef = useRef(false);
  const expandedRef = useRef(false);
  expandedRef.current = expanded;
  /* The flight is driven by one value: 1 at the departure box, 0 on arrival.
     Keeping it as a fraction rather than two pixel offsets is what lets the
     scroll correction below fade out exactly in step with the travel. */
  const flightT = useMotionValue(0);
  const flightDelta = useRef({ dx: 0, dy: 0 });
  /* Scroll travelled since the flight began. The FLIP's two boxes are
     viewport-relative but one end of the trip is in normal flow, so without
     this the orb drifts by however far the page moved during the 0.62s — and
     the page is always moving, since scrolling is what triggers the flight. */
  const scrollAdj = useMotionValue(0);
  /* Degrees of corkscrew for the flight in progress — see SPIN below. */
  const flightSpin = useRef(0);
  const stageSpin = useTransform(flightT, (t) => t * flightSpin.current);
  const stageX = useTransform(flightT, (t) => t * flightDelta.current.dx);
  const stageY = useTransform(
    [flightT, scrollAdj] as const,
    ([t, adj]: number[]) => t * (flightDelta.current.dy + adj),
  );
  /* 0 on the paper, 1 in the air — drives the shadow so the orb visibly lifts
     off the page for the length of the flight and settles again on landing. */
  const lift = useMotionValue(0);
  const squash = useMotionValue(1);
  const shadowOffset = useTransform(lift, [0, 1], [3, 18]);
  const shadowBlur = useTransform(lift, [0, 1], [10, 34]);
  const shadowAlpha = useTransform(lift, [0, 1], [0.2, 0.16]);
  /* A drop-shadow filter rather than a box-shadow: the ring is a picture with
     transparent corners, so a box shadow would draw a rectangle behind it. */
  const orbShadow = useMotionTemplate`drop-shadow(0 ${shadowOffset}px ${shadowBlur}px rgba(27,74,92,${shadowAlpha}))`;
  const [ripple, setRipple] = useState(0);
  /* True for the length of a flight. The discovery cue waits for it: a note
     and an arrow pointing at a ring that is still travelling point at nothing. */
  const [flying, setFlying] = useState(false);

  /* ── Where does the ring belong? ──
     Read top-down, and with hysteresis on both thresholds so a ring sitting
     near a boundary does not flutter while the guest nudges the page:

       1. the song slot is in view                → "song"
       2. the names have scrolled off the top     → "float"
       3. otherwise                               → "name"

     Rule 2 is deliberately "scrolled PAST", not "out of view": at the hero the
     names are simply below the fold, which is why nothing floats in the corner
     when the invitation opens. The ring waits in the page, leaves once the
     guest has actually gone by it, and comes back on the way up. */
  useEffect(() => {
    if (!dockSlot && !ringSlot) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const was = homeRef.current;

      let next: Home;
      const song = dockSlot?.getBoundingClientRect();
      const songHere = song
        ? was === "song"
          // Also leaves once the slot has scrolled off the top: an in-page ring
          // up there is a control the guest can no longer reach.
          ? !(song.top > window.innerHeight - 60 || song.bottom < 100)
          : song.top < window.innerHeight - 140 && song.bottom > 160
        : false;
      if (songHere) {
        next = "song";
      } else {
        const ring = ringSlot?.getBoundingClientRect();
        const past = ring ? (was === "name" ? ring.bottom < 100 : ring.bottom < 160) : false;
        next = past ? "float" : "name";
      }
      if (next === was) {
        // Scrolled away and back: whatever move was waiting is moot.
        pendingHomeRef.current = null;
        return;
      }

      if (expandedRef.current) {
        /* Never move house while the card is open, in any direction — and
           never close the card to do it either. The guest opened it; taking it
           away mid-read, or worse snatching it back a beat after the tap
           because the scroll that got them there was still settling, is not
           something they asked for. The move waits in `pendingHomeRef` and is
           applied once they close the card, by which time the layout the
           flight measures against is the one they can actually see. */
        pendingHomeRef.current = next;
        return;
      }
      flightBox.current = stageRef.current?.getBoundingClientRect() ?? null;
      fromHomeRef.current = was;
      homeRef.current = next;
      setHome(next);
    };
    /* Held on a ref so the card's onExitComplete can resume a deferred
       decision without re-subscribing this effect. */
    measureRef.current = measure;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    if (dockSlot) observer.observe(dockSlot);
    if (ringSlot) observer.observe(ringSlot);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      measureRef.current = null;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [dockSlot, ringSlot]);

  /* ── The flight itself, as a FLIP ──
     The orb is one element rendered into two different parents (the fixed
     corner container, or a portal into the slot). React moves the node; this
     measures where it used to be, puts it back there with a transform, and
     springs that transform to nothing. Shared-layout (layoutId) would do the
     same job, but it crossfades two elements across the fixed/in-flow boundary,
     and a crossfade is exactly what the client asked to be rid of. */
  useLayoutEffect(() => {
    const el = stageRef.current;
    const first = flightBox.current;
    flightBox.current = null;
    if (!el) return;
    if (!first) { setFlying(false); setLanded(dock); return; }
    const from = fromHomeRef.current;
    const nameLeg = home === "name" || from === "name";
    scrollAdj.set(0);
    el.style.transform = "none";
    const last = el.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    el.style.transform = "";
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { setLanded(dock); return; }
    /* A move released by a closing card is worth animating only if the guest
       can see where it starts: the page may have scrolled a long way while the
       card was open, and a ring sailing in from nowhere is a distraction. This
       does NOT apply to ordinary scroll-driven moves — a fast flick captures a
       departure box that has already left the viewport, and those are exactly
       the flights that should still be drawn. */
    const deferred = deferredMoveRef.current;
    deferredMoveRef.current = false;
    if (deferred && (first.bottom < 0 || first.top > window.innerHeight)) { setLanded(dock); return; }
    const arrive = () => {
      setFlying(false);
      setLanded(dock);
      if (dock) {
        setRipple(Date.now());
        setMusic({ landedAt: Date.now() });
      }
    };
    flightDelta.current = { dx, dy };
    // Screws forward along the travel, so the turn reads the same going down
    // the page as coming back up.
    flightSpin.current = nameLeg ? (dy < 0 ? SPIN : -SPIN) : 0;
    if (reduceMotion) { flightT.set(0); arrive(); return; }
    setLanded(false);
    setFlying(true);
    flightT.set(1);
    // Bridge this one frame by hand: motion values are flushed on the next
    // animation frame, and without this the orb would flash at its new place.
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    /* The departure box is pinned to whichever end of the trip does not
       scroll. Flying into the page, the orb left a fixed corner, so the start
       has to slide with the page; flying back out it left a spot in the
       document, so it slides the other way. The correction is multiplied by
       the same remaining fraction as the travel itself (see `stageY`), so it
       reaches zero on arrival instead of leaving the orb offset. */
    const startScroll = window.scrollY;
    // +1 when the ring is landing in the page (it scrolls with it), -1 when it
    // is landing in the fixed corner (it does not).
    const direction = home === "float" ? -1 : 1;
    const onScroll = () => scrollAdj.set((window.scrollY - startScroll) * direction);
    window.addEventListener("scroll", onScroll, { passive: true });
    const settle = () => {
      window.removeEventListener("scroll", onScroll);
      scrollAdj.set(0);
    };
    const rise = animate(lift, 1, { duration: 0.16, ease: "easeOut" });
    const fly = animate(flightT, 0, {
      ...(nameLeg ? NAME_FLIGHT : FLIGHT),
      onComplete: () => {
        settle();
        animate(lift, 0, { duration: 0.32, ease: LAND_EASE });
        animate(squash, [0.96, 1], { duration: 0.3, ease: LAND_EASE });
        arrive();
      },
    });
    return () => { rise.stop(); fly.stop(); settle(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home]);

  const [showTrail, setShowTrail] = useState(true);

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
       cause. Expanding also retires the petal trail (see the effect below). */
    open: () => {
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
              // Written straight to the ref rather than through markClock so
              // this effect does not have to take a dependency that would
              // rebuild the YouTube player.
              clockRef.current = { t: 0, at: performance.now() };
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
     the guest has had a chance to notice the drifting petals. ── */
  useEffect(() => {
    const id = setTimeout(() => setShowTrail(false), 30000);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (expanded) setShowTrail(false);
  }, [expanded]);

  /* Every place a playback time is established stamps it here, so the lyric
     clock below can carry on from it between polls. */
  const markClock = useCallback((t: number) => {
    clockRef.current = { t, at: performance.now() };
  }, []);

  /* ── Progress polling while playing ──
     Runs whenever the song is playing, not only while the card is open: the
     song section's notes follow the lyric cues through MusicStateContext.
     This drives the progress bar and re-anchors the lyric clock; it is no
     longer what decides when a lyric line turns over. */
  useEffect(() => {
    if (!playing || buffering) return;
    const interval = setInterval(() => {
      if (!playerRef.current || draggingRef.current) return;
      try {
        const cur = playerRef.current.getCurrentTime?.() ?? 0;
        const dur = playerRef.current.getDuration?.() ?? 0;
        setCurrentTime(cur);
        markClock(cur);
        setDuration(dur);
        setProgress(dur > 0 ? (cur / dur) * 100 : 0);
      } catch {}
    }, 500);
    return () => clearInterval(interval);
  }, [playing, buffering, markClock]);

  /* ── Lyric timing ──
     Interpolate the clock, then aim one timer straight at the next cue
     boundary instead of polling for it. A line then turns over within a frame
     of the audio, and the browser does less work than the old 500ms poll did.
     Re-arms on every fresh reading (the poll, a seek) and on play/pause. */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const clock = clockRef.current;
      // Only a running song advances between readings. Paused, buffering or
      // mid-scrub, the line holds where the last real reading left it.
      const live = !!clock && playing && !buffering && !draggingRef.current;
      const now = clock
        ? clock.t + (live ? (performance.now() - clock.at) / 1000 : 0)
        : currentTime;
      const at = now + LYRIC_LEAD;
      const cue = lyricAt(LYRICS, at);
      setLyric((prev) => {
        if (!cue) return prev === null ? prev : null;
        return prev && prev.t === cue.t ? prev : { t: cue.t, line: cue.line };
      });
      if (!live) return;
      // The next thing that can change the line: this cue ending, or the next
      // one starting out of a gap.
      const next = cue ? cue.end : LYRICS.find((c) => c.t > at)?.t;
      if (next === undefined) return;
      timer = setTimeout(tick, Math.max(16, (next - at) * 1000));
    };
    tick();
    return () => clearTimeout(timer);
  }, [playing, buffering, currentTime]);

  const togglePlay = useCallback(() => {
    if (failed) return;
    setShowTrail(false); // explicit user engagement retires the discovery cue
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
      markClock(next);
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
    // So the lyric follows the scrub preview. `draggingRef` keeps the clock
    // from running on from it until the guest lets go.
    markClock(ratio * dur);
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

  /* Current lyric line, as timed by the effect above. */
  const currentLyric = lyric?.line ?? "";
  const lyricKey = lyric?.t ?? -1;

  /* What the rest of the page is allowed to know about the player. */
  useEffect(() => {
    setMusic({ playing, docked: dock && landed, cueAt: lyricKey });
  }, [playing, dock, landed, lyricKey, setMusic]);

  /* Tapping the orb starts the song, wherever it is standing. A tap on a play
     button means "play" — making the guest open the card and then find the
     play button inside it was a step nobody took. The one exception is a
     guest who deliberately paused: re-opening the card must not restart. */
  const openPlayer = () => {
    setShowTrail(false);
    setExpanded(true);
    if (!userPausedRef.current) startPlayback(true);
  };

  const playbackActive = playing || buffering;
  const playbackIcon = (size: number) => buffering
    ? <LoaderCircle size={size} color="white" style={{ animation: reduceMotion ? undefined : "music-loading 1s linear infinite" }} />
    : playing ? <Pause size={size} fill="white" color="white" /> : <Play size={size} fill="white" color="white" />;

  /* A move decided while the card was open resumes here, once the card has
     actually left the layout — measuring any earlier reads a frame the guest
     never sees, which is what used to throw the flight off course. */
  const onCardExited = () => {
    if (pendingHomeRef.current === null) return;
    pendingHomeRef.current = null;
    deferredMoveRef.current = true;
    measureRef.current?.();
  };

  /* The card only ever opens in one of two places: standing in the song
     section, or as a fixed card in the corner. The ring's slot between the
     names is 116px wide and holds the ring's exact footprint, which is right
     for the ring and far too small for a 300px card.

     So from the names the card opens in the corner — and the ring STAYS where
     it is while it does, because the names are a composition the guest is
     looking at and taking the ring out of the middle of it would leave a hole.
     In the other two homes the ring still gives way to the card, as before. */
  const inPage = home === "song";
  const ringStays = home === "name";
  const cardInStage = expanded && !ringStays;
  const ringW = RING_WIDTH[home];
  /* The discovery cue — the jiggle and the hand-written note. It belongs to the
     floating ring only: between the names the ring is part of the invitation's
     own composition and must not twitch, and in the song section the guest has
     plainly already found it. */
  const cueing = showTrail && home === "float" && !expanded && !reduceMotion && !flying;

  /* EXPANDED — 300px card. It grows either in the page, inside the song
     section's slot (pushing the footer down), or up out of the bottom-right
     corner. No backdrop blur either way. */
  const card = (
        <motion.div
          key="expanded"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.88, y: inPage ? -10 : 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          /* The exit carries its own short tween: with `mode="wait"` the orb
             cannot come back until this finishes, and a spring's tail would
             make closing the card feel like it stuck. */
          exit={reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: 0.9, y: inPage ? -10 : 28, transition: { duration: 0.2, ease: LAND_EASE } }}
          transition={reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 260, damping: 26, restDelta: 0.5 }}
          style={{
            transformOrigin: inPage ? "top center" : "bottom right",
            width: inPage ? "min(300px, 100%)" : "min(300px, calc(100vw - 32px))",
            margin: inPage ? "0 auto" : undefined,
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
            <div data-song-lyrics style={{ position: "relative", height: 72, margin: "14px 0 4px" }}>
              {/* No `mode="wait"` here: making the outgoing line finish its
                0.15s exit before the incoming one started left the box blank
                for a beat on every change, which read as more lag. They
                cross-fade in place instead. */}
            <AnimatePresence>
                <motion.p
                  key={lyricKey}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  /* Absolute so the outgoing and incoming lines overlap
                     during the cross-fade instead of briefly sitting side by
                     side in the flex row. */
                  style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: "'TT Interphases', 'Noto Sans Thai', sans-serif", fontSize: "14px", color: ACCENT, lineHeight: 1.6, whiteSpace: "pre-line" }}
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
  );

  const player = (
    /* The stage is the element the FLIP moves, and the only one rendered in
       every state: React re-parents this exact node between the corner and the
       slot, so it is always measurable. Column layout in both homes means the
       orb's centre never shifts sideways when the card comes and goes. */
    <motion.div
      ref={stageRef}
      style={{
        x: stageX,
        y: stageY,
        /* The corkscrew. Perspective lives here so the turn reads as a ring
           screwing through space rather than a flat card flip. */
        rotateY: stageSpin,
        transformPerspective: 900,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: inPage ? "center" : "flex-end",
      }}
    >
      {/* One presence for both faces, `mode="wait"`: the orb is fully gone
          before the card arrives and vice-versa. Running them as two
          independent presences meant a stretch where both were on screen and
          fighting for the same space — the "glimpse of the player" on open. */}
      <AnimatePresence initial={false} mode="wait" onExitComplete={onCardExited}>
        {!cardInStage ? (
          /* COLLAPSED — the couple's ring. It stands between their names, in
             the corner, or in the song section's slot; it is the same element
             in all three, which is what the FLIP above moves. */
          <motion.div
            key="collapsed"
            ref={orbRef}
            initial={reduceMotion ? { opacity: 1 } : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            data-music-docked={dock && landed}
            data-music-docking={dock}
            data-music-home={home}
            style={{ position: "relative", width: ringW, aspectRatio: RING_RATIO, zIndex: 2 }}
          >
            {/* The note, and the jiggle under it, are the whole discovery cue:
                they run only while the ring is floating and unengaged. */}
            <AnimatePresence>
              {cueing && <PlayMeNote key="note" label={t.music_play_me} lang={lang} />}
            </AnimatePresence>

            {/* The halo behind the ring.

                Between the names there is none: there the ring is part of the
                invitation's own composition and a glow would read as a
                spotlight on it. Floating, it is a soft cream disc — the ring is
                a pale silver picture and the corner often sits over a
                photograph, where gold alone disappears. In the song section the
                background is plain paper again, so the original warm gold is
                enough. */}
            {home !== "name" && (
              <motion.div
                animate={reduceMotion
                  ? { opacity: showTrail ? 0.7 : 0.35, scale: 1 }
                  : { opacity: showTrail ? [0.5, 0.9, 0.5] : [0.25, 0.45, 0.25], scale: [1, 1.18, 1] }}
                transition={reduceMotion ? { duration: 0.3 } : { repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
                style={{
                  position: "absolute",
                  inset: home === "float" ? "-40% -22%" : "-26% -14%",
                  borderRadius: "50%",
                  background: home === "float"
                    ? "radial-gradient(closest-side, rgba(255,251,242,0.92) 0%, rgba(255,248,235,0.55) 45%, rgba(138,112,48,0.18) 72%, transparent 100%)"
                    : "radial-gradient(circle, rgba(138,112,48,0.45) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />
            )}
            {/* Pulse ring while playing — pure CSS keyframe (smooth, no jitter).
                An ellipse, not a circle: the ring artwork is 16:9, and a circle
                around it would enclose mostly empty space. */}
            {playing && (
              <div
                style={{
                  position: "absolute",
                  inset: "-12% -6%",
                  borderRadius: "50%",
                  border: `1.5px solid ${ACCENT}`,
                  animation: "pulse-ring 2.2s ease-in-out infinite",
                  pointerEvents: "none",
                }}
              />
            )}
            {/* One gold ripple on landing — the only mark the arrival leaves. */}
            {!reduceMotion && ripple > 0 && (
              <motion.span
                key={ripple}
                aria-hidden
                initial={{ opacity: 0.5, scale: 0.85 }}
                animate={{ opacity: 0, scale: 1.9 }}
                transition={{ duration: 0.7, ease: LAND_EASE }}
                style={{ position: "absolute", inset: "-12% -6%", borderRadius: "50%", border: `1.5px solid ${ACCENT}`, pointerEvents: "none" }}
              />
            )}
            <motion.button
              onClick={openPlayer}
              aria-label="Open music player"
              /* The jiggle lives here, inside the stage, so it can never fight
                 the flight transform the stage itself is carrying. */
              animate={cueing
                ? { rotate: [0, -4, 4, -2.5, 1.5, 0], scale: [1, 1.06, 0.98, 1.03, 1] }
                : { rotate: 0, scale: 1 }}
              transition={cueing
                ? { duration: 0.85, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }
                : { duration: 0.25 }}
              style={{
                scaleY: squash,
                position: "relative",
                display: "block",
                width: "100%",
                padding: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                filter: orbShadow,
              }}
            >
              <img
                src={ringImg}
                alt=""
                aria-hidden
                style={{ width: "100%", height: "auto", objectFit: "contain", display: "block", pointerEvents: "none" }}
              />
            </motion.button>
          </motion.div>

        ) : (
          card
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

      {/* The ring lives in exactly one place at a time: portalled into the
          names' ring slot, or the song section's slot, or standing in the fixed
          corner between the two. Moving the node is what the FLIP above
          animates. */}
      {home === "song" && dockSlot
        ? createPortal(player, dockSlot)
        : home === "name" && ringSlot
          ? (
            <>
              {createPortal(player, ringSlot)}
              {/* The card that the ring in the names opens: in the corner, so
                  the names keep their ring and their layout. */}
              <div style={CORNER}>
                <AnimatePresence initial={false} onExitComplete={onCardExited}>
                  {expanded && card}
                </AnimatePresence>
              </div>
            </>
          )
          : <div style={CORNER}>{player}</div>}
    </>
  );
});

MusicPlayer.displayName = "MusicPlayer";
