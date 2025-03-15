import { useEffect, useRef } from 'react';
import maplibregl, { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapSearchProps {
  onLocationSelect: (lat: number, lng: number) => void;
  radius: number;
}

interface CircleGeoJSON {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
  properties: Record<string, never>;
}

function createCircleGeoJSON(center: [number, number], radiusKm: number): CircleGeoJSON {
  const points = 64;
  const coords: [number, number][] = [];
  const earthRadius = 6371; // Earth's radius in km

  for (let i = 0; i < points; i++) {
    const angle = (i * 360) / points;
    const dx = radiusKm * Math.cos((angle * Math.PI) / 180);
    const dy = radiusKm * Math.sin((angle * Math.PI) / 180);

    // Convert dx/dy to lon/lat
    const lat = center[1] + (dy / earthRadius) * (180 / Math.PI);
    const lon = center[0] + (dx / earthRadius) * (180 / Math.PI) / Math.cos(center[1] * Math.PI / 180);

    coords.push([lon, lat]);
  }
  coords.push(coords[0]); // Close the circle

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {},
  };
}

export function MapSearch({ onLocationSelect, radius }: MapSearchProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const circleLayerId = 'search-radius';
  const circleSourceId = 'search-radius-source';

  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/streets/style.json?key=${import.meta.env.MAPTILER_KEY}`,
        center: [21.0122, 52.2297], // Warsaw coordinates
        zoom: 11
      });

      map.current.on('load', () => {
        map.current!.addSource(circleSourceId, {
          type: 'geojson',
          data: createCircleGeoJSON([21.0122, 52.2297], radius)
        });

        map.current!.addLayer({
          id: circleLayerId,
          type: 'fill',
          source: circleSourceId,
          paint: {
            'fill-color': '#1A73E8',
            'fill-opacity': 0.1,
          }
        });

        map.current!.addLayer({
          id: `${circleLayerId}-outline`,
          type: 'line',
          source: circleSourceId,
          paint: {
            'line-color': '#1A73E8',
            'line-width': 2,
          }
        });
      });

      marker.current = new maplibregl.Marker({
        draggable: true
      })
        .setLngLat([21.0122, 52.2297])
        .addTo(map.current);

      marker.current.on('dragend', () => {
        const lngLat = marker.current!.getLngLat();
        updateCircle(lngLat);
        onLocationSelect(lngLat.lat, lngLat.lng);
      });

      map.current.on('click', (e) => {
        marker.current!.setLngLat(e.lngLat);
        updateCircle(e.lngLat);
        onLocationSelect(e.lngLat.lat, e.lngLat.lng);
      });
    }
  }, [onLocationSelect]);

  const updateCircle = (center: maplibregl.LngLat) => {
    if (map.current && map.current.getSource(circleSourceId)) {
      const source = map.current.getSource(circleSourceId) as GeoJSONSource;
      source.setData(createCircleGeoJSON([center.lng, center.lat], radius));
    }
  };

  useEffect(() => {
    if (map.current && marker.current) {
      const lngLat = marker.current.getLngLat();
      updateCircle(lngLat);
    }
  }, [radius]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[400px] rounded-lg overflow-hidden shadow-sm"
    />
  );
}