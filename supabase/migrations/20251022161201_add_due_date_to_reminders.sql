/*
  # Add due_date field to reminders table

  1. Changes
    - Add `due_date` column (timestamptz, nullable) to allow setting expiration dates for reminders
    - This enables tracking of expired reminders and filtering them in the UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE reminders ADD COLUMN due_date timestamptz;
  END IF;
END $$;