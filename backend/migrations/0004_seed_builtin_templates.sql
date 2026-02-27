INSERT INTO templates (user_id, forked_from_id, name, description, icon, content, tags, trigger_conditions, is_public, is_built_in, created_at)
VALUES
(
    NULL,
    NULL,
    'Bullet Journal',
    'Classic bullet journal daily log with rapid logging',
    '📓',
    E'## Daily Log — {{date}}\n\n### Morning Brain Dump\n- \n\n### Tasks\n- [ ] \n- [ ] \n- [ ] \n\n### Events\n- \n\n### Notes\n> \n\n### Reflection\n**What went well?**\n\n**What could be better?**\n\n**Gratitude:**\n',
    '["daily", "productivity", "bullet-journal"]',
    NULL,
    TRUE,
    TRUE,
    NOW()
),
(
    NULL,
    NULL,
    'Weekly Review',
    'End-of-week reflection and planning for the week ahead',
    '📅',
    E'## Weekly Review — Week of {{week_start}}\n\n### What I Accomplished\n- \n\n### What Didn''t Get Done (and Why)\n- \n\n### Lessons Learned\n- \n\n### Energy & Wellbeing\nRate your week (1–10): \n\nNotes:\n\n### Next Week\n**Top 3 priorities:**\n1. \n2. \n3. \n\n**Anything to schedule or prepare:**\n- \n',
    '["weekly", "review", "planning"]',
    '{"type": "day_of_week", "days": [6]}',
    TRUE,
    TRUE,
    NOW()
);