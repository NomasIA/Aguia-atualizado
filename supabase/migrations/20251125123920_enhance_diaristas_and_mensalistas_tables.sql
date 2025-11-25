/*
  # Enhance diaristas and funcionarios_mensalistas tables

  ## Purpose
  This migration adds specialized fields to diaristas for weekday/weekend rate differentiation
  and adds Vale Refeição (meal allowance) calculator fields to funcionarios_mensalistas.

  ## Table Changes

  ### 1. diaristas - Add weekday/weekend rate fields
  Supports automatic calculation of daily rates based on work schedule.
  
  **New fields to add**:
  - `valor_diaria_semana` (numeric(14,2)) - Weekday daily rate (Monday-Friday)
  - `valor_diaria_fimsemana` (numeric(14,2)) - Weekend daily rate (Saturday-Sunday)
  
  **Note**: Existing `valor_diaria` field will be kept for backward compatibility

  ### 2. funcionarios_mensalistas - Add Vale Refeição calculator fields
  Enables automatic calculation of meal allowance (Vale Refeição) for monthly employees.
  
  **New fields to add**:
  - `vale_refeicao_valor_dia` (numeric(14,2), nullable) - Daily meal allowance value
  - `vale_refeicao_dias_mes` (integer, nullable) - Number of meal allowance days per month
  - `vale_refeicao_total_calculado` (numeric(14,2), nullable) - Calculated total (valor_dia * dias_mes)

  ## Usage

  ### Diaristas weekday/weekend rates:
  - Used by payroll calculator to automatically apply correct rate based on work date
  - Weekend work typically has higher rates
  - Weekdays = Monday to Friday
  - Weekend = Saturday and Sunday

  ### Vale Refeição calculator:
  - `vale_refeicao_valor_dia`: Set by user in employee edit screen
  - `vale_refeicao_dias_mes`: Number of working days employee receives meal allowance
  - `vale_refeicao_total_calculado`: Auto-calculated in UI (valor_dia * dias_mes)
  - Used in monthly payroll processing

  ## Security
  - RLS disabled (consistent with existing tables)

  ## Notes
  - All new fields are nullable for backward compatibility
  - Existing records will have NULL values until manually populated
*/

-- Enhance diaristas table with weekday/weekend rates
DO $$
BEGIN
  -- Add valor_diaria_semana field (weekday rate)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diaristas' AND column_name = 'valor_diaria_semana'
  ) THEN
    ALTER TABLE diaristas ADD COLUMN valor_diaria_semana numeric(14,2);
  END IF;

  -- Add valor_diaria_fimsemana field (weekend rate)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'diaristas' AND column_name = 'valor_diaria_fimsemana'
  ) THEN
    ALTER TABLE diaristas ADD COLUMN valor_diaria_fimsemana numeric(14,2);
  END IF;
END $$;

-- Enhance funcionarios_mensalistas table with Vale Refeição calculator
DO $$
BEGIN
  -- Add vale_refeicao_valor_dia field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios_mensalistas' AND column_name = 'vale_refeicao_valor_dia'
  ) THEN
    ALTER TABLE funcionarios_mensalistas ADD COLUMN vale_refeicao_valor_dia numeric(14,2);
  END IF;

  -- Add vale_refeicao_dias_mes field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios_mensalistas' AND column_name = 'vale_refeicao_dias_mes'
  ) THEN
    ALTER TABLE funcionarios_mensalistas ADD COLUMN vale_refeicao_dias_mes integer;
  END IF;

  -- Add vale_refeicao_total_calculado field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios_mensalistas' AND column_name = 'vale_refeicao_total_calculado'
  ) THEN
    ALTER TABLE funcionarios_mensalistas ADD COLUMN vale_refeicao_total_calculado numeric(14,2);
  END IF;
END $$;

-- Add helpful comments for diaristas
COMMENT ON COLUMN diaristas.valor_diaria_semana IS 
  'Daily rate for weekdays (Monday-Friday). Used for automatic payroll calculation';

COMMENT ON COLUMN diaristas.valor_diaria_fimsemana IS 
  'Daily rate for weekends (Saturday-Sunday). Typically higher than weekday rate';

-- Add helpful comments for funcionarios_mensalistas
COMMENT ON COLUMN funcionarios_mensalistas.vale_refeicao_valor_dia IS 
  'Daily meal allowance value (Vale Refeição). Set by user in employee edit screen';

COMMENT ON COLUMN funcionarios_mensalistas.vale_refeicao_dias_mes IS 
  'Number of days per month employee receives meal allowance. Typically number of working days';

COMMENT ON COLUMN funcionarios_mensalistas.vale_refeicao_total_calculado IS 
  'Auto-calculated total meal allowance: valor_dia * dias_mes. Calculated in UI before saving';

-- Add indexes for performance (optional, for reporting queries)
CREATE INDEX IF NOT EXISTS idx_diaristas_valor_diaria_semana 
  ON diaristas(valor_diaria_semana) WHERE valor_diaria_semana IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mensalistas_vale_refeicao 
  ON funcionarios_mensalistas(vale_refeicao_total_calculado) WHERE vale_refeicao_total_calculado IS NOT NULL;
