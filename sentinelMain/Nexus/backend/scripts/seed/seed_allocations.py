from decimal import Decimal
from typing import List
from app.models.manufacturing import CustomerOrderItem, ProductionOrder, CustomerOrderProductionAllocation
from scripts.seed.constants import make_nexus_uuid, make_nexus_datetime


def generate_allocations(
    cust_items: List[CustomerOrderItem],
    production_orders: List[ProductionOrder],
) -> List[CustomerOrderProductionAllocation]:
    allocations: List[CustomerOrderProductionAllocation] = []

    # Map allocations: 120 allocations linking first 120 customer order items to production orders
    for idx in range(120):
        cust_item = cust_items[idx % len(cust_items)]
        prod_order = production_orders[idx % len(production_orders)]
        alloc_id = make_nexus_uuid("ALLOCATION", f"{cust_item.id}:{prod_order.id}")

        qty = Decimal("200.0000") if idx == 0 else Decimal("25.0000")
        created_dt = make_nexus_datetime(-10 + (idx % 5))

        alloc = CustomerOrderProductionAllocation(
            id=alloc_id,
            customer_order_item_id=cust_item.id,
            production_order_id=prod_order.id,
            allocated_quantity=qty,
            created_at=created_dt,
        )
        allocations.append(alloc)

    return allocations
