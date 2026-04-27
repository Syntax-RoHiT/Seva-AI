/**
 * Seva AI — Distance Matrix Service (Layer 4: Volunteer Matching)
 *
 * Uses the Google Maps Distance Matrix API to get real driving distances
 * (not straight-line Haversine) for the Hungarian matching algorithm.
 * This ensures volunteers are matched by actual travel time, not crow-flies km.
 *
 * Batch limit: 25 origins × 25 destinations per request
 * Fallback: Haversine when API key is missing or quota exceeded
 */

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const MAX_RADIUS_KM = 2; // Only match volunteers within 2km (per spec)
const DISTANCE_MATRIX_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

// ─── Haversine fallback ────────────────────────────────────────────────────────

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ─── Skill Match Cost ──────────────────────────────────────────────────────────

function skillCost(volunteer, report) {
  const required = report.needType || [];
  const has = volunteer.skills || [];
  if (required.length === 0) return 0;
  const ratio = has.filter(s => required.includes(s)).length / required.length;
  return (1 - ratio) * 3; // 0–3 km equivalent penalty
}

// ─── Google Distance Matrix API ────────────────────────────────────────────────

/**
 * Fetches real driving distances between volunteers and reports.
 * Returns a cost matrix [volunteers × reports].
 * Volunteers outside MAX_RADIUS_KM get a large penalty (not assigned).
 */
async function getDistanceMatrix(volunteers, reports) {
  // If no API key, fall back to Haversine
  if (!MAPS_API_KEY) {
    console.warn('[DistanceMatrix] No API key — using Haversine fallback');
    return buildHaversineMatrix(volunteers, reports);
  }

  try {
    const originCoords = volunteers
      .map(v => v.location ? `${v.location.lat},${v.location.lng}` : null)
      .filter(Boolean);

    const destCoords = reports
      .map(r => r.location ? `${r.location.lat},${r.location.lng}` : null)
      .filter(Boolean);

    if (originCoords.length === 0 || destCoords.length === 0) {
      return buildHaversineMatrix(volunteers, reports);
    }

    // Batch into 25×25 chunks (API limit)
    const allRows = [];
    for (let i = 0; i < originCoords.length; i += 25) {
      const batch = originCoords.slice(i, i + 25);
      const url = new URL(DISTANCE_MATRIX_URL);
      url.searchParams.set('origins',      batch.join('|'));
      url.searchParams.set('destinations', destCoords.slice(0, 25).join('|'));
      url.searchParams.set('mode',         'driving');
      url.searchParams.set('units',        'metric');
      url.searchParams.set('region',       'in');
      url.searchParams.set('key',          MAPS_API_KEY);

      const resp = await fetch(url.toString(), { timeout: 8000 });
      const data = await resp.json();

      if (data.status !== 'OK') throw new Error(`Distance Matrix: ${data.status}`);

      data.rows.forEach((row, vi) => {
        const volIdx = i + vi;
        const volunteer = volunteers[volIdx];
        if (!allRows[volIdx]) allRows[volIdx] = [];

        row.elements.forEach((el, ri) => {
          const report = reports[ri];
          let cost;

          if (el.status === 'OK') {
            const distKm = el.distance.value / 1000; // meters → km
            const durationMin = el.duration.value / 60;

            // Apply 2km radius filter — large penalty if too far
            if (distKm > MAX_RADIUS_KM) {
              cost = 1000 + distKm; // effectively unassignable
            } else {
              // Weighted cost: 60% real distance + 20% travel time + 20% skill match
              cost = (distKm * 0.6) + (durationMin * 0.2 / 10) + (skillCost(volunteer, report) * 0.2);
            }
          } else {
            cost = 500; // large penalty for unreachable
          }
          allRows[volIdx][ri] = cost;
        });
      });
    }

    console.log(`[DistanceMatrix] Built ${volunteers.length}×${reports.length} cost matrix via Maps API`);
    return allRows;

  } catch (err) {
    console.warn('[DistanceMatrix] API failed, using Haversine:', err.message);
    return buildHaversineMatrix(volunteers, reports);
  }
}

function buildHaversineMatrix(volunteers, reports) {
  return volunteers.map(v =>
    reports.map(r => {
      const vLoc = v.location;
      const rLoc = r.location;
      const distKm = (vLoc && rLoc)
        ? haversineKm(vLoc, rLoc)
        : 50;
      const penalty = distKm > MAX_RADIUS_KM ? 1000 : 0;
      return distKm * 0.8 + skillCost(v, r) * 0.2 + penalty;
    })
  );
}

module.exports = { getDistanceMatrix, haversineKm, skillCost };
