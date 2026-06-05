import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type PickupPoint = {
  id: string; name: string; address: string;
  lat: number; lng: number; working_hours: string; phone: string | null;
};

type Props = {
  pickupPoints: PickupPoint[];
  selectedId: string | null;
  onSelect: (p: PickupPoint) => void;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  onDeliveryPin?: (lat: number, lng: number) => void;
  mode: "pickup" | "delivery";
};

const TASHKENT: [number, number] = [41.2995, 69.2401];

const PICKUP_ICON = (selected: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${selected ? "#1d4f8a" : "#64748b"};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      display:flex;align-items:center;justify-content:center;
    "><svg viewBox='0 0 24 24' style='transform:rotate(45deg);width:16px;height:16px;fill:white'>
      <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/>
    </svg></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });

const DELIVERY_PIN = L.divIcon({
  className: "",
  html: `<div style="
    width:32px;height:32px;border-radius:50%;
    background:#ef4444;
    border:3px solid white;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    display:flex;align-items:center;justify-content:center;
  "><svg viewBox='0 0 24 24' style='width:16px;height:16px;fill:white'>
    <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/>
  </svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

export function OrderMap({ pickupPoints, selectedId, onSelect, deliveryLat, deliveryLng, onDeliveryPin, mode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const deliveryMarkerRef = useRef<L.Marker | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: TASHKENT,
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Click to pin delivery address
    if (mode === "delivery" && onDeliveryPin) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onDeliveryPin(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Pickup point markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "pickup") return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    pickupPoints.forEach(p => {
      const marker = L.marker([p.lat, p.lng], { icon: PICKUP_ICON(p.id === selectedId) })
        .addTo(map)
        .bindPopup(`<b>${p.name}</b><br/><small>${p.address}</small><br/><small>${p.working_hours}</small>`);
      marker.on("click", () => onSelect(p));
      markersRef.current.set(p.id, marker);
    });

    if (pickupPoints.length > 0) {
      const bounds = L.latLngBounds(pickupPoints.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupPoints, mode]);

  // Update pickup marker icons when selection changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      marker.setIcon(PICKUP_ICON(id === selectedId));
    });
    if (selectedId) {
      const marker = markersRef.current.get(selectedId);
      marker?.openPopup();
    }
  }, [selectedId]);

  // Delivery pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== "delivery") return;
    if (deliveryLat != null && deliveryLng != null) {
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.setLatLng([deliveryLat, deliveryLng]);
      } else {
        deliveryMarkerRef.current = L.marker([deliveryLat, deliveryLng], { icon: DELIVERY_PIN }).addTo(map);
      }
      map.setView([deliveryLat, deliveryLng], 15);
    }
  }, [deliveryLat, deliveryLng, mode]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {mode === "delivery" && !deliveryLat && (
        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none z-[400]">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow text-[12px] text-slate-600 font-medium">
            📍 Manzilni belgilash uchun xaritani bosing
          </div>
        </div>
      )}
    </div>
  );
}
