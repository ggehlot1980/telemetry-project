from django.db import models

from apps.telemetry.models.device import Device


class TelemetryAggregateBase(models.Model):
    """Shared schema for all unmanaged telemetry aggregate tables."""

    device = models.ForeignKey(Device, on_delete=models.DO_NOTHING, db_column="device_id")
    metric_name = models.TextField()
    bucket = models.DateTimeField(primary_key=True)
    count = models.BigIntegerField()
    sum_val = models.FloatField(blank=True, null=True)
    min_val = models.FloatField(blank=True, null=True)
    max_val = models.FloatField(blank=True, null=True)
    avg_val = models.FloatField(blank=True, null=True)

    class Meta:
        abstract = True
        managed = False


class TelemetryAggHourly(TelemetryAggregateBase):
    """Hourly rollups."""

    class Meta:
        managed = False
        db_table = "telemetry_agg_hourly"


class TelemetryAggDaily(TelemetryAggregateBase):
    """Daily rollups."""

    class Meta:
        managed = False
        db_table = "telemetry_agg_daily"


class TelemetryAggWeekly(TelemetryAggregateBase):
    """Weekly rollups."""

    class Meta:
        managed = False
        db_table = "telemetry_agg_weekly"


class TelemetryAggMonthly(TelemetryAggregateBase):
    """Monthly rollups."""

    class Meta:
        managed = False
        db_table = "telemetry_agg_monthly"
