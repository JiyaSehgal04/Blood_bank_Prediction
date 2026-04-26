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
