import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe, Layers, LocateFixed, MapPin } from "lucide-react";
import { useApp } from "../store";
import { useTheme } from "../theme";
import { createGoogleLayer, loadGoogleMaps, watchGoogleAuthFailure } from "../googleMap";
import { Avatar, GroupBadge, Sheet } from "./ui";
import type { PoolSpot } from "../types";

const UNITED_STATES = L.latLngBounds([24.4, -125], [49.4, -66.8]);
const COUNTRY_PADDING = { paddingTopLeft: [16, 118] as [number, number], paddingBottomRight: [16, 156] as [number, number] };

const LAUNCH_CITIES = [
  { id: "nyc", name: "New York", label: "NYC", lat: 40.7128, lng: -74.006, place: "center" as const },
  { id: "sf", name: "San Francisco", label: "SF", lat: 37.7749, lng: -122.4194, place: "above" as const },
  { id: "sj", name: "San Jose", label: "San Jose", lat: 37.3382, lng: -121.8863, place: "below" as const },
  { id: "gsp", name: "Greenville", label: "Greenville", lat: 34.8526, lng: -82.394, place: "center" as const },
];

const youIcon = L.divIcon({
  className: "go-pin-wrap",
  iconSize: [72, 72],
  iconAnchor: [36, 36],
  popupAnchor: [0, -18],
  html: `<div class="you-pin" aria-hidden="true"><span></span><span></span><i></i></div>`,
});

const pinCache = new Map<string, L.DivIcon>();

function stopIcon(color: string, hot: boolean) {
  const safe = color.replace(/[^#(),.%\w\s-]/g, "") || "#ffb000";
  const key = `${safe}:${hot ? 1 : 0}`;
  const cached = pinCache.get(key);
  if (cached) return cached;
  const size = hot ? 46 : 36;
  const icon = L.divIcon({
    className: "go-pin-wrap",
    iconSize: [size, size + 16],
    iconAnchor: [size / 2, size + 12],
    popupAnchor: [0, -(size + 4)],
    html: `<div class="go-pin${hot ? " is-hot" : ""}" style="--pin:${safe};width:${size}px"><i></i><b></b></div>`,
  });
  pinCache.set(key, icon);
  return icon;
}

function cityIcon(label: string, place: "above" | "below" | "center") {
  const width = Math.max(52, label.length * 7 + 22);
  const height = 26;
  const anchorY = place === "above" ? height + 8 : place === "below" ? -8 : height / 2;
  return L.divIcon({
    className: "go-pin-wrap",
    iconSize: [width, height],
    iconAnchor: [width / 2, anchorY],
    html: `<div class="city-pin">${label}</div>`,
  });
}

const cityIcons = new Map(LAUNCH_CITIES.map((city) => [city.id, cityIcon(city.label, city.place)]));

function MapViewport({ selected, recenterSignal, countrySignal, focus, userLocation }: { selected: PoolSpot | null; recenterSignal: number; countrySignal: number; focus: { lat: number; lng: number } | null; userLocation: [number, number] | null }) {
  const map = useMap();
  const lastRecenterSignal = useRef(0);
  const lastCountrySignal = useRef(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(UNITED_STATES, COUNTRY_PADDING);
    });
    return () => cancelAnimationFrame(frame);
  }, [map]);

  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], 14, { duration: 0.7 });
  }, [selected, map]);

  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 11, { duration: 0.8 });
  }, [focus, map]);

  useEffect(() => {
    if (recenterSignal !== lastRecenterSignal.current) {
      lastRecenterSignal.current = recenterSignal;
      if (userLocation) map.flyTo(userLocation, 13, { duration: 0.7 });
    }
  }, [recenterSignal, userLocation, map]);

  useEffect(() => {
    if (countrySignal !== lastCountrySignal.current) {
      lastCountrySignal.current = countrySignal;
      map.flyToBounds(UNITED_STATES, { ...COUNTRY_PADDING, duration: 0.8 });
    }
  }, [countrySignal, map]);

  return null;
}

