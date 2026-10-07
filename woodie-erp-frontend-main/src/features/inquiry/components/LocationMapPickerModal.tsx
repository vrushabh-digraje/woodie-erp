import { useEffect, useRef, useState } from "react";
import { Check, Compass, ExternalLink, LoaderCircle, MapPin, Search, X } from "lucide-react";
import { themeClasses } from "../../../theme/classes";

type LocationMapPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (data: { googleMapsUrl: string; address?: string }) => void;
  initialAddress?: string;
  initialUrl?: string;
};

// Default center: Dubai / UAE coordinates
const DEFAULT_LAT = 25.2048;
const DEFAULT_LNG = 55.2708;

export default function LocationMapPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialAddress = "",
  initialUrl = "",
}: LocationMapPickerModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [lat, setLat] = useState<number>(DEFAULT_LAT);
  const [lng, setLng] = useState<number>(DEFAULT_LNG);
  const [searchQuery, setSearchQuery] = useState(initialAddress || "");
  const [searching, setSearching] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState("");
  const [updateAddressText, setUpdateAddressText] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Parse initial coordinates if present in initialUrl
  useEffect(() => {
    if (!isOpen) return;
    if (initialUrl) {
      const match = /(?:q=|@)(-?\d+\.\d+),(-?\d+\.\d+)/.exec(initialUrl);
      if (match) {
        setLat(parseFloat(match[1]));
        setLng(parseFloat(match[2]));
      }
    } else if (initialAddress) {
      setSearchQuery(initialAddress);
    }
  }, [isOpen, initialUrl, initialAddress]);

  // Dynamically load Leaflet and initialize map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isMounted = true;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Function to initialize map
    const initMap = (L: any) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom icon using standard Leaflet marker pin
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
        void reverseGeocode(pos.lat, pos.lng);
      });

      map.on("click", (e: any) => {
        marker.setLatLng(e.latlng);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
        void reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      setMapLoaded(true);

      // Invalidate size after modal animation
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    };

    if ((window as any).L) {
      initMap((window as any).L);
    } else {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        if ((window as any).L) initMap((window as any).L);
      };
      document.body.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Update map marker when lat/lng state changes from search
  const updateMapPosition = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.setView([newLat, newLng], 15);
    }
  };

  // Reverse geocode to get human-readable address
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } },
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setDetectedAddress(data.display_name);
        }
      }
    } catch {
      // Ignore geocode errors
    } finally {
      setGeocoding(false);
    }
  };

  // Search location by query text
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { "Accept-Language": "en" } },
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          const newLat = parseFloat(item.lat);
          const newLng = parseFloat(item.lon);
          updateMapPosition(newLat, newLng);
          setDetectedAddress(item.display_name || searchQuery);
        }
      }
    } catch {
      // Ignore search error
    } finally {
      setSearching(false);
    }
  };

  // Geolocation to use device location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        updateMapPosition(newLat, newLng);
        void reverseGeocode(newLat, newLng);
        setSearching(false);
      },
      () => setSearching(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const generatedGoogleMapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

  const handleConfirm = () => {
    onSelectLocation({
      googleMapsUrl: generatedGoogleMapsUrl,
      address: updateAddressText && detectedAddress ? detectedAddress : undefined,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-surface-border bg-surface-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-surface-border bg-surface-card px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-gold">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Select Site Location</h3>
              <p className="text-xs text-text-muted">Click or drag the pin to set the exact site location</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-border hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Search bar & Current location button */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search area, landmark, or building (e.g. Business Bay, Dubai)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${themeClasses.input} pr-10`}
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                title="Search location"
              >
                {searching ? <LoaderCircle className="h-4 w-4 animate-spin text-brand-gold" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={searching}
              title="Use My Current GPS Location"
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-border/40 transition-colors cursor-pointer shrink-0"
            >
              <Compass className="h-4 w-4 text-brand-gold" />
              <span className="hidden sm:inline">My Location</span>
            </button>
          </form>

          {/* Interactive Map View */}
          <div className="relative overflow-hidden rounded-xl border border-surface-border shadow-inner">
            <div ref={mapContainerRef} className="h-72 w-full bg-surface-muted" />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-card/80 backdrop-blur-xs">
                <LoaderCircle className="h-6 w-6 animate-spin text-brand-gold" />
                <span className="ml-2 text-xs text-text-secondary">Loading interactive map...</span>
              </div>
            )}
          </div>

          {/* Selected Location Coordinates & Address Card */}
          <div className="rounded-xl border border-surface-border-light bg-surface-muted/50 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary">Coordinates:</span>
                <span className="font-mono text-xs font-medium text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
                {geocoding && <LoaderCircle className="h-3 w-3 animate-spin text-text-muted" />}
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand-gold hover:underline"
              >
                <span>Preview on Google Maps</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {detectedAddress && (
              <p className="text-xs text-text-secondary leading-relaxed break-words">
                <strong className="text-text-primary font-medium">Detected Place: </strong>
                {detectedAddress}
              </p>
            )}

            {detectedAddress && (
              <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateAddressText}
                  onChange={(e) => setUpdateAddressText(e.target.checked)}
                  className="rounded border-surface-border text-brand-gold focus:ring-brand-gold h-3.5 w-3.5"
                />
                <span className="text-xs text-text-muted">
                  Also update the <strong>Full Address</strong> field with this detected location
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-surface-border bg-surface-card px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-border px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-border/40 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gold px-4 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-brand-gold/90 transition-colors cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Confirm & Use Location</span>
          </button>
        </div>
      </div>
    </div>
  );
}
