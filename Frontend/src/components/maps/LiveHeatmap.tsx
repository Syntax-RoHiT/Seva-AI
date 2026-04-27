import React, { useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Globe, Loader2, Radio, TrendingUp } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const LIBRARIES: ('visualization' | 'geometry')[] = ['visualization'];

const NIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a4a4a' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d1a0d' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#1a3a1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050a18' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
];

const center = { lat: 26.9124, lng: 75.7873 };
const mapContainerStyle = { width: '100%', height: '100%' };

const SEED_ZONES = [
  { id: 'S1', lat: 26.9200, lng: 75.7900, urgencyScore: 9.8 },
  { id: 'S2', lat: 26.9000, lng: 75.7700, urgencyScore: 8.5 },
  { id: 'S3', lat: 26.9150, lng: 75.8000, urgencyScore: 4.2 },
  { id: 'S4', lat: 26.9300, lng: 75.7800, urgencyScore: 7.2 },
  { id: 'S5', lat: 26.9050, lng: 75.8100, urgencyScore: 6.1 },
  { id: 'S6', lat: 26.9250, lng: 75.7650, urgencyScore: 2.5 },
];

const FORECAST_ZONES = [
  { id: 'F1', lat: 26.9350, lng: 75.7950, predictedScore: 7.8, confidence: 'HIGH',   radiusM: 600, label: 'PREDICTED: HIGH in 24h' },
  { id: 'F2', lat: 26.8950, lng: 75.8150, predictedScore: 6.2, confidence: 'MEDIUM', radiusM: 800, label: 'PREDICTED: MOD in 48h' },
  { id: 'F3', lat: 26.9180, lng: 75.7600, predictedScore: 8.5, confidence: 'HIGH',   radiusM: 500, label: 'PREDICTED: CRITICAL in 12h' },
];

interface ZonePoint {
  id: string;
  lat: number;
  lng: number;
  urgencyScore: number;
}

function getColorForScore(score: number): string {
  if (score >= 8) return '#EF4444';   // RED: CRITICAL
  if (score >= 6) return '#F97316';   // ORANGE: HIGH
  if (score >= 4) return '#F59E0B';   // AMBER: MODERATE
  if (score >= 2) return '#22C55E';   // GREEN: LOW
  return '#3B82F6';                    // BLUE: RESOLVED
}

function getLabelForScore(score: number): string {
  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MODERATE';
  if (score >= 2) return 'LOW';
  return 'RESOLVED';
}

