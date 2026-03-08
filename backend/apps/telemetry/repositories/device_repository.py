from typing import Iterable

from apps.telemetry.models import Device


class DeviceRepository:
    """Data access helper for the `devices` table."""

    def list_devices(self) -> Iterable[Device]:
        # Stable ordering keeps dropdown behavior deterministic across requests.
        return Device.objects.all().order_by("device_id")
