import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, Integer, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Component(Base, TimestampMixin):
    __tablename__ = "components"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    part_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False)
    is_single_sourced: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    resource = relationship("Resource", backref="component_profile")

    __table_args__ = (
        CheckConstraint("unit_cost >= 0", name="chk_comp_unit_cost_non_neg"),
        CheckConstraint("lead_time_days >= 0", name="chk_comp_lead_time_non_neg"),
    )
