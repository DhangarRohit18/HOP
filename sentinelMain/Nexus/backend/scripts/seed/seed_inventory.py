from decimal import Decimal
from typing import List
from app.models.manufacturing import InventoryPosition, Warehouse, Component
from scripts.seed.constants import make_nexus_uuid, make_nexus_datetime


def generate_inventory(warehouses: List[Warehouse], components: List[Component]) -> List[InventoryPosition]:
    inventory_positions: List[InventoryPosition] = []

    # 5 warehouses x first 24 components = 120 inventory positions
    for wh in warehouses:
        for comp in components[:24]:
            inv_id = make_nexus_uuid("INVENTORY", f"{wh.warehouse_code}:{comp.part_number}")
            created_dt = make_nexus_datetime(-180)

            # V3 Vulnerability: CMP-001 at WH-001 (Plant 1)
            if wh.warehouse_code == "WH-001" and comp.part_number == "CMP-001":
                on_hand = Decimal("800.0000")
                reserved = Decimal("600.0000")
                safety = Decimal("500.0000")
                reorder = Decimal("1000.0000")
                demand = Decimal("150.0000")
            elif comp.part_number in ["CMP-001", "CMP-009"]:
                # Single-sourced components in other warehouses - low stock
                on_hand = Decimal("1200.0000")
                reserved = Decimal("800.0000")
                safety = Decimal("600.0000")
                reorder = Decimal("1500.0000")
                demand = Decimal("100.0000")
            elif comp.part_number == "CMP-004":
                # High consumption lithium cells
                on_hand = Decimal("15000.0000")
                reserved = Decimal("11000.0000")
                safety = Decimal("8000.0000")
                reorder = Decimal("20000.0000")
                demand = Decimal("1200.0000")
            else:
                # Standard inventory levels
                on_hand = Decimal("5000.0000")
                reserved = Decimal("2000.0000")
                safety = Decimal("1500.0000")
                reorder = Decimal("4000.0000")
                demand = Decimal("250.0000")

            inv = InventoryPosition(
                id=inv_id,
                warehouse_id=wh.id,
                component_id=comp.id,
                quantity_on_hand=on_hand,
                quantity_reserved=reserved,
                safety_stock_level=safety,
                reorder_point=reorder,
                average_daily_demand=demand,
                created_at=created_dt,
                updated_at=created_dt,
            )
            inventory_positions.append(inv)

    return inventory_positions
