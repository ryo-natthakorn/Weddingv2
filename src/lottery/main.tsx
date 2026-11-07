import { createRoot } from "react-dom/client";
import "../styles/fonts.css";
import "./lottery.css";
import LotteryApp from "./LotteryApp";

createRoot(document.getElementById("root")!).render(<LotteryApp />);

/* Venue Wi-Fi is the weakest link on the day. In production a small service
   worker keeps a copy of this page and its assets, and once the page has
   loaded everything it already fetched is put in that cache — so a reload
   with no signal still opens the draw. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/lottery/sw.js", { scope: "/lottery/" }).catch(() => {});
    setTimeout(() => {
      try {
        if (!("caches" in window)) return;
        const urls = new Set<string>([location.pathname, "/lottery/"]);
        for (const e of performance.getEntriesByType("resource")) {
          if (e.name.startsWith(location.origin)) urls.add(e.name);
        }
        void caches
          .open("pn-lucky-draw")
          .then((c) => Promise.all([...urls].map((u) => c.add(u).catch(() => {}))));
      } catch {
        /* no cache API — online only */
      }
    }, 2500);
  });
}
