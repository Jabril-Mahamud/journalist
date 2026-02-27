CREATE INDEX ix_users_id ON users(id);
CREATE UNIQUE INDEX ix_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX ix_projects_id ON projects(id);
CREATE INDEX ix_projects_name ON projects(name);
CREATE INDEX ix_projects_user_id ON projects(user_id);
CREATE INDEX ix_journal_entries_id ON journal_entries(id);
CREATE INDEX ix_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX ix_entry_tasks_id ON entry_tasks(id);