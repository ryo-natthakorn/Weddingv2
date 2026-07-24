import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, Popup, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useReducedMotion } from "motion/react";
import { COLORS } from "./shared";

/* Real coordinates, MapLibre order [lng, lat] (the reverse of Leaflet's
   [lat, lng] — the single easiest thing to get backwards in this rewrite).
   Venue is Ryo-confirmed exactly on the real building. MRT is from Wikidata
   (Ram Inthra Kor Mor 6 / PK22, Pink Line). */
const VENUE: [number, number] = [100.64791, 13.84472];
const MRT: [number, number] = [100.6503, 13.845];

// Opens Google Maps at the exact venue point (precise pin, not a text search).
const VENUE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${VENUE[1]},${VENUE[0]}`;

// MRT Pink Line branding — the one sanctioned off-palette accent, wayfinding only.
const MRT_PINK = "#E0538A";

// OpenFreeMap "liberty" — free, no API key/billing, vector tiles with a
// built-in 3D building layer (fill-extrusion, source-layer "building",
// zoom >= 14) — real 3D shapes, not an authored scene.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const BUILDING_LAYER_ID = "building-3d";

export type VenueMapLabels = {
  venue: string;
  mrt: string;
  openInMaps: string;
};

/* Teardrop map pin as a plain DOM element for maplibregl.Marker — inline SVG
   so it carries the site palette. Anchored at the bottom tip. */
function pinElement(fill: string): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = `
    <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 4px rgba(61,34,21,0.35))">
      <path d="M15 39C15 39 27 23.5 27 13.5C27 6.6 21.6 1 15 1C8.4 1 3 6.6 3 13.5C3 23.5 15 39 15 39Z" fill="${fill}" stroke="#FFF8F0" stroke-width="1.5"/>
      <circle cx="15" cy="13.5" r="4.5" fill="#FFF8F0"/>
    </svg>`;
  return el;
}

export function VenueMap({ labels }: { labels: VenueMapLabels }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { venue: venueLabel, mrt: mrtLabel, openInMaps } = labels;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: STYLE_URL,
      center: VENUE,
      zoom: 16,
      pitch: 55, // tilted 3D angle, like Google Maps' 3D mode
      bearing: -12,
      attributionControl: { compact: true },
    });

    // Don't hijack page scroll on desktop; keep touch pinch/rotate/tilt.
    map.scrollZoom.disable();

    // Warm the canvas so the map sits in the cream/gold palette.
    map.getCanvas().style.filter = "saturate(0.9) sepia(0.1) brightness(1.02) contrast(0.98)";

    map.addControl(new NavigationControl({ showCompass: true, visualizePitch: true }), "top-left");

    // A failed tile/style fetch surfaces as an 'error' event, not a throw —
    // log it and let the ErrorBoundary catch anything that does throw.
    map.on("error", (e) => console.error("[VenueMap]", e.error ?? e));

    map.on("load", () => {
      // Re-tint the style's built-in 3D building layer into the palette
      // instead of its default pale-gray.
      if (map.getLayer(BUILDING_LAYER_ID)) {
        map.setPaintProperty(BUILDING_LAYER_ID, "fill-extrusion-color", COLORS.paperShadow);
        map.setPaintProperty(BUILDING_LAYER_ID, "fill-extrusion-opacity", 0.9);
      }

      const venuePopup = new Popup({ offset: 28, closeButton: true }).setHTML(
        `<strong>${venueLabel}</strong><br/><a href="${VENUE_MAPS_URL}" target="_blank" rel="noopener noreferrer">${openInMaps} ↗</a>`,
      );
      const venueMarker = new Marker({ element: pinElement(COLORS.gold), anchor: "bottom" })
        .setLngLat(VENUE)
        .setPopup(venuePopup)
        .addTo(map);

      new Marker({ element: pinElement(MRT_PINK), anchor: "bottom" })
        .setLngLat(MRT)
        .setPopup(new Popup({ offset: 28 }).setHTML(`<strong>${mrtLabel}</strong>`))
        .addTo(map);

      // Frame BOTH points so guests get neighborhood context at rest,
      // keeping the tilt already set on the map.
      map.fitBounds([VENUE, MRT], { padding: 56, maxZoom: 17, duration: reduceMotion ? 0 : 1000 });
      venueMarker.togglePopup();
    });

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, [reduceMotion, venueLabel, mrtLabel, openInMaps]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Interactive 3D map showing the venue and the nearest MRT station"
      style={{ width: "100%", height: "100%", borderRadius: 20 }}
    />
  );
}
