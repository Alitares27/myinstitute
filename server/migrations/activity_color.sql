ALTER TABLE activity_plans
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#2563eb'
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
