"""Stale-while-revalidate cache for slow, shared computations (replenishment plan, forecast status).

Building the plan re-reads the database and re-runs the forecast models for every
blood component, which takes ~20 seconds. This cache lets every caller share one
computation, serves the previous result instantly while a fresh one is built in the
background, and keeps the last good result if a refresh fails.
"""

import threading
import time
from typing import Any, Callable, Optional


class ReplenishmentCache:
    def __init__(
        self,
        compute: Callable[[], Any],
        ttl: float = 600.0,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._compute = compute
        self._ttl = ttl
        self._clock = clock
        self._lock = threading.Lock()          # guards the fields below
        self._compute_lock = threading.Lock()  # serialises computations
        self._data: Optional[Any] = None
        self._fetched_at = 0.0
        self._refresh_thread: Optional[threading.Thread] = None

    def get(self) -> Any:
        """Return the plan; computes synchronously only when nothing is cached yet."""
        with self._lock:
            data, fresh = self._data, self._is_fresh()
        if data is None:
            return self._refresh_blocking()
        if not fresh:
            self._refresh_in_background()
        return data

    def invalidate(self) -> None:
        """Mark the cached plan stale (it is still served) and rebuild it in the background."""
        with self._lock:
            self._fetched_at = 0.0
            has_data = self._data is not None
        if has_data:
            self._refresh_in_background()

    def wait_for_refresh(self, timeout: float = 5.0) -> None:
        thread = self._refresh_thread
        if thread is not None:
            thread.join(timeout)

    # -- internals -----------------------------------------------------------

    def _is_fresh(self) -> bool:
        return self._data is not None and (self._clock() - self._fetched_at) < self._ttl

    def _refresh_blocking(self) -> Any:
        with self._compute_lock:
            with self._lock:
                if self._data is not None and self._is_fresh():
                    return self._data  # another caller finished while we waited
            result = self._compute()
            with self._lock:
                self._data, self._fetched_at = result, self._clock()
            return result

    def _refresh_in_background(self) -> None:
        with self._lock:
            if self._refresh_thread is not None and self._refresh_thread.is_alive():
                return
            thread = threading.Thread(target=self._safe_refresh, daemon=True)
            self._refresh_thread = thread
        thread.start()

    def _safe_refresh(self) -> None:
        try:
            with self._compute_lock:
                result = self._compute()
            with self._lock:
                self._data, self._fetched_at = result, self._clock()
        except Exception:
            pass  # keep serving the last good plan
