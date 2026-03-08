from rest_framework import serializers

from apps.telemetry.models import Device


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for exposing device metadata to the frontend."""

    class Meta:
        model = Device
        fields = ["device_id", "device_name", "device_type", "tags", "created_at", "updated_at"]
