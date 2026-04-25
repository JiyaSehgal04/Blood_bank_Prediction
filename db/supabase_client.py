"""
db/supabase_client.py
Supabase client singleton — reads credentials from .env
"""

import os
import sys
from pathlib import Path
from typing import Optional

# Load .env from project root (works regardless of where script is run from)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass  # fall back to existing env vars

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase package not installed. Run: pip3 install supabase")
    sys.exit(1)

_client: "Optional[Client]" = None


def get_client() -> "Client":
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_KEY", "")
        if not url or not key:
            print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env")
            sys.exit(1)
        _client = create_client(url, key)
    return _client
