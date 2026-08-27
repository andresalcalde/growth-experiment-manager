# Ajustes Growth Hub: visibilidad admins, superadmin y trazabilidad — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Modelo de ejecución:** cada task se despacha a un subagente con `model: "opus"` vía el Agent tool. Tasks marcadas ⏸ GATE requieren acción manual del usuario (SQL Editor de Supabase / GO de deploy) y NO pueden delegarse.

**Goal:** Implementar los 3 pedidos del correo de Catalina Bravo (2026-08-26): visibilidad de líderes (rol admin) sobre sus equipos, acceso superadmin a todos los proyectos, y panel de uso con filtro de fecha + trazabilidad de quién crea/resuelve experimentos.

**Architecture:** BD primero (4 migraciones SQL idempotentes aplicadas manualmente en Supabase SQL Editor), verificación automatizada por script REST multi-cuenta, luego frontend (logging enriquecido → vista "Mi equipo" → panel Uso), QA multi-rol en navegador, deploy gateado.

**Tech Stack:** React 19 + TypeScript + Vite, Supabase (PostgreSQL/RLS/RPC SECURITY DEFINER), Vercel (auto-deploy en push a main).

**Spec:** Correo "Ajustes Plataforma Growth Hub" (Catalina Bravo, 2026-08-26) + análisis en la conversación del 2026-08-27. Resumen de los 3 puntos:
1. Usuarios con rol admin (líderes de célula) ven la actividad de sus equipos asignados y sus proyectos.
2. Superadmins visualizan todos los proyectos activos sin membresía explícita.
3. Panel de uso con filtro por fecha y trazabilidad: quién creó un experimento y quién lo resolvió/completó, independiente del responsable (owner).

## Global Constraints

- Repo: `C:\Users\crist\Documents\growth-experiment-manager`. Producción: https://growth-experiment-manager.vercel.app — Supabase `https://oumhhngnwjijtmgpnhba.supabase.co`.
- **La BD de prod diverge del repo** (hecho conocido y verificado). Toda migración debe ser idempotente (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE`) y **aditiva** donde sea posible: nunca reescribir políticas existentes que funcionan; agregar políticas OR nuevas.
- Las migraciones SQL se aplican **manualmente por el usuario** en el SQL Editor de Supabase (no hay service_role key local). El código frontend que dependa de columnas/RPCs nuevas NO se despliega antes de aplicar el SQL.
- No hay test runner (sin Jest/Vitest) y no se agrega uno. La verificación es: `npm run build:typecheck`, script `scripts/verify-rls.mjs` (asserts REST contra prod con cuentas de prueba) y QA manual en navegador con 3 roles.
- Commits locales por task con mensajes descriptivos. **Push a main = deploy a PROD (Vercel)** → requiere GO explícito del usuario (Gate B). No push sin GO.
- Estilo frontend: inline styles + patrones existentes de `AdminView.tsx` (tablas, MetricCard, selects). Texto de UI en español. No introducir librerías nuevas.
- Los subagentes deben leer el `CLAUDE.md` del repo. Si las tools MCP de GitNexus no están disponibles en la sesión, continuar sin ellas (el índice se regenera al final con `npx gitnexus analyze`).
- Roles globales: `superadmin` | `admin` (líder) | `user` (`profiles.global_role`). Roles de proyecto: `admin`/`editor`/`viewer` (`project_members.role`). No confundir.
- Trazabilidad histórica: el creador de experimentos pasados se backfillea desde `activity_log`; **quién resolvió en el pasado no es reconstruible** (nunca se guardó el estado destino). La UI debe declarar esta limitación.

## Decisiones de diseño ya validadas (no re-litigar durante ejecución)

| # | Decisión | Razón |
|---|----------|-------|
| D1 | Acceso de líderes vía **RPCs SECURITY DEFINER** (`lead_*`), no relajando RLS de `experiments`/`projects` | Evita recursión y no amplía acceso de escritura; patrón ya usado (`admin_*`) |
| D2 | Fix de recursión de teams con **funciones helper SECURITY DEFINER** (`is_team_member_of`, `is_team_lead_of`) | Mismo patrón que `FIX_RLS_RECURSION.sql` usó para `project_members` |
| D3 | Visibilidad superadmin como **políticas SELECT adicionales** (`"Superadmins read all X"`), sin tocar las existentes | Aditivo = riesgo cero de romper acceso actual, sea cual sea el estado real de prod |
| D4 | `experiments.created_by uuid DEFAULT auth.uid()` + backfill desde `activity_log` | El default en BD cubre inserts de cliente y de RPCs sin tocar cada call-site |
| D5 | `resolved_by`/`resolved_at` se setean en `updateExperiment` al pasar a `Finished - *` y se limpian al salir de Finished | Regla simple; `activity_log.details` guarda el rastro completo por si se re-resuelve |
| D6 | `activity_log.details jsonb` guarda `{from, to, title}` en cada movimiento | Permite auditar transiciones y mostrar títulos de experimentos ya borrados |
| D7 | El portfolio **excluye proyectos archivados** para todos los roles | Ese es el propósito de archivar; se gestionan desde el panel Admin |
| D8 | La vista "Mi equipo" es accesible para `admin` y `superadmin` | El superadmin la necesita para QA y supervisión |
| D9 | Filtro de fecha del panel Uso: aplica a métricas derivadas de `activity_log` y a la trazabilidad; el "estado" de usuario (Activo/En riesgo/Inactivo) sigue siendo relativo a hoy (`last_seen_at`) | Mezclar semánticas confunde; el estado es una foto actual |
| D10 | `resolved_by` es editable por cualquier miembro del proyecto (igual que el resto del experimento) — riesgo aceptado | Es una herramienta colaborativa, no un audit log forense; `activity_log` es el rastro fiel |

## Riesgos y mitigaciones

- **R1 — Estado real de políticas RLS en prod desconocido** (posibles políticas "V3" sin cláusula superadmin): mitigado por Fase 0 (auditoría `pg_policies`) + enfoque aditivo D3.
- **R2 — Recursión RLS activa en prod en `teams`/`team_memberships`/`team_projects`** (verificado: error 42P17): la migración 06 la corrige; el verify script lo comprueba antes/después.
- **R3 — Frontend desplegado antes que el SQL** rompería prod: el orden de fases lo impide (Gate A antes de cualquier push).
- **R4 — Cuentas de prueba**: crear `test-lead@test.com` y `test-member@test.com` vía signup normal; la promoción de rol y armado del equipo de prueba requiere SQL manual (incluido en Gate A). `test-security@test.com` ya existe como usuaria normal.
- **R5 — `admin_list_teams`/`TeamsSection` ya operan vía RPC** y no se ven afectados por el fix de recursión (SECURITY DEFINER las salta); no tocar.

---

## FASE 0 — Auditoría de prod ⏸ GATE (manual, antes de todo)

### Task 0: SQL de auditoría + ejecución manual

**Files:**
- Create: `supabase/audit/00_audit_prod.sql`
- Create (con el output pegado): `claudedocs/prod-policy-audit-2026-08-27.md`

**Interfaces:**
- Produces: inventario real de políticas/funciones/columnas de prod que las Tasks 1–4 deben contrastar antes de darse por buenas.

- [ ] **Step 1: Escribir el SQL de auditoría**

```sql
-- supabase/audit/00_audit_prod.sql — SOLO LECTURA. Correr en Supabase SQL Editor y pegar el output en claudedocs/prod-policy-audit-2026-08-27.md
-- 1) Todas las políticas RLS de las tablas relevantes
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('projects','project_members','objectives','strategies','experiments',
                    'north_star_metrics','team_members','teams','team_memberships','team_projects',
                    'activity_log','profiles','user_areas')
