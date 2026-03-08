from django.urls import path

from apps.telemetry.views.device_view import DeviceListView
from apps.telemetry.views.raw_view import RawTelemetryView
from apps.telemetry.views.timeseries_view import TelemetryTimeseriesView


urlpatterns = [
    # Device master-data endpoint.
    path("devices", DeviceListView.as_view(), name="devices-list"),
    # Aggregated, chart-ready telemetry endpoint.
    path("telemetry/timeseries", TelemetryTimeseriesView.as_view(), name="telemetry-timeseries"),
    # Raw telemetry endpoint with filtering/sorting/pagination.
    path("telemetry/raw", RawTelemetryView.as_view(), name="telemetry-raw"),
]
