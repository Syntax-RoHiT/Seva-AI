import React, { useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Globe, Loader2, Radio, TrendingUp } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const LIBRARIES: ('visualization' | 'geometry' | 'marker')[] = ['visualization', 'marker'];

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] }
];

const center = { lat: 26.9124, lng: 75.7873 };
const mapContainerStyle = { width: '100%', height: '100%' };



interface ZonePoint {
  id: string;
  lat: number;
  lng: number;
  urgencyScore: number;
}

function getColorForScore(score: number): string {
  if (score >= 8) return '#ef4444';   // RED: CRITICAL
  if (score >= 6) return '#f97316';   // ORANGE: HIGH
  if (score >= 4) return '#f59e0b';   // AMBER: MODERATE
  if (score >= 2) return '#22c55e';   // GREEN: LOW
  return '#3b82f6';                    // BLUE: RESOLVED
}

function getLabelForScore(score: number): string {
  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MODERATE';
  if (score >= 2) return 'LOW';
  return 'RESOLVED';
}

export default function LiveHeatmap() {
  const [zones, setZones] = React.useState<ZonePoint[]>([]);
  const [selectedZone, setSelectedZone] = React.useState<ZonePoint | null>(null);
  const [mapRef, setMapRef] = React.useState<google.maps.Map | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const forecastCirclesRef = useRef<google.maps.Circle[]>([]);
  const [isSyncing, setIsSyncing] = React.useState(true);
  const [liveCount, setLiveCount] = React.useState(0);


  const { isLoaded } = useJsApiLoader({
    id: 'google-map-heatmap-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('urgencyScore', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const live = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(r => r.location?.lat && r.location?.lng)
        .map(r => ({
          id: r.id,
          lat: r.location.lat,
          lng: r.location.lng,
          urgencyScore: r.urgencyScore || 0,
        }));

      setLiveCount(live.length);
      setZones(live);
      setIsSyncing(false);
    }, () => setIsSyncing(false));
    return () => unsubscribe();
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapRef(map);
  }, []);

  // Rebuild heatmap & markers whenever zones or map changes
  useEffect(() => {
    if (!mapRef || !isLoaded || !window.google?.maps?.visualization) return;

    // Clear old markers
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];

    // Clear old heatmap
    if (heatmapRef.current) heatmapRef.current.setMap(null);

    // Build heatmap data points (weighted by urgency score)
    const heatmapData = zones.map(z => ({
      location: new google.maps.LatLng(z.lat, z.lng),
      weight: z.urgencyScore,
    }));

    heatmapRef.current = new google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      map: mapRef,
      radius: 60,
      opacity: 0.8,
      gradient: [
        'rgba(255, 255, 255, 0)',
        'rgba(0, 255, 255, 0.4)',
        'rgba(0, 255, 0, 0.6)',
        'rgba(255, 255, 0, 0.7)',
        'rgba(255, 165, 0, 0.8)',
        'rgba(255, 0, 0, 1)',
      ],
    });

    // Build tactical circle markers
    zones.forEach(zone => {
      const color = getColorForScore(zone.urgencyScore);
      const scale = Math.max(8, zone.urgencyScore * 2.5);

      const pinSvg = `
        <svg width="${scale * 2}" height="${scale * 2}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.6" stroke="#ffffff" stroke-width="2"/>
        </svg>
      `;
      const parser = new DOMParser();
      const svgElement = parser.parseFromString(pinSvg, "image/svg+xml").documentElement;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: zone.lat, lng: zone.lng },
        map: mapRef,
        content: svgElement,
        title: `Score: ${zone.urgencyScore}`,
      });

      marker.addListener('gmp-click', () => {
        setSelectedZone(zone);
      });

      markersRef.current.push(marker);
    });

    // Build forecast zone circles (dashed border = BigQuery ML prediction)
    forecastCirclesRef.current.forEach(c => c.setMap(null));
    forecastCirclesRef.current = [];

    return () => {
      if (heatmapRef.current) heatmapRef.current.setMap(null);
      markersRef.current.forEach(m => { m.map = null; });
      forecastCirclesRef.current.forEach(c => c.setMap(null));
    };
  }, [mapRef, zones, isLoaded]);

  const criticalCount = zones.filter(z => z.urgencyScore >= 8).length;
  const highCount = zones.filter(z => z.urgencyScore >= 6 && z.urgencyScore < 8).length;

  return (
    <div className="bg-white border border-gray-200 h-[600px] relative shadow-sm font-sans">
      {/* Map Header Overlay */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3 flex-wrap">
        <div className="px-4 py-2 bg-white border border-gray-200 shadow-sm flex items-center gap-3">
          <Globe size={14} className="text-blue-600 animate-spin-slow" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-900">
            Live Urgency Heatmap
          </span>
        </div>
        {isSyncing ? (
          <div className="px-4 py-2 bg-white border border-gray-200 shadow-sm flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-gray-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Syncing...</span>
          </div>
        ) : (
          <div className="px-4 py-2 bg-white border border-gray-200 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">
              Live • {liveCount} Field Reports
            </span>
          </div>
        )}

      </div>

      {/* Map */}
      <div className="w-full h-full">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
            onLoad={onMapLoad}
            options={{
              mapId: 'DEMO_MAP_ID',
              disableDefaultUI: true,
              zoomControl: true,
              zoomControlOptions: {
                position: window.google?.maps?.ControlPosition?.RIGHT_CENTER,
              },
              mapTypeId: 'roadmap',
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-50">
            <Radio size={40} className="text-blue-600 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-600">
              Data Link Establishing...
            </span>
          </div>
        )}
      </div>

      {/* Zone Info Popup */}
      {selectedZone && (
        <div className="absolute top-20 right-6 z-20 w-64 bg-white border border-gray-200 shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Zone Intel</div>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-gray-400 hover:text-gray-900"
            >✕</button>
          </div>
          <div
            className="text-2xl font-bold uppercase tracking-tight mb-2"
            style={{ color: getColorForScore(selectedZone.urgencyScore) }}
          >
            {getLabelForScore(selectedZone.urgencyScore)}
          </div>
          <div className="text-[10px] font-bold text-gray-400 mb-6 uppercase tracking-widest">
            {selectedZone.lat.toFixed(4)}°N, {selectedZone.lng.toFixed(4)}°E
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gray-600">Urgency Score</span>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: getColorForScore(selectedZone.urgencyScore) }}
            >
              {selectedZone.urgencyScore.toFixed(1)}
            </span>
          </div>
          <div className="mt-4 h-2 bg-gray-100 overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${(selectedZone.urgencyScore / 10) * 100}%`,
                backgroundColor: getColorForScore(selectedZone.urgencyScore),
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom Legend */}
      <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-end pointer-events-none">
        <div className="bg-white p-5 border border-gray-200 shadow-sm pointer-events-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4">
            Zone Legend
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { color: '#ef4444', label: 'Critical' },
              { color: '#f97316', label: 'High' },
              { color: '#f59e0b', label: 'Moderate' },
              { color: '#22c55e', label: 'Low' },
              { color: '#3b82f6', label: 'Resolved' }
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 ${'dashed' in item && item.dashed ? 'border border-dashed' : ''}`}
                  style={{ backgroundColor: 'dashed' in item && item.dashed ? 'transparent' : item.color, borderColor: item.color }}
                />
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 border border-gray-200 shadow-sm pointer-events-auto">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                Critical: {criticalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500" />
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                High: {highCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
