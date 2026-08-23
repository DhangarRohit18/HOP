import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Dependency(Base, TimestampMixin):
    __tablename__ = "dependencies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    dependency_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    criticality: Mapped[str] = mapped_column(String(32), nullable=False, default="MEDIUM")
    lead_time_hours: Mapped[Decimal] = mapped_column(
        Numeric(8, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    __table_args__ = (
        CheckConstraint("lead_time_hours >= 0", name="chk_dep_lead_time_non_neg"),
        Index("idx_dep_source", "source_type", "source_id"),
        Index("idx_dep_target", "target_type", "target_id"),
    )
