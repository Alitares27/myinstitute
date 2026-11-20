BEGIN;
CREATE TABLE IF NOT EXISTS notification_settings (
 id integer PRIMARY KEY CHECK (id=1),
 activity_days integer NOT NULL DEFAULT 7 CHECK (activity_days BETWEEN 0 AND 365),
 meeting_days integer NOT NULL DEFAULT 3 CHECK (meeting_days BETWEEN 0 AND 365),
 attendance_day integer NOT NULL DEFAULT 6 CHECK (attendance_day BETWEEN 0 AND 6),
 attendance_time time NOT NULL DEFAULT '19:00',
 time_zone text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
 activities_enabled boolean NOT NULL DEFAULT true,
 meetings_enabled boolean NOT NULL DEFAULT true,
 attendance_enabled boolean NOT NULL DEFAULT true
);
INSERT INTO notification_settings(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS notification_reads (
 user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 notification_key text NOT NULL,
 read_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id, notification_key)
);
COMMIT;
