from rest_framework import serializers


class RawTelemetryQuerySerializer(serializers.Serializer):
    device_id = serializers.IntegerField(required=False)
    start_time = serializers.DateTimeField(required=True)
    end_time = serializers.DateTimeField(required=True)

    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=500, default=50)

    sort_by = serializers.ChoiceField(
        required=False,
        choices=["device_name", "metric_name", "metric_value", "timestamp"],
        default="timestamp",
    )
    sort_dir = serializers.ChoiceField(required=False, choices=["asc", "desc"], default="desc")

    metric_name = serializers.ChoiceField(
        required=False, choices=["cpu_usage", "temperature", "battery_level"]
    )
    device_name = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        if attrs["start_time"] >= attrs["end_time"]:
            raise serializers.ValidationError("start_time must be before end_time.")
        return attrs
