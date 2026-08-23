"""add_supply_chain_tables

Revision ID: 302491fb0b28
Revises: '20260822_0001'
Create Date: 2026-08-22 22:17:37.236410+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '302491fb0b28'
down_revision: Union[str, None] = '20260822_0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
