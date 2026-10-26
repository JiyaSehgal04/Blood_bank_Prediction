"""In-memory stand-in for the Supabase client used by the data-layer tests.

It reproduces the one behaviour that matters most here: PostgREST returns at most
`max_rows` rows (1000 by default) unless the caller pages with .range().
"""

from types import SimpleNamespace
from typing import Any, Callable, Dict, List, Optional


class FakeQuery:
    def __init__(self, store: "FakeClient", table: str) -> None:
        self._store = store
        self._table = table
        self._filters: List[Callable[[dict], bool]] = []
        self._op = "select"
        self._payload: Any = None
        self._order: Optional[tuple] = None
        self._range: Optional[tuple] = None
        self._limit: Optional[int] = None
        self._count = False

    # -- builders ------------------------------------------------------------
    def select(self, *_args, count=None, **_kw):
        self._op, self._count = "select", bool(count)
        return self

    def update(self, values: dict):
        self._op, self._payload = "update", values
        return self

    def insert(self, rows):
        self._op, self._payload = "insert", rows
        return self

    def upsert(self, rows, **_kw):
        self._op, self._payload = "insert", rows
        return self

    def eq(self, col, val):
        self._filters.append(lambda r: r.get(col) == val)
        return self

    def neq(self, col, val):
        self._filters.append(lambda r: r.get(col) != val)
        return self

    def lt(self, col, val):
        self._filters.append(lambda r: r.get(col) is not None and str(r[col]) < str(val))
        return self

    def lte(self, col, val):
        self._filters.append(lambda r: r.get(col) is not None and str(r[col]) <= str(val))
        return self

    def gte(self, col, val):
        self._filters.append(lambda r: r.get(col) is not None and str(r[col]) >= str(val))
        return self

    def in_(self, col, values):
        allowed = set(values)
        self._filters.append(lambda r: r.get(col) in allowed)
        return self

    def order(self, col, desc=False):
        self._order = (col, desc)
        return self

    def range(self, start, end):
        self._range = (start, end)
        return self

    def limit(self, n):
        self._limit = n
        return self

    # -- execution -----------------------------------------------------------
    def execute(self):
        rows = self._store.tables.setdefault(self._table, [])
        self._store.calls.append((self._table, self._op, self._payload))
        if self._op == "insert":
            new = self._payload if isinstance(self._payload, list) else [self._payload]
            rows.extend(dict(r) for r in new)
            return SimpleNamespace(data=new, count=len(new))

        matched = [r for r in rows if all(f(r) for f in self._filters)]
        if self._op == "update":
            for r in matched:
                r.update(self._payload)
            return SimpleNamespace(data=matched, count=len(matched))

        if self._order:
            col, desc = self._order
            matched.sort(key=lambda r: str(r.get(col)), reverse=desc)
        total = len(matched)
        start, end = self._range if self._range else (0, self._store.max_rows - 1)
        page = matched[start : min(end + 1, start + self._store.max_rows)]
        if self._limit is not None:
            page = page[: self._limit]
        return SimpleNamespace(data=[dict(r) for r in page], count=total if self._count else None)


class FakeClient:
    def __init__(self, tables: Optional[Dict[str, List[dict]]] = None, max_rows: int = 1000) -> None:
        self.tables = tables or {}
        self.max_rows = max_rows
        self.calls: List[tuple] = []

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self, name)


def unit_row(i: int, *, group="O Pos", component="WB/PRC", expiry="2099-01-01", status="available", **extra) -> dict:
    row = {
        "unit_id": f"U{i:05d}",
        "sno": str(i),
        "unit_no": str(i),
        "segment_no": "1",
        "blood_group": group,
        "component": component,
        "quantity_ml": 300,
        "collection_date": "2026-01-01",
        "collection_time": "10:00",
        "expiry_date": expiry,
        "status": status,
    }
    row.update(extra)
    return row
