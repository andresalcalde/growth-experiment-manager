# COMMITS PENDIENTES — VALIDACIÓN LOCAL COMPLETA, PENDIENTE REVISIÓN DEL COORDINADOR

Estado 15-oct-2026: comprobaciones locales aprobadas. No hay commits, push, despliegue ni acceso a Supabase remoto. El coordinador decide los commits y CK debe dar el GO antes de cualquier cambio en producción. Este documento no declara aceptación del coordinador.

Se continuó el borrador existente conservando los cambios heredados. No se modificaron `.env*`, secretos ni `src/lib/supabase.ts`.

## Causas corregidas en esta continuación

- Captura SQL: `DECLARE t record` colisionaba con `FROM pg_trigger t`. Se renombró únicamente la variable del bucle de tablas a `captured_table`.
- Runner local: PGlite conserva `authenticator` después de `RESET SESSION AUTHORIZATION`; la captura quedaba invisible por RLS y el rollback acusaba `Captura incompleta`. El runner restaura explícitamente la sesión `postgres` después de cada identidad de prueba. No se debilitó el RLS del backup.
- Lint: al ampliar el efecto de Biblioteca Global, la supresión preexistente quedó antes del `useEffect` en vez de antes de `loadData`. Se recolocó el comentario.
- Otras tablas: la fixture ya no tiene una política `true/true` que oculte el resultado del reemplazo de metadata. Ejercita políticas permisivas y restrictivas, USING y WITH CHECK, acceso propio y superadmin desde profiles.

## Checks ejecutados en esta continuación

| Comando | Resultado real |
|---|---|
| `node scripts/verify-rls-local.mjs` | Exit 0: `72 checks passed; no network connections`. Migración completa, captura exacta, segunda aplicación sin alterar captura, negativos, RPC de creación/invitación, cuota 51 denegada, rollback exacto e idempotente y team_members sin project_id. |
| `node --experimental-strip-types --experimental-test-module-mocks --test scripts/security-endpoints.test.mjs scripts/security-runner.test.mjs` | Exit 0: 14 tests, 14 pass, 0 fail/skip. JWT inválido/ausente → 401, correo externo → 403, modelo no permitido → 400; plantilla escapada, remitente, rate limit, cuota y tope de tokens. Guardas de URL, propagación de exit != 0 y SQL del runner ejecutado en PGlite; una política abierta a propósito es detectada como fallo. |
| `npx.cmd tsc --noEmit -p tsconfig.app.json` | Exit 0, sin diagnósticos. |
| `npx.cmd tsc --noEmit -p tsconfig.node.json` | Exit 0, sin diagnósticos; incluye `api/**/*.ts`. |
| `npm.cmd run build` | Exit 0: 1783 módulos; build Vite terminado. Aviso de chunk JS >500 kB (766.73 kB), sin error. |
| `node scripts/verify-security-lint.mjs` | Exit 0: `9 archivos TS: base 28 errores; actual 28; 0 diagnósticos nuevos.` Compara ESLint en archivos cambiados contra HEAD; los errores heredados siguen presentes. |
| `git diff --check` | Exit 0, sin errores de whitespace. Git advierte conversión futura LF→CRLF. |

Evidencia de fallos y corrección proporcional: la primera corrida de esta continuación pasó 68 casos y terminó con exit 1 en rollback por identidad SQL no restaurada; tras un ajuste del runner pasó completa. El primer lint comparado dio 29 errores frente a 28 en la base y una supresión sin uso; tras recolocar el comentario quedó 28/28 y cero diagnósticos nuevos. El runner local captura cualquier fallo y fija `process.exitCode = 1`.

Las pruebas de endpoints usan Node 22 y las opciones experimentales de strip-types/module-mocks disponibles en este equipo. No usan servicios de correo/IA ni Supabase real. Las advertencias experimentales de Node no son fallos.

## Grupos propuestos para el coordinador (sin commits realizados)

### `fix(seguridad): aislar datos por proyecto y capturar políticas para rollback`

- `supabase/migrations/20261015_cierre_brechas_rls.sql`
- `supabase/migrations/20261015_cierre_brechas_rls.rollback.sql`
- `src/contexts/ProjectContext.tsx`
- `src/contexts/AuthContext.tsx`
- `src/hooks/useProjects.ts`

Captura inmutable inicial, reemplazo completo de políticas del Hub, permisos por admin/editor/viewer y protección de ambos privilegios del perfil. Conserva `protect_global_role()` y su trigger original; añade uno independiente. La creación usa `create_project_with_membership`; la invitación por email usa `gh_add_project_member` para no reabrir lectura global de perfiles. Mi equipo lee project_members + profiles; team_members sin project_id queda solo para superadmin.

