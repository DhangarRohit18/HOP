from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional


def calculate_usable_inventory(quantity_on_hand: Decimal, quantity_reserved: Decimal) -> Decimal:
    """usable_inventory = max(0, quantity_on_hand - quantity_reserved)"""
    avail = quantity_on_hand - quantity_reserved
    return max(Decimal("0.0000"), avail)


def calculate_coverage_days(usable_inventory: Decimal, average_daily_demand: Decimal) -> float:
    """
    coverage_days = usable_inventory / average_daily_demand
    Returns float('inf') if average_daily_demand <= 0.
    """
    if average_daily_demand <= Decimal("0.0000"):
        return float("inf")
    days = usable_inventory / average_daily_demand
    return float(days)


def calculate_stockout_timestamp(effective_at: datetime, coverage_days: float) -> Optional[datetime]:
    """
    stockout_timestamp = effective_at + timedelta(days=coverage_days)
    Returns None if coverage_days is infinite.
    Derived analysis metric; never stored in PostgreSQL.
    """
    if coverage_days == float("inf"):
        return None
    return effective_at + timedelta(days=coverage_days)


def calculate_material_deficit(
    quantity_required: Decimal,
    quantity_issued: Decimal,
    usable_inventory: Decimal,
) -> Decimal:
    """
    remaining_requirement = max(0, quantity_required - quantity_issued)
    usable_inventory = max(0, available_inventory)
    material_deficit = max(0, remaining_requirement - usable_inventory)
    """
    remaining_requirement = max(Decimal("0.0000"), quantity_required - quantity_issued)
    usable = max(Decimal("0.0000"), usable_inventory)
    deficit = remaining_requirement - usable
    return max(Decimal("0.0000"), deficit)


def calculate_production_delay_days(
    material_deficit: Decimal,
    disruption_duration_hours: float,
    coverage_days: float,
) -> float:
    """
    Determines production delay:
    - If material_deficit == 0, returns 0.0.
    - If material_deficit > 0, stoppage occurs after coverage_days.
      production_delay_days = max(0.0, (disruption_duration_hours - (coverage_days * 24.0)) / 24.0)
    """
    if material_deficit <= Decimal("0.0000"):
        return 0.0

    if coverage_days == float("inf"):
        return 0.0

    coverage_hours = coverage_days * 24.0
    if disruption_duration_hours <= coverage_hours:
        return 0.0

    delay_hours = disruption_duration_hours - coverage_hours
    delay_days = delay_hours / 24.0
    return max(0.0, delay_days)


def calculate_estimated_completion_date(target_completion_date: date, delay_days: float) -> date:
    """estimated_completion_date = target_completion_date + timedelta(days=ceil(delay_days))"""
    if delay_days <= 0.0:
        return target_completion_date
    added_days = int(Decimal(str(delay_days)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return target_completion_date + timedelta(days=added_days)


def calculate_sla_delay_days(estimated_completion_date: date, requested_delivery_date: date) -> float:
    """sla_delay_days = max(0.0, (estimated_completion_date - requested_delivery_date).days)"""
    delta = (estimated_completion_date - requested_delivery_date).days
    return max(0.0, float(delta))


def calculate_financial_exposure(
    sla_delay_days: float,
    liquidated_damages_per_day: Decimal,
) -> Decimal:
    """
    financial_exposure = sla_delay_days * liquidated_damages_per_day
    Note: liquidated_damages_per_day is a seeded ground-truth rate.
    financial_exposure is a dynamically derived value.
    """
    if sla_delay_days <= 0.0 or liquidated_damages_per_day <= Decimal("0.00"):
        return Decimal("0.00")
    
    exposure = Decimal(str(sla_delay_days)) * liquidated_damages_per_day
    return exposure.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
