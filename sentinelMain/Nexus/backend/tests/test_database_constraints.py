import pytest
import uuid
from decimal import Decimal
from datetime import date
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Entity, Resource
from app.models.manufacturing import Supplier, InventoryPosition, PurchaseOrder, Warehouse, Component


@pytest.mark.asyncio
async def test_reserved_exceeds_on_hand_constraint(db_session: AsyncSession):
    wh_entity = Entity(entity_code="ENT-WH-CSTR", name="WH Entity", entity_type="WAREHOUSE", domain="manufacturing")
    comp_entity = Entity(entity_code="ENT-COMP-CSTR", name="Comp Entity", entity_type="SUPPLIER", domain="manufacturing")
    db_session.add_all([wh_entity, comp_entity])
    await db_session.flush()

    res = Resource(entity_id=comp_entity.id, resource_code="RES-CSTR-01", name="Res", resource_type="ITEM", capacity_total=Decimal("100"), capacity_available=Decimal("100"), unit_of_measure="EA")
    db_session.add(res)
    await db_session.flush()

    warehouse = Warehouse(entity_id=wh_entity.id, warehouse_code="WH-CSTR-01", name="WH", location="Loc", total_capacity_sqm=Decimal("100"))
    component = Component(resource_id=res.id, part_number="PART-CSTR-01", name="Comp", category="CAT", unit_cost=Decimal("10"), lead_time_days=5)
    db_session.add_all([warehouse, component])
    await db_session.flush()

    # Attempt to insert reserved > on_hand (150 > 100)
    inv = InventoryPosition(
        warehouse_id=warehouse.id,
        component_id=component.id,
        quantity_on_hand=Decimal("100.0000"),
        quantity_reserved=Decimal("150.0000"),
    )
    db_session.add(inv)
    
    with pytest.raises(IntegrityError):
        await db_session.commit()
    
    await db_session.rollback()


@pytest.mark.asyncio
async def test_supplier_capacity_exceeded_constraint(db_session: AsyncSession):
    supp_entity = Entity(entity_code="ENT-SUPP-CSTR", name="Supp Entity", entity_type="SUPPLIER", domain="manufacturing")
    db_session.add(supp_entity)
    await db_session.flush()

    # Attempt to insert allocated > monthly (12000 > 10000)
    supplier = Supplier(
        entity_id=supp_entity.id,
        supplier_code="SUP-CSTR-01",
        name="Overbooked Supplier",
        tier="TIER_1",
        country="DEU",
        monthly_capacity_units=Decimal("10000.0000"),
        allocated_capacity_units=Decimal("12000.0000"),
    )
    db_session.add(supplier)

    with pytest.raises(IntegrityError):
        await db_session.commit()

    await db_session.rollback()