const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function GoogleBasemap({ theme, onFail }: { theme: "light" | "dark"; onFail: () => void }) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => {
    if (!mapsKey) return;
    let cancelled = false;
    const stopWatch = watchGoogleAuthFailure(() => {
      if (!cancelled) onFailRef.current();
    });
    loadGoogleMaps(mapsKey).then(() => {
      if (!cancelled) setReady(true);
    }).catch(() => {
      if (!cancelled) onFailRef.current();
    });
    return () => {
      cancelled = true;
      stopWatch();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let layer: L.Layer | null = null;
    let cancelled = false;
    void createGoogleLayer(theme).then((next) => {
      if (cancelled) return;
      layer = next;
      next.addTo(map);
    }).catch(() => {
      if (!cancelled) onFailRef.current();
    });
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [ready, theme, map]);

  return null;
}

export function MapTab() {
  const { groups, spots, users, meetups, posts } = useApp();
  const { theme } = useTheme();
  const [selected, setSelected] = useState<PoolSpot | null>(null);
  const [visibleGroups, setVisibleGroups] = useState<string[]>(groups.map((g) => g.id));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [countrySignal, setCountrySignal] = useState(0);
  const [focusCity, setFocusCity] = useState<(typeof LAUNCH_CITIES)[number] | null>(null);
  const [camera, setCamera] = useState<{ lat: number; lng: number; token: number } | null>(null);
  const showCity = (city: (typeof LAUNCH_CITIES)[number]) => {
    setSelected(null);
    setFocusCity(city);
    setCamera({ lat: city.lat, lng: city.lng, token: Date.now() });
  };
  const [googleOk, setGoogleOk] = useState(Boolean(mapsKey));
  const disableGoogle = useCallback(() => setGoogleOk(false), []);
  const getGroup = (id: string) => groups.find((g) => g.id === id)!;
  const pinSpots = useMemo(() => spots.filter((spot) => visibleGroups.includes(spot.groupId)), [spots, visibleGroups]);
  const selectedPosts = selected ? posts.filter((p) => p.spotId === selected.id) : [];
  const tileUrl = theme === "dark"
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
  const tileAttribution = theme === "dark"
    ? "Tiles &copy; Esri"
    : "&copy; OpenStreetMap contributors, Tiles &copy; OSM France";

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
      () => setLocationDenied(true),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  return (
    <div className="h-screen relative pb-16 overflow-hidden">
      <MapContainer bounds={UNITED_STATES} boundsOptions={COUNTRY_PADDING} zoomControl={false} minZoom={2} className="go-map h-full w-full z-0">
        {mapsKey && googleOk ? <GoogleBasemap theme={theme} onFail={disableGoogle} /> : <TileLayer key={tileUrl} url={tileUrl} attribution={tileAttribution} />}
        <MapViewport selected={selected} recenterSignal={recenterSignal} countrySignal={countrySignal} focus={camera} userLocation={userLocation} />
        {LAUNCH_CITIES.map((city) => (
          <Marker
            key={city.id}
            position={[city.lat, city.lng]}
            icon={cityIcons.get(city.id)!}
            zIndexOffset={focusCity?.id === city.id ? 500 : 200}
            eventHandlers={{ click: () => showCity(city) }}
          >
            <Popup><strong>{city.name}</strong><br />Launch city</Popup>
          </Marker>
        ))}
        {userLocation && (
          <Marker position={userLocation} icon={youIcon} zIndexOffset={800}>
            <Popup>You are here</Popup>
          </Marker>
        )}
        {pinSpots.map((spot) => {
          const group = getGroup(spot.groupId);
          const isMeetup = meetups.some((m) => m.spotId === spot.id);
          return (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={stopIcon(group.accent, isMeetup)}
              eventHandlers={{ click: () => setSelected(spot) }}
            >
              <Popup><strong>{spot.title}</strong><br />{spot.address}</Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pointer-events-none">
        <div className="flex items-center justify-between gap-3 pointer-events-auto">
          <div className="glass-chip px-4 py-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--go)]">United States</p>
            <h1 className="text-[1.65rem] font-extrabold leading-none text-[var(--text-primary)]">Map</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFocusCity(null); setCamera(null); setCountrySignal((v) => v + 1); }}
              className="icon-btn"
              aria-label="Show the United States"
            >
              <Globe size={18} className="text-[var(--text-primary)]" />
            </button>
            <button
              onClick={() => setRecenterSignal((v) => v + 1)}
              disabled={!userLocation}
              className="icon-btn"
              aria-label="Center on you"
            >
              <LocateFixed size={18} className="text-[var(--go)]" />
            </button>
            <button onClick={() => setFiltersOpen((v) => !v)} className="icon-btn" aria-label="Filter orbits">
              <Layers size={18} className="text-[var(--text-primary)]" />
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
          {LAUNCH_CITIES.map((city) => {
            const on = focusCity?.id === city.id;
            return (
              <button
                key={city.id}
                onClick={() => showCity(city)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold border ${on ? "border-[var(--snap-ink)] bg-[var(--snap)] text-[var(--snap-ink)]" : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)]"}`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
        {locationDenied && (
          <p className="glass-chip mt-2 inline-block px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] pointer-events-auto">Enable location to drop your player pin.</p>
        )}
        {filtersOpen && (
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto">
            {groups.map((group) => {
              const active = visibleGroups.includes(group.id);
              return (
                <button
                  key={group.id}
                  onClick={() => setVisibleGroups((ids) => active ? ids.filter((id) => id !== group.id) : [...ids, group.id])}
                  className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-extrabold border ${active ? "" : "bg-[var(--card-bg)] border-[var(--border)] text-[var(--text-muted)]"}`}
                  style={active ? { borderColor: group.accent, backgroundColor: `${group.accent}22`, color: group.accent } : undefined}
                >
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: group.accent }} />
                  {group.name.split(" ")[1] ?? group.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pinSpots.length > 0 && (
        <div className="absolute bottom-36 left-0 right-0 z-10 px-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {pinSpots.map((spot) => {
              const group = getGroup(spot.groupId);
              const on = selected?.id === spot.id;
              return (
                <button key={spot.id} onClick={() => setSelected(spot)} className="shrink-0 w-[72px] flex flex-col items-center">
                  <span
                    className="w-14 h-14 rounded-full p-[3px] shadow-lg"
                    style={{ background: on ? "var(--snap)" : `conic-gradient(${group.accent}, #fff, ${group.accent})` }}
                  >
                    <img src={spot.thumbnail} alt="" className="w-full h-full rounded-full object-cover border-2 border-white" />
                  </span>
                  <span className="mt-1 max-w-[72px] truncate rounded-full bg-[var(--card-bg)]/95 px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--text-primary)] shadow">
                    {spot.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Spot details">
        {selected && (
          <>
            <img src={selected.thumbnail} alt={selected.title} className="w-full h-40 object-cover rounded-2xl" />
            <div className="pt-4">
              <GroupBadge name={getGroup(selected.groupId).name} accent={getGroup(selected.groupId).accent} icon={MapPin} />
              <h2 className="text-xl font-bold mt-3 text-[var(--text-primary)]">{selected.title}</h2>
              <div className="flex gap-1.5 text-xs text-[var(--text-muted)] mt-2"><MapPin size={13} />{selected.address}</div>
              <div className="mt-5 flex items-center gap-2">
                <Avatar src={users.find((u) => u.id === selected.addedByUserId)!.avatar} size={26} />
                <span className="text-xs text-[var(--text-muted)]">Added by {users.find((u) => u.id === selected.addedByUserId)!.name}</span>
              </div>
              {selectedPosts.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-3">Meetup memories</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {selectedPosts.flatMap((p) => p.photos).map((photo, i) => (
                      <img key={i} src={photo} alt="Meetup memory" className="w-24 h-24 rounded-xl object-cover shrink-0" />
                    ))}
                  </div>
                </div>
              )}
              <a href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer" className="snap-btn mt-5 flex items-center justify-center py-3.5 text-sm">
                Open in Maps
              </a>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
