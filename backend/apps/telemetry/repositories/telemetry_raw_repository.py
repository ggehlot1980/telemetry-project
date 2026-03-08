import json
from datetime import datetime
from typing import Any

from django.db import connection


class TelemetryRawRepository:
    SORT_FIELDS = {
        "device_name": "d.device_name",
        "metric_name": "r.metric_name",
        "metric_value": "r.metric_value",
        "timestamp": "r.ts",
    }

    def fetch_raw_page(
        self,
        start_time: datetime,
        end_time: datetime,
        page: int,
        page_size: int,
        sort_by: str,
        sort_dir: str,
        device_id: int | None = None,
        metric_name: str | None = None,
        device_name: str | None = None,
    ) -> dict[str, Any]:
        where_clauses = ["r.ts >= %s", "r.ts <= %s"]
        params: list[Any] = [start_time, end_time]

        if device_id is not None:
            where_clauses.append("r.device_id = %s")
            params.append(device_id)
        if metric_name:
            where_clauses.append("r.metric_name = %s")
            params.append(metric_name)
        if device_name:
            where_clauses.append("d.device_name ILIKE %s")
            params.append(f"%{device_name}%")

        where_sql = " AND ".join(where_clauses)
        order_sql = self.SORT_FIELDS.get(sort_by, "r.ts")
        direction = "ASC" if sort_dir.lower() == "asc" else "DESC"
        offset = (page - 1) * page_size

        count_sql = f"""
            SELECT COUNT(*)
            FROM telemetry_raw r
            INNER JOIN devices d ON d.device_id = r.device_id
            WHERE {where_sql}
        """
        data_sql = f"""
            SELECT
                d.device_name,
                r.metric_name,
                r.metric_value,
                r.ts AS timestamp,
                r.attributes
            FROM telemetry_raw r
            INNER JOIN devices d ON d.device_id = r.device_id
            WHERE {where_sql}
            ORDER BY {order_sql} {direction}
            LIMIT %s OFFSET %s
        """

        with connection.cursor() as cursor:
            cursor.execute(count_sql, params)
            total_rows = cursor.fetchone()[0]

            cursor.execute(data_sql, [*params, page_size, offset])
            columns = [col[0] for col in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

        for row in rows:
            attributes = row.get("attributes")
            if isinstance(attributes, str):
                try:
                    row["attributes"] = json.loads(attributes)
                except json.JSONDecodeError:
                    row["attributes"] = {"raw": attributes}

        total_pages = (total_rows + page_size - 1) // page_size if total_rows > 0 else 0

        return {
            "rows": rows,
            "page": page,
            "page_size": page_size,
            "total_rows": total_rows,
            "total_pages": total_pages,
        }
