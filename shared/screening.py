"""Screening-result helpers shared by stock counting, alerts and allocation."""

from typing import Mapping

SCREENING_TESTS = ("hiv", "hbsag", "hcv", "malaria", "vdrl")
SCREENING_COLUMNS = ",".join(SCREENING_TESTS)


def is_screening_positive(row: Mapping) -> bool:
    """True if any transfusion-transmissible-infection test on the unit is positive."""
    return any(str(row.get(test) or "").strip().lower() == "pos" for test in SCREENING_TESTS)
