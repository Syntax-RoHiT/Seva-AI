/**
 * Seva AI — Backend Cloud Functions Entry Point
 * Registers all Firebase Cloud Function triggers.
 *
 * Functions:
 *  - onReportCreated       (Firestore trigger) → parse with Gemini, score, fan-out to Pub/Sub
 *  - urgencyDecayCron      (Scheduled, every 15 min) → re-score open reports
 *  - swarmAssemblerTrigger (Pub/Sub) → run Hungarian matching, write missions
 *  - bigQueryExport        (Firestore trigger) → stream report to BigQuery
 *  - sendCriticalAlert     (Pub/Sub) → FCM push for Critical zones
 */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const admin = require('firebase-admin');

admin.initializeApp();

// Re-export each function module
const { onReportCreated }       = require('./functions/geminiParser');
const { urgencyDecayCron }      = require('./functions/urgencyDecayEngine');
const { swarmAssemblerTrigger } = require('./functions/swarmAssembler');
const { bigQueryExportFn }      = require('./functions/bigQueryExport');
const { sendCriticalAlertFn }   = require('./functions/notificationService');

module.exports = {
  onReportCreated,
  urgencyDecayCron,
  swarmAssemblerTrigger,
  bigQueryExport: bigQueryExportFn,
  sendCriticalAlert: sendCriticalAlertFn,
};
