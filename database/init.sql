/* ============================================================
   TELEMETRY ANALYTICS SYSTEM
   PostgreSQL + TimescaleDB
   ============================================================ */


/* ============================================================
   1. Enable required extensions
   ============================================================ */

CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


/* ============================================================
   2. Create tables
   ============================================================ */

CREATE TABLE IF NOT EXISTS devices (
  device_id      BIGINT PRIMARY KEY,
  device_name    TEXT,
  device_type    TEXT,
  tags           JSONB,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telemetry_raw (
  device_id      BIGINT NOT NULL REFERENCES devices(device_id),
  metric_name    TEXT NOT NULL,
  metric_value   DOUBLE PRECISION,
  attributes     JSONB,
  ts             timestamptz NOT NULL
);


/* ============================================================
   3. Index for device search
   ============================================================ */

CREATE INDEX IF NOT EXISTS devices_name_trgm
ON devices USING GIN (device_name gin_trgm_ops);


/* ============================================================
   4. Indexes for telemetry_raw
   ============================================================ */

CREATE INDEX IF NOT EXISTS idx_ts_brin
ON telemetry_raw USING BRIN (ts);

CREATE INDEX IF NOT EXISTS idx_device_ts
ON telemetry_raw (device_id, ts DESC);

CREATE INDEX IF NOT EXISTS idx_metric
ON telemetry_raw (metric_name);

CREATE INDEX IF NOT EXISTS idx_device_metric_ts
ON telemetry_raw (device_id, metric_name, ts DESC);


/* ============================================================
   5. Convert telemetry_raw into hypertable
   ============================================================ */

SELECT create_hypertable(
  'telemetry_raw',
  'ts',
  'device_id',
  number_partitions => 8,
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);


/* ============================================================
   6. Retention policy for raw telemetry
   Keep only 90 days
   ============================================================ */

SELECT add_retention_policy(
  'telemetry_raw',
  INTERVAL '90 days',
  if_not_exists => TRUE
);


/* ============================================================
   7. Continuous Aggregates
   ============================================================ */


/* ---------------- HOURLY ---------------- */

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_agg_hourly
WITH (timescaledb.continuous) AS
SELECT
  device_id,
  metric_name,
  time_bucket(INTERVAL '1 hour', ts) AS bucket,
  COUNT(*) AS count,
  SUM(metric_value) AS sum_val,
  MIN(metric_value) AS min_val,
  MAX(metric_value) AS max_val,
  AVG(metric_value) AS avg_val
FROM telemetry_raw
GROUP BY device_id, metric_name, bucket
WITH NO DATA;


/* ---------------- DAILY ---------------- */

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_agg_daily
WITH (timescaledb.continuous) AS
SELECT
  device_id,
  metric_name,
  time_bucket(INTERVAL '1 day', ts) AS bucket,
  COUNT(*) AS count,
  SUM(metric_value) AS sum_val,
  MIN(metric_value) AS min_val,
  MAX(metric_value) AS max_val,
  AVG(metric_value) AS avg_val
FROM telemetry_raw
GROUP BY device_id, metric_name, bucket
WITH NO DATA;


/* ---------------- WEEKLY ---------------- */

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_agg_weekly
WITH (timescaledb.continuous) AS
SELECT
  device_id,
  metric_name,
  time_bucket(INTERVAL '1 week', ts) AS bucket,
  COUNT(*) AS count,
  SUM(metric_value) AS sum_val,
  MIN(metric_value) AS min_val,
  MAX(metric_value) AS max_val,
  AVG(metric_value) AS avg_val
FROM telemetry_raw
GROUP BY device_id, metric_name, bucket
WITH NO DATA;


/* ---------------- MONTHLY ---------------- */

CREATE MATERIALIZED VIEW IF NOT EXISTS telemetry_agg_monthly
WITH (timescaledb.continuous) AS
SELECT
  device_id,
  metric_name,
  time_bucket(INTERVAL '1 month', ts) AS bucket,
  COUNT(*) AS count,
  SUM(metric_value) AS sum_val,
  MIN(metric_value) AS min_val,
  MAX(metric_value) AS max_val,
  AVG(metric_value) AS avg_val
FROM telemetry_raw
GROUP BY device_id, metric_name, bucket
WITH NO DATA;



/* ============================================================
   8. Continuous aggregate refresh policies
   ============================================================ */

/* HOURLY */
SELECT add_continuous_aggregate_policy(
  'telemetry_agg_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '30 seconds'
);

/* DAILY */
SELECT add_continuous_aggregate_policy(
  'telemetry_agg_daily',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '5 minutes',
  schedule_interval => INTERVAL '1 minute'
);

/* WEEKLY */
SELECT add_continuous_aggregate_policy(
  'telemetry_agg_weekly',
  start_offset => INTERVAL '3 weeks',
  end_offset => INTERVAL '10 minutes',
  schedule_interval => INTERVAL '5 minutes'
);

/* MONTHLY */
SELECT add_continuous_aggregate_policy(
  'telemetry_agg_monthly',
  start_offset => INTERVAL '4 months',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '10 minutes'
);



/* ============================================================
   Enable real-time aggregates
   ============================================================ */

ALTER MATERIALIZED VIEW telemetry_agg_hourly
SET (timescaledb.materialized_only = false);

ALTER MATERIALIZED VIEW telemetry_agg_daily
SET (timescaledb.materialized_only = false);

ALTER MATERIALIZED VIEW telemetry_agg_weekly
SET (timescaledb.materialized_only = false);

ALTER MATERIALIZED VIEW telemetry_agg_monthly
SET (timescaledb.materialized_only = false);



/* ============================================================
   9. Indexes for aggregate views
   ============================================================ */

CREATE INDEX IF NOT EXISTS idx_hourly_device_metric_bucket
ON telemetry_agg_hourly (device_id, metric_name, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_daily_device_metric_bucket
ON telemetry_agg_daily (device_id, metric_name, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_device_metric_bucket
ON telemetry_agg_weekly (device_id, metric_name, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_device_metric_bucket
ON telemetry_agg_monthly (device_id, metric_name, bucket DESC);



/* ============================================================
   10. Retention policies for aggregates
   ============================================================ */

SELECT add_retention_policy(
  'telemetry_agg_hourly',
  INTERVAL '2 years',
  if_not_exists => TRUE
);

SELECT add_retention_policy(
  'telemetry_agg_daily',
  INTERVAL '5 years',
  if_not_exists => TRUE
);

SELECT add_retention_policy(
  'telemetry_agg_weekly',
  INTERVAL '10 years',
  if_not_exists => TRUE
);

SELECT add_retention_policy(
  'telemetry_agg_monthly',
  INTERVAL '15 years',
  if_not_exists => TRUE
);



/* ============================================================
   11. Configure chunk intervals for aggregate hypertables
   ============================================================ */

SELECT set_chunk_time_interval(
  'telemetry_agg_hourly',
  INTERVAL '30 days'
);

SELECT set_chunk_time_interval(
  'telemetry_agg_daily',
  INTERVAL '90 days'
);

SELECT set_chunk_time_interval(
  'telemetry_agg_weekly',
  INTERVAL '6 months'
);

SELECT set_chunk_time_interval(
  'telemetry_agg_monthly',
  INTERVAL '1 year'
);


/* ============================================================
   Enable compression for telemetry_raw
   ============================================================ */

ALTER TABLE telemetry_raw
SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id, metric_name',
  timescaledb.compress_orderby = 'ts DESC'
);

SELECT add_compression_policy(
  'telemetry_raw',
  INTERVAL '7 days'
);


/* ============================================================
   Compression for hourly aggregates
   ============================================================ */

ALTER MATERIALIZED VIEW telemetry_agg_hourly
SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id, metric_name',
  timescaledb.compress_orderby = 'bucket DESC'
);

SELECT add_compression_policy(
  'telemetry_agg_hourly',
  INTERVAL '30 days'
);


/* ============================================================
   Compression for daily aggregates
   ============================================================ */

ALTER MATERIALIZED VIEW telemetry_agg_daily
SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id, metric_name',
  timescaledb.compress_orderby = 'bucket DESC'
);

SELECT add_compression_policy(
  'telemetry_agg_daily',
  INTERVAL '90 days'
);