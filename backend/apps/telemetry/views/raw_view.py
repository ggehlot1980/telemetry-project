from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.telemetry.serializers import RawTelemetryQuerySerializer
from apps.telemetry.services import RawTelemetryService


class RawTelemetryView(APIView):
    service_class = RawTelemetryService

    def get(self, request):
        serializer = RawTelemetryQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        payload = self.service_class().get_raw_telemetry(
            device_id=validated.get("device_id"),
            start_time=validated["start_time"],
            end_time=validated["end_time"],
            page=validated["page"],
            page_size=validated["page_size"],
            sort_by=validated["sort_by"],
            sort_dir=validated["sort_dir"],
            metric_name=validated.get("metric_name"),
            device_name=validated.get("device_name"),
        )
        return Response(payload, status=status.HTTP_200_OK)
