from decimal import Decimal
from typing import List, Tuple
from app.models.core import Entity
from app.models.manufacturing import CustomerOrder, CustomerOrderItem
from scripts.seed.constants import make_nexus_uuid, make_nexus_date, make_nexus_datetime


def generate_customer_orders() -> Tuple[List[Entity], List[CustomerOrder], List[CustomerOrderItem]]:
    entities: List[Entity] = []
    customer_orders: List[CustomerOrder] = []
    cust_items: List[CustomerOrderItem] = []

    customers = [
        "Titan Motors", "Apex Mobility", "EuroAuto Group", "Vanguard Electric",
        "Pacific Logistics", "Bavaria Automotive", "Metro Bus Fleet", "Zenith Power"
    ]

    # Generate 100 Customer Orders
    for i in range(1, 101):
        so_code = f"SO-2026-{i:03d}"
        entity_id = make_nexus_uuid("ENTITY", f"CUSTOMER_ORDER:{so_code}")
        so_id = make_nexus_uuid("CUSTOMER_ORDER", so_code)

        cust_name = "Titan Motors" if i == 1 else customers[(i - 1) % len(customers)]

        if i == 1:
            # Primary Chain V5 Customer Order
            status = "CONFIRMED"
            ord_date = make_nexus_date(-12)  # 2026-07-20
            del_date = make_nexus_date(17)   # 2026-08-18
            val = Decimal("2500000.00")
            created_dt = make_nexus_datetime(-12)
            attributes = {"liquidated_damages_per_day": 50000.00, "priority": "CRITICAL_SLA"}
        else:
            status = "CONFIRMED" if i % 2 == 0 else "RECEIVED"
            ord_date = make_nexus_date(-30 + (i % 20))
            del_date = make_nexus_date(10 + (i % 30))
            val = Decimal("150000.00")
            created_dt = make_nexus_datetime(-30 + (i % 20))
            attributes = {"priority": "STANDARD"}

        entity = Entity(
            id=entity_id,
            entity_code=f"ENT-{so_code}",
            name=f"Customer Order {so_code} ({cust_name})",
            entity_type="CUSTOMER_ORDER",
            domain="manufacturing",
            status="ACTIVE",
            attributes=attributes,
            created_at=created_dt,
            updated_at=created_dt,
        )
        entities.append(entity)

        cust_order = CustomerOrder(
            id=so_id,
            entity_id=entity_id,
            order_number=so_code,
            customer_name=cust_name,
            status=status,
            order_date=ord_date,
            requested_delivery_date=del_date,
            total_value=val,
            created_at=created_dt,
            updated_at=created_dt,
        )
        customer_orders.append(cust_order)

        # 180 order items total across 100 customer orders (80 orders have 2 items, 20 orders have 1 item)
        num_items = 2 if i <= 80 else 1
        for item_idx in range(1, num_items + 1):
            item_id = make_nexus_uuid("CUSTOMER_ORDER_ITEM", f"{so_code}:{item_idx}")
            prd_code = "PRD-EV-BATT" if (i == 1 or item_idx == 1) else "PRD-INVERTER"
            qty = Decimal("200.0000") if i == 1 else Decimal("50.0000")
            price = Decimal("12500.0000") if prd_code == "PRD-EV-BATT" else Decimal("3000.0000")

            item = CustomerOrderItem(
                id=item_id,
                customer_order_id=so_id,
                product_code=prd_code,
                quantity=qty,
                unit_price=price,
            )
            cust_items.append(item)

    return entities, customer_orders, cust_items