ORDER BY tablename, cmd, policyname;

-- 2) Funciones public existentes (para saber qué RPCs/helpers ya están)
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 3) Columnas de las tablas que las migraciones van a tocar
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('experiments','activity_log','projects','profiles','teams')
ORDER BY table_name, ordinal_position;

-- 4) Triggers activos
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

- [ ] **Step 2: Usuario corre el SQL en el SQL Editor de Supabase (prod) y entrega el output**
- [ ] **Step 3: Guardar el output en `claudedocs/prod-policy-audit-2026-08-27.md` y anotar arriba del archivo: (a) ¿el SELECT de `projects` incluye cláusula superadmin?, (b) ¿qué políticas tienen `teams*`?, (c) ¿existe ya alguna columna `created_by`/`details`?**
- [ ] **Step 4: Contrastar Tasks 1–4 contra el inventario; ajustar nombres de políticas a dropear si difieren de los del repo**
- [ ] **Step 5: Commit**

```bash
git add supabase/audit/00_audit_prod.sql claudedocs/prod-policy-audit-2026-08-27.md
git commit -m "audit: inventario de politicas RLS y esquema real de prod (fase 0 ajustes Catalina)"
```

---

## FASE 1 — Migraciones SQL (Tasks 1–4 en paralelo, subagentes Opus; solo escriben archivos, nada se aplica aún)

### Task 1: Migración 06 — fix recursión RLS de equipos

**Files:**
- Create: `supabase/06_migration_fix_teams_recursion.sql`

**Interfaces:**
- Consumes: tablas `teams`/`team_memberships`/`team_projects` y `is_superadmin()` ya existentes en prod (verificado).
- Produces: `public.is_team_member_of(p_team_id uuid) RETURNS boolean` y `public.is_team_lead_of(p_team_id uuid) RETURNS boolean` (SECURITY DEFINER, STABLE) — las usa la Task 4 y las políticas nuevas.

- [ ] **Step 1: Escribir la migración completa**

```sql
-- ============================================================================
-- 06_migration_fix_teams_recursion.sql
-- Las políticas de teams/team_memberships se referencian circularmente →
-- error 42P17 (recursión infinita, verificado en prod el 2026-08-27).
-- Fix: helpers SECURITY DEFINER que saltan RLS al chequear pertenencia
-- (mismo patrón que is_project_member en FIX_RLS_RECURSION.sql).
-- Idempotente. Correr en el SQL Editor de Supabase ANTES que 07/08/09.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_team_member_of(p_team_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_memberships
    WHERE team_id = p_team_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_team_member_of(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_team_lead_of(p_team_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams
    WHERE id = p_team_id AND lead_user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_team_lead_of(uuid) TO authenticated;

-- Recrear políticas SELECT sin subqueries cruzadas (la recursión vivía aquí).
DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams
  FOR SELECT USING (
    public.is_superadmin()
    OR lead_user_id = auth.uid()
    OR public.is_team_member_of(id)
  );

DROP POLICY IF EXISTS team_memberships_select ON public.team_memberships;
CREATE POLICY team_memberships_select ON public.team_memberships
  FOR SELECT USING (
    public.is_superadmin()
    OR user_id = auth.uid()
    OR public.is_team_lead_of(team_id)
  );

DROP POLICY IF EXISTS team_projects_select ON public.team_projects;
CREATE POLICY team_projects_select ON public.team_projects
  FOR SELECT USING (
    public.is_superadmin()
    OR public.is_team_lead_of(team_id)
    OR public.is_team_member_of(team_id)
  );

-- Las políticas de escritura (solo superadmin) no recursan: se dejan intactas.
```

- [ ] **Step 2: Revisar contra la auditoría de Fase 0** — si prod tiene nombres de políticas distintos a `teams_select`/`team_memberships_select`/`team_projects_select`, agregar los `DROP POLICY IF EXISTS` correspondientes.
- [ ] **Step 3: Commit**

```bash
git add supabase/06_migration_fix_teams_recursion.sql
git commit -m "feat(sql): 06 - corrige recursion infinita en RLS de equipos con helpers security definer"
```

### Task 2: Migración 07 — visibilidad total para superadmin

