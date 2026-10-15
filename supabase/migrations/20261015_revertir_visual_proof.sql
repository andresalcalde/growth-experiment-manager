-- Companion to RLS rollback ONLY when reverting the frontend; stop traffic first.
-- Set the public Supabase origin explicitly in the same SQL session (no secrets):
-- SET app.rollback_supabase_url = 'https://<project-ref>.supabase.co';
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
 IF nullif(current_setting('app.rollback_supabase_url',true),'') IS NULL THEN
   RAISE EXCEPTION 'Set app.rollback_supabase_url before reverting visual_proof';
 END IF;
END $$;
UPDATE public.experiments e SET visual_proof = (
 SELECT array_agg(CASE WHEN ref LIKE 'storage://experiment-evidence/%' THEN
   rtrim(current_setting('app.rollback_supabase_url'),'/') || '/storage/v1/object/public/experiment-evidence/' ||
   replace(replace(replace(substring(ref FROM length('storage://experiment-evidence/')+1),'%','%25'),' ','%20'),'#','%23')
   ELSE ref END ORDER BY ord)
 FROM unnest(e.visual_proof) WITH ORDINALITY v(ref,ord)
) WHERE EXISTS(SELECT 1 FROM unnest(e.visual_proof) v(ref) WHERE ref LIKE 'storage://experiment-evidence/%');
COMMIT;
