import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.routes import dashboard


def test_fetch_query_reads_multiple_pages():
    rows = [{"id": i} for i in range(dashboard.FETCH_PAGE_SIZE + 1)]
    ranges = []

    class Query:
        def range(self, start, end):
            ranges.append((start, end))
            self.start = start
            self.end = end
            return self

        def execute(self):
            return SimpleNamespace(data=rows[self.start:self.end + 1])

    result = dashboard._fetch_query(Query)

    assert result == rows
    assert ranges == [
        (0, dashboard.FETCH_PAGE_SIZE - 1),
        (dashboard.FETCH_PAGE_SIZE, dashboard.FETCH_PAGE_SIZE * 2 - 1),
    ]


def test_upload_totals_use_all_history_rows():
    rows = [
        {"total_rows": 10, "inserted": 8},
        {"total_rows": 20, "inserted": 18},
        {"inserted": 5},
    ]

    class Query:
        def select(self, *_args, **_kwargs):
            return self

        def range(self, start, end):
            self.start = start
            self.end = end
            return self

        def execute(self):
            return SimpleNamespace(data=rows[self.start:self.end + 1])

    class Client:
        def table(self, name):
            assert name == "upload_history"
            return Query()

    assert dashboard._upload_totals(Client()) == (3, 35)


def test_expiry_buckets_group_units_by_days_left():
    from datetime import date

    today = date(2026, 10, 26)
    rows = [
        {"expiry_date": "2026-10-20"},   # already past
        {"expiry_date": "2026-10-26"},   # today -> 0-3d
        {"expiry_date": "2026-10-29"},   # 3 days -> 0-3d
        {"expiry_date": "2026-10-30"},   # 4 days -> 4-7d
        {"expiry_date": "2026-11-09"},   # 14 days -> 8-14d
        {"expiry_date": "2026-11-25"},   # 30 days -> 15-30d
        {"expiry_date": "2027-01-01"},   # 31+ days
        {"expiry_date": None},           # ignored
    ]

    buckets = dashboard._expiry_buckets(rows, today)

    assert [(b["label"], b["units"]) for b in buckets] == [
        ("Past due", 1),
        ("0–3 days", 2),
        ("4–7 days", 1),
        ("8–14 days", 1),
        ("15–30 days", 1),
        ("31+ days", 1),
    ]


def test_group_component_matrix_counts_units():
    rows = [
        {"blood_group": "O Pos", "component": "PLT"},
        {"blood_group": "O Pos", "component": "PLT"},
        {"blood_group": "O Pos", "component": "FFP"},
        {"blood_group": "A Neg", "component": "WB/PRC"},
    ]

    assert dashboard._group_component_matrix(rows) == {
        "O Pos": {"PLT": 2, "FFP": 1},
        "A Neg": {"WB/PRC": 1},
    }


def test_allocation_summary_reports_fulfilment_and_status_counts():
    rows = [
        {"units_requested": 4, "units_fulfilled": 4, "status": "fulfilled"},
        {"units_requested": 6, "units_fulfilled": 3, "status": "partial"},
        {"units_requested": 2, "units_fulfilled": 0, "status": "unmet"},
    ]

    summary = dashboard._allocation_summary(rows)

    assert summary["total_requested"] == 12
    assert summary["total_fulfilled"] == 7
    assert summary["fulfillment_rate"] == 58.3
    assert summary["by_status"] == {"fulfilled": 1, "partial": 1, "unmet": 1}


def test_allocation_summary_handles_no_rows():
    assert dashboard._allocation_summary([]) == {
        "total_requested": 0,
        "total_fulfilled": 0,
        "fulfillment_rate": 0,
        "by_status": {},
    }
