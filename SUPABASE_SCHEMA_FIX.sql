-- =================================================================
-- SUPABASE SCHEMA FIX - funnel_stage Column Missing
-- =================================================================
-- Este script agrega la columna faltante 'funnel_stage' que está
-- causando errores PGRST204 en producción
-- =================================================================

-- Add fun nel_stage column to experiments table
ALTER TABLE experiments 
ADD COLUMN IF NOT EXISTS funnel_stage TEXT;

-- Add comment for documentation
COMMENT ON COLUMN experiments.funnel_stage IS 'Stage in the funnel: Acquisition, Activation, Retention, Revenue, Referral';

-- Update existing records with default value
UPDATE experiments 
SET funnel_stage = 'Activation' 
WHERE funnel_stage IS NULL;

-- Optional: Add check constraint for valid values
ALTER TABLE experiments
ADD CONSTRAINT experiments_funnel_stage_check 
CHECK (funnel_stage IN ('Acquisition', 'Activation', 'Retention', 'Revenue', 'Referral'))
NOT VALID;

-- Validate the constraint for existing rows
ALTER TABLE experiments
VALIDATE CONSTRAINT experiments_funnel_stage_check;

-- Success message
SELECT '✅ funnel_stage column added and configured successfully' AS status;

