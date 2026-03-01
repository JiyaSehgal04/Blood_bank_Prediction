import os
from pathlib import Path

# Default to SQLite so the app runs without PostgreSQL. Set DATABASE_URL to
# postgresql+psycopg2://user:pass@host:5432/bloodbank (and install psycopg2-binary) for Postgres.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./bloodbank.db"
)

TODAY_OVERRIDE = os.getenv("TODAY_OVERRIDE")  # optional: "2026-02-28"

# Default inventory Excel (used when no file is uploaded). Override with INVENTORY_EXCEL_PATH.
_APP_DIR = Path(__file__).resolve().parent
DEFAULT_EXCEL_PATH = os.getenv(
    "INVENTORY_EXCEL_PATH",
    str(_APP_DIR / "register_to_excel_updated_option2.xlsx")
)