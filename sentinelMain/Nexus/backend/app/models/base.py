import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, declared_attr


class Base(DeclarativeBase):
    """
    Base Declarative class for all SQLAlchemy ORM models in NEXUS.
    """

    @declared_attr.directive
    def __tablename__(cls) -> str:
        # Default tablename is snake_case of class name
        return cls.__name__.lower()


class TimestampMixin:
    """
    Mixin providing created_at and updated_at timestamp columns.
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
