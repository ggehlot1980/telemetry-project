import json
from typing import Any, Optional

import redis
from django.conf import settings


class RedisCacheClient:
    def __init__(self) -> None:
        self._client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        self._ttl = settings.CACHE_TTL_SECONDS

    def get_json(self, key: str) -> Optional[dict[str, Any]]:
        payload = self._client.get(key)
        if not payload:
            return None
        return json.loads(payload)

    def set_json(self, key: str, value: dict[str, Any], ttl_seconds: Optional[int] = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self._ttl
        self._client.setex(key, ttl, json.dumps(value, default=str))

    @staticmethod
    def build_timeseries_key(device_id: int, start_iso: str, end_iso: str) -> str:
        return f"telemetry:timeseries:{device_id}:{start_iso}:{end_iso}"
