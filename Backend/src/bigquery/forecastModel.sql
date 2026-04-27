/**
 * Seva AI — BigQuery ML Forecasting Queries
 *
 * These SQL scripts define the BQML model and generate forecasts for
 * "Predicted Red Zones" — the dashed-border regions on the heatmap.
 *
 * Run these in BigQuery console or via the Cloud Scheduler trigger.
 *
 * Model: ARIMA_PLUS time-series forecaster per geographic zone
 * Output: forecast_zones table, read by the LiveHeatmap component
 */

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Create the BQML ARIMA_PLUS model (run once)
-- Trains on 30 days of historical urgency data per zone
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE MODEL `seva-ai-prod.seva_ai_analytics.urgency_forecast_model`
OPTIONS (
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'report_date',
  time_series_data_col = 'avg_urgency_score',
  time_series_id_col = 'zone_id',
  horizon = 3,                   -- Forecast 3 days ahead
  auto_arima = TRUE,
  data_frequency = 'DAILY',
  decompose_time_series = TRUE,
  holiday_region = 'IN'          -- Indian holiday calendar
) AS
SELECT
  DATE(created_at) AS report_date,
  CONCAT(
    CAST(ROUND(location_lat, 2) AS STRING), '_',
    CAST(ROUND(location_lng, 2) AS STRING)
  ) AS zone_id,
  AVG(urgency_score) AS avg_urgency_score
FROM `seva-ai-prod.seva_ai_analytics.reports_stream`
WHERE
  created_at IS NOT NULL
  AND location_lat IS NOT NULL
  AND location_lng IS NOT NULL
  AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY 1, 2;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Generate 72-hour forecast and write to forecast_zones table
-- This runs daily via Cloud Scheduler
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TABLE `seva-ai-prod.seva_ai_analytics.forecast_zones` AS
SELECT
  f.zone_id,
  SPLIT(f.zone_id, '_')[OFFSET(0)] AS forecast_lat,
  SPLIT(f.zone_id, '_')[OFFSET(1)] AS forecast_lng,
  f.forecast_timestamp,
  f.forecast_value AS predicted_urgency,
  f.prediction_interval_lower_bound AS confidence_low,
  f.prediction_interval_upper_bound AS confidence_high,
  -- Confidence bucket: HIGH (80%+), MEDIUM (60-79%)
  CASE
    WHEN f.prediction_interval_upper_bound - f.prediction_interval_lower_bound < 2.0 THEN 'HIGH'
    WHEN f.prediction_interval_upper_bound - f.prediction_interval_lower_bound < 4.0 THEN 'MEDIUM'
    ELSE 'LOW'
  END AS confidence_level,
  CURRENT_TIMESTAMP() AS generated_at
FROM ML.FORECAST(
  MODEL `seva-ai-prod.seva_ai_analytics.urgency_forecast_model`,
  STRUCT(3 AS horizon, 0.8 AS confidence_level)
) AS f
WHERE f.forecast_value >= 4.0;  -- Only include zones predicted to need attention


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Analytics query — National Resource Allocation Report
-- Used by Government Dashboard / Looker Studio
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  DATE(created_at) AS report_date,
  type AS need_category,
  zone_label,
  COUNT(*) AS total_reports,
  AVG(urgency_score) AS avg_urgency,
  SUM(affected_count) AS total_affected,
  COUNTIF(status = 'RESOLVED') AS resolved_count,
  SAFE_DIVIDE(COUNTIF(status = 'RESOLVED'), COUNT(*)) AS resolution_rate,
  COUNTIF(resource_gap = TRUE) AS resource_gaps,
  COUNTIF(is_life_threatening = TRUE) AS life_threatening_count
FROM `seva-ai-prod.seva_ai_analytics.reports_stream`
WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY 1, 2, 3
ORDER BY report_date DESC, avg_urgency DESC;
