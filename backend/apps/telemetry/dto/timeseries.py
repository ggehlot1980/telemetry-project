from dataclasses import dataclass
from datetime import timedelta


@dataclass(frozen=True)
class AggregateSelection:
    table_name: str
    bucket_size: timedelta
    expected_buckets: int

