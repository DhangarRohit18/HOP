from typing import List, Tuple
from app.models.core import Entity
from app.models.manufacturing import Shipment, PurchaseOrder, Warehouse
from scripts.seed.constants import make_nexus_uuid, make_nexus_datetime


def generate_shipments(
    purchase_orders: List[PurchaseOrder],
    warehouses: List[Warehouse],
) -> Tuple[List[Entity], List[Shipment]]:
    entities: List[Entity] = []
    shipments: List[Shipment] = []

    wh_map = {w.warehouse_code: w for w in warehouses}

    # Generate 60 Shipments
    for i in range(1, 61):
        shp_code = f"SHP-2026-{i:03d}"
        tracking = f"TRK-APEX-{i:03d}" if i == 1 else f"TRK-GLOBAL-{i:03d}"
        entity_id = make_nexus_uuid("ENTITY", f"SHIPMENT:{shp_code}")
        shp_id = make_nexus_uuid("SHIPMENT", shp_code)

        po = purchase_orders[(i - 1) % len(purchase_orders)]

        if i == 1:
            # Primary Chain V4 Shipment
            dest_wh = wh_map["WH-001"]
            status = "IN_TRANSIT"
            carrier = "DHL Supply Chain"
            est_arrival = make_nexus_datetime(9, 14, 0)  # 2026-08-10 14:00:00
            act_arrival = None
            created_dt = make_nexus_datetime(-17)
        elif i <= 35:
            dest_wh = warehouses[(i - 1) % len(warehouses)]
            status = "DELIVERED"
            carrier = "Kuehne+Nagel" if i % 2 == 0 else "DB Schenker"
            est_arrival = make_nexus_datetime(-20 + (i % 15))
            act_arrival = est_arrival
            created_dt = make_nexus_datetime(-40 + (i % 15))
        elif i <= 50:
            dest_wh = warehouses[(i - 1) % len(warehouses)]
            status = "IN_TRANSIT"
            carrier = "Maersk Logistics"
            est_arrival = make_nexus_datetime(5 + (i % 10))
            act_arrival = None
            created_dt = make_nexus_datetime(-5)
        elif i <= 55:
            dest_wh = warehouses[(i - 1) % len(warehouses)]
            status = "DELAYED"
            carrier = "FedEx Express Freight"
            est_arrival = make_nexus_datetime(12 + (i % 5))
            act_arrival = None
            created_dt = make_nexus_datetime(-10)
        else:
            dest_wh = warehouses[(i - 1) % len(warehouses)]
            status = "CUSTOMS_HOLD"
            carrier = "DHL Express"
            est_arrival = make_nexus_datetime(8 + (i % 5))
            act_arrival = None
            created_dt = make_nexus_datetime(-7)

        entity = Entity(
            id=entity_id,
            entity_code=f"ENT-{shp_code}",
            name=f"Shipment {shp_code} Entity",
            entity_type="SHIPMENT",
            domain="manufacturing",
            status="ACTIVE",
            created_at=created_dt,
            updated_at=created_dt,
        )
        entities.append(entity)

        shipment = Shipment(
            id=shp_id,
            entity_id=entity_id,
            tracking_number=tracking,
            purchase_order_id=po.id,
            destination_warehouse_id=dest_wh.id,
            status=status,
            carrier=carrier,
            estimated_arrival=est_arrival,
            actual_arrival=act_arrival,
            created_at=created_dt,
            updated_at=created_dt,
        )
        shipments.append(shipment)

    return entities, shipments
