-- Apply after reviewing any existing invalid data. NOT VALID preserves history.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'temple_attendance_amounts_valid') THEN
    ALTER TABLE temple_attendance ADD CONSTRAINT temple_attendance_amounts_valid
      CHECK (advance_payment >= 0 AND pending_payment >= 0 AND advance_payment::text NOT IN ('NaN','Infinity','-Infinity') AND pending_payment::text NOT IN ('NaN','Infinity','-Infinity')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'temple_amortizations_positive_amount') THEN
    ALTER TABLE temple_amortizations ADD CONSTRAINT temple_amortizations_positive_amount
      CHECK (payment_amount > 0 AND payment_amount::text NOT IN ('NaN','Infinity','-Infinity')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grades_valid_range') THEN
    ALTER TABLE grades ADD CONSTRAINT grades_valid_range CHECK (grade BETWEEN 0 AND 100 AND grade::text <> 'NaN') NOT VALID;
  END IF;
END $$;
COMMIT;
