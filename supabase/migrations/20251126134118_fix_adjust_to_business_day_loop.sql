/*
  # Fix adjust_to_business_day Loop Logic

  ## Problem
  The current function is moving the date TWICE when it should only move ONCE.
  
  For a holiday on Thursday (20/11):
  - Current: 20/11 → 19/11 → checks again → 18/11 (WRONG)
  - Expected: 20/11 → 19/11 → checks → STOP (CORRECT)

  ## Root Cause
  The WHILE loop condition `NOT is_business_day(adjusted_date)` checks the date BEFORE moving,
  then moves inside the loop, then loops again checking the NEW date.
  
  This causes it to move an extra day.

  ## Solution
  Move the date first, THEN check if it's a business day at the END of the loop.
  If it's a business day, exit. Otherwise continue moving.
*/

CREATE OR REPLACE FUNCTION adjust_to_business_day(
  original_date date,
  direction text DEFAULT 'before'
)
RETURNS date AS $$
DECLARE
  adjusted_date date;
  day_of_week int;
  max_iterations int := 15;
  iterations int := 0;
BEGIN
  adjusted_date := original_date;
  day_of_week := EXTRACT(DOW FROM adjusted_date);
  
  -- Handle Saturday: always move to Friday
  IF day_of_week = 6 THEN
    adjusted_date := adjusted_date - INTERVAL '1 day';
    RETURN adjusted_date;
  END IF;
  
  -- Handle Sunday: always move to Monday
  IF day_of_week = 0 THEN
    adjusted_date := adjusted_date + INTERVAL '1 day';
    RETURN adjusted_date;
  END IF;
  
  -- Handle holidays: move to previous business day
  WHILE iterations < max_iterations LOOP
    -- If current date is a business day, return it
    IF is_business_day(adjusted_date) THEN
      RETURN adjusted_date;
    END IF;
    
    -- Not a business day, move backwards
    adjusted_date := adjusted_date - INTERVAL '1 day';
    day_of_week := EXTRACT(DOW FROM adjusted_date);
    
    -- Skip weekends while searching for business day
    IF day_of_week = 6 THEN
      adjusted_date := adjusted_date - INTERVAL '1 day';
    ELSIF day_of_week = 0 THEN
      adjusted_date := adjusted_date - INTERVAL '2 days';
    END IF;
    
    iterations := iterations + 1;
  END LOOP;
  
  RETURN adjusted_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION adjust_to_business_day IS 'Ajusta data para dia útil seguindo regras bancárias: Sábado→Sexta-feira | Domingo→Segunda-feira | Feriado→Dia útil anterior';
