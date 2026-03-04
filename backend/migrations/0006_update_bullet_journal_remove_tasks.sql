-- 0006_update_bullet_journal_remove_tasks.sql
-- Removes the static markdown tasks section from the Bullet Journal template.
-- Tasks are handled by the Todoist TaskPanel on the entry dialog, not via
-- static markdown checkboxes in the template content.

UPDATE templates
SET content = E'## Daily Log — {{date}}\n\n::stars[Energy Level]\n\n::select[Day Type]{options="rest,push,work,recovery"}\n\n### Morning Brain Dump\n\n::textarea[Morning thoughts]\n\n### Reflection\n\n::text[What went well?]\n\n::text[What could be better?]\n\n::text[Gratitude]'
WHERE name = 'Bullet Journal'
    AND is_built_in = TRUE;