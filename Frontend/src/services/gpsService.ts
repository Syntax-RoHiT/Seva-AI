/**
 * Seva AI — Volunteer GPS Location Service
 *
 * Continuously publishes the volunteer's GPS coordinates to their
 * Firestore document so the Live Heatmap can track field positions.
 *
 * Uses the browser Geolocation API with a watchPosition for continuous updates.
 * Implements a distance threshold (>10m) before writing to reduce Firestore writes.
 */

import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const MIN_DISTANCE_METERS = 10; // Only write if moved more than 10m
let watchId: number | null = null;
let lastLat: number | null = null;
let lastLng: number | null = null;

/**
 * Calculates the distance in meters between two GPS coordinates.
 * Uses the Haversine formula.
 */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Starts continuous GPS tracking for a volunteer.
 * Writes to Firestore volunteers/{uid} when position changes meaningfully.
 *
 * @param uid - Firebase Auth UID of the volunteer
 * @param onError - Optional callback for permission errors
 */
export function startGPSTracking(uid: string, onError?: (msg: string) => void): void {
  if (!navigator.geolocation) {
    onError?.('Geolocation is not supported by this device.');
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
  }

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;

      // Skip low-accuracy readings (> 100m accuracy)
      if (accuracy > 100) return;

      // Skip if we haven't moved significantly
      if (lastLat !== null && lastLng !== null) {
        const dist = haversineMeters(lastLat, lastLng, latitude, longitude);
        if (dist < MIN_DISTANCE_METERS) return;
      }

      lastLat = latitude;
      lastLng = longitude;

      try {
        await updateDoc(doc(db, 'volunteers', uid), {
          location: { lat: latitude, lng: longitude },
          locationAccuracy: accuracy,
          locationUpdatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error('[GPSService] Failed to update location:', err);
      }
    },
    (err) => {
      const msg = err.code === 1
        ? 'Location permission denied. Enable GPS to receive accurate missions.'
        : 'Unable to determine your location. Please check device GPS.';
      onError?.(msg);
      console.warn('[GPSService] Error:', err.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    }
  );
}

/**
 * Stops GPS tracking and marks volunteer as location-unknown.
 * Call this when volunteer goes offline.
 */
export function stopGPSTracking(uid: string): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    lastLat = null;
    lastLng = null;
  }

  // Don't await — fire and forget
  updateDoc(doc(db, 'volunteers', uid), {
    locationUpdatedAt: serverTimestamp(),
  }).catch(() => {});
}

/**
 * Gets the current position once (for initial placement on map).
 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
