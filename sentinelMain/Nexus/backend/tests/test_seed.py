import pytest
import uuid
import json
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Entity, Resource, Dependency
from app.models.manufacturing import (
    Supplier, Component, Warehouse, InventoryPosition, PurchaseOrder,
    Shipment, ProductionOrder, CustomerOrder, CustomerOrderProductionAllocation,
    SupplierPerformance
)
from scripts.seed.run_seed import run_seed_generator, compute_dataset_checksum
from scripts.seed.constants import SEED, BASELINE_DATE, NAMESPACE_NEXUS, make_nexus_uuid


@pytest.mark.asyncio
async def test_seed_generator_execution_and_counts(db_session: AsyncSession):
    manifest = await run_seed_generator(db_session)
    await db_session.commit()

    assert manifest["random_seed"] == SEED
    assert manifest["record_counts"]["suppliers"] == 12
    assert manifest["record_counts"]["components"] == 36
    assert manifest["record_counts"]["warehouses"] == 5
    assert manifest["record_counts"]["purchase_orders"] == 75
    assert manifest["record_counts"]["shipments"] == 60
    assert manifest["record_counts"]["inventory_positions"] == 120
    assert manifest["record_counts"]["production_orders"] == 40
    assert manifest["record_counts"]["customer_orders"] == 100
    assert manifest["record_counts"]["customer_order_allocations"] == 120
    assert manifest["record_counts"]["supplier_performance"] == 144
    assert manifest["record_counts"]["core_entities"] == 292
    assert manifest["record_counts"]["core_resources"] == 36
    assert manifest["record_counts"]["core_dependencies"] == 280

    # DB Query Verifications
    num_suppliers = (await db_session.execute(select(func.count(Supplier.id)))).scalar_one()
    num_components = (await db_session.execute(select(func.count(Component.id)))).scalar_one()
    num_deps = (await db_session.execute(select(func.count(Dependency.id)))).scalar_one()

    assert num_suppliers == 12
    assert num_components == 36
    assert num_deps == 280


@pytest.mark.asyncio
async def test_vulnerabilities_presence(db_session: AsyncSession):
    await run_seed_generator(db_session)
    await db_session.commit()

    # V1 / V6 / V7: SUP-001 & CMP-001
    supp_1 = (await db_session.execute(select(Supplier).where(Supplier.supplier_code == "SUP-001"))).scalar_one()
    comp_1 = (await db_session.execute(select(Component).where(Component.part_number == "CMP-001"))).scalar_one()
    assert supp_1.allocated_capacity_units / supp_1.monthly_capacity_units == Decimal("0.96")
    assert comp_1.is_single_sourced is True

    # V2: SUP-003 Unreliable
    supp_3 = (await db_session.execute(select(Supplier).where(Supplier.supplier_code == "SUP-003"))).scalar_one()
    assert supp_3.reliability_score == Decimal("0.68")

    # V3: WH-001 / CMP-001 Low Inventory Coverage Parameters
    wh_1 = (await db_session.execute(select(Warehouse).where(Warehouse.warehouse_code == "WH-001"))).scalar_one()
    inv_1 = (await db_session.execute(
        select(InventoryPosition).where(InventoryPosition.warehouse_id == wh_1.id, InventoryPosition.component_id == comp_1.id)
    )).scalar_one()
    assert inv_1.quantity_on_hand == Decimal("800.0000")
    assert inv_1.quantity_reserved == Decimal("600.0000")
    assert inv_1.available_inventory == Decimal("200.0000")
    assert inv_1.average_daily_demand == Decimal("150.0000")

    # V4: SHP-2026-001 Deadline Pressure Shipment
    shp_1 = (await db_session.execute(select(Shipment).where(Shipment.tracking_number == "TRK-APEX-001"))).scalar_one()
    assert shp_1.status == "IN_TRANSIT"

    # V5: SO-2026-001 Titan Motors Strict SLA
    so_1 = (await db_session.execute(select(CustomerOrder).where(CustomerOrder.order_number == "SO-2026-001"))).scalar_one()
    assert so_1.customer_name == "Titan Motors"
    so_1_entity = (await db_session.execute(select(Entity).where(Entity.id == so_1.entity_id))).scalar_one()
    assert so_1_entity.attributes["liquidated_damages_per_day"] == 50000.00


@pytest.mark.asyncio
async def test_deterministic_regeneration_and_checksum(db_session: AsyncSession):
    # First Seed Run
    manifest_1 = await run_seed_generator(db_session)
    await db_session.commit()

    # Second Seed Run (Clean Re-run)
    manifest_2 = await run_seed_generator(db_session)
    await db_session.commit()

    assert manifest_1["dataset_checksum"] == manifest_2["dataset_checksum"]
    assert manifest_1["record_counts"] == manifest_2["record_counts"]
