import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import Numeric, Date, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SupplierPerformance(Base, TimestampMixin):
    __tablename__ = "supplier_performance"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
    )
    evaluation_date: Mapped[date] = mapped_column(Date, nullable=False)
    on_time_delivery_rate: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    quality_defect_rate: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    response_lead_time_days: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)

    supplier = relationship("Supplier", backref="performance_history")

    __table_args__ = (
        CheckConstraint("on_time_delivery_rate >= 0.00 AND on_time_delivery_rate <= 1.00", name="chk_perf_ontime_range"),
        CheckConstraint("quality_defect_rate >= 0.00 AND quality_defect_rate <= 1.00", name="chk_perf_defect_range"),
        CheckConstraint("response_lead_time_days >= 0", name="chk_perf_lead_time_non_neg"),
        Index("idx_supp_perf_supp_date", "supplier_id", "evaluation_date"),
    )
