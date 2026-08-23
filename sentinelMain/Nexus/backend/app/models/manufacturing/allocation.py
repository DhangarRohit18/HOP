import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Numeric, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class CustomerOrderProductionAllocation(Base):
    __tablename__ = "customer_order_production_allocations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    customer_order_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customer_order_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    production_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("production_orders.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    allocated_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    customer_order_item = relationship("CustomerOrderItem", backref="allocations")
    production_order = relationship("ProductionOrder", backref="allocations")

    __table_args__ = (
        CheckConstraint("allocated_quantity > 0", name="chk_alloc_qty_pos"),
    )
