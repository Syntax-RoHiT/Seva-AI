/**
 * Seva AI — Notification Service Cloud Function
 *
 * Triggered: Pub/Sub topic 'critical-alert'
 * Purpose:
 *   Sends multi-channel alerts when a zone escalates to CRITICAL (score >= 8.0):
 *   1. FCM Push Notification → all NGO_ADMIN tokens
 *   2. WhatsApp via Twilio (optional, configured via env vars)
 *
 * Target: <60 second notification SLA for critical zones (per architecture spec)
 */

const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const admin = require('firebase-admin');

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Formats the FCM notification payload for a critical alert.
 */
function buildFcmPayload(alert) {
  const score = (alert.urgencyScore || 0).toFixed(1);
  return {
    notification: {
      title: `🚨 CRITICAL ZONE — Score ${score}`,
      body: alert.summary || 'A new critical zone has been identified. Immediate action required.',
    },
    data: {
      type: 'CRITICAL_ALERT',
      reportId: alert.reportId || '',
      urgencyScore: String(score),
      location: alert.location || 'Unknown',
    },
    android: {
      priority: 'high',
      notification: { channelId: 'critical_alerts', sound: 'alarm' },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default', badge: 1 } },
    },
  };
}

/**
 * Fetches all FCM tokens registered for NGO_ADMIN and SUPER_ADMIN users.
 */
async function getAdminFcmTokens() {
  const usersSnap = await db.collection('users')
    .where('role', 'in', ['NGO_ADMIN', 'SUPER_ADMIN'])
    .where('fcmToken', '!=', null)
    .get();

  return usersSnap.docs
    .map(d => d.data().fcmToken)
    .filter(Boolean);
}

/**
 * Firebase Cloud Function — triggered on 'critical-alert' Pub/Sub messages.
 */
const sendCriticalAlertFn = onMessagePublished('critical-alert', async (event) => {
  const alert = JSON.parse(
    Buffer.from(event.data.message.data, 'base64').toString()
  );

  console.log(`[NotificationService] Critical alert for report ${alert.reportId}, score ${alert.urgencyScore}`);

  // Fetch admin FCM tokens
  const tokens = await getAdminFcmTokens();

  if (tokens.length === 0) {
    console.warn('[NotificationService] No admin FCM tokens registered. Skipping push.');
    return;
  }

  const payload = buildFcmPayload(alert);

  // Send to all admin tokens via FCM multicast
  const response = await messaging.sendEachForMulticast({
    tokens,
    ...payload,
  });

  console.log(`[NotificationService] FCM sent: ${response.successCount} success, ${response.failureCount} failures.`);

  // Clean up invalid/expired tokens
  const invalidTokens = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      const code = resp.error?.code;
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(tokens[idx]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    console.log(`[NotificationService] Removing ${invalidTokens.length} stale FCM tokens.`);
    const batch = db.batch();
    const staleSnap = await db.collection('users')
      .where('fcmToken', 'in', invalidTokens)
      .get();
    staleSnap.docs.forEach(d => {
      batch.update(d.ref, { fcmToken: admin.firestore.FieldValue.delete() });
    });
    await batch.commit();
  }

  // Log the alert in Firestore for audit trail
  await db.collection('alerts').add({
    type: 'CRITICAL_ZONE',
    reportId: alert.reportId,
    urgencyScore: alert.urgencyScore,
    summary: alert.summary,
    location: alert.location,
    recipientCount: tokens.length,
    successCount: response.successCount,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});

module.exports = { sendCriticalAlertFn };
