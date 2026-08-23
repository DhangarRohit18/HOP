from decimal import Decimal
from typing import List, Tuple
from app.models.core import Entity
from app.models.manufacturing import PurchaseOrder, PurchaseOrderItem, Supplier, Component
from scripts.seed.constants import make_nexus_uuid, make_nexus_date, make_nexus_datetime


def generate_procurement(
    suppliers: List[Supplier],
    components: List[Component],
) -> Tuple[List[Entity], List[PurchaseOrder], List[PurchaseOrderItem]]:
    entities: List[Entity] = []
    purchase_orders: List[PurchaseOrder] = []
    po_items: List[PurchaseOrderItem] = []

    supp_map = {s.supplier_code: s for s in suppliers}
    comp_map = {c.part_number: c for c in components}

    # Generate 75 POs
    for i in range(1, 76):
        po_num = f"PO-2026-{i:03d}"
        entity_id = make_nexus_uuid("ENTITY", f"PURCHASE_ORDER:{po_num}")
        po_id = make_nexus_uuid("PURCHASE_ORDER", po_num)

        # Primary chain PO-2026-001
        if i == 1:
            supp = supp_map["SUP-001"]
            status = "CONFIRMED"
            ord_date = make_nexus_date(-17)  # 2026-07-15
            del_date = make_nexus_date(9)    # 2026-08-10
            created_dt = make_nexus_datetime(-17)
        elif i <= 40:
            supp = suppliers[(i - 1) % len(suppliers)]
            status = "DELIVERED"
            ord_date = make_nexus_date(-60 + (i % 30))
            del_date = make_nexus_date(-30 + (i % 30))
            created_dt = make_nexus_datetime(-60 + (i % 30))
        elif i <= 60:
            supp = suppliers[(i - 1) % len(suppliers)]
            status = "IN_TRANSIT"
            ord_date = make_nexus_date(-15 + (i % 10))
            del_date = make_nexus_date(5 + (i % 15))
            created_dt = make_nexus_datetime(-15 + (i % 10))
        else:
            supp = suppliers[(i - 1) % len(suppliers)]
            status = "CONFIRMED" if i % 2 == 0 else "DRAFT"
            ord_date = make_nexus_date(i % 5)
            del_date = make_nexus_date(15 + (i % 10))
            created_dt = make_nexus_datetime(i % 5)

        entity = Entity(
            id=entity_id,
            entity_code=f"ENT-{po_num}",
            name=f"Purchase Order {po_num} Entity",
            entity_type="PURCHASE_ORDER",
            domain="manufacturing",
            status="ACTIVE",
            created_at=created_dt,
            updated_at=created_dt,
        )
        entities.append(entity)

        # 2 PO items per PO = 150 items total
        item_1_comp = comp_map["CMP-001"] if i == 1 else components[(i * 2 - 2) % len(components)]
        item_2_comp = comp_map["CMP-002"] if i == 1 else components[(i * 2 - 1) % len(components)]

        qty1 = Decimal("5000.0000") if i == 1 else Decimal("1000.0000")
        qty2 = Decimal("2000.0000")
        rcvd1 = qty1 if status == "DELIVERED" else Decimal("0.0000")
        rcvd2 = qty2 if status == "DELIVERED" else Decimal("0.0000")

        total_amt = (qty1 * item_1_comp.unit_cost) + (qty2 * item_2_comp.unit_cost)

        po = PurchaseOrder(
            id=po_id,
            entity_id=entity_id,
            po_number=po_num,
            supplier_id=supp.id,
            status=status,
            order_date=ord_date,
            expected_delivery_date=del_date,
            total_amount=total_amt,
            created_at=created_dt,
            updated_at=created_dt,
        )
        purchase_orders.append(po)

        item1_id = make_nexus_uuid("PURCHASE_ORDER_ITEM", f"{po_num}:1")
        item2_id = make_nexus_uuid("PURCHASE_ORDER_ITEM", f"{po_num}:2")

        item1 = PurchaseOrderItem(
            id=item1_id,
            purchase_order_id=po_id,
            component_id=item_1_comp.id,
            quantity_ordered=qty1,
            quantity_received=rcvd1,
            unit_price=item_1_comp.unit_cost,
        )
        item2 = PurchaseOrderItem(
            id=item2_id,
            purchase_order_id=po_id,
            component_id=item_2_comp.id,
            quantity_ordered=qty2,
            quantity_received=rcvd2,
            unit_price=item_2_comp.unit_cost,
        )
        po_items.extend([item1, item2])

    return entities, purchase_orders, po_items
