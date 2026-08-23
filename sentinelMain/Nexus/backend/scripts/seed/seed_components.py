from decimal import Decimal
from typing import List, Tuple
from app.models.core import Resource
from app.models.manufacturing import Component
from scripts.seed.constants import make_nexus_uuid, make_nexus_datetime


def generate_components() -> Tuple[List[Resource], List[Component]]:
    # 36 Component definitions
    components_data = [
        ("CMP-001", "Automotive 32-bit MCU", "SEMICONDUCTOR", "125.0000", 45, True),
        ("CMP-002", "SMT Power PCBA Assembly", "ELECTRONICS", "85.0000", 20, False),
        ("CMP-003", "Aluminum Enclosure Casing", "STRUCTURAL", "45.0000", 14, False),
        ("CMP-004", "Lithium-Ion 2170 Cell", "BATTERY_CELL", "4.5000", 21, False),
        ("CMP-005", "High-Voltage Wiring Harness", "HARNESS", "65.0000", 10, False),
        ("CMP-006", "Current & Thermal Sensor Array", "SENSOR", "32.0000", 12, False),
        ("CMP-007", "Die-Cast Heat Sink", "THERMAL", "28.0000", 15, False),
        ("CMP-008", "Control Logic Board", "ELECTRONICS", "75.0000", 18, False),
        ("CMP-009", "High-Voltage Inverter Capacitor", "ELECTRONICS", "18.0000", 30, True),
        ("CMP-010", "Raw Copper Busbar", "RAW_MATERIAL", "12.0000", 25, False),
        ("CMP-011", "Liquid Cooling Plate", "THERMAL", "55.0000", 14, False),
        ("CMP-012", "Optical Sensor Module", "OPTRONICS", "42.0000", 16, False),
    ]

    # Generate remaining 24 standard hardware & passive components (CMP-013 .. CMP-036)
    for i in range(13, 37):
        code = f"CMP-{i:03d}"
        category = "HARDWARE" if i % 2 == 0 else "PASSIVE"
        cost = f"{(i * 1.25):.4f}"
        lead = 5 + (i % 7)
        components_data.append((code, f"Standard Component Part {i:02d}", category, cost, lead, False))

    resources: List[Resource] = []
    components: List[Component] = []

    for code, name, category, cost, lead_time, single_sourced in components_data:
        res_id = make_nexus_uuid("RESOURCE", f"COMPONENT:{code}")
        comp_id = make_nexus_uuid("COMPONENT", code)
        created_dt = make_nexus_datetime(-365)

        # Reference first supplier entity or dummy entity link
        supp_entity_id = make_nexus_uuid("ENTITY", f"SUPPLIER:SUP-001") if single_sourced else make_nexus_uuid("ENTITY", f"SUPPLIER:SUP-002")

        resource = Resource(
            id=res_id,
            entity_id=supp_entity_id,
            resource_code=f"RES-{code}",
            name=f"{name} Inventory Resource",
            resource_type="INVENTORY_ITEM",
            capacity_total=Decimal("100000.0000"),
            capacity_available=Decimal("80000.0000"),
            unit_of_measure="UNITS",
            created_at=created_dt,
            updated_at=created_dt,
        )
        component = Component(
            id=comp_id,
            resource_id=res_id,
            part_number=code,
            name=name,
            category=category,
            unit_cost=Decimal(cost),
            lead_time_days=lead_time,
            is_single_sourced=single_sourced,
            created_at=created_dt,
            updated_at=created_dt,
        )
        resources.append(resource)
        components.append(component)

    return resources, components
