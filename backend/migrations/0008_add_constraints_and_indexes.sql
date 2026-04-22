ALTER TABLE entry_tasks
  ADD CONSTRAINT uq_entry_tasks_entry_task
  UNIQUE (entry_id, todoist_task_id);

CREATE INDEX ix_journal_entries_created_at
  ON journal_entries(created_at DESC);

DROP INDEX IF EXISTS ix_users_id;
DROP INDEX IF EXISTS ix_projects_id;
DROP INDEX IF EXISTS ix_journal_entries_id;
DROP INDEX IF EXISTS ix_entry_tasks_id;
