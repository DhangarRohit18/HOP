import pytest
import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Entity, Resource
from app.models.manufacturing import (
    Supplier,
    Component,
    Warehouse,
    InventoryPosition,
    PurchaseOrder,
    PurchaseOrderItem,
    ProductionOrder,
    CustomerOrder,
    CustomerOrderItem,
    CustomerOrderProductionAllocation,
)


@pytest.mark.asyncio
async def test_manufacturing_supplier_and_component(db_session: AsyncSession):
    supp_entity = Entity(entity_code="ENT-SUPP-001", name="Supplier Entity", entity_type="SUPPLIER", domain="manufacturing")
    db_session.add(supp_entity)
    await db_session.flush()

    comp_resource = Resource(
        entity_id=supp_entity.id,
        resource_code="RES-COMP-001",
        name="Component Resource",
        resource_type="INVENTORY_ITEM",
        capacity_total=Decimal("5000.0000"),
        capacity_available=Decimal("5000.0000"),
        unit_of_measure="UNITS",
    )
    db_session.add(comp_resource)
    await db_session.flush()

    supplier = Supplier(
        entity_id=supp_entity.id,
        supplier_code="SUP-TEST-01",
        name="Acme Micro",
        tier="TIER_1",
        country="TWN",
        reliability_score=Decimal("0.95"),
        monthly_capacity_units=Decimal("10000.0000"),
        allocated_capacity_units=Decimal("2000.0000"),
    )
    component = Component(
        resource_id=comp_resource.id,
        part_number="PART-MCU-01",
        name="Microcontroller IC",
        category="SEMICONDUCTOR",
        unit_cost=Decimal("12.5000"),
        lead_time_days=14,
        is_single_sourced=True,
    )
    db_session.add_all([supplier, component])
    await db_session.commit()

    assert supplier.id is not None
    assert supplier.entity_id == supp_entity.id
    assert component.resource_id == comp_resource.id
    assert component.is_single_sourced is True


@pytest.mark.asyncio
async def test_customer_order_production_allocation_traceability(db_session: AsyncSession):
    cust_entity = Entity(entity_code="ENT-CUST-ORD-01", name="Cust Order Entity", entity_type="CUSTOMER_ORDER", domain="manufacturing")
    prod_entity = Entity(entity_code="ENT-PROD-ORD-01", name="Prod Order Entity", entity_type="PRODUCTION_ORDER", domain="manufacturing")
    wh_entity = Entity(entity_code="ENT-WH-01", name="WH Entity", entity_type="WAREHOUSE", domain="manufacturing")
    
    db_session.add_all([cust_entity, prod_entity, wh_entity])
    await db_session.flush()

    warehouse = Warehouse(entity_id=wh_entity.id, warehouse_code="WH-MAIN-01", name="Main Warehouse", location="Factory Floor", total_capacity_sqm=Decimal("5000.00"))
    db_session.add(warehouse)
    await db_session.flush()

    cust_order = CustomerOrder(
        entity_id=cust_entity.id,
        order_number="SO-TEST-001",
        customer_name="Tesla Motors",
        order_date=date(2026, 8, 1),
        requested_delivery_date=date(2026, 8, 30),
        total_value=Decimal("50000.00"),
    )
    cust_item = CustomerOrderItem(
        customer_order=cust_order,
        product_code="PRD-EV-BATTERY",
        quantity=Decimal("100.0000"),
        unit_price=Decimal("500.0000"),
    )
    prod_order = ProductionOrder(
        entity_id=prod_entity.id,
        production_order_number="PRD-TEST-001",
        warehouse_id=warehouse.id,
        production_line_code="LINE-SMT-01",
        product_code="PRD-EV-BATTERY",
        start_date=date(2026, 8, 5),
        target_completion_date=date(2026, 8, 20),
        quantity_to_produce=Decimal("100.0000"),
    )
    db_session.add_all([cust_order, cust_item, prod_order])
    await db_session.flush()

    allocation = CustomerOrderProductionAllocation(
        customer_order_item_id=cust_item.id,
        production_order_id=prod_order.id,
        allocated_quantity=Decimal("100.0000"),
    )
    db_session.add(allocation)
    await db_session.commit()

    assert allocation.id is not None
    assert allocation.customer_order_item_id == cust_item.id
    assert allocation.production_order_id == prod_order.id
