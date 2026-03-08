from datetime import datetime
from typing import Any

from django.db import connection


class TelemetryAggregateRepository:
    """Reads from pre-aggregated tables used by the timeseries endpoint."""

    ALLOWED_AGG_TABLES = {
        "telemetry_agg_hourly",
        "telemetry_agg_daily",
        "telemetry_agg_weekly",
        "telemetry_agg_monthly",
    }

    def fetch_timeseries(
        self,
        table_name: str,
        device_id: int,
        start_time: datetime,
        end_time: datetime,
    ) -> list[dict[str, Any]]:
        # Table name is dynamic, so keep a strict allow-list before interpolating SQL.
        if table_name not in self.ALLOWED_AGG_TABLES:
            raise ValueError(f"Unsupported aggregate table: {table_name}")

        sql = f"""
            SELECT
                device_id,
                metric_name,
                bucket,
                count,
                sum_val,
                min_val,
                max_val,
                avg_val
            FROM {table_name}
            WHERE device_id = %s
              AND bucket >= %s
              AND bucket <= %s
            ORDER BY bucket ASC, metric_name ASC
        """
        params = [device_id, start_time, end_time]

        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
