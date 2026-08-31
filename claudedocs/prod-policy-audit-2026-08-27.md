# Auditoría de políticas/funciones en prod — Growth Hub

Corrida: 2026-08-31 (SQL Editor, proyecto oumhhngnwjijtmgpnhba) con `supabase/audit/00_audit_prod.sql`.
Insumo del Gate A antes de aplicar 06→09. Veredicto: **GO** — sin colisiones de nombres ni firmas.

## Contraste contra las migraciones

| Chequeo | Resultado |
|---|---|
| 06 dropea `teams_select` / `team_memberships_select` / `team_projects_select` | Existen en prod con esos nombres exactos; sus quals confirman la recursión mutua teams ↔ team_memberships (42P17) |
| 07 crea 7 políticas `"Superadmins read all X"` | Ninguna existe → creación limpia, `duplicate_object` no se dispara |
| `is_superadmin()` requerida por 06/07/09 | Existe, SECURITY DEFINER |
| `is_team_member_of` / `is_team_lead_of` (06) | No existen → se crean; sin overloads previos |
| RPCs `lead_list_my_teams` / `lead_team_projects` / `lead_team_activity` (09) | No existen → se crean; los DROP IF EXISTS calzan con las firmas |
| `admin_set_project_archived` (usada por AdminView) | Existe |
| `experiments.created_by/resolved_by/resolved_at` y `activity_log.details` (08) | No existen → 08 las agrega |
| `experiments.status` | **Es `text` en prod, no el enum del repo.** El `::text` de 09 es inocuo sobre text |
| `profiles` (para backfill de 08) | email/full_name/avatar_url presentes; email sin default (NOT NULL asumido, el filtro `u.email IS NOT NULL` cubre) |
| `teams.lead_user_id` | Existe (uuid) |
| `handle_new_user` | Existe (hotfix 2026-07-23 vigente) |

## Hallazgos preexistentes (NO introducidos por 06-09, follow-ups)

1. **`north_star_metrics`: política `"Allow all operations"` con qual/with_check `true`** — lectura Y escritura abiertas a cualquier autenticado. Preexistente.
2. **`team_members`: política `"Allow all operations"` `true/true`** — ídem.
3. **`profiles`: `allow_all_insert` / `allow_all_update` / `allow_all` (SELECT) con `true`** — cualquier autenticado puede insertar/actualizar perfiles vía REST. Preexistente; `trg_protect_global_role` mitiga la escalada de rol pero el resto de columnas queda expuesto.
4. **~3 generaciones de políticas duplicadas conviviendo** (heredadas en español + "Members can X" + V3) en projects/experiments/objectives/strategies/project_members. RLS permisiva suma con OR: redundante pero no incorrecto. Limpieza = follow-up aparte, fuera de este alcance.
5. **`projects`: `"Crear proyectos"` con_check `true`** — cualquier autenticado crea proyectos (comportamiento actual de la app).
6. Cláusulas superadmin vía `auth.jwt() -> user_metadata ->> global_role` en políticas antiguas — frágiles (dependen del metadata del JWT, no de `profiles.global_role`); 07 agrega el camino confiable vía `is_superadmin()`.
7. **Trigger `trg_protect_global_role` (BEFORE UPDATE en profiles)**: puede rechazar la promoción de cuentas de prueba desde el SQL Editor. Si falla, deshabilitar temporalmente el trigger para ese UPDATE y re-habilitarlo.
8. Triggers `updated_at` duplicados en experiments/objectives/profiles/projects/strategies (`set_updated_at` + `update_X_updated_at`) — inofensivo.

## Inventario condensado

### Políticas por tabla (nombre — cmd — resumen del qual)

**activity_log**: `Users can insert own activity` (INSERT, user_id=uid) · `Read own or superadmin reads all activity` (SELECT, own OR is_superadmin).

**experiments**: `Acceso Heredado Experimentos` (ALL, member) · `Experiments All V3` (ALL, is_project_member) · `Members can delete/insert/update experiments` + `Members delete/insert/update experiments` (member, duplicadas) · `Superadmins manage experiments del/ins/upd` (is_superadmin) · `Users can read project experiments` (SELECT, member OR jwt-superadmin).

**north_star_metrics**: `Acceso Heredado NSM` (ALL, member) · `Allow all operations on north_star_metrics` (ALL, true/true ⚠).

**objectives / strategies**: mismo patrón que experiments (heredada ALL + V3 ALL + Members X duplicadas + Superadmins manage del/ins/upd + read con jwt-superadmin).

