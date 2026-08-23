from decimal import Decimal
from typing import List, Tuple
from app.models.core import Entity
from app.models.manufacturing import Supplier
from scripts.seed.constants import make_nexus_uuid, make_nexus_datetime


def generate_suppliers() -> Tuple[List[Entity], List[Supplier]]:
    suppliers_data = [
        ("SUP-001", "Apex Semiconductor", "TIER_1", "TWN", "0.98", "10000.0000", "9600.0000", True),
        ("SUP-002", "Global Logistics", "TIER_1", "DEU", "0.96", "50000.0000", "25000.0000", True),
        ("SUP-003", "Budget Microelectronics", "TIER_2", "CHN", "0.68", "30000.0000", "18000.0000", True),
        ("SUP-004", "VoltTech Energy", "TIER_1", "KOR", "0.92", "15000.0000", "14400.0000", True),
        ("SUP-005", "Precision Harnesses", "TIER_1", "MEX", "0.97", "20000.0000", "11000.0000", True),
        ("SUP-006", "Alpha Sensors", "TIER_2", "USA", "0.82", "12000.0000", "7500.0000", True),
        ("SUP-007", "EuroCast Foundry", "TIER_1", "DEU", "0.99", "8000.0000", "4200.0000", True),
        ("SUP-008", "SinoPCB Assembly", "TIER_2", "CHN", "0.85", "45000.0000", "30000.0000", True),
        ("SUP-009", "Nippon Capacitor", "TIER_1", "JPN", "0.99", "18000.0000", "12000.0000", True),
        ("SUP-010", "Andes Metalworks", "TIER_2", "CHL", "0.71", "10000.0000", "9200.0000", True),
        ("SUP-011", "Nordic Thermal", "TIER_1", "SWE", "0.95", "14000.0000", "8000.0000", True),
        ("SUP-012", "Vietnam Optronics", "TIER_2", "VNM", "0.79", "25000.0000", "15000.0000", True),
    ]

    entities: List[Entity] = []
    suppliers: List[Supplier] = []

    for code, name, tier, country, rel_score, cap_monthly, cap_alloc, active in suppliers_data:
        entity_id = make_nexus_uuid("ENTITY", f"SUPPLIER:{code}")
        supplier_id = make_nexus_uuid("SUPPLIER", code)
        created_dt = make_nexus_datetime(-365)

        entity = Entity(
            id=entity_id,
            entity_code=f"ENT-{code}",
            name=f"{name} Entity Profile",
            entity_type="SUPPLIER",
            domain="manufacturing",
            status="ACTIVE",
            attributes={"tier": tier, "country": country},
            created_at=created_dt,
            updated_at=created_dt,
        )
        supplier = Supplier(
            id=supplier_id,
            entity_id=entity_id,
            supplier_code=code,
            name=name,
            tier=tier,
            country=country,
            reliability_score=Decimal(rel_score),
            monthly_capacity_units=Decimal(cap_monthly),
            allocated_capacity_units=Decimal(cap_alloc),
            is_active=active,
            created_at=created_dt,
            updated_at=created_dt,
        )
        entities.append(entity)
        suppliers.append(supplier)

    return entities, suppliers
