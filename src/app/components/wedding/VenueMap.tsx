import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, Popup, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useReducedMotion } from "motion/react";
import { COLORS } from "./shared";

/* MapLibre parses vector tiles in a separate worker script that itself
   imports a second ~470KB "shared" chunk via a hardcoded relative path
   (`./maplibre-gl-shared.mjs`) baked into the worker file at publish time.
   Vite's bundler has no way to see that nested import (it's not a static
   `import` statement Rollup can trace), so it never gets copied into the
   build output — the worker script loads, but its own internal import
   404s (or, worse, silently gets the SPA-fallback index.html and fails to
   parse), so the worker crashes immediately and tile fetching never
   starts. Both files are copied byte-for-byte (unhashed, so their
   relative reference to each other keeps working) into public/maplibre/ —
   see that folder's contents. */
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

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

/* The stock "liberty" style is tuned to read as generic web-map chrome:
   saturated sky-blue water, orange/yellow/white road hierarchy, bright
   green parks. Retint every visible base layer into the card's own
   cream/gold/sage/teal world on load — this replaces the earlier approach
   of a blanket CSS filter on the canvas, which only muddied those same
   saturated colors instead of actually changing them. */
const MAP_TINTS = {
  background: COLORS.cream,
  water: "#D7E1DC", // dusty sage-teal, deliberately nowhere near "Google blue"
  green: "#DCE3C4", // parks / woods / grass
  greenOutline: "rgba(107,138,90,0.3)", // COLORS.sage at low opacity
  tan: "#E7DCB9", // pitches / tracks
  school: "#F0E9D6",
  hospital: "#F3E3DE",
  cemetery: "#DCD8C0",
  building: "#E7DCC4", // flat building fill beneath the 3D extrusion layer
  buildingOutline: "hsla(35,20%,55%,0.3)",
  motorway: COLORS.gold,
  motorwayCasing: COLORS.midBrown,
  trunkPrimary: COLORS.goldLight,
  trunkPrimaryCasing: COLORS.gold,
  secondaryTertiary: "#E9D9AE",
  secondaryTertiaryCasing: "#B89968",
  minorRoad: COLORS.white,
  minorRoadCasing: "#D9CBB0",
  labelText: COLORS.midBrown,
  labelHalo: COLORS.cream,
} as const;

/* Stock POI icons (shops, restaurants, transit stops) and secondary
   place-name labels (neighborhoods, water names, route shields) — noise on
   a map whose only job is "find this one venue and the nearest MRT stop",
   not a general-purpose business directory. */
const CLUTTER_LAYERS = [
  "poi_r20",
  "poi_r7",
  "poi_r1",
  "poi_transit",
  "label_other",
  "label_village",
  "label_town",
  "label_city",
  "label_city_capital",
  "waterway_line_label",
  "water_name_point_label",
  "water_name_line_label",
  "airport",
  "road_shield_us",
  "highway-shield-us-interstate",
  "highway-shield-non-us",
];

function tint(map: MapLibreMap, id: string, prop: string, value: string) {
  if (map.getLayer(id)) map.setPaintProperty(id, prop as any, value as any);
}

