from decimal import Decimal
from typing import List
from app.models.core import Dependency, Entity, Resource
from app.models.manufacturing import (
    Supplier, Component, Warehouse, PurchaseOrder, Shipment, ProductionOrder, CustomerOrder
)
from scripts.seed.constants import make_nexus_uuid, make_nexus_datetime


def generate_dependencies(
    suppliers: List[Supplier],
    components: List[Component],
    warehouses: List[Warehouse],
    purchase_orders: List[PurchaseOrder],
    shipments: List[Shipment],
    production_orders: List[ProductionOrder],
    customer_orders: List[CustomerOrder],
    resources: List[Resource],
) -> List[Dependency]:
    dependencies: List[Dependency] = []

    comp_res_map = {c.id: c.resource_id for c in components}
    supp_ent_map = {s.id: s.entity_id for s in suppliers}
    po_ent_map = {p.id: p.entity_id for p in purchase_orders}
    shp_ent_map = {s.id: s.entity_id for s in shipments}
    prd_ent_map = {pr.id: pr.entity_id for pr in production_orders}
    so_ent_map = {so.id: so.entity_id for so in customer_orders}

    dep_count = 0

    def add_dep(src_type: str, src_id, tgt_type: str, tgt_id, dep_type: str, crit: str, lead_hrs: str):
        nonlocal dep_count
        dep_count += 1
        dep_id = make_nexus_uuid("DEPENDENCY", f"DEP-{dep_count:04d}")
        created_dt = make_nexus_datetime(-30 + (dep_count % 10))

        dependencies.append(
            Dependency(
                id=dep_id,
                source_type=src_type.upper(),
                source_id=src_id,
                target_type=tgt_type.upper(),
                target_id=tgt_id,
                dependency_type=dep_type,
                criticality=crit,
                lead_time_hours=Decimal(lead_hrs),
                created_at=created_dt,
                updated_at=created_dt,
            )
        )

    # 1. Primary Chain Explicit Edges (5 edges)
    # Edge 1: SUP-001 Entity -> PO-2026-001 Entity
    add_dep("ENTITY", supp_ent_map[suppliers[0].id], "ENTITY", po_ent_map[purchase_orders[0].id], "SUPPLIES_PURCHASE_ORDER", "HIGH", "48.00")
    # Edge 2: PO-2026-001 Entity -> SHP-2026-001 Entity
    add_dep("ENTITY", po_ent_map[purchase_orders[0].id], "ENTITY", shp_ent_map[shipments[0].id], "FULFILLED_BY_SHIPMENT", "HIGH", "72.00")
    # Edge 3: SHP-2026-001 Entity -> CMP-001 Resource
    add_dep("ENTITY", shp_ent_map[shipments[0].id], "RESOURCE", comp_res_map[components[0].id], "TRANSPORTS_COMPONENT", "CRITICAL", "120.00")
    # Edge 4: CMP-001 Resource -> PRD-2026-001 Entity
    add_dep("RESOURCE", comp_res_map[components[0].id], "ENTITY", prd_ent_map[production_orders[0].id], "REQUIRED_BY_PRODUCTION", "CRITICAL", "24.00")
    # Edge 5: PRD-2026-001 Entity -> SO-2026-001 Entity
    add_dep("ENTITY", prd_ent_map[production_orders[0].id], "ENTITY", so_ent_map[customer_orders[0].id], "ALLOCATED_TO_SALES_ORDER", "CRITICAL", "48.00")

    # 2. Secondary Bottleneck Edges (SUP-009 -> CMP-009, SUP-004 -> CMP-004)
    add_dep("ENTITY", supp_ent_map[suppliers[8].id], "RESOURCE", comp_res_map[components[8].id], "SOLE_SUPPLIER_FOR_RESOURCE", "HIGH", "720.00")
    add_dep("ENTITY", supp_ent_map[suppliers[3].id], "RESOURCE", comp_res_map[components[3].id], "HIGH_VOLUME_CELL_SUPPLIER", "HIGH", "504.00")

    # 3. Generate remaining 273 dependencies up to 280 total
    # Supplier -> PO edges (75 edges)
    for i in range(1, 75):
        supp_ent = supp_ent_map[suppliers[i % len(suppliers)].id]
        po_ent = po_ent_map[purchase_orders[i].id]
        add_dep("ENTITY", supp_ent, "ENTITY", po_ent, "SUPPLIES_PURCHASE_ORDER", "MEDIUM", "48.00")

    # PO -> Shipment edges (59 edges)
    for i in range(1, 60):
        po_ent = po_ent_map[purchase_orders[i % len(purchase_orders)].id]
        shp_ent = shp_ent_map[shipments[i].id]
        add_dep("ENTITY", po_ent, "ENTITY", shp_ent, "FULFILLED_BY_SHIPMENT", "MEDIUM", "72.00")

    # Shipment -> Resource edges (59 edges)
    for i in range(1, 60):
        shp_ent = shp_ent_map[shipments[i].id]
        comp_res = comp_res_map[components[i % len(components)].id]
        add_dep("ENTITY", shp_ent, "RESOURCE", comp_res, "TRANSPORTS_COMPONENT", "MEDIUM", "96.00")

    # Resource -> Production Order edges (39 edges)
    for i in range(1, 40):
        comp_res = comp_res_map[components[i % len(components)].id]
        prd_ent = prd_ent_map[production_orders[i].id]
        add_dep("RESOURCE", comp_res, "ENTITY", prd_ent, "REQUIRED_BY_PRODUCTION", "MEDIUM", "24.00")

    # Production Order -> Customer Order edges (41 edges up to exactly 280)
    needed = 280 - dep_count
    for i in range(needed):
        prd_ent = prd_ent_map[production_orders[i % len(production_orders)].id]
        so_ent = so_ent_map[customer_orders[i % len(customer_orders)].id]
        add_dep("ENTITY", prd_ent, "ENTITY", so_ent, "ALLOCATED_TO_SALES_ORDER", "MEDIUM", "48.00")

    return dependencies
