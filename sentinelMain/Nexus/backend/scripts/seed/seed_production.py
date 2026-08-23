from decimal import Decimal
from typing import List, Tuple
from app.models.core import Entity
from app.models.manufacturing import ProductionOrder, ProductionOrderItem, Warehouse, Component
from scripts.seed.constants import make_nexus_uuid, make_nexus_date, make_nexus_datetime


def generate_production(
    warehouses: List[Warehouse],
    components: List[Component],
) -> Tuple[List[Entity], List[ProductionOrder], List[ProductionOrderItem]]:
    entities: List[Entity] = []
    production_orders: List[ProductionOrder] = []
    prod_items: List[ProductionOrderItem] = []

    wh_map = {w.warehouse_code: w for w in warehouses}
    comp_map = {c.part_number: c for c in components}

    # Generate 40 Production Orders
    for i in range(1, 41):
        prd_code = f"PRD-2026-{i:03d}"
        entity_id = make_nexus_uuid("ENTITY", f"PRODUCTION_ORDER:{prd_code}")
        prd_id = make_nexus_uuid("PRODUCTION_ORDER", prd_code)

        if i == 1:
            # Primary Chain Production Order
            wh = wh_map["WH-001"]
            line = "LINE-SMT-01"
            product = "PRD-EV-BATT"
            status = "PLANNED"
            start = make_nexus_date(4)      # 2026-08-05
            target = make_nexus_date(14)    # 2026-08-15
            qty_produce = Decimal("500.0000")
            created_dt = make_nexus_datetime(-10)
        elif i <= 20:
            wh = warehouses[(i - 1) % len(warehouses)]
            line = f"LINE-ASM-{((i - 1) % 4) + 1:02d}"
            product = "PRD-EV-BATT" if i % 2 == 0 else "PRD-INVERTER"
            status = "IN_PROGRESS"
            start = make_nexus_date(-10 + (i % 5))
            target = make_nexus_date(5 + (i % 10))
            qty_produce = Decimal("300.0000")
            created_dt = make_nexus_datetime(-15)
        else:
            wh = warehouses[(i - 1) % len(warehouses)]
            line = f"LINE-SMT-{((i - 1) % 3) + 1:02d}"
            product = "PRD-INVERTER" if i % 2 == 0 else "PRD-EV-BATT"
            status = "PLANNED"
            start = make_nexus_date(10 + (i % 10))
            target = make_nexus_date(20 + (i % 10))
            qty_produce = Decimal("250.0000")
            created_dt = make_nexus_datetime(-5)

        entity = Entity(
            id=entity_id,
            entity_code=f"ENT-{prd_code}",
            name=f"Production Order {prd_code} Entity",
            entity_type="PRODUCTION_ORDER",
            domain="manufacturing",
            status="ACTIVE",
            created_at=created_dt,
            updated_at=created_dt,
        )
        entities.append(entity)

        prod_order = ProductionOrder(
            id=prd_id,
            entity_id=entity_id,
            production_order_number=prd_code,
            warehouse_id=wh.id,
            production_line_code=line,
            product_code=product,
            status=status,
            start_date=start,
            target_completion_date=target,
            quantity_to_produce=qty_produce,
            created_at=created_dt,
            updated_at=created_dt,
        )
        production_orders.append(prod_order)

        # 4 items per production order = 160 items total
        for item_idx in range(1, 5):
            item_id = make_nexus_uuid("PRODUCTION_ORDER_ITEM", f"{prd_code}:{item_idx}")

            if i == 1 and item_idx == 1:
                comp = comp_map["CMP-001"]
                qty_req = Decimal("500.0000")
                qty_iss = Decimal("0.0000")
            else:
                comp = components[(i * 4 + item_idx) % len(components)]
                qty_req = qty_produce
                qty_iss = qty_req if status == "IN_PROGRESS" else Decimal("0.0000")

            item = ProductionOrderItem(
                id=item_id,
                production_order_id=prd_id,
                component_id=comp.id,
                quantity_required=qty_req,
                quantity_issued=qty_iss,
            )
            prod_items.append(item)

    return entities, production_orders, prod_items
