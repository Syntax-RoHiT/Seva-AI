const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');

const db = admin.firestore();
const pubsub = new PubSub();

/**
 * Urgency Decay Formula:
 * U = S × (1 + T / 12) × Z + R + W
 *
 * @param {number} S - Base severity (1-5)
 * @param {number} T - Hours unresolved
 * @param {number} Z - Zone density: 1.0 rural, 1.5 urban, 2.0 slum
 * @param {number} R - Repeat report bonus (+1.0 per duplicate)
 * @param {number} W - Weather risk (+0.5 rain, +1.0 heat, +1.5 flood)
 * @returns {number} Urgency score capped at 10
 */
function computeUrgencyScore(S, T, Z = 1.5, R = 0, W = 0.5) {
  const raw = S * (1 + T / 12) * Z + R + W;
  return Math.min(10, parseFloat(raw.toFixed(1)));
}

/**
 * Derive zone label from score.
 */
function getZoneLabel(score) {
  if (score >= 8.0) return 'CRITICAL';
  if (score >= 6.0) return 'HIGH';
  if (score >= 4.0) return 'MODERATE';
  if (score >= 2.0) return 'LOW';
  return 'RESOLVED';
}

/**
 * Convert Firestore Timestamp or ISO string to hours elapsed since creation.
 */
function hoursElapsed(createdAt) {
  let createdMs;
  if (createdAt && createdAt.toDate) {
    createdMs = createdAt.toDate().getTime();
  } else if (typeof createdAt === 'string') {
    createdMs = new Date(createdAt).getTime();
  } else {
    return 0;
  }
  return (Date.now() - createdMs) / (1000 * 60 * 60);
}

/**
 * Scheduled Cloud Function — runs every 15 minutes.
 * Re-scores all reports with status PENDING, PROCESSING, or ACTIVE.
 */
const urgencyDecayCron = onSchedule('every 15 minutes', async () => {
  console.log('[UrgencyDecayEngine] Starting recalculation cycle...');

  const openStatuses = ['PENDING', 'PROCESSING', 'ACTIVE', 'ON_ROUTE'];
  const snapshot = await db.collection('reports')
    .where('status', 'in', openStatuses)
    .get();

  if (snapshot.empty) {
    console.log('[UrgencyDecayEngine] No open reports found. Cycle complete.');
    return;
  }

  const batch = db.batch();
  const newCritical = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const prevScore = data.urgencyScore || 0;

    // Extract factors
    const S = data.severity || 3;
    const T = hoursElapsed(data.createdAt);
    const Z = data.zoneDensity || 1.5;
    const R = data.repeatBonus || 0;
    const W = data.weatherBonus || 0.5;

    const newScore = computeUrgencyScore(S, T, Z, R, W);
    const zoneLabel = getZoneLabel(newScore);

    // Check for escalation to CRITICAL
    const wasNotCritical = prevScore < 8.0;
    const isNowCritical = newScore >= 8.0;

    batch.update(docSnap.ref, {
      urgencyScore: newScore,
      zoneLabel,
      lastScoreUpdate: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Track newly-escalated critical reports
    if (wasNotCritical && isNowCritical && data.status !== 'ON_ROUTE') {
      newCritical.push({
        reportId: docSnap.id,
        urgencyScore: newScore,
        summary: data.summary || 'Incident escalated to CRITICAL',
        location: data.location || data.locationDescription || 'Unknown',
      });
    }
  });

  await batch.commit();
  console.log(`[UrgencyDecayEngine] Updated ${snapshot.size} reports.`);

  // Fan out CRITICAL alerts via Pub/Sub
  for (const alert of newCritical) {
    await pubsub.topic('critical-alert').publishMessage({
      data: Buffer.from(JSON.stringify(alert))
    });
    console.log(`[UrgencyDecayEngine] Escalation alert sent for report ${alert.reportId}`);
  }

  console.log(`[UrgencyDecayEngine] Cycle complete. ${newCritical.length} new critical escalations.`);
});

module.exports = { urgencyDecayCron };
