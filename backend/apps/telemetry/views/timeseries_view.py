from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.telemetry.serializers import TimeseriesQuerySerializer
from apps.telemetry.services import TelemetryTimeseriesService


class TelemetryTimeseriesView(APIView):
    service_class = TelemetryTimeseriesService

    def get(self, request):
        serializer = TimeseriesQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        payload = self.service_class().get_timeseries(
            device_id=serializer.validated_data["device_id"],
            start_time=serializer.validated_data["start_time"],
            end_time=serializer.validated_data["end_time"],
        )
        return Response(payload, status=status.HTTP_200_OK)
