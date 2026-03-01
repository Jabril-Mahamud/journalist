-- 0005_update_builtin_templates.sql
-- Updates the two built-in templates to use the structured ::type[Label] syntax.
-- The assembled markdown output is identical to the old plain-markdown content,
-- so no entries are affected — only the template definitions change.

UPDATE templates
SET content = E'## Daily Log — {{date}}\n\n::stars[Energy Level]\n\n::select[Day Type]{options="rest,push,work,recovery"}\n\n### Morning Brain Dump\n\n::textarea[Morning thoughts]\n\n### Tasks\n- [ ] \n- [ ] \n- [ ] \n\n### Reflection\n\n::text[What went well?]\n\n::text[What could be better?]\n\n::text[Gratitude]'
WHERE name = 'Bullet Journal'
    AND is_built_in = TRUE;

UPDATE templates
SET content = E'## Weekly Review — Week of {{week_start}}\n\n::stars[Week Rating]\n\n::select[Overall Vibe]{options="great,good,mixed,tough,rough"}\n\n::textarea[Accomplishments]\n\n::textarea[What didn''t get done (and why)]\n\n::textarea[Lessons learned]\n\n### Next Week\n\n::text[Top priority #1]\n\n::text[Top priority #2]\n\n::text[Top priority #3]\n\n::textarea[Anything to schedule or prepare]'
WHERE name = 'Weekly Review'
    AND is_built_in = TRUE;