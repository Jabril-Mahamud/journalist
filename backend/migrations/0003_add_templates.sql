CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    forked_from_id INTEGER REFERENCES templates(id),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    icon VARCHAR(10),
    content TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]',
    trigger_conditions JSONB,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_templates_id ON templates(id);
CREATE INDEX ix_templates_user_id ON templates(user_id);
CREATE INDEX ix_templates_is_built_in ON templates(is_built_in);