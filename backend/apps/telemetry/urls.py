from django.urls import path

from apps.telemetry.views.device_view import DeviceListView
from apps.telemetry.views.raw_view import RawTelemetryView
from apps.telemetry.views.timeseries_view import TelemetryTimeseriesView


urlpatterns = [
    path("devices", DeviceListView.as_view(), name="devices-list"),
    path("telemetry/timeseries", TelemetryTimeseriesView.as_view(), name="telemetry-timeseries"),
    path("telemetry/raw", RawTelemetryView.as_view(), name="telemetry-raw"),
]