### `fix(seguridad): proteger evidencia privada con rutas de proyecto y URLs firmadas`

- `src/lib/uploadEvidence.ts`
- `src/GlobalLibraryView.tsx`

Depende de la migración y ProjectContext del grupo anterior. Rutas nuevas project_id/experiment_id/archivo; referencias duraderas storage://; firmas de una hora y renovación cada 45 minutos. Las rutas legacy experiment_id/archivo se autorizan mediante lookup sin mover objetos. Usuarios con Biblioteca Global pero sin membresía no reciben evidencia privada ajena.

### `fix(api): autorizar notificaciones y limitar consumo de IA por usuario`

- `api/_lib/security.ts`
- `api/send-notification.ts`
- `api/ai-assistant.ts`
- `src/lib/notify.ts`
- `tsconfig.node.json`

Valida getUser; correo solo propio o con proyecto compartido, plantilla Winner escapada y `no-reply@send.mmglatam.com`. Rate limit de 5/minuto por usuario y por instancia. IA solo gpt-4o-mini (modelo de la UI), 1000 tokens máximo y 50 solicitudes/día UTC con reserva atómica service-role. Requiere SUPABASE_SERVICE_ROLE_KEY server-side; no se modificó configuración ni secretos.

### `test(seguridad): verificar RLS, rollback y endpoints sin acceso remoto`

- `package.json`
- `package-lock.json`
- `scripts/fixtures/security-schema.sql`
- `scripts/verify-rls-local.mjs`
- `scripts/security-endpoints.test.mjs`
- `scripts/verify-rls-remote.mjs`
- `scripts/security-runner.test.mjs`
- `scripts/verify-security-lint.mjs`
- `COMMITS-PENDIENTES.md`

PGlite ya estaba añadido en el borrador. No se añadieron otras dependencias en esta continuación. La fixture es un esquema mínimo reconstruido, no un dump de producción.

## Runner contra una BD explícita (no ejecutado contra ninguna BD externa)

`node scripts/verify-rls-remote.mjs` exige DATABASE_URL PostgreSQL y estos UUID de fixtures ya existentes en una BD de pruebas:

- RLS_TEST_USER_ID: perfil normal no miembro del proyecto ajeno.
- RLS_TEST_FOREIGN_PROJECT_ID: proyecto ajeno con evidencia y al menos una fila en experiments/objectives/strategies/north_star_metrics y team_members (si tiene project_id).
- RLS_TEST_VIEWER_ID: perfil no superadmin con membresía viewer.
- RLS_TEST_VIEWER_PROJECT_ID: proyecto del viewer con un experimento existente.

También exige psql en PATH y conexión SQL capaz de SET ROLE authenticated. No hay psql instalado en este equipo: el transporte real queda sin verificar. El SQL completo del runner sí pasó en PGlite, y detectó una política abierta introducida intencionalmente.

No carga `.env`, no tiene destino por defecto, rechaza el ref de producción `oumhhngnwjijtmgpnhba` en host o usuario de pooler (incluido URL-encoding) salvo `--allow-prod`. Esa excepción se comprobó solo como función, sin conexión. Usa psql -X, ON_ERROR_STOP, timeout y transacción con ROLLBACK; no aplica migraciones. Un error cierra la conexión y revierte la transacción. Los callbacks externos de triggers, si existieran en otra BD, no están modelados por esta fixture: usar una BD de pruebas.

## Cambios exactos definidos para una aplicación futura autorizada

Todo el cambio SQL ocurre en una transacción con advisory lock 20261015. Las tablas opcionales se modifican solo si existen.

