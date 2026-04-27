/**
 * Seva AI — BigQuery Export Pipeline (Cloud Function)
 *
 * Triggered: onDocumentUpdated('reports/{reportId}')
 * Purpose:
 *   Streams every resolved/updated report to BigQuery for:
 *   - Historical trend analysis
 *   - BigQuery ML demand forecasting (predicts future Red Zones)
 *   - Looker Studio executive dashboards
 *
 * Dataset: seva_ai_analytics
 * Table:   reports_stream
 */

const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { BigQuery } = require('@google-cloud/bigquery');
const admin = require('firebase-admin');

const bq = new BigQuery();

const DATASET_ID = 'seva_ai_analytics';
const TABLE_ID = 'reports_stream';

/**
 * Safely convert a Firestore Timestamp (or null) to an ISO string.
 */
function toISO(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return null;
}

/**
 * BigQuery row schema — must match the table definition.
 */
function buildRow(reportId, data) {
  return {
    report_id:        reportId,
    created_at:       toISO(data.createdAt),
    updated_at:       toISO(data.updatedAt || data.aiProcessedAt),
    type:             (data.needType || ['GENERAL']).join(','),
    severity:         data.severity || 0,
    urgency_score:    data.urgencyScore || 0,
    zone_label:       data.zoneLabel || 'UNKNOWN',
    status:           data.status || 'UNKNOWN',
    location_lat:     data.location?.lat || null,
    location_lng:     data.location?.lng || null,
    location_text:    data.locationDescription || data.location || null,
    is_life_threatening: data.isLifeThreatening || false,
    affected_count:   data.meta?.affectedCount || data.affectedCount || 0,
    detected_language: data.detectedLanguage || 'en',
    ai_processed:     data.aiProcessed || false,
    reporter_id:      data.reporterId || null,
    assigned_volunteer: data.assignedVolunteerId || null,
    match_cost_km:    data.matchCostKm || null,
    resource_gap:     data.resourceGap || false,
  };
}

const bigQueryExportFn = onDocumentUpdated('reports/{reportId}', async (event) => {
  const after = event.data.after.data();
  const reportId = event.params.reportId;

  // Only stream resolved or AI-processed reports to reduce BigQuery costs
  const shouldStream = after.aiProcessed || after.status === 'RESOLVED';
  if (!shouldStream) return;

  try {
    const row = buildRow(reportId, after);
    await bq.dataset(DATASET_ID).table(TABLE_ID).insert([row]);
    console.log(`[BigQueryExport] Streamed report ${reportId} to BigQuery.`);
  } catch (err) {
    // Log but don't crash — BigQuery export is non-critical
    console.error(`[BigQueryExport] Failed for report ${reportId}:`, err.message);
  }
});

module.exports = { bigQueryExportFn };