**Files:**
- Create: `supabase/07_migration_superadmin_visibility.sql`

**Interfaces:**
- Consumes: `public.is_superadmin()` (existe en prod, verificado vía `assert_superadmin`).
- Produces: políticas `"Superadmins read all <tabla>"` en projects, project_members, objectives, strategies, experiments, north_star_metrics, team_members.

- [ ] **Step 1: Escribir la migración completa**

```sql
-- ============================================================================
-- 07_migration_superadmin_visibility.sql
-- Punto 2 de Catalina: superadmin ve TODOS los proyectos y su contenido sin
-- membresía explícita. Prod puede estar corriendo políticas "V3" (de
-- FIX_RLS_RECURSION.sql) que NO incluyen la cláusula superadmin — por eso
-- este archivo AGREGA políticas OR nuevas en vez de reescribir existentes.
-- Idempotente. Correr después de 06.
-- ============================================================================

DO $$ BEGIN
  CREATE POLICY "Superadmins read all projects"
    ON public.projects FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all project_members"
    ON public.project_members FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all objectives"
    ON public.objectives FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all strategies"
    ON public.strategies FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all experiments"
    ON public.experiments FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Superadmins read all north_star_metrics"
    ON public.north_star_metrics FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- team_members = tabla del esquema base (miembros por proyecto), NO team_memberships.
DO $$ BEGIN
  CREATE POLICY "Superadmins read all team_members"
    ON public.team_members FOR SELECT USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

- [ ] **Step 2: Revisar contra la auditoría de Fase 0** — confirmar que `north_star_metrics` y `team_members` existen como tablas en prod (si `north_star` vive embebido en `projects`, eliminar ese bloque y anotarlo en el archivo).
- [ ] **Step 3: Commit**

```bash
git add supabase/07_migration_superadmin_visibility.sql
git commit -m "feat(sql): 07 - politicas SELECT aditivas para que superadmin vea todos los proyectos"
```

### Task 3: Migración 08 — trazabilidad en datos

**Files:**
- Create: `supabase/08_migration_traceability.sql`

**Interfaces:**
- Produces: `activity_log.details jsonb`; `experiments.created_by uuid DEFAULT auth.uid()`, `experiments.resolved_by uuid`, `experiments.resolved_at timestamptz`. Los usan las Tasks 6, 7 y 8.

- [ ] **Step 1: Escribir la migración completa**

```sql
-- ============================================================================
-- 08_migration_traceability.sql
-- Punto 3 de Catalina: trazabilidad de quién crea y quién resuelve.
-- - activity_log.details: transiciones {from, to, title} (títulos sobreviven
--   al borrado del experimento).
-- - experiments.created_by: DEFAULT auth.uid() → se llena solo en cada INSERT
--   (cliente o RPC). Backfill histórico desde activity_log.
-- - experiments.resolved_by/resolved_at: los setea el frontend al pasar a
--   Finished-* (ver ProjectContext.updateExperiment).
-- Idempotente. Correr después de 06 y 07.
-- ============================================================================

ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS details jsonb;

ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.experiments
  ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.experiments
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Backfill del creador desde el log (solo experimentos aún vivos y sin dato).
UPDATE public.experiments e
SET created_by = al.user_id
FROM public.activity_log al
WHERE al.action = 'experiment_created'
  AND al.entity_id = e.id
  AND e.created_by IS NULL;

-- Índices para el panel de uso filtrado por fecha y por proyecto.
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_project ON public.activity_log(project_id);
```

- [ ] **Step 2: Revisar contra la auditoría de Fase 0** (que no exista ya un `created_by` con otro tipo/uso).
- [ ] **Step 3: Commit**

```bash
git add supabase/08_migration_traceability.sql
git commit -m "feat(sql): 08 - created_by/resolved_by en experiments + details jsonb en activity_log con backfill"
```

### Task 4: Migración 09 — RPCs de lectura para líderes

**Files:**
- Create: `supabase/09_migration_lead_rpcs.sql`

**Interfaces:**
- Consumes: `is_team_lead_of(uuid)` (Task 1), `is_superadmin()`, `activity_log.details` (Task 3).
- Produces (los consume la Task 7 — copiar firmas EXACTAS):
  - `lead_list_my_teams() RETURNS jsonb` — array de `{id, name, lead_user_id, lead_name, members: [{user_id, full_name, email, last_seen_at, area}], projects: [{project_id, name, archived}]}`
  - `lead_team_projects(p_team_id uuid) RETURNS jsonb` — array de `{id, name, archived, active_experiments, finished_experiments, last_activity}`
  - `lead_team_activity(p_team_id uuid, p_from timestamptz, p_to timestamptz) RETURNS jsonb` — array de `{id, user_id, user_name, project_id, project_name, action, entity_type, entity_id, details, created_at}` (máx 500, desc)

- [ ] **Step 1: Escribir la migración completa**

```sql
-- ============================================================================
-- 09_migration_lead_rpcs.sql
-- Punto 1 de Catalina: el líder (global_role='admin') ve la actividad de sus
-- equipos y sus proyectos. Acceso vía RPCs SECURITY DEFINER gateadas por
-- liderazgo real — NO se relaja la RLS de projects/experiments.
-- Idempotente. Correr después de 06 y 08.
-- ============================================================================

DROP FUNCTION IF EXISTS public.lead_list_my_teams();
CREATE OR REPLACE FUNCTION public.lead_list_my_teams()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
DECLARE v_is_super boolean := public.is_superadmin();
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.name)
    FROM (
      SELECT
        te.id, te.name, te.lead_user_id,
        (SELECT pr.full_name FROM profiles pr WHERE pr.id = te.lead_user_id) AS lead_name,
        (SELECT jsonb_agg(jsonb_build_object(
            'user_id', tm.user_id, 'full_name', p2.full_name, 'email', p2.email,
            'last_seen_at', p2.last_seen_at, 'area', p2.area))
           FROM team_memberships tm JOIN profiles p2 ON p2.id = tm.user_id
           WHERE tm.team_id = te.id) AS members,
        (SELECT jsonb_agg(jsonb_build_object(
            'project_id', tp.project_id, 'name', pj.name, 'archived', pj.archived))
           FROM team_projects tp JOIN projects pj ON pj.id = tp.project_id
           WHERE tp.team_id = te.id) AS projects
      FROM teams te
      WHERE v_is_super OR te.lead_user_id = auth.uid()
    ) t
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.lead_list_my_teams() TO authenticated;

