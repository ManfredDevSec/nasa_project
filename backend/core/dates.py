"""Date helpers shared by every app (docs/02 §3.2)."""


def mission_day(start_date, on_date):
    """Mission day number for `on_date`. Day 1 = start_date; pre-flight dates give 0 or less.

    >>> from datetime import date
    >>> mission_day(date(2026, 8, 15), date(2026, 8, 15))
    1
    >>> mission_day(date(2026, 8, 15), date(2026, 11, 14))
    92
    """
    return (on_date - start_date).days + 1
