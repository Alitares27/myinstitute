BEGIN;
-- Original installations also have this three-role constraint. Leaving it in
-- place would reject finance even when the newer four-role constraint exists.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS gestionar_user_role;
ALTER TABLE users ADD CONSTRAINT gestionar_user_role CHECK(role IN ('admin','teacher','student','finance'));
CREATE OR REPLACE FUNCTION audit_user_access() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.role IN ('teacher','admin','finance') THEN
      INSERT INTO security_events(actor_id,target_id,action,outcome)
      VALUES(NULLIF(current_setting('gestionar.actor_id',true),'')::integer,NEW.id,'account_created','allowed');
    END IF;
  ELSIF (OLD.role,OLD.permissions) IS DISTINCT FROM (NEW.role,NEW.permissions) THEN
    INSERT INTO security_events(actor_id,target_id,action,outcome)
    VALUES(NULLIF(current_setting('gestionar.actor_id',true),'')::integer,NEW.id,'access_changed','allowed');
  END IF;
  RETURN NEW;
END;
$$;
COMMIT;
