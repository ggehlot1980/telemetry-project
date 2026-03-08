import math
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

import redis

from apps.telemetry.cache import RedisCacheClient
from apps.telemetry.query_router import AggregateQueryRouter
from apps.telemetry.repositories import TelemetryAggregateRepository


class TelemetryTimeseriesService:
    METRICS = ["cpu_usage", "temperature", "battery_level"]
    STATS = ["min", "max", "avg"]
    MAX_POINTS = 300

    def __init__(
        self,
        agg_repository: TelemetryAggregateRepository | None = None,
        router: AggregateQueryRouter | None = None,
        cache_client: RedisCacheClient | None = None,
    ) -> None:
        self._agg_repository = agg_repository or TelemetryAggregateRepository()
        self._router = router or AggregateQueryRouter()
        self._cache = cache_client or RedisCacheClient()

    def get_timeseries(self, device_id: int, start_time: datetime, end_time: datetime) -> dict[str, Any]:
        start_iso = start_time.astimezone(UTC).isoformat()
        end_iso = end_time.astimezone(UTC).isoformat()
        cache_key = self._cache.build_timeseries_key(device_id=device_id, start_iso=start_iso, end_iso=end_iso)

        try:
            cached = self._cache.get_json(cache_key)
            if cached:
                cached["meta"]["cache_hit"] = True
                return cached
        except redis.RedisError:
            pass

        selection = self._router.select(start_time=start_time, end_time=end_time)
        rows = self._agg_repository.fetch_timeseries(
            table_name=selection.table_name,
            device_id=device_id,
            start_time=start_time,
            end_time=end_time,
            metrics=self.METRICS,
        )
        payload = self._build_payload(device_id, start_time, end_time, selection.table_name, selection.expected_buckets, rows)

        try:
            self._cache.set_json(cache_key, payload)
        except redis.RedisError:
            pass

        payload["meta"]["cache_hit"] = False
        return payload

    def _build_payload(
        self,
        device_id: int,
        start_time: datetime,
        end_time: datetime,
        source_table: str,
        expected_buckets: int,
        rows: list[dict[str, Any]],
    ) -> dict[str, Any]:
        series_data: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
        unique_buckets: set[str] = set()

        for row in rows:
            metric_name = row["metric_name"]
            bucket = row["bucket"].astimezone(UTC).isoformat()
            unique_buckets.add(bucket)
            series_data[(metric_name, "min")].append({"bucket": bucket, "value": row["min_val"]})
            series_data[(metric_name, "max")].append({"bucket": bucket, "value": row["max_val"]})
            series_data[(metric_name, "avg")].append({"bucket": bucket, "value": row["avg_val"]})

        series = []
        for metric_name in self.METRICS:
            for stat in self.STATS:
                points = self._downsample_points(series_data.get((metric_name, stat), []))
                series.append(
                    {
                        "id": f"{metric_name}_{stat}",
                        "metric_name": metric_name,
                        "stat": stat,
                        "points": points,
                    }
                )

        return {
            "meta": {
                "device_id": device_id,
                "start_time": start_time.astimezone(UTC).isoformat(),
                "end_time": end_time.astimezone(UTC).isoformat(),
                "source_table": source_table,
                "expected_bucket_count": expected_buckets,
                "bucket_count": len(unique_buckets),
            },
            "series": series,
        }

    def _downsample_points(self, points: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if len(points) <= self.MAX_POINTS:
            return points
        stride = max(1, math.ceil(len(points) / self.MAX_POINTS))
        return points[::stride]
