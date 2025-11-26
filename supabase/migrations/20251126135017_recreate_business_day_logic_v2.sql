/*
  # Recriar Lógica de Dias Úteis do Zero

  ## Regras Bancárias Brasileiras
  
  1. **Sábado** → Move para sexta-feira anterior
  2. **Domingo** → Move para segunda-feira seguinte
  3. **Feriado** → Move para dia útil anterior
  
  ## Lógica Simples
  
  Para ajustar uma data:
  1. Se for sábado → volta 1 dia (sexta)
  2. Se for domingo → avança 1 dia (segunda)
  3. Se for feriado → volta 1 dia e repete até achar dia útil
  
  ## Exemplos
  
  - 20/11/2025 (quinta, feriado) → 19/11/2025 (quarta, útil) ✓
  - 15/11/2025 (sábado) → 14/11/2025 (sexta) ✓
  - 16/11/2025 (domingo) → 17/11/2025 (segunda) ✓
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS adjust_to_business_day(date, text);
DROP FUNCTION IF EXISTS is_business_day(date);

-- Recriar is_business_day: retorna TRUE se for dia útil
CREATE FUNCTION is_business_day(check_date date)
RETURNS boolean AS $$
DECLARE
  day_of_week int;
BEGIN
  day_of_week := EXTRACT(DOW FROM check_date);
  
  -- Sábado (6) ou Domingo (0) = não é dia útil
  IF day_of_week = 0 OR day_of_week = 6 THEN
    RETURN false;
  END IF;
  
  -- Verificar se está nos feriados
  IF EXISTS (
    SELECT 1 
    FROM feriados 
    WHERE data = check_date
  ) THEN
    RETURN false;
  END IF;
  
  -- É dia útil
  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Recriar adjust_to_business_day: ajusta data para dia útil
CREATE FUNCTION adjust_to_business_day(
  original_date date,
  direction text DEFAULT 'before'
)
RETURNS date AS $$
DECLARE
  adjusted_date date;
  day_of_week int;
  iterations int := 0;
  max_iterations int := 30;
BEGIN
  adjusted_date := original_date;
  
  -- Loop até encontrar dia útil
  WHILE iterations < max_iterations LOOP
    day_of_week := EXTRACT(DOW FROM adjusted_date);
    
    -- Regra 1: Sábado → Sexta (volta 1)
    IF day_of_week = 6 THEN
      adjusted_date := adjusted_date - INTERVAL '1 day';
      CONTINUE;
    END IF;
    
    -- Regra 2: Domingo → Segunda (avança 1)
    IF day_of_week = 0 THEN
      adjusted_date := adjusted_date + INTERVAL '1 day';
      CONTINUE;
    END IF;
    
    -- Regra 3: Feriado → Dia anterior (volta 1)
    IF EXISTS (SELECT 1 FROM feriados WHERE data = adjusted_date) THEN
      adjusted_date := adjusted_date - INTERVAL '1 day';
      iterations := iterations + 1;
      CONTINUE;
    END IF;
    
    -- Encontrou dia útil!
    RETURN adjusted_date;
  END LOOP;
  
  -- Segurança: se passar do limite, retorna a data atual
  RETURN adjusted_date;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_business_day IS 'Verifica se uma data é dia útil (não é sábado, domingo ou feriado)';
COMMENT ON FUNCTION adjust_to_business_day IS 'Ajusta data para dia útil: Sábado→Sexta | Domingo→Segunda | Feriado→Anterior';
