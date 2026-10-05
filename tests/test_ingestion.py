from datetime import date

from research.providers.fred import FredSeries
from scripts.ingest_fred import incremental_start
from scripts.ingest_market import incremental_start as market_incremental_start


ITEM = FredSeries("TEST", "Test Series", "Test", "Daily", "Index")


def test_incomplete_legacy_series_forces_full_repair():
    state = {"latest": date(2026, 10, 1), "full_history_complete": False}
    start, full_history = incremental_start(ITEM, state, None)
    assert start is None
    assert full_history is True


def test_complete_series_uses_incremental_overlap():
    state = {"latest": date(2026, 10, 1), "full_history_complete": True}
    start, full_history = incremental_start(ITEM, state, None)
    assert start == "2026-09-17"
    assert full_history is False


def test_explicit_since_takes_precedence():
    state = {"latest": date(2026, 10, 1), "full_history_complete": False}
    start, full_history = incremental_start(ITEM, state, "2025-01-01")
    assert start == "2025-01-01"
    assert full_history is False


def test_market_incremental_overlap_is_idempotent():
    state = {"latest": date(2026, 10, 1), "full_history_complete": True}
    start, full_history = market_incremental_start(state, None)
    assert start == date(2026, 9, 17)
    assert full_history is False
