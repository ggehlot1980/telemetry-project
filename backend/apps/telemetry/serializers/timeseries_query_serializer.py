from rest_framework import serializers


class TimeseriesQuerySerializer(serializers.Serializer):
    """Validates required parameters for aggregate timeseries requests."""

    device_id = serializers.IntegerField(required=True)
    start_time = serializers.DateTimeField(required=True)
    end_time = serializers.DateTimeField(required=True)

    def validate(self, attrs):
        # Router/repository assume strictly increasing interval bounds.
        if attrs["start_time"] >= attrs["end_time"]:
            raise serializers.ValidationError("start_time must be before end_time.")
        return attrs
