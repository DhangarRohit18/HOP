import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Warehouse(Base, TimestampMixin):
    __tablename__ = "warehouses"

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
    warehouse_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    total_capacity_sqm: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    entity = relationship("Entity", backref="warehouse_profile")

    __table_args__ = (
        CheckConstraint("total_capacity_sqm > 0", name="chk_wh_capacity_pos"),
    )
