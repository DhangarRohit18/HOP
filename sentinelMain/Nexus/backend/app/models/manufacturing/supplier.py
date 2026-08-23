import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("entities.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    supplier_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tier: Mapped[str] = mapped_column(String(32), nullable=False, default="TIER_1")
    country: Mapped[str] = mapped_column(String(3), nullable=False)
    reliability_score: Mapped[Decimal] = mapped_column(
        Numeric(3, 2),
        nullable=False,
        default=Decimal("1.00"),
    )
    monthly_capacity_units: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("10000.0000"),
    )
    allocated_capacity_units: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    entity = relationship("Entity", backref="supplier_profile")

    __table_args__ = (
        CheckConstraint("reliability_score >= 0.00 AND reliability_score <= 1.00", name="chk_supp_reliability_range"),
        CheckConstraint("monthly_capacity_units > 0", name="chk_supp_monthly_cap_pos"),
        CheckConstraint("allocated_capacity_units >= 0", name="chk_supp_alloc_cap_non_neg"),
        CheckConstraint("allocated_capacity_units <= monthly_capacity_units", name="chk_supplier_capacity_allocated"),
    )
