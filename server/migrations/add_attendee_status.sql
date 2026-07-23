-- Add attendance confirmation status to meeting_attendees junction table
-- Values: 'pending' (default), 'confirmed', 'declined'

ALTER TABLE public.meeting_attendees
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Add a check constraint to ensure only valid statuses are stored
ALTER TABLE public.meeting_attendees
ADD CONSTRAINT chk_attendee_status
CHECK (status IN ('pending', 'confirmed', 'declined'));

COMMENT ON COLUMN public.meeting_attendees.status IS 'Attendance confirmation status: pending, confirmed, or declined';