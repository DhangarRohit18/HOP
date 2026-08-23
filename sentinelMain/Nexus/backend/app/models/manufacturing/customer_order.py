import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import String, Numeric, Date, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CustomerOrder(Base, TimestampMixin):
    __tablename__ = "customer_orders"

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
    order_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="RECEIVED", index=True)
    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    requested_delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))

    entity = relationship("Entity", backref="customer_order_profile")
    items = relationship("CustomerOrderItem", back_populates="customer_order", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("total_value >= 0", name="chk_cust_order_value_non_neg"),
        CheckConstraint("requested_delivery_date >= order_date", name="chk_cust_order_dates"),
    )


class CustomerOrderItem(Base):
    __tablename__ = "customer_order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    customer_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customer_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)

    customer_order = relationship("CustomerOrder", back_populates="items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_cust_item_qty_pos"),
        CheckConstraint("unit_price >= 0", name="chk_cust_item_unit_price_non_neg"),
    )
