import math
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List

from apps.telemetry.dto.timeseries import AggregateSelection


@dataclass(frozen=True)
class _AggregateCandidate:
    table_name: str
    bucket_size: timedelta


class AggregateQueryRouter:
    """Selects the aggregate table whose bucket density best fits chart rendering."""

    TARGET_MIN_BUCKETS = 200
    TARGET_MAX_BUCKETS = 300

    CANDIDATES: List[_AggregateCandidate] = [
        _AggregateCandidate(table_name="telemetry_agg_hourly", bucket_size=timedelta(hours=1)),
        _AggregateCandidate(table_name="telemetry_agg_daily", bucket_size=timedelta(days=1)),
        _AggregateCandidate(table_name="telemetry_agg_weekly", bucket_size=timedelta(days=7)),
        _AggregateCandidate(table_name="telemetry_agg_monthly", bucket_size=timedelta(days=30)),
    ]

    def select(self, start_time: datetime, end_time: datetime) -> AggregateSelection:
        duration = end_time - start_time
        if duration.total_seconds() <= 0:
            raise ValueError("Invalid time range. end_time must be after start_time.")

        estimates = []
        for candidate in self.CANDIDATES:
            # Estimate how many points the chart would get if this table is used.
            estimated_buckets = max(1, math.ceil(duration / candidate.bucket_size))
            estimates.append(
                AggregateSelection(
                    table_name=candidate.table_name,
                    bucket_size=candidate.bucket_size,
                    expected_buckets=estimated_buckets,
                )
            )

        within_target = [
            estimate
            for estimate in estimates
            if self.TARGET_MIN_BUCKETS <= estimate.expected_buckets <= self.TARGET_MAX_BUCKETS
        ]
        if within_target:
            return min(within_target, key=lambda x: x.expected_buckets)

        # If we cannot stay in-range, prefer the smallest above-range option.
        above_target = [estimate for estimate in estimates if estimate.expected_buckets > self.TARGET_MAX_BUCKETS]
        if above_target:
            return min(above_target, key=lambda x: x.expected_buckets)

        # Last fallback for short intervals: pick the finest available granularity.
        return max(estimates, key=lambda x: x.expected_buckets)
