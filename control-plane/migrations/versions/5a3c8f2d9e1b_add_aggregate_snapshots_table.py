"""add_aggregate_snapshots_table

Revision ID: 5a3c8f2d9e1b
Revises: 429c109fb142
Create Date: 2026-02-04 07:17:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a3c8f2d9e1b'
down_revision: Union[str, None] = '429c109fb142'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create aggregate_snapshots table
    op.create_table(
        'aggregate_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('service_name', sa.String(), nullable=False),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('window', sa.String(), nullable=False),
        sa.Column('snapshot_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('count', sa.Integer(), nullable=False),
        sa.Column('sum_latency', sa.Float(), nullable=False),
        sa.Column('errors', sa.Integer(), nullable=False),
        sa.Column('avg_latency', sa.Float(), nullable=False),
        sa.Column('error_rate', sa.Float(), nullable=False),
        sa.Column('last_updated', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_snapshot_lookup', 'aggregate_snapshots', 
                    ['user_id', 'service_name', 'endpoint', 'window'])
    op.create_index('idx_snapshot_cleanup', 'aggregate_snapshots', ['snapshot_at'])
    op.create_index('idx_snapshot_latest', 'aggregate_snapshots', 
                    ['user_id', 'service_name', 'endpoint', 'window', 'snapshot_at'])
    
    # Individual column indexes
    op.create_index(op.f('ix_aggregate_snapshots_user_id'), 'aggregate_snapshots', ['user_id'], unique=False)
    op.create_index(op.f('ix_aggregate_snapshots_service_name'), 'aggregate_snapshots', ['service_name'], unique=False)
    op.create_index(op.f('ix_aggregate_snapshots_endpoint'), 'aggregate_snapshots', ['endpoint'], unique=False)
    op.create_index(op.f('ix_aggregate_snapshots_window'), 'aggregate_snapshots', ['window'], unique=False)
    op.create_index(op.f('ix_aggregate_snapshots_snapshot_at'), 'aggregate_snapshots', ['snapshot_at'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_aggregate_snapshots_snapshot_at'), table_name='aggregate_snapshots')
    op.drop_index(op.f('ix_aggregate_snapshots_window'), table_name='aggregate_snapshots')
    op.drop_index(op.f('ix_aggregate_snapshots_endpoint'), table_name='aggregate_snapshots')
    op.drop_index(op.f('ix_aggregate_snapshots_service_name'), table_name='aggregate_snapshots')
    op.drop_index(op.f('ix_aggregate_snapshots_user_id'), table_name='aggregate_snapshots')
    op.drop_index('idx_snapshot_latest', table_name='aggregate_snapshots')
    op.drop_index('idx_snapshot_cleanup', table_name='aggregate_snapshots')
    op.drop_index('idx_snapshot_lookup', table_name='aggregate_snapshots')
    
    # Drop table
    op.drop_table('aggregate_snapshots')
