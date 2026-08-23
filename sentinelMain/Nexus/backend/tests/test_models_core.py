import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Entity, Resource, Event, Constraint, Action, Metric, Dependency


@pytest.mark.asyncio
async def test_core_entity_creation(db_session: AsyncSession):
    entity = Entity(
        entity_code="ENT-TEST-001",
        name="Test Entity Plant",
        entity_type="PLANT",
        domain="manufacturing",
        status="ACTIVE",
        attributes={"location": "Test Location"},
    )
    db_session.add(entity)
    await db_session.commit()
    await db_session.refresh(entity)

    assert entity.id is not None
    assert entity.entity_code == "ENT-TEST-001"
    assert entity.attributes["location"] == "Test Location"


@pytest.mark.asyncio
async def test_core_resource_creation(db_session: AsyncSession):
    entity = Entity(
        entity_code="ENT-TEST-002",
        name="Test Warehouse Entity",
        entity_type="WAREHOUSE",
        domain="manufacturing",
    )
    db_session.add(entity)
    await db_session.flush()

    resource = Resource(
        entity_id=entity.id,
        resource_code="RES-TEST-001",
        name="Test Stock",
        resource_type="INVENTORY",
        capacity_total=Decimal("1000.0000"),
        capacity_available=Decimal("800.0000"),
        unit_of_measure="UNITS",
    )
    db_session.add(resource)
    await db_session.commit()
    await db_session.refresh(resource)

    assert resource.id is not None
    assert resource.entity_id == entity.id
    assert resource.capacity_available == Decimal("800.0000")
