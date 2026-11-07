/* The announcer — reads the draw aloud the way the lottery broadcast does
   (each digit as its ball lands, then "รางวัลบ้านเจ้าสาว ได้แก่ เก้า, เก้า, …"), using the
   device's own Thai text-to-speech. No audio files, works offline. On iPad
   the voice is Kanya; the downloadable "Enhanced" Kanya sounds far more
   natural (Settings › Accessibility › Spoken Content › Voices › Thai).

   If the device has no Thai voice, every call resolves at once and the draw
   simply runs without speech. */

import { duck, ensureAudio } from "./device";

let voice: SpeechSynthesisVoice | null = null;
/* Safari silently drops onend for utterances that get garbage-collected
   mid-sentence, so every live utterance is held here until it finishes. */
const live = new Set<SpeechSynthesisUtterance>();

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const ss = synth();
  if (!ss) return null;
  const thai = ss.getVoices().filter((v) => (v.lang || "").toLowerCase().replace("_", "-").startsWith("th"));
  const score = (v: SpeechSynthesisVoice) =>
    (/premium|enhanced|neural|natural|คุณภาพสูง/i.test(v.name) ? 4 : 0) +
    (/kanya|narisa|premwadee|niwat|google/i.test(v.name) ? 1 : 0) +
    (v.localService ? 1 : 0);
  thai.sort((a, b) => score(b) - score(a));
  return thai[0] ?? null;
}

/* Voices load asynchronously (Chrome) or late (Safari); `onChange` fires
   whenever the chosen voice may have changed. */
export function initAnnouncer(onChange: (name: string | null) => void) {
  const ss = synth();
  if (!ss) return onChange(null);
  const update = () => {
    voice = pickVoice();
    onChange(voice ? voice.name : null);
  };
  update();
  ss.addEventListener?.("voiceschanged", update);
  // Some WebKit builds never fire voiceschanged; look again shortly.
  window.setTimeout(update, 1200);
}

/* Speak one line and resolve when it has been said. A timer stands in for
   onend in case the browser never sends it. The draw's own sounds duck
   while the announcer talks. */
export function say(text: string, rate = 0.95): Promise<void> {
  const ss = synth();
  if (!ss || !voice) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const u = new SpeechSynthesisUtterance(text);
    const finish = () => {
      if (done) return;
      done = true;
      live.delete(u);
      window.clearTimeout(timer);
      duck(false);
      ensureAudio(); // iOS may have interrupted web audio while it spoke
      resolve();
    };
    const timer = window.setTimeout(finish, 1500 + (text.length * 150) / rate);
    u.voice = voice;
    u.lang = voice!.lang;
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    u.onend = finish;
    u.onerror = finish;
    live.add(u);
    duck(true);
    try {
      ss.speak(u);
    } catch {
      finish();
    }
  });
}

/* Stop talking now (a new draw, or sound switched off). */
export function hush() {
  try {
    const ss = synth();
    if (ss && (ss.speaking || ss.pending)) ss.cancel();
  } catch {
    /* ignore */
  }
  duck(false);
}
