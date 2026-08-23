import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Resource(Base, TimestampMixin):
    __tablename__ = "resources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("entities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resource_code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    capacity_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    capacity_available: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit_of_measure: Mapped[str] = mapped_column(String(32), nullable=False)

    entity = relationship("Entity", backref="resources")

    __table_args__ = (
        CheckConstraint("capacity_total >= 0", name="chk_res_capacity_total_non_neg"),
        CheckConstraint("capacity_available >= 0", name="chk_res_capacity_avail_non_neg"),
    )
