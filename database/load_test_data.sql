---------------------------------------------------------
-- PERFORMANCE SETTINGS
---------------------------------------------------------

SET synchronous_commit = OFF;
SET work_mem = '256MB';
SET maintenance_work_mem = '1GB';

---------------------------------------------------------
-- CREATE DEVICES
---------------------------------------------------------

INSERT INTO devices (device_id, device_name, device_type, tags)
VALUES
(1, 'device-1', 'cpu_sensor', '{"location":"dc-1"}'),
(2, 'device-2', 'temperature_sensor', '{"location":"warehouse"}'),
(3, 'device-3', 'battery_sensor', '{"location":"iot-node"}'),
(4, 'device-4', 'humidity_sensor', '{"location":"lab"}'),
(5, 'device-5', 'vibration_sensor', '{"location":"factory"}')
ON CONFLICT (device_id) DO NOTHING;

---------------------------------------------------------
-- DEFINE TIME RANGE
---------------------------------------------------------

DO $$
DECLARE
    start_ts timestamptz := '2025-01-01';
    end_ts timestamptz := '2026-03-07';
    total_rows integer := 10000000;

    total_seconds double precision;
BEGIN

total_seconds := EXTRACT(EPOCH FROM (end_ts - start_ts));

---------------------------------------------------------
-- DEVICE 1 CPU
---------------------------------------------------------

INSERT INTO telemetry_raw(device_id, metric_name, metric_value, attributes, ts)
SELECT
1,
'cpu_usage',
20 + random()*80,
'{}'::jsonb,
start_ts + ((random()*total_seconds) * interval '1 second')
FROM generate_series(1,total_rows);

---------------------------------------------------------
-- DEVICE 2 TEMPERATURE
---------------------------------------------------------

INSERT INTO telemetry_raw(device_id, metric_name, metric_value, attributes, ts)
SELECT
2,
'temperature',
25 + sin(i/50000.0)*10 + random()*2,
'{}'::jsonb,
start_ts + ((random()*total_seconds) * interval '1 second')
FROM generate_series(1,total_rows) i;

---------------------------------------------------------
-- DEVICE 3 BATTERY
---------------------------------------------------------

INSERT INTO telemetry_raw(device_id, metric_name, metric_value, attributes, ts)
SELECT
3,
'battery_level',
GREATEST(5,100 - (i/200000.0) + random()),
'{}'::jsonb,
start_ts + ((random()*total_seconds) * interval '1 second')
FROM generate_series(1,total_rows) i;

---------------------------------------------------------
-- DEVICE 4 HUMIDITY
---------------------------------------------------------

INSERT INTO telemetry_raw(device_id, metric_name, metric_value, attributes, ts)
SELECT
4,
'humidity',
40 + sin(i/30000.0)*20 + random()*5,
'{}'::jsonb,
start_ts + ((random()*total_seconds) * interval '1 second')
FROM generate_series(1,total_rows) i;

---------------------------------------------------------
-- DEVICE 5 VIBRATION
---------------------------------------------------------

INSERT INTO telemetry_raw(device_id, metric_name, metric_value, attributes, ts)
SELECT
5,
'vibration_level',
CASE
WHEN random() < 0.01 THEN random()*8
ELSE random()
END,
'{}'::jsonb,
start_ts + ((random()*total_seconds) * interval '1 second')
FROM generate_series(1,total_rows);

END $$;