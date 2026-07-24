import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useReducedMotion } from "motion/react";
import { COLORS } from "./shared";

/* Real coordinates. Venue is a search-derived estimate pending Ryo's on-phone
   confirmation; MRT is from Wikidata (Ram Inthra Kor Mor 6 / PK22, Pink Line). */
const VENUE: [number, number] = [13.84472, 100.64791];
const MRT: [number, number] = [13.8450, 100.6503];

// Opens Google Maps at the exact venue point (precise pin, not a text search).
const VENUE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${VENUE[0]},${VENUE[1]}`;

// MRT Pink Line branding — the one sanctioned off-palette accent, wayfinding only.
const MRT_PINK = "#E0538A";

// CARTO Voyager — clean, soft, Google-Maps-like raster tiles, free with
// attribution, no API key. 2D <img> tiles (no WebGL) → robust in LINE/iOS.
const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export type VenueMapLabels = {
  venue: string;
  mrt: string;
  openInMaps: string;
};

/* Teardrop map pin as an inline-SVG divIcon — avoids Leaflet's well-known
   broken-default-marker-image issue under bundlers, and lets the pin carry
   the site palette. Point sits at the bottom-center (iconAnchor). */
function pinIcon(fill: string): L.DivIcon {
  const w = 30;
  const h = 40;
  const html = `
    <svg width="${w}" height="${h}" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 4px rgba(61,34,21,0.35))">
      <path d="M15 39C15 39 27 23.5 27 13.5C27 6.6 21.6 1 15 1C8.4 1 3 6.6 3 13.5C3 23.5 15 39 15 39Z" fill="${fill}" stroke="#FFF8F0" stroke-width="1.5"/>
      <circle cx="15" cy="13.5" r="4.5" fill="#FFF8F0"/>
    </svg>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 6],
  });
}

export function VenueMap({ labels }: { labels: VenueMapLabels }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { venue: venueLabel, mrt: mrtLabel, openInMaps } = labels;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
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

    // Gentle warm tint on the tile pane so the map sits in the cream/gold
    // palette without hurting street legibility.
    const tilePane = map.getPane("tilePane");
    if (tilePane) tilePane.style.filter = "saturate(0.9) sepia(0.12) brightness(1.02) contrast(0.98)";

    const venueMarker = L.marker(VENUE, { icon: pinIcon(COLORS.gold), title: venueLabel }).addTo(map);
    venueMarker.bindPopup(
      `<strong>${venueLabel}</strong><br/><a href="${VENUE_MAPS_URL}" target="_blank" rel="noopener noreferrer">${openInMaps} ↗</a>`,
    );

    L.marker(MRT, { icon: pinIcon(MRT_PINK), title: mrtLabel })
      .addTo(map)
      .bindPopup(`<strong>${mrtLabel}</strong>`);

    // Frame BOTH the venue and the MRT so guests get neighborhood context at
    // rest (fixes the earlier "starts too zoomed" feedback), capped so two
    // nearby points don't zoom in uncomfortably far.
    map.fitBounds(L.latLngBounds([VENUE, MRT]), { padding: [42, 42], maxZoom: 16 });
    venueMarker.openPopup();

    // Leaflet needs a size recalc once the container has real dimensions
    const invalidate = () => map.invalidateSize();
    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(container);
    const raf = requestAnimationFrame(invalidate);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      map.remove();
    };
  }, [reduceMotion, venueLabel, mrtLabel, openInMaps]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Interactive map showing the venue and the nearest MRT station"
      style={{ width: "100%", height: "100%", borderRadius: 20 }}
    />
  );
}
