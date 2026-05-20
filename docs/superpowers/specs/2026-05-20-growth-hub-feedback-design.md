# Growth Hub — Implementación feedback plataforma (8 items)

Fecha: 2026-05-20
Fuente: doc de feedback de Catalina Bravo (Google Doc `1SOwCFgo...`) + correo de rename.
Entrega: **PR único** sobre branch `feat/user-panel-logo`, con commits limpios por fase.
Estado: revisado por doble agente (analista + abogado del diablo) → REVISE → revisiones integradas.

## Contexto

Plataforma React 19 + TypeScript + Vite + Supabase. La agencia (Moov) pidió 8 cambios.
Cada `project` ≈ un cliente/marca. **Todos los usuarios son equipo interno de la agencia**
(no hay cuentas de cliente; `project_members` solo invita team members). El sin test runner
configurado, así que el auth-path se valida manualmente.

## Decisiones tomadas (confirmadas con el usuario)

1. Tracking de actividad (#3): tabla `activity_log` para acciones de entidad +
   `last_seen_at` (con throttle) para presencia. **No** se registra evento "login".
2. Rol admin global (#2): reusar rol `superadmin`; UI para que un superadmin promueva/degrade
   a otros. Primer superadmin se asigna por SQL manual.
3. Biblioteca global (#5): global real — cualquier usuario autenticado ve los experimentos
   `Finished` de todos los proyectos. Seguro porque todos son equipo de la agencia.
4. Entrega: un solo PR. La migración SQL se aplica y verifica en Supabase **antes** de
   desplegar el frontend.

## Estado actual auditado

- `deleteExperiment` existe en `ProjectContext` (línea 686, en el `value`) pero `App.tsx`
  **no lo desestructura** (líneas 405-430) → sin UI.
- `deleteProject` existe; `App.tsx` actual **no** pasa delete/`onResetData` a `SettingsView`.
- Logo de proyecto: ya implementado (`uploadLogo.ts`, `updateProjectLogo`).
- Rol `superadmin` existe en `global_role_enum`; RLS da SELECT global a superadmin en
  sub-tablas, pero **no** INSERT/UPDATE/DELETE ni gestión de `project_members`.
- **Bug enum:** `project_role_enum` solo tiene `('admin','editor')` (migration.sql:24); el
  código mapea `Viewer→'viewer'` (ProjectContext.tsx:91) → invitar un Viewer falla en DB hoy.
- **Bug #6:** solo existe `key_learnings`. El drawer "Key Learnings" y el `KeyLearningModal`
  escriben el mismo campo; `CaseStudyModal` lo muestra mal-etiquetado como "The Verdict".
- **Bug #7:** `CaseStudyModal` "The Evidence" (App.tsx:336) renderiza la data-URL como texto.
- RLS recursiva preexistente: la policy "Superadmins can read all profiles"
  (migration.sql:213-224) ya consulta `profiles` dentro de una policy de `profiles`.

## Fases de implementación

### Fase 0 — Migración SQL consolidada
Archivo `supabase/migration_growth_hub_feedback.sql`. Se ejecuta manualmente en Supabase
**antes** del deploy frontend. Entregables:

- **`is_superadmin()` SECURITY DEFINER** — función que devuelve si `auth.uid()` es superadmin
  sin recursión. **Reescribir TODAS las policies que referencian `profiles`** (las nuevas y
  las recursivas preexistentes) para usarla.
- Añadir `'viewer'` a `project_role_enum` (`ALTER TYPE ... ADD VALUE`).
- Nuevo enum `user_area` (`Paid Media`, `SEO`, `Crossmedia`, `CRO`).
- `profiles`: `ADD COLUMN area user_area`, `ADD COLUMN panel_logo_url text` (consolida
  `migration_user_panel_logo.sql`), `ADD COLUMN last_seen_at timestamptz`.
- `experiments`: `ADD COLUMN verdict text`.
- **Backfill:** `UPDATE experiments SET verdict = key_learnings WHERE status::text LIKE
  'Finished%' AND verdict IS NULL` — para que el panel "The Verdict" muestre datos históricos.
- Tabla `activity_log`: `id, user_id, project_id, action, entity_type, entity_id, created_at`.
  RLS: insert propio; SELECT superadmin global + miembro de proyecto.
- RLS: extender `superadmin` (vía `is_superadmin()`) a INSERT/UPDATE/DELETE en
  `objectives/strategies/experiments` y a la gestión de `project_members`.
- RLS: policy para que `superadmin` haga UPDATE de `profiles.global_role` (vía
  `is_superadmin()`, no subquery inline).
- RPC `get_global_finished_experiments()` SECURITY DEFINER → experimentos con
  `status IN ('Finished - Winner','Finished - Loser','Finished - Inconclusive')` de todos los
  proyectos, con nombre de proyecto. Para la biblioteca global (#5).
- Bucket `user-panel-logos` + políticas (de la migración pendiente).
- Sin transacción global posible para `DO $$` múltiples; entregar también un script de
  rollback básico junto al archivo.

### Fase 1 — Rename Growth Lab → Growth Hub
**Grep repo-wide** de `Growth ?Lab`/`GrowthLab` (no fiarse de números de línea — el archivo
se mueve). Reemplazo de strings visibles: `App.tsx`, `PortfolioView.tsx`, `LandingPage.tsx`,
`AuthGate.tsx`, y el string user-facing de `SettingsView.tsx` ("Reemplaza el logo 'Growth
Lab'"). `index.html <title>` y `package.json name` no se tocan (no son la marca).

### Fase 2 — #7 Fix deformación imagen
`App.tsx` `CaseStudyModal` "The Evidence": renderizar `<img src={proof}>` con
`objectFit: contain` y `maxHeight` en vez del string. Mantener caja 16/9.

### Fase 3 — #6 Key Learnings vs The Verdict
- `types.ts`: añadir `verdict?: string` a `Experiment`.
- `ProjectContext`: mapear `verdict` en `dbRowToExperiment`, `addExperiment`,
  `updateExperiment`. Los `select('*')` ya toleran columna ausente, pero los writes NO — por
  eso la SQL va primero (ver Decisión 4).
- `KeyLearningModal`: escribe `verdict`; label aclara "The Verdict / Key Insight".
- `KeyLearningModal` / formulario de cierre: texto explícito indicando que lo escrito ahí
  (The Verdict) es lo que se mostrará en la vista Learning, y que "Key Learnings" (datos/
  aprendizajes detallados) se edita por separado en el drawer.
- `App.handleLearningSave`: setea `verdict`, deja `keyLearnings` intacto.
- `CaseStudyModal` y card del Kanban: mostrar ambos campos, con fallback a `keyLearnings` si
  `verdict` es null.
- Editar experimentos finalizados: verificar que el drawer lo permite; si no, exponer ruta.

### Fase 4 — #1 Editar/eliminar experimentos
- Conectar `deleteExperiment`: `ProjectContext` → `App` → `ExperimentDrawer`.
- Botón eliminar en el header del drawer con `window.confirm`.
- Edición inline de `title` e `hypothesis` en el drawer (hoy solo lectura).

### Fase 5 — #4 Editar proyecto (nombre + delete)
- `ProjectContext`: añadir `updateProjectName(id, name)`.
- `SettingsView`: campo editable de nombre; botón eliminar proyecto con confirmación.
- `App`: pasar `deleteProject`/`updateProjectName` a `SettingsView`; tras borrar → portfolio.

### Fase 6 — #2 Admin global + UI de promoción
- RLS extendida en Fase 0.
- Nueva vista `AdminView` (archivo propio, gateada a `superadmin`): lista proyectos y
  usuarios, promover/degradar `superadmin`, gestionar accesos a proyectos.
- **Guard:** no permitir degradar al último superadmin (evita lockout).
- Registrar cada cambio de rol en `activity_log`.
- `AuthContext`: función `updateUserGlobalRole(userId, role)`.

### Fase 7 — #3 Panel adopción/actividad
- Campo `area` obligatorio en el perfil (UI en Settings); usuarios sin área → prompt al
  entrar.
- `last_seen_at`: actualizar con throttle (1× por sesión o cada ~15 min) desde el handler
  `SIGNED_IN` de `AuthContext` — **no** en cada `onAuthStateChange` (dispara en focus de tab).
- `activity_log`: instrumentar solo acciones de entidad (crear/actualizar/mover experimento,
  crear proyecto), no logins.
- **"workspace/célula" = área** (decisión del usuario). No se crea entidad nueva; cada
  mención de "workspace" en el doc #3 se mapea al campo `area`.
- `AdminView` sección "Uso de la plataforma" (solo superadmin):
  - Métricas: usuarios activos 30d, adopción por área, proyectos inactivos +7d,
    experimentos activos y en Learning.
  - Ranking de proyectos más activos: nº de experimentos, usuarios involucrados y tendencia
    de actividad (p. ej. variación de acciones en `activity_log` últimos 7d vs 7d previos).
  - Tabla de actividad por usuario (nombre, área, último uso, exp activos, estado
    Activo/En riesgo/Inactivo, rol). La columna "workspace(s)" del doc = área.
  - Panel de usuarios inactivos +14d.
  - Filtros por área y estado + export CSV (Blob plano, sin librería). El filtro "workspace"
    del doc = filtro por área (mismo control).
  - Nota: las métricas de 30d quedan vacías hasta acumular 30 días de `activity_log`.

### Fase 8 — #5 Biblioteca global de experimentos
- Toggle "Global" en la vista Learning (o vista nueva `GlobalLibraryView`, archivo propio)
  que llama al RPC `get_global_finished_experiments()`.
- Filtros: área, nombre, marca (proyecto).
- Mostrar anotaciones y etapa de cada experimento.

## Orden y verificación

1. Ejecutar `migration_growth_hub_feedback.sql` en Supabase. Verificar: enum `viewer`,
   columnas nuevas, backfill `verdict`, policies sin recursión (probar un SELECT/UPDATE de
   `profiles` como superadmin y como user normal).
2. Recién entonces desplegar el frontend.
3. `npm run build:typecheck` y `npm run lint` antes de cada commit.

## Riesgos conocidos

- RLS de superadmin: mitigado con `is_superadmin()`; el riesgo real era la policy UPDATE de
  `profiles`.
- Biblioteca global expone datos entre marcas — aceptado; seguro mientras no haya cuentas de
  cliente. Si se añaden cuentas de cliente, gatear el RPC a `is_superadmin()` o a dominio
  de la agencia.
- `App.tsx` (1319 líneas) ya es grande: `AdminView` y `GlobalLibraryView` van en archivos
  propios.
- PR único = revisión difícil; mitigado con commits por fase y SQL verificada aparte primero.
- No hay test runner: el auth-path se valida manualmente; no tocar `simpleLock`/token cache.
- `INSERT WITH CHECK (true)` en `projects` permite a cualquier usuario crear proyectos
  (preexistente, fuera de alcance — solo se anota).

## Fuera de alcance

- Proyecto InfluOps y Athen AI (plataformas separadas).
- Integraciones API Defontana/Buk.
- Endurecer el `INSERT` de `projects`.
