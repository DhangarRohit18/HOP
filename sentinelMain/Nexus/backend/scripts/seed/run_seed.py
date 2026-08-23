import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.base import Base
from app.models.core import Entity, Resource, Event, Constraint, Action, Metric, Dependency
from app.models.manufacturing import (
    Supplier, Component, Warehouse, InventoryPosition, PurchaseOrder, PurchaseOrderItem,
    Shipment, ProductionOrder, ProductionOrderItem, CustomerOrder, CustomerOrderItem,
    CustomerOrderProductionAllocation, SupplierPerformance
)
from app.services.validation.dependency_validator import validate_polymorphic_dependency
from scripts.seed.constants import SEED, BASELINE_DATE, NAMESPACE_NEXUS
from scripts.seed.seed_suppliers import generate_suppliers
from scripts.seed.seed_components import generate_components
from scripts.seed.seed_warehouses import generate_warehouses
from scripts.seed.seed_inventory import generate_inventory
from scripts.seed.seed_procurement import generate_procurement
from scripts.seed.seed_shipments import generate_shipments
from scripts.seed.seed_production import generate_production
from scripts.seed.seed_customer_orders import generate_customer_orders
from scripts.seed.seed_allocations import generate_allocations
from scripts.seed.seed_performance import generate_performance
from scripts.seed.seed_dependencies import generate_dependencies

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def compute_dataset_checksum(manifest_counts: Dict[str, int]) -> str:
    """
    Computes a deterministic SHA-256 checksum over deterministic manifest parameters.
    Explicitly excludes runtime metadata like generated_at.
    """
    checksum_payload = {
        "seed": SEED,
        "namespace": str(NAMESPACE_NEXUS),
        "baseline_date": str(BASELINE_DATE),
        "counts": manifest_counts,
    }
    canonical_json = json.dumps(checksum_payload, sort_keys=True)
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


async def reset_database_tables(session: AsyncSession) -> None:
    """Ensures database tables exist and cleanly deletes existing records prior to seeding."""
    conn = await session.connection()
    await conn.run_sync(Base.metadata.create_all)

    logger.info("Cleaning existing database records...")
    tables = [
        SupplierPerformance, CustomerOrderProductionAllocation, CustomerOrderItem, CustomerOrder,
        ProductionOrderItem, ProductionOrder, Shipment, PurchaseOrderItem, PurchaseOrder,
        InventoryPosition, Component, Supplier, Warehouse, Dependency, Metric, Action,
        Constraint, Event, Resource, Entity
    ]
    for table in tables:
        await session.execute(delete(table))
    await session.flush()





