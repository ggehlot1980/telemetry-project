from dataclasses import dataclass
from datetime import timedelta


@dataclass(frozen=True)
class AggregateSelection:
    """Router decision payload for aggregate table and expected chart density."""

    table_name: str
    bucket_size: timedelta
    expected_buckets: int
