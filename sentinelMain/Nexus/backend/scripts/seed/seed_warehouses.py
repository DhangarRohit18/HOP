from decimal import Decimal
from typing import List, Tuple
from app.models.core import Entity
from app.models.manufacturing import Warehouse
from scripts.seed.constants import make_nexus_uuid, make_nexus_datetime


def generate_warehouses() -> Tuple[List[Entity], List[Warehouse]]:
    warehouses_data = [
        ("WH-001", "Plant 1 Munich", "Munich, Germany", "25000.00"),
        ("WH-002", "Plant 2 Austin", "Austin, TX, USA", "30000.00"),
        ("WH-003", "Central Buffer Rotterdam", "Rotterdam, Netherlands", "50000.00"),
        ("WH-004", "Regional DC Chicago", "Chicago, IL, USA", "20000.00"),
        ("WH-005", "Regional DC Singapore", "Singapore", "15000.00"),
    ]

    entities: List[Entity] = []
    warehouses: List[Warehouse] = []

    for code, name, location, sqm in warehouses_data:
        entity_id = make_nexus_uuid("ENTITY", f"WAREHOUSE:{code}")
        wh_id = make_nexus_uuid("WAREHOUSE", code)
        created_dt = make_nexus_datetime(-365)

        entity = Entity(
            id=entity_id,
            entity_code=f"ENT-{code}",
            name=f"{name} Facility Entity",
            entity_type="FACILITY",
            domain="manufacturing",
            status="ACTIVE",
            attributes={"location": location},
            created_at=created_dt,
            updated_at=created_dt,
        )
        warehouse = Warehouse(
            id=wh_id,
            entity_id=entity_id,
            warehouse_code=code,
            name=name,
            location=location,
            total_capacity_sqm=Decimal(sqm),
            created_at=created_dt,
            updated_at=created_dt,
        )
        entities.append(entity)
        warehouses.append(warehouse)

    return entities, warehouses
