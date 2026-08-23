import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import String, Numeric, Date, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class PurchaseOrder(Base, TimestampMixin):
    __tablename__ = "purchase_orders"

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
    po_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="DRAFT", index=True)
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))

    entity = relationship("Entity", backref="purchase_order_profile")
    supplier = relationship("Supplier", backref="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="chk_po_total_non_neg"),
        CheckConstraint("expected_delivery_date >= order_date", name="chk_po_delivery_after_order"),
    )


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    component_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("components.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity_ordered: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    quantity_received: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    component = relationship("Component", backref="po_items")

    __table_args__ = (
        CheckConstraint("quantity_ordered > 0", name="chk_po_item_qty_ordered_pos"),
        CheckConstraint("quantity_received >= 0", name="chk_po_item_qty_received_non_neg"),
        CheckConstraint("unit_price >= 0", name="chk_po_item_unit_price_non_neg"),
        CheckConstraint("quantity_received <= quantity_ordered", name="chk_po_item_received_le_ordered"),
    )
