from django.db import models

from apps.telemetry.models.device import Device


class TelemetryRaw(models.Model):
    """Unmanaged mapping of raw telemetry events."""

    device = models.ForeignKey(Device, on_delete=models.DO_NOTHING, db_column="device_id")
    metric_name = models.TextField()
    metric_value = models.FloatField(blank=True, null=True)
    attributes = models.JSONField(blank=True, null=True)
    ts = models.DateTimeField(primary_key=True)

    class Meta:
        managed = False
        db_table = "telemetry_raw"
