import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import calendar
from datetime import datetime
from utils.trigger_matcher import matches_trigger


# ─── None / manual ────────────────────────────────────────────────────────────

def test_none_trigger_returns_false():
    assert matches_trigger(None) is False

def test_empty_dict_returns_false():
    assert matches_trigger({}) is False

def test_manual_trigger_returns_false():
    assert matches_trigger({"type": "manual"}) is False

def test_manual_trigger_with_extra_keys_returns_false():
    assert matches_trigger({"type": "manual", "days": [0, 1, 2]}) is False


# ─── project ──────────────────────────────────────────────────────────────────

def test_project_trigger_returns_false():
    assert matches_trigger({"type": "project", "project_id": 42}) is False


# ─── day_of_week ──────────────────────────────────────────────────────────────

def test_day_of_week_match():
    # datetime(2025, 2, 24) is a Monday = 0
    monday = datetime(2025, 2, 24, 10, 0, 0)
    assert matches_trigger({"type": "day_of_week", "days": [0]}, now=monday) is True

def test_day_of_week_no_match():
    monday = datetime(2025, 2, 24, 10, 0, 0)
    assert matches_trigger({"type": "day_of_week", "days": [1, 2, 3]}, now=monday) is False

def test_day_of_week_sunday():
    # datetime(2025, 3, 2) is a Sunday = 6
    sunday = datetime(2025, 3, 2, 10, 0, 0)
    assert matches_trigger({"type": "day_of_week", "days": [6]}, now=sunday) is True

def test_day_of_week_multiple_days():
    wednesday = datetime(2025, 2, 26, 10, 0, 0)  # Wednesday = 2
    assert matches_trigger({"type": "day_of_week", "days": [1, 2, 3]}, now=wednesday) is True

def test_day_of_week_empty_days_returns_false():
    monday = datetime(2025, 2, 24, 10, 0, 0)
    assert matches_trigger({"type": "day_of_week", "days": []}, now=monday) is False


# ─── time_of_day — morning ────────────────────────────────────────────────────

def test_time_of_day_morning_at_5():
    t = datetime(2025, 2, 24, 5, 0, 0)
    assert matches_trigger({"type": "time_of_day", "time": "morning"}, now=t) is True

def test_time_of_day_morning_at_9():
    t = datetime(2025, 2, 24, 9, 30, 0)
    assert matches_trigger({"type": "time_of_day", "time": "morning"}, now=t) is True

def test_time_of_day_morning_at_11():
    t = datetime(2025, 2, 24, 11, 59, 59)
    assert matches_trigger({"type": "time_of_day", "time": "morning"}, now=t) is True

def test_time_of_day_morning_at_4_returns_false():
    t = datetime(2025, 2, 24, 4, 59, 59)
    assert matches_trigger({"type": "time_of_day", "time": "morning"}, now=t) is False

def test_time_of_day_morning_at_noon_returns_false():
    t = datetime(2025, 2, 24, 12, 0, 0)
    assert matches_trigger({"type": "time_of_day", "time": "morning"}, now=t) is False


# ─── time_of_day — evening ────────────────────────────────────────────────────

def test_time_of_day_evening_at_17():
    t = datetime(2025, 2, 24, 17, 0, 0)
    assert matches_trigger({"type": "time_of_day", "time": "evening"}, now=t) is True

def test_time_of_day_evening_at_20():
    t = datetime(2025, 2, 24, 20, 0, 0)
    assert matches_trigger({"type": "time_of_day", "time": "evening"}, now=t) is True

def test_time_of_day_evening_at_22():
    t = datetime(2025, 2, 24, 22, 59, 59)
    assert matches_trigger({"type": "time_of_day", "time": "evening"}, now=t) is True

def test_time_of_day_evening_at_16_returns_false():
    t = datetime(2025, 2, 24, 16, 59, 59)
    assert matches_trigger({"type": "time_of_day", "time": "evening"}, now=t) is False

def test_time_of_day_evening_at_23_returns_false():
    t = datetime(2025, 2, 24, 23, 0, 0)
    assert matches_trigger({"type": "time_of_day", "time": "evening"}, now=t) is False

def test_time_of_day_invalid_time_returns_false():
    t = datetime(2025, 2, 24, 10, 0, 0)
    assert matches_trigger({"type": "time_of_day", "time": "afternoon"}, now=t) is False


# ─── date_pattern — first_of_month ────────────────────────────────────────────

def test_date_pattern_first_of_month_matches():
    t = datetime(2025, 2, 1, 10, 0, 0)
    assert matches_trigger({"type": "date_pattern", "date_pattern": "first_of_month"}, now=t) is True

def test_date_pattern_first_of_month_no_match():
    t = datetime(2025, 2, 2, 10, 0, 0)
    assert matches_trigger({"type": "date_pattern", "date_pattern": "first_of_month"}, now=t) is False

def test_date_pattern_first_of_month_december():
    t = datetime(2025, 12, 1, 10, 0, 0)
    assert matches_trigger({"type": "date_pattern", "date_pattern": "first_of_month"}, now=t) is True


# ─── date_pattern — last_of_month ─────────────────────────────────────────────

def test_date_pattern_last_of_month_january():
    t = datetime(2025, 1, 31, 10, 0, 0)
    assert matches_trigger({"type": "date_pattern", "date_pattern": "last_of_month"}, now=t) is True

def test_date_pattern_last_of_month_february_non_leap():
    t = datetime(2025, 2, 28, 10, 0, 0)
    assert matches_trigger({"type": "date_pattern", "date_pattern": "last_of_month"}, now=t) is True

def test_date_pattern_last_of_month_february_leap():
    t = datetime(2024, 2, 29, 10, 0, 0)
    assert matches_trigger({"type": "date_pattern", "date_pattern": "last_of_month"}, now=t) is True

def test_date_pattern_last_of_month_not_last():
    t = datetime(2025, 1, 30, 10, 0, 0)
    assert matches_trigger({"type": "date_pattern", "date_pattern": "last_of_month"}, now=t) is False

def test_date_pattern_invalid_pattern_returns_false():
    t = datetime(2025, 2, 15, 10, 0, 0)
    assert matches_trigger({"type": "date_pattern", "date_pattern": "every_friday"}, now=t) is False


# ─── Unknown type ─────────────────────────────────────────────────────────────

def test_unknown_trigger_type_returns_false():
    t = datetime(2025, 2, 24, 10, 0, 0)
    assert matches_trigger({"type": "something_new"}, now=t) is False


# ─── Uses current time when now is not provided ───────────────────────────────

def test_matches_trigger_uses_current_time_by_default():
    # Just verify it doesn't raise and returns a bool
    result = matches_trigger({"type": "day_of_week", "days": list(range(7))})
    assert result is True  # all days match, so always True