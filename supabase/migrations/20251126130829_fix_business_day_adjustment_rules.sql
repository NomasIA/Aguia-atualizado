/*
  # Fix Business Day Adjustment Rules

  This migration updates the `adjust_to_business_day` function to correctly handle payment date adjustments according to Brazilian banking calendar rules:

  ## Changes
  - **Saturday (day 6)**: Payment moved to Friday (previous business day)
  - **Sunday (day 0)**: Payment moved to Monday (next business day) 
  - **Holiday**: Payment moved to previous business day

  ## Previous Behavior (INCORRECT)
  - Sunday with direction='before': Moved 2 days back to Friday
  - Sunday with direction='after': Moved 1 day forward to Monday

  ## New Behavior (CORRECT)
  - Saturday: Always moves to Friday (-1 day)
  - Sunday: Always moves to Monday (+1 day)
  - Holiday: Always moves to previous business day

  This ensures payments scheduled for Sunday are correctly moved to the following Monday, not to the previous Friday.
*/

-- Update the adjust_to_business_day function with correct weekend handling
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
  WHILE NOT is_business_day(adjusted_date) AND iterations < max_iterations LOOP
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
