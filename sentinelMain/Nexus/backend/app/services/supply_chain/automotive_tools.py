import math
from typing import Dict, Any, List

def calculate_smart_reorder_quantity(
    available_stock: int,
    incoming_stock: int,
    daily_usage: int,
    lead_time_days: int,
    safety_stock: int,
    min_order_quantity: int = 100,
    pack_size: int = 50,
    supplier_reliability: float = 0.90
) -> Dict[str, Any]:
    """
    Authoritative deterministic smart order formula calculation.
    """
    forecast_demand = daily_usage * 7
    lead_time_demand = daily_usage * lead_time_days
    production_commitment = daily_usage * 4
    risk_buffer = math.ceil(daily_usage * 2) if supplier_reliability < 0.85 else 0

    raw_required = (
        forecast_demand
        + safety_stock
        + production_commitment
        + lead_time_demand
        + risk_buffer
        - available_stock
        - incoming_stock
    )

    recommended_qty = max(min_order_quantity, raw_required)
    recommended_qty = math.ceil(recommended_qty / pack_size) * pack_size

    return {
        "recommended_quantity": recommended_qty,
        "formula_breakdown": {
            "forecast_demand_7d": forecast_demand,
            "safety_stock": safety_stock,
            "lead_time_demand": lead_time_demand,
            "risk_buffer": risk_buffer,
            "available_stock": available_stock,
            "incoming_stock": incoming_stock
        }
    }

def calculate_vehicle_build_capacity(
    inventory_items: List[Dict[str, Any]],
    bom_requirements: Dict[str, int]
) -> Dict[str, Any]:
    """
    Calculates overall complete vehicle build capacity based on bottleneck component.
    """
    component_capacities = {}
    for part_id, req_per_car in bom_requirements.items():
        matching_item = next((i for i in inventory_items if i.get("part_id") == part_id), None)
        avail = matching_item.get("available_stock", 0) if matching_item else 0
        component_capacities[part_id] = avail // req_per_car if req_per_car > 0 else 0

    bottleneck_part = min(component_capacities, key=component_capacities.get)
    max_buildable_vehicles = component_capacities[bottleneck_part]

    return {
        "max_buildable_vehicles": max_buildable_vehicles,
        "bottleneck_part_id": bottleneck_part,
        "component_breakdown": component_capacities
    }
