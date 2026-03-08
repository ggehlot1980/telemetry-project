from apps.telemetry.repositories import DeviceRepository


class DeviceService:
    def __init__(self, device_repository: DeviceRepository | None = None) -> None:
        self._device_repository = device_repository or DeviceRepository()

    def list_devices(self):
        return self._device_repository.list_devices()
