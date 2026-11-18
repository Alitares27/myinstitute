BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 1;
UPDATE users SET token_version = GREATEST(token_version, auth_version);

CREATE TABLE IF NOT EXISTS security_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id integer,
  target_id integer,
  action text NOT NULL,
  outcome text NOT NULL,
  module text
);

CREATE OR REPLACE FUNCTION maintain_user_security() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.role, OLD.permissions, OLD.password) IS DISTINCT FROM (NEW.role, NEW.permissions, NEW.password) THEN
    NEW.token_version := GREATEST(NEW.token_version, OLD.token_version + 1);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION audit_user_access() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('teacher', 'admin') THEN
      INSERT INTO security_events(actor_id, target_id, action, outcome)
      VALUES (NULLIF(current_setting('gestionar.actor_id', true), '')::integer, NEW.id, 'account_created', 'allowed');
    END IF;
  ELSIF (OLD.role, OLD.permissions) IS DISTINCT FROM (NEW.role, NEW.permissions) THEN
    INSERT INTO security_events(actor_id, target_id, action, outcome)
    VALUES (NULLIF(current_setting('gestionar.actor_id', true), '')::integer, NEW.id, 'access_changed', 'allowed');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS maintain_user_security ON users;
CREATE TRIGGER maintain_user_security BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION maintain_user_security();
DROP TRIGGER IF EXISTS audit_user_access ON users;
CREATE TRIGGER audit_user_access AFTER INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION audit_user_access();
COMMIT;
