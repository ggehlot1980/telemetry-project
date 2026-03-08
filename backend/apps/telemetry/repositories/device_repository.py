from typing import Iterable

from apps.telemetry.models import Device


class DeviceRepository:
    def list_devices(self) -> Iterable[Device]:
        return Device.objects.all().order_by("device_id")
