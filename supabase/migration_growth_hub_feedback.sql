-- ============================================================================
-- Growth Hub — Migración feedback plataforma (8 items)
-- Ejecutar ENTERO en Supabase SQL Editor ANTES de desplegar el frontend.
--
-- Cubre: rol admin global (#2), panel adopción (#3), Key Learnings/Verdict (#6),
-- biblioteca global (#5), logo de panel de usuario, y fixes de esquema.
--
-- Rollback al final del archivo (comentado).
-- ============================================================================


-- ============================================================================
-- PART A: ENUMS
-- ============================================================================

-- A.1 Añadir 'viewer' a project_role_enum (el frontend ya lo usa; faltaba en DB)
ALTER TYPE project_role_enum ADD VALUE IF NOT EXISTS 'viewer';

-- A.2 Área de trabajo del usuario (#3)
DO $$ BEGIN
  CREATE TYPE user_area AS ENUM ('Paid Media', 'SEO', 'Crossmedia', 'CRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- PART B: COLUMNAS NUEVAS
-- ============================================================================

-- B.1 profiles: área, logo de panel personal, última actividad
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS area user_area;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS panel_logo_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- B.2 experiments: campo verdict separado de key_learnings (#6)
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS verdict text;

-- B.3 Backfill: los experimentos finished históricos tienen su insight de cierre
--     en key_learnings (el modal preguntaba "¿Qué aprendimos?"). Copiarlo a verdict
--     para que el panel "The Verdict" muestre datos históricos.
UPDATE experiments
  SET verdict = key_learnings
  WHERE status::text LIKE 'Finished%'
    AND verdict IS NULL
    AND key_learnings IS NOT NULL;


-- ============================================================================
-- PART C: is_superadmin() — evita recursión RLS
-- ============================================================================

-- SECURITY DEFINER: corre como owner, salta RLS de profiles → sin recursión cuando
-- se llama desde dentro de una policy de profiles.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role = 'superadmin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;


-- ============================================================================
-- PART D: PROTECCIÓN DE global_role
-- ============================================================================

-- RLS no puede restringir columnas. La policy "Users can update own profile" deja
-- que un usuario cambie su propio global_role (escalada de privilegios). Este
-- trigger lo bloquea: solo un superadmin cambia global_role, y no se puede degradar
-- al último superadmin (evita lockout de la plataforma).
CREATE OR REPLACE FUNCTION public.protect_global_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.global_role IS DISTINCT FROM OLD.global_role THEN
    -- auth.uid() IS NULL = contexto service-role / SQL Editor (confiable): se permite,
    -- es la vía para bootstrapear el primer superadmin. Con usuario logueado, exige superadmin.
    IF auth.uid() IS NOT NULL AND NOT public.is_superadmin() THEN
      RAISE EXCEPTION 'Solo un superadmin puede cambiar global_role';
    END IF;
    IF OLD.global_role = 'superadmin' AND NEW.global_role <> 'superadmin' THEN
      IF (SELECT count(*) FROM public.profiles WHERE global_role = 'superadmin') <= 1 THEN
        RAISE EXCEPTION 'No se puede degradar al último superadmin';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_global_role ON profiles;
CREATE TRIGGER trg_protect_global_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_global_role();


-- ============================================================================
-- PART E: ACTIVITY LOG (#3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can insert own activity"
    ON activity_log FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Read own or superadmin reads all activity"
    ON activity_log FOR SELECT
    USING (user_id = auth.uid() OR public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- PART F: RLS — reescribir policies de profiles con is_superadmin()
-- ============================================================================

-- F.1 SELECT superadmin (la versión vieja consultaba profiles dentro de profiles)
DROP POLICY IF EXISTS "Superadmins can read all profiles" ON profiles;
CREATE POLICY "Superadmins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_superadmin());

-- F.2 UPDATE superadmin sobre cualquier perfil (necesario para promover/gestionar).
--     El cambio de global_role sigue protegido por trg_protect_global_role.
DO $$ BEGIN
  CREATE POLICY "Superadmins can update any profile"
    ON profiles FOR UPDATE
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- PART G: RLS — superadmin en project_members
-- ============================================================================

-- G.1 SELECT: superadmin ve todas las membresías (para el panel admin)
DO $$ BEGIN
  CREATE POLICY "Superadmins can read all memberships"
    ON project_members FOR SELECT
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- G.2 UPDATE: admin del proyecto o superadmin (faltaba toda policy UPDATE)
DO $$ BEGIN
  CREATE POLICY "Project admins or superadmins update memberships"
    ON project_members FOR UPDATE
    USING (
      public.is_superadmin()
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = project_members.project_id
          AND pm.user_id = auth.uid()
          AND pm.role = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- G.3 DELETE: añadir superadmin a la policy existente
DROP POLICY IF EXISTS "Admins can delete memberships" ON project_members;
CREATE POLICY "Admins can delete memberships"
  ON project_members FOR DELETE
  USING (
    public.is_superadmin()
    OR EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
  );


-- ============================================================================
-- PART H: RLS — superadmin INSERT/UPDATE/DELETE en sub-tablas
-- ============================================================================

-- objectives
DO $$ BEGIN
  CREATE POLICY "Superadmins manage objectives ins"
    ON objectives FOR INSERT WITH CHECK (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Superadmins manage objectives upd"
    ON objectives FOR UPDATE USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Superadmins manage objectives del"
    ON objectives FOR DELETE USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- strategies
DO $$ BEGIN
  CREATE POLICY "Superadmins manage strategies ins"
    ON strategies FOR INSERT WITH CHECK (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Superadmins manage strategies upd"
    ON strategies FOR UPDATE USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Superadmins manage strategies del"
    ON strategies FOR DELETE USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- experiments
DO $$ BEGIN
  CREATE POLICY "Superadmins manage experiments ins"
    ON experiments FOR INSERT WITH CHECK (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Superadmins manage experiments upd"
    ON experiments FOR UPDATE USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Superadmins manage experiments del"
    ON experiments FOR DELETE USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- PART I: RPC — biblioteca global de experimentos finished (#5)
-- ============================================================================

-- SECURITY DEFINER: cualquier usuario autenticado ve los experimentos finalizados
-- de todos los proyectos (aprendizaje cruzado dentro de la agencia).
--
-- Devuelve jsonb (un array de objetos), NO una tabla tipada: así es agnóstico a
-- cualquier divergencia de tipos entre esta instancia y el esquema base (status,
-- funnel_stage, visual_proof, etc. pueden ser enum/text/text[]/jsonb sin afectar).
DROP FUNCTION IF EXISTS public.get_global_finished_experiments();

CREATE OR REPLACE FUNCTION public.get_global_finished_experiments()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  FROM (
    SELECT
      e.id,
      e.project_id,
      p.name AS project_name,
      e.title,
      e.status,
      e.owner_name,
      e.owner_avatar,
      -- Área de la disciplina = área del owner (match por nombre; el modelo
      -- guarda el owner como texto, no como FK).
      (SELECT pr.area FROM profiles pr
         WHERE lower(pr.full_name) = lower(e.owner_name) LIMIT 1) AS owner_area,
      e.hypothesis,
      e.observation,
      e.problem,
      e.funnel_stage,
      e.north_star_metric,
      e.impact,
      e.confidence,
      e.ease,
      e.ice_score,
      e.start_date,
      e.end_date,
      e.key_learnings,
      e.verdict,
      e.visual_proof
    FROM experiments e
    JOIN projects p ON p.id = e.project_id
    WHERE e.status::text IN (
      'Finished - Winner', 'Finished - Loser', 'Finished - Inconclusive'
    )
    ORDER BY e.end_date DESC NULLS LAST
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_finished_experiments() TO authenticated;


-- ============================================================================
-- PART J: STORAGE — bucket logo de panel de usuario
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-panel-logos', 'user-panel-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Convención de ruta: <auth.uid>/logo.<ext> — escritura solo del dueño, lectura pública.
DO $$ BEGIN
  CREATE POLICY "Users can upload own panel logo"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'user-panel-logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own panel logo"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'user-panel-logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own panel logo"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'user-panel-logos'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public panel logo access"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'user-panel-logos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- ✅ DONE.
--
-- BOOTSTRAP DEL PRIMER SUPERADMIN — ejecutar UNA vez con tu email:
--   UPDATE profiles SET global_role = 'superadmin'
--     WHERE email = 'tu-email@moovmediagroup.com';
--
-- Verificar:
--   SELECT email, global_role FROM profiles WHERE global_role = 'superadmin';
--   SELECT * FROM public.get_global_finished_experiments() LIMIT 1;
-- ============================================================================


-- ============================================================================
-- ROLLBACK (descomentar y ejecutar solo si hay que revertir)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.get_global_finished_experiments();
-- DROP TRIGGER IF EXISTS trg_protect_global_role ON profiles;
-- DROP FUNCTION IF EXISTS public.protect_global_role();
-- DROP POLICY IF EXISTS "Superadmins can update any profile" ON profiles;
-- DROP POLICY IF EXISTS "Superadmins can read all memberships" ON project_members;
-- DROP POLICY IF EXISTS "Project admins or superadmins update memberships" ON project_members;
-- DROP POLICY IF EXISTS "Superadmins manage objectives ins" ON objectives;
-- DROP POLICY IF EXISTS "Superadmins manage objectives upd" ON objectives;
-- DROP POLICY IF EXISTS "Superadmins manage objectives del" ON objectives;
-- DROP POLICY IF EXISTS "Superadmins manage strategies ins" ON strategies;
-- DROP POLICY IF EXISTS "Superadmins manage strategies upd" ON strategies;
-- DROP POLICY IF EXISTS "Superadmins manage strategies del" ON strategies;
-- DROP POLICY IF EXISTS "Superadmins manage experiments ins" ON experiments;
-- DROP POLICY IF EXISTS "Superadmins manage experiments upd" ON experiments;
-- DROP POLICY IF EXISTS "Superadmins manage experiments del" ON experiments;
-- DROP TABLE IF EXISTS activity_log;
-- ALTER TABLE experiments DROP COLUMN IF EXISTS verdict;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS last_seen_at;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS area;
-- (panel_logo_url y el enum user_area / valor 'viewer' se dejan: son inocuos)
-- ============================================================================
