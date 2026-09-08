CREATE TABLE IF NOT EXISTS wishes (
  invitation_id TEXT PRIMARY KEY NOT NULL,
  answers_json TEXT NOT NULL CHECK (json_valid(answers_json)),
  note TEXT NOT NULL CHECK (length(note) <= 500),
  summary TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
