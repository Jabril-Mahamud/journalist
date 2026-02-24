"""add user_id indexes

Revision ID: 002
Revises: 001
Create Date: 2025-02-23

"""
from typing import Sequence, Union
from alembic import op

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if tables exist before creating indexes
    from sqlalchemy import text
    
    conn = op.get_context().connection
    
    journal_entries_exists = conn.execute(
        text("SELECT to_regclass('journal_entries')")
    ).scalar()
    
    projects_exists = conn.execute(
        text("SELECT to_regclass('projects')")
    ).scalar()
    
    if journal_entries_exists:
        op.create_index('ix_journal_entries_user_id', 'journal_entries', ['user_id'])
    
    if projects_exists:
        op.create_index('ix_projects_user_id', 'projects', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_journal_entries_user_id', table_name='journal_entries')
    op.drop_index('ix_projects_user_id', table_name='projects')