DROP FUNCTION IF EXISTS public.lead_team_projects(uuid);
CREATE OR REPLACE FUNCTION public.lead_team_projects(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  IF NOT (public.is_superadmin() OR public.is_team_lead_of(p_team_id)) THEN
    RAISE EXCEPTION 'forbidden: not lead of this team';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(t ORDER BY t.name)
    FROM (
      SELECT
        pj.id, pj.name, pj.archived,
        (SELECT count(*) FROM experiments e
          WHERE e.project_id = pj.id AND e.status NOT LIKE 'Finished%') AS active_experiments,
        (SELECT count(*) FROM experiments e
          WHERE e.project_id = pj.id AND e.status LIKE 'Finished%') AS finished_experiments,
        (SELECT max(al.created_at) FROM activity_log al
          WHERE al.project_id = pj.id) AS last_activity
      FROM team_projects tp
      JOIN projects pj ON pj.id = tp.project_id
      WHERE tp.team_id = p_team_id
    ) t
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.lead_team_projects(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.lead_team_activity(uuid, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.lead_team_activity(
  p_team_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  IF NOT (public.is_superadmin() OR public.is_team_lead_of(p_team_id)) THEN
    RAISE EXCEPTION 'forbidden: not lead of this team';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(t)
    FROM (
      SELECT
        al.id, al.user_id, pr.full_name AS user_name,
        al.project_id, pj.name AS project_name,
        al.action, al.entity_type, al.entity_id, al.details, al.created_at
      FROM activity_log al
      LEFT JOIN profiles pr ON pr.id = al.user_id
      LEFT JOIN projects pj ON pj.id = al.project_id
      WHERE (
        al.user_id IN (SELECT user_id FROM team_memberships WHERE team_id = p_team_id)
        OR al.project_id IN (SELECT project_id FROM team_projects WHERE team_id = p_team_id)
      )
      AND (p_from IS NULL OR al.created_at >= p_from)
      AND (p_to IS NULL OR al.created_at <= p_to)
      ORDER BY al.created_at DESC
      LIMIT 500
    ) t
  ), '[]'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.lead_team_activity(uuid, timestamptz, timestamptz) TO authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/09_migration_lead_rpcs.sql
git commit -m "feat(sql): 09 - RPCs security definer de lectura para lideres de equipo"
```

---

## FASE 2 — Verificación (test primero, luego aplicar SQL)

### Task 5: Script de verificación RLS multi-cuenta

**Files:**
- Create: `scripts/verify-rls.mjs`

**Interfaces:**
- Consumes: REST de Supabase prod (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` del `.env`) + credenciales de prueba vía variables de entorno `GH_TEST_MEMBER_EMAIL/PASS`, `GH_TEST_LEAD_EMAIL/PASS`, `GH_TEST_SUPER_EMAIL/PASS`.
- Produces: exit code 0 = todo OK; imprime PASS/FAIL por check. Es "el test" de las Tasks 1–4.

- [ ] **Step 1: Escribir el script completo**

```js
// scripts/verify-rls.mjs — Verifica RLS y RPCs de prod con 3 roles.
// Uso: node scripts/verify-rls.mjs   (lee .env del repo + GH_TEST_* del entorno)
// Antes de aplicar 06-09 DEBE fallar (recursion 42P17, superadmin sin visibilidad).
// Despues de aplicarlas DEBE pasar completo.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const URL_ = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name} ${extra}`); }
};

async function login(email, password) {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`login ${email}: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}
async function rest(token, path, init = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, 'Content-Type': 'application/json', ...init.headers },
  });
  let body = null; try { body = await r.json(); } catch { /* empty */ }
  return { status: r.status, body };
}
const rpc = (token, fn, args = {}) => rest(token, `rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });

console.log('— anon —');
{
  const t = await rest(null, 'teams?select=id&limit=1');
  ok('teams sin recursion 42P17 (200 vacio para anon)', t.status === 200 && Array.isArray(t.body) && t.body.length === 0, `got ${t.status} ${JSON.stringify(t.body)}`);
  const p = await rest(null, 'projects?select=id&limit=1');
  ok('projects invisibles para anon', p.status === 200 && Array.isArray(p.body) && p.body.length === 0, `got ${p.status}`);
}

console.log('— member (user normal) —');
{
  const t = await login(process.env.GH_TEST_MEMBER_EMAIL, process.env.GH_TEST_MEMBER_PASS);
  const teams = await rest(t, 'teams?select=id,name');
  ok('member lee teams sin 500', teams.status === 200, `got ${teams.status} ${JSON.stringify(teams.body)}`);
  const act = await rpc(t, 'lead_team_activity', { p_team_id: '00000000-0000-0000-0000-000000000000' });
  ok('member NO puede llamar lead_team_activity', act.status >= 400, `got ${act.status}`);
  const exp = await rest(t, 'experiments?select=created_by&limit=1');
  ok('experiments.created_by existe', exp.status === 200, `got ${exp.status} ${JSON.stringify(exp.body)}`);
}

console.log('— lead (global admin, lidera equipo de prueba) —');
{
  const t = await login(process.env.GH_TEST_LEAD_EMAIL, process.env.GH_TEST_LEAD_PASS);
  const my = await rpc(t, 'lead_list_my_teams');
  ok('lead_list_my_teams devuelve >=1 equipo', my.status === 200 && Array.isArray(my.body) && my.body.length >= 1, `got ${my.status} ${JSON.stringify(my.body)}`);
  const teamId = my.body?.[0]?.id;
  if (teamId) {
    const projs = await rpc(t, 'lead_team_projects', { p_team_id: teamId });
    ok('lead_team_projects responde 200', projs.status === 200, `got ${projs.status}`);
    const act = await rpc(t, 'lead_team_activity', { p_team_id: teamId });
    ok('lead_team_activity responde 200', act.status === 200, `got ${act.status}`);
  }
}