async def run_seed_generator(session: AsyncSession) -> Dict[str, Any]:
    """
    Executes the deterministic seed generator inside a single transaction block.
    """
    logger.info(f"Starting NEXUS Phase 2.2 Seed Generation (SEED={SEED}, BASELINE={BASELINE_DATE})...")

    await reset_database_tables(session)

    # 1. Generate Models
    supp_entities, suppliers = generate_suppliers()
    wh_entities, warehouses = generate_warehouses()
    comp_resources, components = generate_components()
    inventory_positions = generate_inventory(warehouses, components)
    po_entities, purchase_orders, po_items = generate_procurement(suppliers, components)
    shp_entities, shipments = generate_shipments(purchase_orders, warehouses)
    prd_entities, production_orders, prd_items = generate_production(warehouses, components)
    so_entities, customer_orders, cust_items = generate_customer_orders()
    allocations = generate_allocations(cust_items, production_orders)
    performance_records = generate_performance(suppliers)
    dependencies = generate_dependencies(
        suppliers, components, warehouses, purchase_orders, shipments,
        production_orders, customer_orders, comp_resources
    )

    # Combine all core entities
    all_entities = supp_entities + wh_entities + po_entities + shp_entities + prd_entities + so_entities

    # 2. Add to Session
    session.add_all(all_entities)
    session.add_all(comp_resources)
    await session.flush()

    session.add_all(suppliers)
    session.add_all(warehouses)
    session.add_all(components)
    await session.flush()

    session.add_all(inventory_positions)
    session.add_all(purchase_orders)
    await session.flush()

    session.add_all(po_items)
    session.add_all(shipments)
    session.add_all(production_orders)
    session.add_all(customer_orders)
    await session.flush()

    session.add_all(prd_items)
    session.add_all(cust_items)
    await session.flush()

    session.add_all(allocations)
    session.add_all(performance_records)
    session.add_all(dependencies)
    await session.flush()

    # 3. Validation Suite
    logger.info("Executing 18-Point Data Quality Validation Suite...")

    # Exact count checks
    counts = {
        "suppliers": len(suppliers),
        "components": len(components),
        "warehouses": len(warehouses),
        "inventory_positions": len(inventory_positions),
        "purchase_orders": len(purchase_orders),
        "purchase_order_items": len(po_items),
        "shipments": len(shipments),
        "production_orders": len(production_orders),
        "production_order_items": len(prd_items),
        "customer_orders": len(customer_orders),
        "customer_order_items": len(cust_items),
        "customer_order_allocations": len(allocations),
        "supplier_performance": len(performance_records),
        "core_entities": len(all_entities),
        "core_resources": len(comp_resources),
        "core_dependencies": len(dependencies),
    }

    assert counts["suppliers"] == 12
    assert counts["components"] == 36
    assert counts["warehouses"] == 5
    assert counts["purchase_orders"] == 75
    assert counts["purchase_order_items"] == 150
    assert counts["shipments"] == 60
    assert counts["inventory_positions"] == 120
    assert counts["production_orders"] == 40
    assert counts["production_order_items"] == 160
    assert counts["customer_orders"] == 100
    assert counts["customer_order_items"] == 180
    assert counts["customer_order_allocations"] == 120
    assert counts["supplier_performance"] == 144
    assert counts["core_entities"] == 292
    assert counts["core_resources"] == 36
    assert counts["core_dependencies"] == 280

    # Validate inventory invariants
    for inv in inventory_positions:
        assert inv.quantity_reserved <= inv.quantity_on_hand, f"Inventory invariant failed for {inv.id}"

    # Validate supplier capacity
    for supp in suppliers:
        assert supp.allocated_capacity_units <= supp.monthly_capacity_units, f"Supplier capacity failed for {supp.id}"

    # Validate polymorphic dependency edges
    for dep in dependencies:
        assert dep.source_type != "DEPENDENCY" and dep.target_type != "DEPENDENCY"
        await validate_polymorphic_dependency(session, dep.source_type, dep.source_id, dep.target_type, dep.target_id)

    # Compute checksum
    checksum = compute_dataset_checksum(counts)

    manifest = {
        "dataset_version": "1.0.0",
        "random_seed": SEED,
        "namespace": str(NAMESPACE_NEXUS),
        "baseline_date": str(BASELINE_DATE),
        "dataset_checksum": checksum,
        "record_counts": counts,
        "vulnerability_identifiers": {
            "v1_single_source_supplier": "SUP-001",
            "v1_v7_component": "CMP-001",
            "v2_unreliable_supplier": "SUP-003",
            "v3_warehouse": "WH-001",
            "v4_shipment": "SHP-2026-001",
            "v5_customer_order": "SO-2026-001",
            "v6_supplier_capacity_utilization": 0.96
        },
        "metadata_informational_only": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "note": "generated_at is informational and explicitly excluded from dataset_checksum calculation"
        }
    }

    logger.info(f"Dataset successfully validated! Checksum: {checksum}")
    return manifest


async def main():
    async with AsyncSessionLocal() as session:
        async with session.begin():
            manifest = await run_seed_generator(session)
            # Write manifest to file
            with open("dataset_manifest.json", "w") as f:
                json.dump(manifest, f, indent=2)
            logger.info("Manifest written to dataset_manifest.json")


if __name__ == "__main__":
    asyncio.run(main())
