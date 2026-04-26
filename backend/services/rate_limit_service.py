from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from backend.core.config import get_settings


class SlidingWindowRateLimiter:
    def __init__(self, *, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            return len(bucket) < self.max_requests

    def add_failure(self, key: str) -> None:
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            bucket.append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)


settings = get_settings()
login_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.login_max_attempts,
    window_seconds=settings.login_window_seconds,
)
credential_change_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.login_max_attempts,
    window_seconds=settings.login_window_seconds,
)
