from enum import Enum
from typing import Dict, Type
from app.models.base import Base
from app.models.core import Entity, Resource, Event, Constraint, Action, Metric


class AllowedDependencyEndpointType(str, Enum):
    ENTITY = "ENTITY"
    RESOURCE = "RESOURCE"
    EVENT = "EVENT"
    CONSTRAINT = "CONSTRAINT"
    ACTION = "ACTION"
    METRIC = "METRIC"
    # Note: DEPENDENCY itself is explicitly EXCLUDED from allowed endpoint types.


PRIMITIVE_REGISTRY: Dict[AllowedDependencyEndpointType, Type[Base]] = {
    AllowedDependencyEndpointType.ENTITY: Entity,
    AllowedDependencyEndpointType.RESOURCE: Resource,
    AllowedDependencyEndpointType.EVENT: Event,
    AllowedDependencyEndpointType.CONSTRAINT: Constraint,
    AllowedDependencyEndpointType.ACTION: Action,
    AllowedDependencyEndpointType.METRIC: Metric,
}
