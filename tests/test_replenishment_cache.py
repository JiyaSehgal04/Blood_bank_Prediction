import sys
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.replenishment_cache import ReplenishmentCache


class Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def _cache(compute, ttl=60.0, clock=None):
    return ReplenishmentCache(compute=compute, ttl=ttl, clock=clock or Clock())


def test_first_get_computes_once_and_serves_from_cache():
    calls = []

    def compute():
        calls.append(1)
        return [{"blood_group": "O Pos"}]

    cache = _cache(compute)

    assert cache.get() == [{"blood_group": "O Pos"}]
    assert cache.get() == [{"blood_group": "O Pos"}]
    assert len(calls) == 1


def test_concurrent_cold_gets_share_one_computation():
    calls = []
    release = threading.Event()

    def compute():
        calls.append(1)
        release.wait(timeout=5)
        return ["plan"]

    cache = _cache(compute)
    results = []
    threads = [threading.Thread(target=lambda: results.append(cache.get())) for _ in range(4)]
    for t in threads:
        t.start()
    release.set()
    for t in threads:
        t.join(timeout=5)

    assert results == [["plan"]] * 4
    assert len(calls) == 1


def test_stale_entry_is_served_immediately_and_refreshed_in_background():
    clock = Clock()
    values = iter([["old"], ["new"]])
    cache = _cache(lambda: next(values), ttl=60, clock=clock)

    assert cache.get() == ["old"]
    clock.now += 61

    assert cache.get() == ["old"]          # stale data returned without waiting
    cache.wait_for_refresh()
    assert cache.get() == ["new"]


def test_invalidate_keeps_old_data_but_refreshes():
    release = threading.Event()
    values = iter([["a"], ["b"]])

    def compute():
        result = next(values)
        if result == ["b"]:
            release.wait(timeout=5)  # hold the background refresh open
        return result

    cache = _cache(compute)
    assert cache.get() == ["a"]

    cache.invalidate()
    assert cache.get() == ["a"]            # old plan still served while refreshing

    release.set()
    cache.wait_for_refresh()
    assert cache.get() == ["b"]


def test_failed_refresh_keeps_last_good_data():
    clock = Clock()
    state = {"fail": False}

    def compute():
        if state["fail"]:
            raise RuntimeError("db down")
        return ["good"]

    cache = _cache(compute, ttl=60, clock=clock)
    assert cache.get() == ["good"]

    state["fail"] = True
    clock.now += 61
    assert cache.get() == ["good"]
    cache.wait_for_refresh()
    assert cache.get() == ["good"]


def test_cold_failure_propagates():
    def compute():
        raise RuntimeError("boom")

    cache = _cache(compute)
    try:
        cache.get()
    except RuntimeError:
        return
    raise AssertionError("expected RuntimeError")
