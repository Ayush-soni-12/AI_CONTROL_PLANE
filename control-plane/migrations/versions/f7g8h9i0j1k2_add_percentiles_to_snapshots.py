"""Add p50 p95 p99 to aggregate_snapshots

Revision ID: f7g8h9i0j1k2
Revises: a1b2c3d4e5f6
Create Date: 2026-02-11 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7g8h9i0j1k2'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add p50, p95, p99 columns to aggregate_snapshots table."""
    op.add_column('aggregate_snapshots', sa.Column('p50', sa.Float(), server_default=sa.text('0'), nullable=True))
    op.add_column('aggregate_snapshots', sa.Column('p95', sa.Float(), server_default=sa.text('0'), nullable=True))
    op.add_column('aggregate_snapshots', sa.Column('p99', sa.Float(), server_default=sa.text('0'), nullable=True))


def downgrade() -> None:
    """Remove p50, p95, p99 columns from aggregate_snapshots table."""
    op.drop_column('aggregate_snapshots', 'p99')
    op.drop_column('aggregate_snapshots', 'p95')
    op.drop_column('aggregate_snapshots', 'p50')