console.log('— superadmin —');
{
  const t = await login(process.env.GH_TEST_SUPER_EMAIL, process.env.GH_TEST_SUPER_PASS);
  const all = await rpc(t, 'admin_list_projects');
  const direct = await rest(t, 'projects?select=id');
  ok('superadmin ve por RLS tantos proyectos como admin_list_projects',
    all.status === 200 && direct.status === 200 && Array.isArray(direct.body) && direct.body.length >= (all.body?.length ?? 0),
    `rpc=${all.body?.length} rls=${direct.body?.length}`);
  const exp = await rest(t, 'experiments?select=id&limit=1');
  ok('superadmin lee experiments por RLS', exp.status === 200 && Array.isArray(exp.body), `got ${exp.status}`);
  const log = await rest(t, 'activity_log?select=details&limit=1');
  ok('activity_log.details existe', log.status === 200, `got ${log.status}`);
}

console.log(`\nResultado: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2: Correrlo AHORA (pre-migración) y verificar que FALLA donde debe**

Run: `node scripts/verify-rls.mjs` (con `GH_TEST_MEMBER_*` = test-security@test.com / TestSecurity123!; los otros dos roles aún no existen → esos bloques fallarán por login, es esperado)
Expected: FAIL en "teams sin recursion" (hoy da 500 42P17). Documentar el output en el commit message.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-rls.mjs
git commit -m "test: script de verificacion RLS multi-rol contra prod (falla pre-migracion: recursion 42P17 confirmada)"
```

### ⏸ GATE A: aplicar migraciones + preparar cuentas de prueba (manual)

**El usuario ejecuta en el SQL Editor de Supabase, en este orden:** `06` → `07` → `08` → `09`.

**Cuentas de prueba** (crear vía signup normal en la app de prod, luego promover por SQL):
1. Registrar `test-lead@test.com` (pass: `TestLead123!`) y `test-member@test.com` (pass: `TestMember123!`) desde la pantalla de signup de prod.
2. Correr en SQL Editor:

```sql
-- Promover roles de prueba y armar un equipo de prueba
UPDATE profiles SET global_role = 'admin' WHERE email = 'test-lead@test.com';
-- Superadmin de prueba: promover una cuenta que Cristián controle (o usar la suya).
-- Si se usa test-security como superadmin temporal para QA:
-- UPDATE profiles SET global_role = 'superadmin' WHERE email = 'test-security@test.com';

INSERT INTO teams (name, lead_user_id)
SELECT 'Equipo QA', id FROM profiles WHERE email = 'test-lead@test.com'
ON CONFLICT DO NOTHING;

INSERT INTO team_memberships (team_id, user_id)
SELECT t.id, p.id FROM teams t, profiles p
WHERE t.name = 'Equipo QA' AND p.email IN ('test-lead@test.com', 'test-member@test.com')
ON CONFLICT DO NOTHING;

INSERT INTO team_projects (team_id, project_id)
SELECT t.id, pj.id FROM teams t, projects pj
WHERE t.name = 'Equipo QA' AND pj.name = 'Test Post-Security Hotfix'
ON CONFLICT DO NOTHING;
```

- [ ] Migraciones 06–09 aplicadas sin error
- [ ] Cuentas y equipo de prueba creados
- [ ] **Correr `node scripts/verify-rls.mjs` con las 3 credenciales → TODO PASS.** Si algo falla: detenerse, diagnosticar con la auditoría de Fase 0, no avanzar a Fase 3.

---

## FASE 3 — Frontend (Tasks 6 → luego 7 y 8 en paralelo → 9)

### Task 6: Logging enriquecido + tipos de trazabilidad

**Files:**
- Modify: `src/lib/activityLog.ts`
- Modify: `src/types.ts` (interface `Experiment`, líneas 57–84)
- Modify: `src/contexts/ProjectContext.tsx` (`dbRowToExperiment` línea 171, `addExperiment` ~línea 663, `updateExperiment` ~líneas 669–721)

**Interfaces:**
- Consumes: columnas de Task 3 (`created_by`, `resolved_by`, `resolved_at`, `details`).
- Produces (los usa la Task 8): `Experiment.createdBy?: string`, `Experiment.resolvedBy?: string`, `Experiment.resolvedAt?: string`, `Experiment.createdAt?: string`; `logActivity({..., details?: Record<string, unknown>})`.

- [ ] **Step 1: `activityLog.ts` — aceptar `details`**

```ts
interface LogActivityParams {
  userId: string
  projectId?: string | null
  action: ActivityAction
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}
// ...en el insert:
    await supabase.from('activity_log').insert({
      user_id: params.userId,
      project_id: params.projectId ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      details: params.details ?? null,
    })
```

- [ ] **Step 2: `types.ts` — campos nuevos en `Experiment`** (agregar al final de la interface, antes del cierre)

```ts
  createdBy?: string;   // profiles.id de quien creó (BD: created_by, default auth.uid())
  createdAt?: string;
  resolvedBy?: string;  // profiles.id de quien lo movió a Finished-*
  resolvedAt?: string;
```

- [ ] **Step 3: `ProjectContext.tsx` — mapear en `dbRowToExperiment`** (agregar junto a `isPublic`)

```ts
        createdBy: row.created_by || undefined,
        createdAt: row.created_at || undefined,
        resolvedBy: row.resolved_by || undefined,
        resolvedAt: row.resolved_at || undefined,
```

- [ ] **Step 4: `ProjectContext.tsx` — `addExperiment`: incluir título en el log**

```ts
        if (user) logActivity({
            userId: user.id, projectId: activeProjectId,
            action: 'experiment_created', entityType: 'experiment', entityId: newExp.id,
            details: { title: newExp.title },
        })
```

- [ ] **Step 5: `ProjectContext.tsx` — `updateExperiment`: resolver + transición en el log.** Al inicio de la función (antes del optimistic update), capturar el estado previo:

```ts
        const prevExp = projects
            .find(p => p.metadata.id === activeProjectId)
            ?.experiments.find(e => e.id === id)
```

Tras armar `dbUpdates` (después de la línea de `isPublic`), agregar:

```ts
        // Trazabilidad: quién resolvió. Se setea al entrar a Finished-* y se
        // limpia si el experimento vuelve a una etapa activa.
        if (updates.status !== undefined && prevExp && user) {
            const wasFinished = prevExp.status.startsWith('Finished')
            const isFinished = updates.status.startsWith('Finished')
            if (isFinished && !wasFinished) {
                dbUpdates.resolved_by = user.id
                dbUpdates.resolved_at = new Date().toISOString()
            } else if (!isFinished && wasFinished) {
                dbUpdates.resolved_by = null
                dbUpdates.resolved_at = null
            }
        }
```

Y en el `logActivity` de `experiment_moved`:

```ts
            logActivity({
                userId: user.id, projectId: activeProjectId,
                action: 'experiment_moved', entityType: 'experiment', entityId: id,
                details: { from: prevExp?.status ?? null, to: updates.status, title: prevExp?.title ?? null },
            })
```

Nota: `projects` debe estar en el array de dependencias del `useCallback` de `updateExperiment` (agregarlo si no está).

- [ ] **Step 6: Typecheck**

Run: `npm run build:typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/activityLog.ts src/types.ts src/contexts/ProjectContext.tsx
git commit -m "feat: trazabilidad de experimentos - created_by/resolved_by mapeados y activity_log con detalles de transicion"
```

### Task 7: Vista "Mi equipo" para líderes

**Files:**
- Create: `src/TeamView.tsx`
- Modify: `src/contexts/AuthContext.tsx` (exponer `isAdminOrAbove`)
- Modify: `src/App.tsx` (línea 665 union del view state, bloque render ~1035, y sidebar donde está el botón Admin ~1247)
- Modify: `src/PortfolioView.tsx` (props `onOpenAdmin` ~225–290: agregar `onOpenTeam` análogo)

**Interfaces:**
- Consumes: RPCs de Task 4 (`lead_list_my_teams`, `lead_team_projects`, `lead_team_activity` — firmas exactas en Task 4).
- Produces: vista `'team'` accesible para `global_role` `admin`/`superadmin`; `useAuth().isAdminOrAbove: boolean`.

- [ ] **Step 1: `AuthContext.tsx` — agregar al value y al tipo `AuthContextValue`**

```ts
    isAdminOrAbove: profile?.global_role === 'superadmin' || profile?.global_role === 'admin',
```

- [ ] **Step 2: Crear `src/TeamView.tsx`** — componente completo, estilo consistente con AdminView (inline styles, misma paleta). Estructura:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Users, Activity, FlaskConical } from 'lucide-react';
import { supabase } from './lib/supabase';

