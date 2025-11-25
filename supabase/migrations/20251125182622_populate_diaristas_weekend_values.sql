/*
  # Populate weekend values for existing diaristas

  ## Changes
  - Set valor_diaria_semana to valor_diaria for all existing records where it's NULL
  - Set valor_diaria_fimsemana to valor_diaria for all existing records where it's NULL
  - This ensures backward compatibility and proper calculations

  ## Why this change
  - Existing diaristas records have NULL values for the new weekend fields
  - This causes the system to fall back to valor_diaria, which works correctly
  - But it's better to have explicit values set for clarity and proper display
*/

-- Populate valor_diaria_semana with valor_diaria where NULL
UPDATE diaristas
SET valor_diaria_semana = valor_diaria
WHERE valor_diaria_semana IS NULL;

-- Populate valor_diaria_fimsemana with valor_diaria where NULL
UPDATE diaristas
SET valor_diaria_fimsemana = valor_diaria
WHERE valor_diaria_fimsemana IS NULL;
