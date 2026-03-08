from datetime import datetime
from typing import Any

from apps.telemetry.repositories import TelemetryRawRepository


class RawTelemetryService:
    def __init__(self, raw_repository: TelemetryRawRepository | None = None) -> None:
        self._raw_repository = raw_repository or TelemetryRawRepository()

    def get_raw_telemetry(
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
        return self._raw_repository.fetch_raw_page(
            start_time=start_time,
            end_time=end_time,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_dir=sort_dir,
            device_id=device_id,
            metric_name=metric_name,
            device_name=device_name,
        )