**profiles**: INSERT `Profiles Insert V3` (uid=id) + `allow_all_insert` (true ⚠) · SELECT `Members can read co-member profiles`, `Profiles Read V3` (true), `Public profiles are viewable by everyone` (true), `Superadmins can read all profiles`, `Users can read own profile`, `allow_all` (true), `profiles_self_read` · UPDATE `Profiles Update V3` (uid=id), `Superadmins can update any profile`, `Users can update own profile`, `allow_all_update` (true ⚠), `profiles_self_update`.

**project_members**: DELETE `Admins can delete memberships` (super OR proj-admin), `Members Delete V3` · INSERT `Admins can manage memberships`, `Auto-asignación al crear` (uid), `Members Insert V3`, `Users can add themselves as members` · SELECT `Accesible por el propio usuario`, `Members Select V3`, `Superadmins can read all memberships`, `Users can read own memberships` (own OR jwt-superadmin) · UPDATE `Admins can update memberships`, `Members Update V3`, `Project admins or superadmins update memberships`.

**projects**: DELETE `Admins can delete their projects` (proj-admin OR jwt-superadmin), `Borrar mis proyectos` (member), `Projects Delete V3` · INSERT `Admins can insert projects` (false), `Crear proyectos` (true), `Projects Insert V3` (authenticated) · SELECT `Acceso a mis proyectos` (member), `Projects Select V3` (is_project_member), `Users can read assigned projects` (member OR jwt-superadmin) · UPDATE `Admins can update their projects`, `Modificar mis proyectos` (member), `Projects Update V3`.

**team_members**: `Allow all operations on team_members` (ALL, true/true ⚠).

**team_memberships**: `team_memberships_write` (ALL, is_superadmin) · `team_memberships_select` (SELECT, super OR own OR **EXISTS teams** ← recursión).

**team_projects**: `team_projects_write` (ALL, is_superadmin) · `team_projects_select` (SELECT, super OR **EXISTS teams** ← recursión).

**teams**: `teams_write` (ALL, is_superadmin) · `teams_select` (SELECT, super OR lead OR **EXISTS team_memberships** ← recursión).

**user_areas**: `user_areas_delete/insert` (is_superadmin) · `user_areas_select` (true).

### Funciones public (nombre — args — secdef)

Todas SECURITY DEFINER salvo las de updated_at: `admin_add_team_member(uuid,uuid)`, `admin_add_team_project(uuid,uuid)`, `admin_create_team(text,uuid)`, `admin_delete_team(uuid)`, `admin_list_project_members(uuid)`, `admin_list_projects()`, `admin_list_teams()`, `admin_remove_project_member(uuid,uuid)`, `admin_remove_team_member(uuid,uuid)`, `admin_remove_team_project(uuid,uuid)`, `admin_set_project_archived(uuid,boolean)`, `admin_set_team_lead(uuid,uuid)`, `admin_upsert_project_member(uuid,uuid,text)`, `assert_superadmin()`, `clone_demo_project(uuid)`, `create_project_with_membership(...)`, `get_global_finished_experiments()`, `get_notification_preference(uuid)`, `handle_new_user()`, `is_admin_or_above()`, `is_project_admin(uuid,uuid)`, `is_project_member(uuid,uuid)`, `is_superadmin()`, `is_team_admin_of_project(uuid)`, `protect_global_role()`. No secdef: `touch_updated_at()`, `update_updated_at()`, `update_updated_at_column()`.

### Columnas relevantes

- **experiments**: id, project_id, title, **status text default 'Idea'** (no enum), owner_id (default auth.uid()), hypothesis, observation, problem, impact, confidence, ease, ice_score, funnel_stage, north_star_metric, linked_strategy_id, start/end_date, test_url, success_criteria, target_metric, key_learnings, visual_proof jsonb, source, created_at, updated_at, owner_name, owner_avatar, labels, is_active, verdict, campaign_objective, is_public. **Sin created_by/resolved_by/resolved_at** (las agrega 08).
- **activity_log**: id, user_id, project_id, action, entity_type, entity_id, created_at. **Sin details** (lo agrega 08).
- **profiles**: id, email, full_name, avatar_url, global_role (global_role_enum default 'user'), created_at, updated_at, panel_logo_url, area[], last_seen_at, can_access_global_library.
- **projects**: incluye `archived boolean default false` + campos nsm_* (source_type/url/config/last_synced_at/sync_status/webhook_token — divergencia del repo, no la tocamos).
- **teams**: id, name, lead_user_id, created_at.

### Triggers public

updated_at duplicados en experiments/objectives/profiles/projects/strategies; `trg_protect_global_role` en profiles; touch en tablas de otro dominio (campaigns, clients, influencers, purchase_orders — conviven en la misma BD).
