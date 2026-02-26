"""seed builtin templates

Revision ID: 004
Revises: 003
Create Date: 2025-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import json
from datetime import datetime, timezone


revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BULLET_JOURNAL_CONTENT = """## Daily Log — {{date}}

### Morning Brain Dump
- 

### Tasks
- [ ] 
- [ ] 
- [ ] 

### Events
- 

### Notes
> 

### Reflection
**What went well?**

**What could be better?**

**Gratitude:**
"""

WEEKLY_REVIEW_CONTENT = """## Weekly Review — Week of {{week_start}}

### What I Accomplished
- 

### What Didn't Get Done (and Why)
- 

### Lessons Learned
- 

### Energy & Wellbeing
Rate your week (1–10): 

Notes:

### Next Week
**Top 3 priorities:**
1. 
2. 
3. 

**Anything to schedule or prepare:**
- 
"""


def upgrade() -> None:
    templates_table = sa.table(
        'templates',
        sa.column('user_id', sa.Integer),
        sa.column('forked_from_id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('icon', sa.String),
        sa.column('content', sa.Text),
        sa.column('tags', sa.JSON),
        sa.column('trigger_conditions', sa.JSON),
        sa.column('is_public', sa.Boolean),
        sa.column('is_built_in', sa.Boolean),
        sa.column('created_at', sa.DateTime),
    )

    op.bulk_insert(templates_table, [
        {
            'user_id': None,
            'forked_from_id': None,
            'name': 'Bullet Journal',
            'description': 'Classic bullet journal daily log with rapid logging',
            'icon': '📓',
            'content': BULLET_JOURNAL_CONTENT,
            'tags': json.dumps(['daily', 'productivity', 'bullet-journal']),
            'trigger_conditions': None,
            'is_public': True,
            'is_built_in': True,
            'created_at': datetime.now(timezone.utc),
        },
        {
            'user_id': None,
            'forked_from_id': None,
            'name': 'Weekly Review',
            'description': 'End-of-week reflection and planning for the week ahead',
            'icon': '📅',
            'content': WEEKLY_REVIEW_CONTENT,
            'tags': json.dumps(['weekly', 'review', 'planning']),
            'trigger_conditions': json.dumps({'type': 'day_of_week', 'days': [6]}),
            'is_public': True,
            'is_built_in': True,
            'created_at': datetime.now(timezone.utc),
        },
    ])


def downgrade() -> None:
    op.execute("DELETE FROM templates WHERE is_built_in = true")