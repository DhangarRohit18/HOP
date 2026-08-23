import uuid
from datetime import date, datetime, timezone, timedelta

SEED = 42
NAMESPACE_NEXUS = uuid.UUID("a3b4c5d6-e7f8-4901-8234-56789abcdef0")
BASELINE_DATE = date(2026, 8, 1)


def make_nexus_uuid(entity_type: str, business_code: str) -> uuid.UUID:
    """
    Generates a deterministic UUID5 derived from NAMESPACE_NEXUS and the string key '{entity_type}:{business_code}'.
    """
    key = f"{entity_type.upper()}:{business_code}"
    return uuid.uuid5(NAMESPACE_NEXUS, key)


def make_nexus_date(days_offset: int) -> date:
    """
    Generates a deterministic Date object offset relative to BASELINE_DATE (2026-08-01).
    """
    return BASELINE_DATE + timedelta(days=days_offset)


def make_nexus_datetime(days_offset: int, hour: int = 12, minute: int = 0) -> datetime:
    """
    Generates a deterministic UTC Datetime object offset relative to BASELINE_DATE (2026-08-01).
    """
    dt = datetime(2026, 8, 1, hour, minute, tzinfo=timezone.utc)
    return dt + timedelta(days=days_offset)
