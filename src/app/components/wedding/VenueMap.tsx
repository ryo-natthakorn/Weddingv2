import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useReducedMotion } from "motion/react";
import { COLORS } from "./shared";

/* Real coordinates. Venue is a search-derived estimate pending Ryo's on-phone
   confirmation; MRT is from Wikidata (Ram Inthra Kor Mor 6 / PK22, Pink Line). */
const VENUE: [number, number] = [13.84472, 100.64791];
const MRT: [number, number] = [13.8450, 100.6503];

// CARTO Voyager — clean, soft, Google-Maps-like raster tiles, free with
// attribution, no API key. 2D <img> tiles (no WebGL) → robust in LINE/iOS.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function VenueMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      center: VENUE,
      zoom: 16,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // don't hijack page scroll on desktop
      zoomAnimation: !reduceMotion,
      fadeAnimation: !reduceMotion,
      markerZoomAnimation: !reduceMotion,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIB,
      maxZoom: 20,
      detectRetina: true,
    }).addTo(map);

    // Basic venue marker so the center is verifiable; styled pins land in Batch 2
    L.circleMarker(VENUE, {
      radius: 9,
      color: COLORS.gold,
      weight: 3,
      fillColor: COLORS.white,
      fillOpacity: 1,
    }).addTo(map);

    // Leaflet needs a size recalc once the container has real dimensions
    const invalidate = () => map.invalidateSize();
    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(container);
    // one deferred pass for the initial mount inside a freshly-sized card
    const raf = requestAnimationFrame(invalidate);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      map.remove();
    };
  }, [reduceMotion]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Interactive map showing the venue and the nearest MRT station"
      style={{ width: "100%", height: "100%", borderRadius: 20 }}
    />
  );
}
