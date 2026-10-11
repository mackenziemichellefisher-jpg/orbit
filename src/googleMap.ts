import L from "leaflet";
import mutantUrl from "leaflet.gridlayer.googlemutant/dist/Leaflet.GoogleMutant.js?url";

let mutantReady: Promise<void> | null = null;

function ensureMutant(): Promise<void> {
  const leaflet = L as typeof L & { gridLayer?: { googleMutant?: unknown } };
  if (leaflet.gridLayer?.googleMutant) return Promise.resolve();
  if (!mutantReady) {
    (window as unknown as { L: typeof L }).L = L;
    mutantReady = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = mutantUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        mutantReady = null;
        reject(new Error("Google map layer failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return mutantReady;
}

const dayStyle = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e7f6c8" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#f7f4ea" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#b6ee8a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#7ed8f7" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffe14a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffd000" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#3a3428" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#5c564c" }] },
];

const nightStyle = [
  { elementType: "geometry", stylers: [{ color: "#12151c" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa0ad" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#12151c" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3142" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#3a3320" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a3d16" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c3d52" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#16341f" }] },
];

type MutantLayer = L.GridLayer;

let mapsPromise: Promise<void> | null = null;

type MapsWindow = Window & { gm_authFailure?: () => void };

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (!mapsPromise) {
    const callbackName = "__orbitGoogleMapsInit";
    mapsPromise = new Promise((resolve, reject) => {
      const host = window as unknown as Record<string, unknown>;
      host[callbackName] = () => {
        delete host[callbackName];
        resolve();
      };
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=${callbackName}`;
      script.async = true;
      script.onerror = () => {
        delete host[callbackName];
        mapsPromise = null;
        reject(new Error("Google Maps failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return mapsPromise;
}

export function watchGoogleAuthFailure(onFail: () => void): () => void {
  const host = window as MapsWindow;
  const previous = host.gm_authFailure;
  host.gm_authFailure = () => {
    previous?.();
    onFail();
  };
  return () => {
    host.gm_authFailure = previous;
  };
}

export async function createGoogleLayer(theme: "light" | "dark"): Promise<MutantLayer> {
  await ensureMutant();
  const factory = (L as unknown as {
    gridLayer: { googleMutant: (options: object) => MutantLayer };
  }).gridLayer.googleMutant;
  return factory({
    type: "roadmap",
    maxZoom: 21,
    styles: theme === "dark" ? nightStyle : dayStyle,
  });
}
