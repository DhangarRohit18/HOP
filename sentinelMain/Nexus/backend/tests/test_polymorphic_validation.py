import pytest
import uuid
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Entity, Resource
from app.services.validation.dependency_validator import (
    validate_polymorphic_dependency,
    PolymorphicValidationError,
)
from app.schemas.core.primitive import DependencyCreate


@pytest.mark.asyncio
async def test_polymorphic_dependency_validation_success(db_session: AsyncSession):
    entity = Entity(entity_code="ENT-POLY-01", name="Poly Entity", entity_type="PLANT", domain="manufacturing")
    db_session.add(entity)
    await db_session.flush()

    resource = Resource(
        entity_id=entity.id,
        resource_code="RES-POLY-01",
        name="Poly Stock",
        resource_type="INVENTORY",
        capacity_total=Decimal("100"),
        capacity_available=Decimal("100"),
        unit_of_measure="EA",
    )
    db_session.add(resource)
    await db_session.commit()

    # Valid link: ENTITY -> RESOURCE
    is_valid = await validate_polymorphic_dependency(
        session=db_session,
        source_type="ENTITY",
        source_id=entity.id,
        target_type="RESOURCE",
        target_id=resource.id,
    )
    assert is_valid is True


@pytest.mark.asyncio
async def test_polymorphic_dependency_validation_unallowed_type(db_session: AsyncSession):
    fake_id = uuid.uuid4()
    with pytest.raises(PolymorphicValidationError) as exc_info:
        await validate_polymorphic_dependency(
            session=db_session,
            source_type="DEPENDENCY",  # EXCLUDED primitive endpoint type
            source_id=fake_id,
            target_type="ENTITY",
            target_id=fake_id,
        )
    assert "Invalid source_type 'DEPENDENCY'" in str(exc_info.value)


@pytest.mark.asyncio
async def test_polymorphic_dependency_validation_non_existent_id(db_session: AsyncSession):
    entity = Entity(entity_code="ENT-POLY-02", name="Poly Entity 2", entity_type="PLANT", domain="manufacturing")
    db_session.add(entity)
    await db_session.commit()

    non_existent_id = uuid.uuid4()
    with pytest.raises(PolymorphicValidationError) as exc_info:
        await validate_polymorphic_dependency(
            session=db_session,
            source_type="ENTITY",
            source_id=entity.id,
            target_type="RESOURCE",
            target_id=non_existent_id,
        )
    assert "Referenced target primitive RESOURCE with ID" in str(exc_info.value)


def test_pydantic_dependency_create_schema_validation():
    # Pydantic schema validation rejecting DEPENDENCY
    with pytest.raises(ValueError) as exc_info:
        DependencyCreate(
            source_type="DEPENDENCY",
            source_id=uuid.uuid4(),
            target_type="ENTITY",
            target_id=uuid.uuid4(),
            dependency_type="REQUIRES",
        )
    assert "Endpoint type 'DEPENDENCY' is not an allowed primitive type" in str(exc_info.value)