export default function LiveHeatmap() {
  const [zones, setZones] = React.useState<ZonePoint[]>(SEED_ZONES);
  const [selectedZone, setSelectedZone] = React.useState<ZonePoint | null>(null);
  const [mapRef, setMapRef] = React.useState<google.maps.Map | null>(null);
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const forecastCirclesRef = useRef<google.maps.Circle[]>([]);
  const [isSyncing, setIsSyncing] = React.useState(true);
  const [liveCount, setLiveCount] = React.useState(0);
  const [showForecast, setShowForecast] = React.useState(true);

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
      // Merge live data with seed data for a rich demo
      const merged = [...live, ...SEED_ZONES].slice(0, 60);
      setZones(merged.length > 0 ? merged : SEED_ZONES);
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
    markersRef.current.forEach(m => m.setMap(null));
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
        'rgba(0, 0, 255, 0)',
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

      const marker = new google.maps.Marker({
        position: { lat: zone.lat, lng: zone.lng },
        map: mapRef,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.4,
          strokeWeight: 2,
          strokeColor: color,
          scale,
        },
        title: `Score: ${zone.urgencyScore}`,
      });

      marker.addListener('click', () => {
        setSelectedZone(zone);
      });

      markersRef.current.push(marker);
    });

    // Build forecast zone circles (dashed border = BigQuery ML prediction)
    forecastCirclesRef.current.forEach(c => c.setMap(null));
    forecastCirclesRef.current = [];

    if (showForecast) {
      FORECAST_ZONES.forEach(fz => {
        const color = fz.predictedScore >= 8 ? '#A855F7' : fz.predictedScore >= 6 ? '#8B5CF6' : '#7C3AED';
        // Outer dashed ring
        const circle = new google.maps.Circle({
          center: { lat: fz.lat, lng: fz.lng },
          radius: 700,
          map: mapRef,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.06,
          zIndex: 1,
        });
        // Clickable inner label marker
        const labelMarker = new google.maps.Marker({
          position: { lat: fz.lat, lng: fz.lng },
          map: mapRef,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 0.3,
            strokeWeight: 1.5,
            strokeColor: color,
            scale: 8,
          },
          title: fz.label,
          zIndex: 2,
        });
        forecastCirclesRef.current.push(circle);
        markersRef.current.push(labelMarker);
      });
    }

    return () => {
      if (heatmapRef.current) heatmapRef.current.setMap(null);
      markersRef.current.forEach(m => m.setMap(null));
      forecastCirclesRef.current.forEach(c => c.setMap(null));
    };
  }, [mapRef, zones, isLoaded, showForecast]);

  const criticalCount = zones.filter(z => z.urgencyScore >= 8).length;
  const highCount = zones.filter(z => z.urgencyScore >= 6 && z.urgencyScore < 8).length;

  return (
    <div className="glass-panel overflow-hidden rounded-[2.5rem] border border-white/10 h-[600px] relative">
      {/* Map Header Overlay */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-3 flex-wrap">
        <div className="px-4 py-2 bg-black/80 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3">
          <Globe size={14} className="text-secondary-container animate-spin-slow" />
          <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white">
            Live Urgency Heatmap — Rajasthan Kendra
          </span>
        </div>
        {isSyncing ? (
          <div className="px-4 py-2 bg-black/80 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
            <Loader2 size={12} className="animate-spin text-white/40" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Syncing...</span>
          </div>
        ) : (
          <div className="px-4 py-2 bg-black/80 backdrop-blur-md rounded-full border border-secondary-container/30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-secondary-container">
              Live • {liveCount} Field Reports
            </span>
          </div>
        )}
        {/* Forecast toggle */}
        <button
          onClick={() => setShowForecast(f => !f)}
          className={`px-4 py-2 bg-black/80 backdrop-blur-md rounded-full border flex items-center gap-2 transition-all ${
            showForecast ? 'border-purple-500/40 text-purple-400' : 'border-white/10 text-white/30'
          }`}
        >
          <TrendingUp size={12} />
          <span className="text-[9px] font-mono uppercase tracking-widest">
            {showForecast ? 'BQML Forecast ON' : 'Forecast OFF'}
          </span>
        </button>
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
              styles: NIGHT_MAP_STYLE,
              disableDefaultUI: true,
              zoomControl: true,
              zoomControlOptions: {
                position: window.google?.maps?.ControlPosition?.RIGHT_CENTER,
              },
              mapTypeId: 'roadmap',
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-white/5">
            <Radio size={40} className="text-white/10 animate-pulse" />
            <span className="text-[10px] font-display font-bold uppercase tracking-widest text-white/20">
              Satellite Link Establishing...
            </span>
          </div>
        )}
      </div>

      {/* Zone Info Popup */}
      {selectedZone && (
        <div className="absolute top-20 right-6 z-20 w-64 bg-black/90 backdrop-blur-xl border rounded-2xl p-5 border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-mono uppercase text-white/40 tracking-widest">Zone Intel</div>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-white/20 hover:text-white text-xs"
            >✕</button>
          </div>
          <div
            className="text-2xl font-display font-black uppercase tracking-tighter mb-1"
            style={{ color: getColorForScore(selectedZone.urgencyScore) }}
          >
            {getLabelForScore(selectedZone.urgencyScore)}
          </div>
          <div className="text-[10px] font-mono text-white/40 mb-4">
            {selectedZone.lat.toFixed(4)}°N, {selectedZone.lng.toFixed(4)}°E
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-display font-bold uppercase text-white/30">Urgency Score</span>
            <span
              className="text-lg font-mono font-black tracking-tighter"
              style={{ color: getColorForScore(selectedZone.urgencyScore) }}
            >
              {selectedZone.urgencyScore.toFixed(1)}
            </span>
          </div>
          <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(selectedZone.urgencyScore / 10) * 100}%`,
                backgroundColor: getColorForScore(selectedZone.urgencyScore),
                boxShadow: `0 0 10px ${getColorForScore(selectedZone.urgencyScore)}`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom Legend */}
      <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-end pointer-events-none">
        <div className="glass-panel p-4 rounded-xl border-white/5 pointer-events-auto">
          <div className="text-[9px] font-display font-bold uppercase tracking-[0.2em] text-white/30 mb-3">
            Zone Legend
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              { color: '#EF4444', label: 'Critical' },
              { color: '#F97316', label: 'High' },
              { color: '#F59E0B', label: 'Moderate' },
              { color: '#22C55E', label: 'Low' },
              { color: '#3B82F6', label: 'Resolved' },
              { color: '#A855F7', label: 'BQML Forecast', dashed: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${'dashed' in item && item.dashed ? 'ring-1 ring-current bg-transparent' : ''}`}
                  style={{ backgroundColor: 'dashed' in item && item.dashed ? 'transparent' : item.color, color: item.color, borderColor: item.color }}
                />
                <span className="text-[9px] font-mono text-white/50 uppercase">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border-white/5 pointer-events-auto">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-mono text-white/60 uppercase">
                Critical: {criticalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-[10px] font-mono text-white/60 uppercase">
                High: {highCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
