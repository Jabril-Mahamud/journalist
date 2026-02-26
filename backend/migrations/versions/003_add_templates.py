"""add templates table

Revision ID: 003
Revises: 002
Create Date: 2025-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_context().connection

    templates_exists = conn.execute(
        sa.text("SELECT to_regclass('templates')")
    ).scalar()

    if not templates_exists:
        op.create_table(
            'templates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('forked_from_id', sa.Integer(), nullable=True),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('description', sa.String(length=500), nullable=True),
            sa.Column('icon', sa.String(length=10), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('tags', sa.JSON(), nullable=False, server_default='[]'),
            sa.Column('trigger_conditions', sa.JSON(), nullable=True),
            sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('is_built_in', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.ForeignKeyConstraint(['forked_from_id'], ['templates.id']),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_templates_id'), 'templates', ['id'], unique=False)
        op.create_index('ix_templates_user_id', 'templates', ['user_id'], unique=False)
        op.create_index('ix_templates_is_built_in', 'templates', ['is_built_in'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_templates_is_built_in', table_name='templates')
    op.drop_index('ix_templates_user_id', table_name='templates')
    op.drop_index(op.f('ix_templates_id'), table_name='templates')
    op.drop_table('templates')