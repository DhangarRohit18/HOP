import uuid
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.validation.registry import (
    AllowedDependencyEndpointType,
    PRIMITIVE_REGISTRY,
)

logger = logging.getLogger(__name__)


class PolymorphicValidationError(ValueError):
    """
    Raised when a polymorphic dependency endpoint specifies an invalid primitive type
    or a non-existent primitive ID.
    """
    pass


async def validate_polymorphic_dependency(
    session: AsyncSession,
    source_type: str,
    source_id: uuid.UUID,
    target_type: str,
    target_id: uuid.UUID,
) -> bool:
    """
    Validates that:
    1. source_type and target_type are allowed primitive types.
    2. DEPENDENCY is excluded from endpoint types.
    3. Both source_id and target_id exist in their respective primitive tables.
    """
    # 1. Validate primitive endpoint types
    try:
        source_enum = AllowedDependencyEndpointType(source_type.upper())
    except ValueError:
        raise PolymorphicValidationError(
            f"Invalid source_type '{source_type}'. Must be one of {[e.value for e in AllowedDependencyEndpointType]}"
        )

    try:
        target_enum = AllowedDependencyEndpointType(target_type.upper())
    except ValueError:
        raise PolymorphicValidationError(
            f"Invalid target_type '{target_type}'. Must be one of {[e.value for e in AllowedDependencyEndpointType]}"
        )

    # 2. Lookup ORM models from registry
    source_model = PRIMITIVE_REGISTRY[source_enum]
    target_model = PRIMITIVE_REGISTRY[target_enum]

    # 3. Verify source_id existence
    source_stmt = select(source_model.id).where(source_model.id == source_id)
    source_res = await session.execute(source_stmt)
    if source_res.scalar_one_or_none() is None:
        raise PolymorphicValidationError(
            f"Referenced source primitive {source_enum.value} with ID '{source_id}' does not exist"
        )

    # 4. Verify target_id existence
    target_stmt = select(target_model.id).where(target_model.id == target_id)
    target_res = await session.execute(target_stmt)
    if target_res.scalar_one_or_none() is None:
        raise PolymorphicValidationError(
            f"Referenced target primitive {target_enum.value} with ID '{target_id}' does not exist"
        )

    return True