1. Crea public._rls_backup_20261015, activa RLS sin políticas, revoca PUBLIC/anon/authenticated y otorga SELECT a service_role. Captura una sola vez políticas completas de las tablas afectadas y storage.objects, flags RLS, fila completa del bucket, protect_global_role y DDL/estado de triggers de profiles. Reaplicar no sobrescribe la captura.
2. Elimina TODAS las políticas, sin depender del nombre, en public.projects, project_members, profiles, experiments, objectives, strategies, north_star_metrics, team_members y activity_log. Incluye las autoinserciones de membresía, Allow all operations, allow_all_insert/update/select, duplicadas heredadas y SELECT true de profiles.
3. En cada una de esas nueve tablas crea exactamente gh_select, gh_insert, gh_update y gh_delete, excepto profiles que solo tiene las primeras tres. Total con las nueve presentes: 35 políticas. Lectura por membresía/co-miembro/propio; escritura admin/editor; membresías y borrado de proyectos solo admin/superadmin. Profiles no tiene DELETE. team_members sin project_id usa is_superadmin para todas las operaciones.
4. Fuera de esas tablas, cada política que contenga user_metadata en qual/with_check se elimina y reconstruye con su mismo nombre, roles, comando y modo permissive/restrictive, sustituyendo exclusivamente el predicado global_role='superadmin' por public.is_superadmin(). Un patrón desconocido aborta la transacción. Ambas ramas y el rollback se probaron localmente.
5. Crea o actualiza el bucket experiment-evidence a public=false. Elimina en storage.objects cualquier política cuyo qual/with_check mencione experiment-evidence o cuyo nombre coincida con gh_evidence_%. Crea exactamente gh_evidence_select, gh_evidence_insert, gh_evidence_update, gh_evidence_delete y gh_evidence_guard_select, gh_evidence_guard_insert, gh_evidence_guard_update, gh_evidence_guard_delete. Las cuatro guard son restrictivas para impedir bypass por otras permisivas genéricas; otros buckets conservan su acceso.
6. Crea las ocho funciones public.gh_project_read(uuid), gh_project_write(uuid), gh_project_admin(uuid), gh_profile_read(uuid), gh_add_project_member(uuid,text,text), gh_protect_profile(), gh_evidence_project(text), gh_reserve_ai_usage(uuid). Fija search_path y grants explícitos. Conserva funciones originales y crea el trigger gh_protect_profile BEFORE INSERT OR UPDATE en profiles.
7. Crea public.ai_usage(user_id, day, requests), PK(user_id,day), FK profiles, límite requests 1..50, RLS y exactamente gh_ai_own (SELECT propio). Revoca escrituras de usuarios/anon; service role escribe y ejecuta la reserva atómica.
8. La verificación final aborta si persisten políticas con user_metadata, políticas heredadas en esas tablas o bucket público. El SELECT final enumera las políticas gh_* efectivas. Con las nueve tablas presentes se crean 44 políticas nuevas (35 Hub + 8 Storage + 1 cuota), además de los reemplazos de metadata con sus nombres originales.

Los nombres originales vigentes solo pueden conocerse en la captura de una aplicación autorizada; no se inventó un inventario actual. El informe del 31-ago se leyó como referencia histórica. Los conjuntos dinámicos de eliminación anteriores son completos y la tabla backup guarda cada nombre/expresión real para inspección y reversión.

Rollback: elimina las políticas nuevas de todas las tablas capturadas y reconstruye exactamente las capturadas (roles, cmd, permissive, qual, with_check); restaura funciones/triggers/flags/bucket; elimina las ocho funciones gh_*, ai_usage y la captura. Las comparaciones locales incluyen todas las políticas, funciones public, triggers, bucket y flags RLS, no solo conteos. Restablece políticas vulnerables deliberadamente. Si el bucket no existía antes y recibió objetos, el FK puede impedir borrarlo: el rollback aborta completo. La cuota nueva ai_usage se elimina al revertir.

## Límites y revisión pendiente antes del GO

- No se verificó el esquema efectivo de Supabase ni Auth/Storage reales. No hubo conexiones remotas ni lecturas de producción.
- No se repitió Docker/Supabase CLI: el borrador documentó Docker sin acceso al motor/config y CLI bloqueada por telemetría fuera del sandbox. Se usó PostgreSQL embebido PGlite, con políticas RLS reales.
- No hubo pruebas de navegador para registro, panel admin, Mi equipo, biblioteca ni renovación de firmas tras suspensión. Creación e invitación se comprobaron por SQL; cuota y autorizaciones de API, con mocks. Compatibilidad de la fixture no equivale a aceptación de UI ni ensayo sobre un clon completo de Supabase.
- resolveEvidence omite firmas inaccesibles/fallidas. Revisar en preview que editar un experimento tras un fallo transitorio de firma no borre referencias existentes al guardar visualProof; ese escenario no está cubierto por esta continuación.
- El rate limit de correo es por instancia, no distribuido. Las reservas de IA fallidas también consumen cuota por diseño.
- GitNexus no está expuesto en esta sesión; revisión de referencias manual, sin análisis de grafo. No hay commits por instrucción del coordinador.
- El borrador registró npm ci exitoso (500 paquetes), instalación de PGlite y 37 vulnerabilidades de npm audit. No se repitió audit ni se actualizaron dependencias fuera del alcance.