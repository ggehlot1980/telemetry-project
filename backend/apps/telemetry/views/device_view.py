from rest_framework.response import Response
from rest_framework.views import APIView

from apps.telemetry.serializers import DeviceSerializer
from apps.telemetry.services import DeviceService


class DeviceListView(APIView):
    service_class = DeviceService

    def get(self, request):
        service = self.service_class()
        devices = service.list_devices()
        serializer = DeviceSerializer(devices, many=True)
        return Response(serializer.data)
