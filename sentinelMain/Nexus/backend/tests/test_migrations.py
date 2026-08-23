import pytest
from alembic.config import Config
from alembic import command
from app.core.config import settings


def test_alembic_migration_lifecycle():
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

    # 1. Test upgrade head
    command.upgrade(alembic_cfg, "head")

    # 2. Test current
    command.current(alembic_cfg)

    # 3. Test history
    command.history(alembic_cfg)



