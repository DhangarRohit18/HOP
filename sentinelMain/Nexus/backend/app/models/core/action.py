import uuid
from decimal import Decimal
from typing import Dict, Any
from sqlalchemy import String, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Action(Base, TimestampMixin):
    __tablename__ = "actions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    target_entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("entities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    estimated_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    estimated_lead_time_hours: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False, default=Decimal("0.00"))
    autonomy_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    target_entity = relationship("Entity", backref="actions")
