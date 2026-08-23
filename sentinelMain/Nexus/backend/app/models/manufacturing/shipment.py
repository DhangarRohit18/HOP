import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Shipment(Base, TimestampMixin):
    __tablename__ = "shipments"

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
    tracking_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    destination_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="SCHEDULED", index=True)
    carrier: Mapped[str] = mapped_column(String(128), nullable=False)
    estimated_arrival: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_arrival: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    entity = relationship("Entity", backref="shipment_profile")
    purchase_order = relationship("PurchaseOrder", backref="shipments")
    destination_warehouse = relationship("Warehouse", backref="incoming_shipments")
