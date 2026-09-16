'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

interface WarehouseMapProps {
  lat: number | null;
  lng: number | null;
  onLocationChange?: (lat: number, lng: number) => void;
  address?: string;
  height?: number;
}

export default function WarehouseMap({ lat, lng, onLocationChange, address, height = 320 }: WarehouseMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const editable = typeof onLocationChange === 'function';

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current) return;

    const L = require('leaflet');
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    });

    const map = L.map(mapRef.current).setView([48.85, 2.35], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (editable) {
      map.on('click', (e: any) => {
        onLocationChange(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
      });
    }

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mounted) return;
    const L = require('leaflet');

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (lat !== null && lng !== null) {
      markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
      mapInstanceRef.current.setView([lat, lng], 13);
    }
  }, [lat, lng, mounted]);

  const handleGeocode = async () => {
    if (!address?.trim()) return;
    setSearching(true);
    setNotFound(false);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { 'Accept-Language': 'fr,en', 'User-Agent': 'catering-mgmt-app/1.0' } }
      );
      const data = await res.json();
      if (data[0]) {
        onLocationChange?.(parseFloat(parseFloat(data[0].lat).toFixed(6)), parseFloat(parseFloat(data[0].lon).toFixed(6)));
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  if (!mounted) {
    return (
      <div style={{ height }} className="rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
        Loading map…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={mapRef} style={{ height }} className="rounded-lg border border-gray-200 overflow-hidden z-0" />

      <div className="flex items-center gap-3 flex-wrap">
        {editable && (
          <button
            type="button"
            onClick={handleGeocode}
            disabled={searching || !address?.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {searching ? 'Searching…' : 'Find on map'}
          </button>
        )}
        {notFound && <span className="text-xs text-red-500">Address not found</span>}
        <span className="text-xs text-gray-500">
          {lat !== null && lng !== null
            ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : editable
              ? 'Click on the map to place a pin'
              : 'No location set'}
        </span>
      </div>
    </div>
  );
}
