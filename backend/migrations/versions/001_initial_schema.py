"""initial schema

Revision ID: 001
Revises: 
Create Date: 2024-02-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('clerk_user_id', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('todoist_token', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('clerk_user_id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_clerk_user_id'), 'users', ['clerk_user_id'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=False, server_default='#6366f1'),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_index(op.f('ix_projects_name'), 'projects', ['name'], unique=False)

    op.create_table(
        'journal_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_journal_entries_id'), 'journal_entries', ['id'], unique=False)

    op.create_table(
        'entry_projects',
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['entry_id'], ['journal_entries.id'], ),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ),
        sa.PrimaryKeyConstraint('entry_id', 'project_id')
    )

    op.create_table(
        'entry_tasks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entry_id', sa.Integer(), nullable=False),
        sa.Column('todoist_task_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['entry_id'], ['journal_entries.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_entry_tasks_id'), 'entry_tasks', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_entry_tasks_id'), table_name='entry_tasks')
    op.drop_table('entry_tasks')
    op.drop_table('entry_projects')
    op.drop_index(op.f('ix_journal_entries_id'), table_name='journal_entries')
    op.drop_table('journal_entries')
    op.drop_index(op.f('ix_projects_name'), table_name='projects')
    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_clerk_user_id'), table_name='users')
    op.drop_table('users')