interface TeamRow {
  id: string; name: string; lead_user_id: string; lead_name: string | null;
  members: { user_id: string; full_name: string | null; email: string | null; last_seen_at: string | null; area: string[] | null }[] | null;
  projects: { project_id: string; name: string; archived: boolean }[] | null;
}
interface TeamProjectRow {
  id: string; name: string; archived: boolean;
  active_experiments: number; finished_experiments: number; last_activity: string | null;
}
interface TeamActivityRow {
  id: string; user_id: string; user_name: string | null; project_id: string | null;
  project_name: string | null; action: string; entity_type: string | null;
  details: { from?: string; to?: string; title?: string } | null; created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  experiment_created: 'creó el experimento',
  experiment_moved: 'movió el experimento',
  experiment_deleted: 'eliminó un experimento',
  project_created: 'creó el proyecto',
  role_changed: 'cambió un rol',
};

export const TeamView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [projects, setProjects] = useState<TeamProjectRow[]>([]);
  const [activity, setActivity] = useState<TeamActivityRow[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('lead_list_my_teams');
      if (error) { setError(error.message); setLoading(false); return; }
      const rows = (data as TeamRow[]) || [];
      setTeams(rows);
      setSelected(rows[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  const loadTeamData = useCallback(async (teamId: string) => {
    const args: Record<string, unknown> = { p_team_id: teamId };
    const actArgs: Record<string, unknown> = { ...args };
    if (fromDate) actArgs.p_from = new Date(fromDate).toISOString();
    if (toDate) actArgs.p_to = new Date(new Date(toDate).getTime() + 86400000).toISOString();
    const [pRes, aRes] = await Promise.all([
      supabase.rpc('lead_team_projects', args),
      supabase.rpc('lead_team_activity', actArgs),
    ]);
    if (pRes.error || aRes.error) { setError((pRes.error || aRes.error)!.message); return; }
    setProjects((pRes.data as TeamProjectRow[]) || []);
    setActivity((aRes.data as TeamActivityRow[]) || []);
  }, [fromDate, toDate]);

  useEffect(() => { if (selected) loadTeamData(selected); }, [selected, loadTeamData]);

  const team = teams.find(t => t.id === selected) ?? null;
  // Render: top bar con botón Volver (patrón AdminView), selector de equipo si hay >1,
  // 3 secciones: Miembros (tabla: nombre, email, área, último uso),
  // Proyectos del equipo (tabla: nombre, exp. activos, exp. finalizados, última actividad),
  // Actividad (filtro fecha desde/hasta con <input type="date"> + feed:
  //   fecha — user_name ACTION_LABEL[action] «details.title» (details.from → details.to) en project_name).
  // Empty states: sin equipos → "No tienes equipos asignados. Pide a un superadmin que te asigne uno.";
  // error → caja roja con mensaje + botón Reintentar (patrón AdminView).
  // (El subagente implementa el JSX completo siguiendo los estilos de AdminView.tsx:
  //  tablas con bordes #e5e7eb, headers #f9fafb, fuentes 12-14px.)
  ...
};
```

El subagente escribe el JSX completo (sin `...`), replicando los patrones visuales de `AdminView.tsx` (tabla de `ManageTab` y feed simple). Ninguna sección puede quedar como comentario.

- [ ] **Step 3: `App.tsx` — registrar la vista.**
  - Línea 665: agregar `'team'` a la union: `useState<'portfolio' | 'board' | 'table' | 'library' | 'roadmap' | 'admin' | 'team'>('portfolio')`.
  - Junto al bloque de `view === 'admin'` (línea 1035), agregar antes:

```tsx
  if (view === 'team' && isAdminOrAbove) {
    return (
      <>
        <TeamView onBack={() => setView('portfolio')} />
        <AreaPromptModal />
      </>
    );
  }
```

  - Obtener `isAdminOrAbove` del mismo `useAuth()` de donde sale `isSuperAdmin`, e importar `TeamView`.

- [ ] **Step 4: `PortfolioView.tsx` — botón de entrada.** Replicar el patrón de `onOpenAdmin` (props línea 225, botón líneas 280–290): agregar prop `onOpenTeam?: () => void` y botón "Mi equipo" (icono `Users` de lucide-react) visible cuando la prop viene definida. En `App.tsx` (línea ~1052) pasar `onOpenTeam={isAdminOrAbove ? () => setView('team') : undefined}`.

- [ ] **Step 5: Typecheck**

Run: `npm run build:typecheck`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/TeamView.tsx src/App.tsx src/PortfolioView.tsx src/contexts/AuthContext.tsx
git commit -m "feat: vista Mi equipo para lideres - actividad, miembros y proyectos del equipo via RPCs"
```

### Task 8: Panel de uso — filtro de fecha + trazabilidad

**Files:**
- Modify: `src/AdminView.tsx` (estado/métricas líneas 48–182, `UsageTab` líneas 1032–1211, export CSV líneas 219–241)

**Interfaces:**
- Consumes: `Experiment.createdBy/resolvedBy/resolvedAt/createdAt` (Task 6); `users: Profile[]` ya cargados en AdminView; `projects: Project[]` prop existente.
- Produces: UI final del punto 3. Sin cambios de API para otros archivos.

- [ ] **Step 1: Estado de rango de fechas en `AdminView`** (junto a `areaFilter`)

```tsx
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
```

- [ ] **Step 2: Filtrar actividad por rango y derivar métricas del filtrado**

```tsx
  const filteredActivity = useMemo(() => {
    if (!fromDate && !toDate) return activity;
    const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const to = toDate ? new Date(toDate).getTime() + DAY : Infinity; // inclusivo hasta fin de día
    return activity.filter(a => {
      const t = new Date(a.created_at).getTime();
      return t >= from && t < to;
    });
  }, [activity, fromDate, toDate]);
```

Reemplazar `activity` por `filteredActivity` en `projectLastActivity` y `projectRanking`. En `projectRanking`, cuando hay rango activo la tendencia compara las dos mitades del rango; sin rango se mantienen las ventanas 7d/14d actuales:

```tsx
      const rangeActive = Boolean(fromDate || toDate);
      const times = filteredActivity.map(a => new Date(a.created_at).getTime());
      const mid = rangeActive && times.length
        ? (Math.min(...times) + Math.max(...times)) / 2
        : now - 7 * DAY;
      const last7 = acts.filter(a => new Date(a.created_at).getTime() >= mid).length;
      const prev7 = acts.filter(a => new Date(a.created_at).getTime() < mid).length;
```

(`acts` pasa a calcularse sobre `filteredActivity`; "Proyectos inactivos (+7 días)" queda relativo a hoy, sin cambio.)

- [ ] **Step 3: Filas de trazabilidad en `AdminView`**

```tsx
  const profileById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const traceRows = useMemo(() => {
    const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const to = toDate ? new Date(toDate).getTime() + DAY : Infinity;
    return projects.flatMap(p => p.experiments.map(e => ({
      projectName: p.metadata.name,
      title: e.title,
      status: e.status,
      verdict: e.verdict || '',
      ownerName: e.owner?.name || '',
      creatorName: e.createdBy ? (profileById.get(e.createdBy)?.full_name || profileById.get(e.createdBy)?.email || '—') : '—',
      createdAt: e.createdAt || null,
      resolverName: e.resolvedBy ? (profileById.get(e.resolvedBy)?.full_name || profileById.get(e.resolvedBy)?.email || '—') : '—',
      resolvedAt: e.resolvedAt || null,
    }))).filter(r => {
      const c = r.createdAt ? new Date(r.createdAt).getTime() : null;
      const rv = r.resolvedAt ? new Date(r.resolvedAt).getTime() : null;
      if (!fromDate && !toDate) return true;
      return (c !== null && c >= from && c < to) || (rv !== null && rv >= from && rv < to);
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [projects, profileById, fromDate, toDate]);
```

- [ ] **Step 4: UI en `UsageTab`.** Nuevas props: `fromDate`, `toDate`, `onFromDate`, `onToDate`, `traceRows`, `onExportTrace`. Encima de las métricas, un bloque de filtro:

```tsx
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Rango de fechas:</span>
        <input type="date" value={fromDate} onChange={e => onFromDate(e.target.value)} style={selectStyle} />
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>—</span>
        <input type="date" value={toDate} onChange={e => onToDate(e.target.value)} style={selectStyle} />
        {(fromDate || toDate) && (
          <button onClick={() => { onFromDate(''); onToDate(''); }}
            style={{ border: 'none', background: 'none', color: '#4F46E5', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            Limpiar
          </button>
        )}
      </div>
```

Nueva sección "Trazabilidad de experimentos" (después de "Ranking de proyectos"): tabla con columnas `Proyecto | Experimento | Estado | Veredicto | Responsable | Creado por | Fecha creación | Resuelto por | Fecha resolución`, botón "Exportar CSV" propio, y aviso amarillo (mismo estilo del banner existente): *"El creador se reconstruyó del historial; en experimentos antiguos puede faltar. «Resuelto por» se registra desde el despliegue de esta versión en adelante."* Fechas con `toLocaleDateString()`, `—` para nulls.

- [ ] **Step 5: Export CSV de trazabilidad en `AdminView`**

```tsx
  const exportTraceCsv = () => {
    const headers = ['Proyecto', 'Experimento', 'Estado', 'Veredicto', 'Responsable', 'Creado por', 'Fecha creacion', 'Resuelto por', 'Fecha resolucion'];
    const rows = traceRows.map(r => [
      r.projectName, r.title, r.status, r.verdict, r.ownerName, r.creatorName,
      r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '',
      r.resolverName,
      r.resolvedAt ? new Date(r.resolvedAt).toISOString().split('T')[0] : '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trazabilidad-growth-hub-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
```

- [ ] **Step 6: Typecheck**

Run: `npm run build:typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/AdminView.tsx
git commit -m "feat: panel de uso con filtro por rango de fechas y tabla de trazabilidad de experimentos"
```

### Task 9: Portfolio excluye proyectos archivados

**Files:**
- Modify: `src/contexts/ProjectContext.tsx` (`fetchProjects`, línea ~247–259)

**Interfaces:**
- Consumes: columna `projects.archived` (existe en prod, verificado).
- Produces: el portfolio (todos los roles) solo muestra proyectos con `archived = false`; los archivados se gestionan desde el panel Admin (RPC, sin cambio).

- [ ] **Step 1: Filtrar en `fetchProjects`** — tras obtener `projectRows`:

```ts
            // Los proyectos archivados no aparecen en el portfolio; se gestionan
            // (y desarchivan) desde el panel Admin.
            const visibleRows = (projectRows || []).filter((r: any) => !r.archived)
```

y usar `visibleRows` en lugar de `projectRows` de ahí en adelante (guard de vacío incluido).

- [ ] **Step 2: Typecheck**

Run: `npm run build:typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/ProjectContext.tsx
git commit -m "feat: portfolio excluye proyectos archivados (gestion via panel admin)"
```

---

## FASE 4 — QA y deploy

### Task 10: QA integral multi-rol en navegador (dev local contra BD de prod)

**Files:**
- Create: `claudedocs/qa-ajustes-catalina-2026-08.md` (checklist con resultados)

- [ ] **Step 1: Levantar dev server** (`npm run dev` vía preview/launch, `.env` ya apunta a la BD de prod)
- [ ] **Step 2: Como `test-member@test.com`:** ve solo sus proyectos; NO ve botón "Mi equipo" ni "Admin"; crear un experimento en el proyecto de prueba y moverlo a `Finished - Winner` (alimenta trazabilidad).
- [ ] **Step 3: Como `test-lead@test.com`:** ve botón "Mi equipo"; la vista lista "Equipo QA" con miembros, proyectos y la actividad recién generada; el filtro de fechas de la vista funciona; NO ve botón "Admin".
- [ ] **Step 4: Como superadmin:** portfolio muestra TODOS los proyectos no archivados (comparar contra "Todos los proyectos" del panel Admin); puede abrir un proyecto ajeno (objetivos/experimentos visibles); panel Uso → filtro de fechas altera ranking; sección Trazabilidad muestra el experimento del Step 2 con creador (`test-member`) y resuelto por (`test-member`); export CSV de trazabilidad descarga bien; archivar un proyecto de prueba lo saca del portfolio y desarchivarlo lo devuelve.
- [ ] **Step 5: Regresión:** login/logout normal, crear proyecto, Biblioteca Global, panel Admin Gestión (roles, equipos, áreas) sin errores de consola.
- [ ] **Step 6: Registrar resultados en el checklist y `npm run build:typecheck` final**
- [ ] **Step 7: Commit**

```bash
git add claudedocs/qa-ajustes-catalina-2026-08.md
git commit -m "docs: QA multi-rol de visibilidad lideres/superadmin y trazabilidad"
```

### ⏸ GATE B: GO de deploy

- [ ] Usuario da GO explícito → `git push origin main` (Vercel auto-despliega).
- [ ] Smoke test en https://growth-experiment-manager.vercel.app (login + portfolio + panel Uso).
- [ ] `npx gitnexus analyze` para refrescar el índice del repo.

### Task 11: Borrador de respuesta a Catalina

**Files:**
- Create: `claudedocs/respuesta-catalina-ajustes-2026-08.md`

- [ ] **Step 1: Redactar el borrador** (NO enviar — el usuario decide): qué se implementó por punto (1: vista "Mi equipo" para líderes; 2: superadmin ve todo el portfolio; 3: filtro de fechas + trazabilidad con export), la limitación histórica de "resuelto por" (solo hacia adelante), y la pregunta abierta de si la definición de "actividad" del líder calza con lo que esperaban (feed de acciones + resumen por proyecto).
- [ ] **Step 2: Entregar el borrador al usuario para revisión y envío manual (o vía Gmail MCP previa confirmación).**

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec:** Punto 1 → Tasks 1, 4, 7 (+ Gate A). Punto 2 → Task 2 (+ Task 9 define "activos" = no archivados). Punto 3 → Tasks 3, 5, 6, 8. Verificación transversal → Tasks 0, 5, 10.
- **Placeholders:** el único bloque delegado explícitamente es el JSX visual de `TeamView` (Step 2, Task 7), acotado con estructura de datos, secciones, empty states y patrones de referencia concretos; los contratos de datos están completos.
- **Consistencia de tipos:** firmas RPC de Task 4 = interfaces TS de Task 7; campos `Experiment` de Task 6 = usos en Task 8; `details {from,to,title}` de Task 6 = render en Task 7.
