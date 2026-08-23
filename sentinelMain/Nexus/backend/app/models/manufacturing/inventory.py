import uuid
from decimal import Decimal
from sqlalchemy import Numeric, ForeignKey, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class InventoryPosition(Base, TimestampMixin):
    __tablename__ = "inventory_positions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
    )
    component_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("components.id", ondelete="CASCADE"),
        nullable=False,
    )
    quantity_on_hand: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )
    quantity_reserved: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )
    safety_stock_level: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )
    reorder_point: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )
    average_daily_demand: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )

    warehouse = relationship("Warehouse", backref="inventory_positions")
    component = relationship("Component", backref="inventory_positions")

    @property
    def available_inventory(self) -> Decimal:
        """Deterministic derivation: quantity_on_hand - quantity_reserved."""
        return self.quantity_on_hand - self.quantity_reserved

    __table_args__ = (
        UniqueConstraint("warehouse_id", "component_id", name="uq_inventory_warehouse_component"),
        CheckConstraint("quantity_on_hand >= 0", name="chk_inv_on_hand_non_neg"),
        CheckConstraint("quantity_reserved >= 0", name="chk_inv_reserved_non_neg"),
        CheckConstraint("safety_stock_level >= 0", name="chk_inv_safety_stock_non_neg"),
        CheckConstraint("reorder_point >= 0", name="chk_inv_reorder_point_non_neg"),
        CheckConstraint("average_daily_demand >= 0", name="chk_inv_demand_non_neg"),
        CheckConstraint("quantity_reserved <= quantity_on_hand", name="chk_reserved_le_on_hand"),
        Index("idx_inv_pos_wh_comp", "warehouse_id", "component_id"),
    )
