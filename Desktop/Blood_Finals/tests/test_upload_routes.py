import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.app import create_app
from api.routes import upload
from db import initial_load


def test_upload_route_is_owned_by_upload_blueprint():
    app = create_app()
    upload_rules = [r for r in app.url_map.iter_rules() if r.rule == "/api/upload"]

    assert len(upload_rules) == 1
    assert upload_rules[0].endpoint == "upload.upload_file"


def test_upload_upsert_ignores_duplicates():
    query = MagicMock()
    query.execute.return_value = SimpleNamespace(data=[{"unit_id": "new-unit"}])

    table = MagicMock()
    table.upsert.return_value = query

    client = MagicMock()
    client.table.return_value = table

    inserted, errors = upload._upsert(client, [{"sno": "1"}], "batch_1")

    assert inserted == 1
    assert errors == 0
    table.upsert.assert_called_once_with(
        [{"sno": "1", "upload_batch_id": "batch_1"}],
        on_conflict="sno,segment_no,component",
        ignore_duplicates=True,
    )


def test_bulk_load_upsert_ignores_duplicates():
    query = MagicMock()
    query.execute.return_value = SimpleNamespace(data=[])

    table = MagicMock()
    table.upsert.return_value = query

    client = MagicMock()
    client.table.return_value = table

    inserted, errors = initial_load.upsert_batch(client, [{"sno": "1"}])

    assert inserted == 0
    assert errors == 0
    table.upsert.assert_called_once_with(
        [{"sno": "1"}],
        on_conflict="sno,segment_no,component",
        ignore_duplicates=True,
    )
