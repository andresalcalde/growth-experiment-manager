-- Add logo_url field to projects for PNG logo support
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo_url text;

-- Create bucket for project logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users can upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-logos');

-- Policy: public read access for logos
CREATE POLICY "Public logo access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-logos');

-- Policy: authenticated users can update/delete logos
CREATE POLICY "Authenticated users can manage logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-logos');

CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-logos');
