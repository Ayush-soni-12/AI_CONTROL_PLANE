"""Add ai_thresholds and ai_insights tables

Revision ID: a1b2c3d4e5f6
Revises: db51077434eb
Create Date: 2026-02-11 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e33a78f63e55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create ai_thresholds and ai_insights tables."""
    
    # AI Thresholds table
    op.create_table('ai_thresholds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('service_name', sa.String(), nullable=False),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('cache_latency_ms', sa.Integer(), server_default=sa.text('500'), nullable=False),
        sa.Column('circuit_breaker_error_rate', sa.Float(), server_default=sa.text('0.3'), nullable=False),
        sa.Column('queue_deferral_rpm', sa.Integer(), server_default=sa.text('80'), nullable=False),
        sa.Column('load_shedding_rpm', sa.Integer(), server_default=sa.text('150'), nullable=False),
        sa.Column('rate_limit_customer_rpm', sa.Integer(), server_default=sa.text('15'), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('reasoning', sa.String(), nullable=True),
        sa.Column('last_updated', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_ai_threshold_unique', 'ai_thresholds', ['user_id', 'service_name', 'endpoint'], unique=True)
    op.create_index(op.f('ix_ai_thresholds_endpoint'), 'ai_thresholds', ['endpoint'], unique=False)
    op.create_index(op.f('ix_ai_thresholds_service_name'), 'ai_thresholds', ['service_name'], unique=False)
    op.create_index(op.f('ix_ai_thresholds_user_id'), 'ai_thresholds', ['user_id'], unique=False)
    
    # AI Insights table
    op.create_table('ai_insights',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('service_name', sa.String(), nullable=False),
        sa.Column('insight_type', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_ai_insight_user_time', 'ai_insights', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_ai_insights_service_name'), 'ai_insights', ['service_name'], unique=False)
    op.create_index(op.f('ix_ai_insights_user_id'), 'ai_insights', ['user_id'], unique=False)


def downgrade() -> None:
    """Drop ai_thresholds and ai_insights tables."""
    op.drop_index('idx_ai_insight_user_time', table_name='ai_insights')
    op.drop_index(op.f('ix_ai_insights_service_name'), table_name='ai_insights')
    op.drop_index(op.f('ix_ai_insights_user_id'), table_name='ai_insights')
    op.drop_table('ai_insights')
    
    op.drop_index('idx_ai_threshold_unique', table_name='ai_thresholds')
    op.drop_index(op.f('ix_ai_thresholds_endpoint'), table_name='ai_thresholds')
    op.drop_index(op.f('ix_ai_thresholds_service_name'), table_name='ai_thresholds')
    op.drop_index(op.f('ix_ai_thresholds_user_id'), table_name='ai_thresholds')
    op.drop_table('ai_thresholds')
