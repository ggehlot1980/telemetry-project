/* ============================================================
   Insert devices
   ============================================================ */

INSERT INTO devices (device_id, device_name, device_type, tags)
SELECT
  i,
  'device-' || i,
  CASE
    WHEN i % 3 = 0 THEN 'temperature_sensor'
    WHEN i % 3 = 1 THEN 'cpu_monitor'
    ELSE 'battery_sensor'
  END,
  jsonb_build_object(
    'location', 'site-' || (i % 5),
    'firmware', 'v1.' || (i % 3),
    'group', 'test-lab'
  )
FROM generate_series(1,20) AS i
ON CONFLICT (device_id) DO NOTHING;



/* ============================================================
   Generate ~20M telemetry rows
   ============================================================ */

INSERT INTO telemetry_raw (
    device_id,
    metric_name,
    metric_value,
    attributes,
    ts
)
SELECT
    d.device_id,
    m.metric_name,

    CASE
        WHEN m.metric_name = 'temperature'
            THEN 65 + 10 * sin(gs.i / 200.0) + random() * 2
        WHEN m.metric_name = 'cpu_usage'
            THEN 30 + 50 * abs(sin(gs.i / 100.0)) + random() * 10
        WHEN m.metric_name = 'battery_level'
            THEN 100 - (gs.i / 5000.0) + random()
    END
    +
    CASE
        WHEN random() < 0.001 THEN random()*60
        ELSE 0
    END,

    jsonb_build_object(
        'sensor_id', 'sensor-' || d.device_id,
        'status', CASE WHEN random() < 0.01 THEN 'warning' ELSE 'ok' END,
        'signal_strength', round((random()*20 + 70)::numeric,1)
    ),

    timestamp '2026-02-27'
        + (gs.i * interval '0.0432 seconds')

FROM devices d

CROSS JOIN (
    VALUES
        ('temperature'),
        ('cpu_usage'),
        ('battery_level')
) AS m(metric_name)

JOIN generate_series(1,333333) AS gs(i);