/*
  # Add Anonymous Read Access to All Tables

  1. Changes
    - Add SELECT policies for anonymous users on all tables
    - This enables the application to work without authentication

  2. Security
    - Only SELECT access is granted to anonymous users
    - All write operations still require authentication
*/

-- Get all tables with RLS and add anon read policies
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
    LOOP
        -- Drop existing anon read policy if it exists
        EXECUTE format('DROP POLICY IF EXISTS "allow_anon_read_%I" ON %I', table_record.tablename, table_record.tablename);
        
        -- Create new anon read policy
        EXECUTE format('CREATE POLICY "allow_anon_read_%I" ON %I FOR SELECT TO anon USING (true)', table_record.tablename, table_record.tablename);
    END LOOP;
END $$;
