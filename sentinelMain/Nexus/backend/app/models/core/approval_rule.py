import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ApprovalRule(Base, TimestampMixin):
    __tablename__ = "approval_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    rule_code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    emergency_procurement_threshold: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        default=Decimal("150000.00"),
        nullable=False,
    )
    min_supplier_quality_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=Decimal("90.00"),
        nullable=False,
    )
    max_acceptable_delay_days: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )
    require_approval_above_threshold: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    updated_by: Mapped[str] = mapped_column(
        String(255),
        default="SYSTEM",
        nullable=False,
    )
