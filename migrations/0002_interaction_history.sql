ALTER TABLE wishes ADD COLUMN interaction_log_json TEXT CHECK (interaction_log_json IS NULL OR json_valid(interaction_log_json));
ALTER TABLE wishes ADD COLUMN interaction_summary TEXT;
