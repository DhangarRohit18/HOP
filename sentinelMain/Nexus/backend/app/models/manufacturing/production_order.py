import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import String, Numeric, Date, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ProductionOrder(Base, TimestampMixin):
    __tablename__ = "production_orders"

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
    production_order_number: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    production_line_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    product_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PLANNED", index=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    target_completion_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity_to_produce: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)

    entity = relationship("Entity", backref="production_order_profile")
    warehouse = relationship("Warehouse", backref="production_orders")
    items = relationship("ProductionOrderItem", back_populates="production_order", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("quantity_to_produce > 0", name="chk_prod_qty_to_produce_pos"),
        CheckConstraint("target_completion_date >= start_date", name="chk_prod_order_dates"),
        Index("idx_prod_order_line", "warehouse_id", "production_line_code"),
    )


class ProductionOrderItem(Base):
    __tablename__ = "production_order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    production_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("production_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    component_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("components.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity_required: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    quantity_issued: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )

    production_order = relationship("ProductionOrder", back_populates="items")
    component = relationship("Component", backref="production_order_items")

    __table_args__ = (
        CheckConstraint("quantity_required > 0", name="chk_prod_item_qty_req_pos"),
        CheckConstraint("quantity_issued >= 0", name="chk_prod_item_qty_issued_non_neg"),
    )