export type VenueMapLabels = {
  venue: string;
  mrt: string;
  openInMaps: string;
  gestureHint: string;
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
  const { venue: venueLabel, mrt: mrtLabel, openInMaps, gestureHint } = labels;

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
      // A single finger on a touch device should scroll the PAGE past the
      // map, not drag the map itself — the classic "embedded map eats my
      // scroll gesture" problem. MapLibre's built-in cooperative-gestures
      // mode requires two fingers to pan/rotate the map on touch (one
      // finger passes straight through to page scroll), showing a brief
      // bilingual hint if a guest tries the wrong gesture. Its desktop
      // counterpart (Ctrl/Cmd+scroll to zoom) never surfaces here since
      // scrollZoom is fully disabled below — only the mobile string needs
      // localizing.
      cooperativeGestures: true,
      locale: { "CooperativeGesturesHandler.MobileHelpText": gestureHint },
    });

    // Don't hijack page scroll on desktop; keep touch pinch/rotate/tilt.
    map.scrollZoom.disable();

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

      // Retint the rest of the base map (see MAP_TINTS for why).
      tint(map, "background", "background-color", MAP_TINTS.background);
      tint(map, "water", "fill-color", MAP_TINTS.water);
      tint(map, "park", "fill-color", MAP_TINTS.green);
      tint(map, "park", "fill-outline-color", MAP_TINTS.greenOutline);
      tint(map, "park_outline", "line-color", MAP_TINTS.greenOutline);
      tint(map, "landcover_wood", "fill-color", MAP_TINTS.green);
      tint(map, "landcover_grass", "fill-color", MAP_TINTS.green);
      tint(map, "landuse_pitch", "fill-color", MAP_TINTS.tan);
      tint(map, "landuse_track", "fill-color", MAP_TINTS.tan);
      tint(map, "landuse_school", "fill-color", MAP_TINTS.school);
      tint(map, "landuse_hospital", "fill-color", MAP_TINTS.hospital);
      tint(map, "landuse_cemetery", "fill-color", MAP_TINTS.cemetery);
      tint(map, "building", "fill-color", MAP_TINTS.building);
      tint(map, "building", "fill-outline-color", MAP_TINTS.buildingOutline);
      tint(map, "road_motorway", "line-color", MAP_TINTS.motorway);
      tint(map, "road_motorway_casing", "line-color", MAP_TINTS.motorwayCasing);
      tint(map, "road_trunk_primary", "line-color", MAP_TINTS.trunkPrimary);
      tint(map, "road_trunk_primary_casing", "line-color", MAP_TINTS.trunkPrimaryCasing);
      tint(map, "road_secondary_tertiary", "line-color", MAP_TINTS.secondaryTertiary);
      tint(map, "road_secondary_tertiary_casing", "line-color", MAP_TINTS.secondaryTertiaryCasing);
      tint(map, "road_minor", "line-color", MAP_TINTS.minorRoad);
      tint(map, "road_minor_casing", "line-color", MAP_TINTS.minorRoadCasing);
      tint(map, "road_path_pedestrian", "line-color", MAP_TINTS.minorRoad);
      tint(map, "highway-name-major", "text-color", MAP_TINTS.labelText);
      tint(map, "highway-name-major", "text-halo-color", MAP_TINTS.labelHalo);
      tint(map, "highway-name-minor", "text-color", MAP_TINTS.labelText);
      tint(map, "highway-name-minor", "text-halo-color", MAP_TINTS.labelHalo);

      // Declutter: hide stock POI icons + secondary place-name labels.
      for (const id of CLUTTER_LAYERS) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
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
    <>
      {/* MapLibre's own UI chrome (zoom/compass controls, popups,
          attribution) ships as stark white Material-style boxes in a
          generic sans font — the biggest remaining "this looks like Google
          Maps" tell once the tile colors themselves are on-palette. Retint
          it to match the card instead of fighting maplibre-gl.css's
          specificity with inline styles. */}
      <style>{`
        .venue-maplibre .maplibregl-ctrl-group {
          background: rgba(255,248,240,0.92);
          border: 1px solid rgba(138,112,48,0.2);
          border-radius: 12px;
          box-shadow: 0 6px 16px rgba(61,34,21,0.14);
          overflow: hidden;
        }
        .venue-maplibre .maplibregl-ctrl-group button {
          background: transparent;
        }
        .venue-maplibre .maplibregl-ctrl-icon {
          filter: sepia(1) saturate(3) hue-rotate(-15deg) brightness(0.65);
        }
        .venue-maplibre .maplibregl-popup-content {
          background: #FFF8F0;
          color: #2A1A0A;
          font-family: 'TT Interphases', sans-serif;
          font-size: 0.85rem;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(61,34,21,0.2);
          padding: 12px 14px;
        }
        .venue-maplibre .maplibregl-popup-tip {
          border-top-color: #FFF8F0;
          border-bottom-color: #FFF8F0;
        }
        .venue-maplibre .maplibregl-popup-content a {
          color: #8A7030;
        }
        .venue-maplibre .maplibregl-popup-close-button {
          color: #7A5A38;
          font-size: 1rem;
        }
        .venue-maplibre .maplibregl-ctrl-attrib {
          background: rgba(255,248,240,0.78);
          color: #5A3E25;
          font-family: 'TT Interphases', sans-serif;
        }
        .venue-maplibre .maplibregl-ctrl-attrib a {
          color: #5A3E25;
        }
        .venue-maplibre .maplibregl-cooperative-gesture-screen {
          background: rgba(42,26,10,0.55);
          font-family: 'TT Interphases', sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
        }
      `}</style>
      <div
        ref={containerRef}
        className="venue-maplibre"
        role="application"
        aria-label="Interactive 3D map showing the venue and the nearest MRT station"
        style={{ width: "100%", height: "100%", borderRadius: 20 }}
      />
    </>
  );
}
