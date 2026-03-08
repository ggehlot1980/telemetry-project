from django.db import models


class Device(models.Model):
    device_id = models.BigIntegerField(primary_key=True)
    device_name = models.TextField(blank=True, null=True)
    device_type = models.TextField(blank=True, null=True)
    tags = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "devices"
