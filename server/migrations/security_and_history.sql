BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
ALTER TABLE temples ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE temple_trips ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE TABLE IF NOT EXISTS financial_events (
  id bigserial PRIMARY KEY,
  actor_id integer,
  event_type text NOT NULL,
  reservation_id integer,
  payment_id integer,
  details jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financial_events_reservation ON financial_events(reservation_id,created_at);
CREATE INDEX IF NOT EXISTS idx_payment_reservation ON temple_amortizations(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_day ON attendance(course_id,date);
CREATE INDEX IF NOT EXISTS idx_grades_student_course_page ON grades(student_id,course_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_payments_date_page ON temple_amortizations(payment_date DESC,id DESC);
COMMIT;
