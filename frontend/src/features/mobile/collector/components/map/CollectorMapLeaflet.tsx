"use client";

import { useEffect, useId, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPin } from "../../support/types";
import styles from "./map.module.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();

  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      const p = pins[0].kit!;
      map.setView([p.latitude!, p.longitude!], 14);
      return;
    }
    const bounds = L.latLngBounds(
      pins.map((p) => [p.kit!.latitude!, p.kit!.longitude!] as [number, number]),
    );
    map.fitBounds(bounds.pad(0.15));
  }, [map, pins]);

  return null;
}

interface CollectorMapLeafletProps {
  pins: MapPin[];
  center: [number, number];
  zoom: number;
}

export default function CollectorMapLeaflet({ pins, center, zoom }: CollectorMapLeafletProps) {
  const mapId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles.mapCanvas} aria-hidden />;
  }

  return (
    <div className={styles.mapCanvas}>
      <MapContainer
        key={`${mapId}-${pins.length}`}
        center={center}
        zoom={zoom}
        className={styles.leafletMap}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={pins} />
        {pins.map((pin) => {
          const lat = pin.kit!.latitude!;
          const lng = pin.kit!.longitude!;
          return (
            <Marker key={pin.collectionId} position={[lat, lng]} icon={icon}>
              <Popup>
                <strong>{pin.licenseCode}</strong>
                <br />
                {pin.customerName ?? "Customer"}
                <br />
                <a href={`/collector/collections/${pin.collectionId}`}>Open visit</a>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
