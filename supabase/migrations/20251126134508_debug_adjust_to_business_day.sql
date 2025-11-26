/*
  # Add debugging to adjust_to_business_day
  
  Adds RAISE NOTICE to debug why the function is returning wrong date
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
  
  RAISE NOTICE 'Starting adjust_to_business_day: original_date=%, dow=%', original_date, day_of_week;
  
  -- Handle Saturday: always move to Friday
  IF day_of_week = 6 THEN
    adjusted_date := adjusted_date - INTERVAL '1 day';
    RAISE NOTICE 'Saturday detected, moving to Friday: %', adjusted_date;
    RETURN adjusted_date;
  END IF;
  
  -- Handle Sunday: always move to Monday
  IF day_of_week = 0 THEN
    adjusted_date := adjusted_date + INTERVAL '1 day';
    RAISE NOTICE 'Sunday detected, moving to Monday: %', adjusted_date;
    RETURN adjusted_date;
  END IF;
  
  -- Handle holidays: move to previous business day
  WHILE iterations < max_iterations LOOP
    RAISE NOTICE 'Loop iteration %: checking date %, is_business_day=%', iterations, adjusted_date, is_business_day(adjusted_date);
    
    -- If current date is a business day, return it
    IF is_business_day(adjusted_date) THEN
      RAISE NOTICE 'Found business day: %', adjusted_date;
      RETURN adjusted_date;
    END IF;
    
    -- Not a business day, move backwards
    adjusted_date := adjusted_date - INTERVAL '1 day';
    day_of_week := EXTRACT(DOW FROM adjusted_date);
    
    RAISE NOTICE 'Moved to: %, dow=%', adjusted_date, day_of_week;
    
    -- Skip weekends while searching for business day
    IF day_of_week = 6 THEN
      adjusted_date := adjusted_date - INTERVAL '1 day';
      RAISE NOTICE 'Skipped Saturday, now at: %', adjusted_date;
    ELSIF day_of_week = 0 THEN
      adjusted_date := adjusted_date - INTERVAL '2 days';
      RAISE NOTICE 'Skipped Sunday, now at: %', adjusted_date;
    END IF;
    
    iterations := iterations + 1;
  END LOOP;
  
  RAISE NOTICE 'Max iterations reached, returning: %', adjusted_date;
  RETURN adjusted_date;
END;
$$ LANGUAGE plpgsql;
