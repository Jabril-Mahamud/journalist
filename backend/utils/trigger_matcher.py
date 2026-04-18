"""
Utility for matching template trigger conditions against the current datetime.
Used by the /templates/suggestions endpoint to determine which templates to
auto-suggest when a user opens the new entry dialog.
"""

import calendar
from datetime import datetime, timezone
from typing import Optional


def matches_trigger(trigger_conditions: Optional[dict], now: Optional[datetime] = None) -> bool:
    """
    Returns True if the given trigger conditions match the current datetime.

    Trigger condition types:
      - None or {"type": "manual"}
          → always False (never auto-trigger)
      - {"type": "day_of_week", "days": [0..6]}
          → True if today's weekday is in days (Monday=0, Sunday=6)
      - {"type": "time_of_day", "time": "morning"}
          → True if current hour is 5–11 (inclusive)
      - {"type": "time_of_day", "time": "evening"}
          → True if current hour is 17–22 (inclusive)
      - {"type": "date_pattern", "date_pattern": "first_of_month"}
          → True if today is the 1st of the month
      - {"type": "date_pattern", "date_pattern": "last_of_month"}
          → True if today is the last day of the month
      - {"type": "project"}
          → False (project matching is handled by the frontend, not time-based)
    """
    if now is None:
        now = datetime.now(timezone.utc)

    if not trigger_conditions:
        return False

    trigger_type = trigger_conditions.get("type", "manual")

    if trigger_type == "manual":
        return False

    if trigger_type == "project":
        return False

    if trigger_type == "day_of_week":
        days = trigger_conditions.get("days", [])
        # Python weekday(): Monday=0, Sunday=6 — matches our schema
        return now.weekday() in days

    if trigger_type == "time_of_day":
        time_of_day = trigger_conditions.get("time", "")
        hour = now.hour
        if time_of_day == "morning":
            return 5 <= hour <= 11
        if time_of_day == "evening":
            return 17 <= hour <= 22
        return False

    if trigger_type == "date_pattern":
        pattern = trigger_conditions.get("date_pattern", "")
        if pattern == "first_of_month":
            return now.day == 1
        if pattern == "last_of_month":
            last_day = calendar.monthrange(now.year, now.month)[1]
            return now.day == last_day
        return False

    return False