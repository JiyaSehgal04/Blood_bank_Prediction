"""Test-suite defaults: admin credentials come from the environment, never from source."""

import pytest
from werkzeug.security import generate_password_hash

TEST_ADMIN_USERNAME = "admin"
TEST_ADMIN_PASSWORD = "bloodbank2026"  # test-only; production uses ADMIN_PASSWORD_HASH


@pytest.fixture(autouse=True)
def _admin_credentials(monkeypatch):
    monkeypatch.setenv("ADMIN_USERNAME", TEST_ADMIN_USERNAME)
    monkeypatch.setenv(
        "ADMIN_PASSWORD_HASH",
        generate_password_hash(TEST_ADMIN_PASSWORD, method="pbkdf2:sha256"),
    )


@pytest.fixture(autouse=True)
def _no_live_forecast_status(monkeypatch):
    """Route tests must never read the live database to assess forecast history."""
    from types import SimpleNamespace

    monkeypatch.setattr(
        "api.routes.predictions._FORECAST_STATUS",
        SimpleNamespace(get=lambda: {}, invalidate=lambda: None),
        raising=False,
    )
