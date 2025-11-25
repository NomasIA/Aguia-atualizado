/*
  # Add valor_diaria field to diarista_ponto table

  ## Changes
  - Add `valor_diaria` column to `diarista_ponto` table to track the daily rate used for each point registration
  - This allows the system to store different rates for weekdays vs weekends at the time of point registration
  - Default to 0 to ensure compatibility with existing records

  ## Why this change
  - When a diarista works on Saturday or Sunday, the system needs to track which rate was applied
  - This ensures accurate payment calculations even if the rates change later
*/

-- Add valor_diaria column to diarista_ponto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diarista_ponto' AND column_name = 'valor_diaria'
  ) THEN
    ALTER TABLE diarista_ponto ADD COLUMN valor_diaria numeric(10,2) DEFAULT 0;
  END IF;
END $$;
