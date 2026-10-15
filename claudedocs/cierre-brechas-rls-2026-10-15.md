# Cierre de brechas RLS - ronda de correcciones, 15-oct-2026

Estado: implementacion parcial, **NO lista para aceptar ni desplegar**. El reintento local SQL paso (92 checks), pero la suite completa termino 23/24: el runner mantiene una asercion global incompatible con la instruccion de conservar metadata de otras apps. Se detuvieron cambios de codigo al agotarse el unico intento de correccion permitido. Esta ronda no declara aceptacion del coordinador. Sin conexiones remotas, deploy, secretos, commits ni push; `src/lib/supabase.ts` intacto.

## Causas y decisiones implementadas

- La identidad se resolvia desde `profiles.email`, editable, y el correo aceptaba destinatarios/titulo del navegador. Ahora un trigger protege email y privilegios (service role/superadmin/operacion SQL administrativa exceptuados); invitaciones resuelven `auth.users.email` confirmado. Retornan NULL tambien en exito, desconocido, no confirmado, duplicado y cuota agotada, para no exponer resultados distintos. El frontend da un mensaje uniforme y refresca el equipo. Cuota por actor: 20 intentos/hora UTC en `gh_actor_usage`; los fallos normales consumen intento porque no levantan excepcion que revierta la reserva.
- Correo recibe exclusivamente `experimentId`, consulta con JWT/RLS, exige `Finished - Winner` y `gh_project_write`, toma titulo de BD y owner desde `auth.admin.getUserById`, exige email confirmado y respeta `get_notification_preference`. Cuota de cinco reservas/minuto por actor y dedupe por experimento en BD. La reserva anterior al proveedor da semantica de un solo intento por experimento: un 502 tambien conserva dedupe; no hay reenvio automatico. `NOTIFICATIONS_FROM` acepta solo dominio exacto `send.mmglatam.com`; fallback `no-reply@send.mmglatam.com`.
- El repo no tenia `experiments.owner_id`: se agrega FK a Auth. El backfill solo vincula nombres que coinciden con un unico miembro del mismo proyecto. Ambiguos/sin coincidencia quedan NULL, sin correo. Altas/cambios de propietario en ProjectContext guardan la identidad cuando el miembro es inequivoco. Notificar ocurre despues de persistir Winner, evitando la carrera contra la escritura anterior.
- IA autoriza perfiles admin/superadmin, o email de Auth confirmado en los dominios configurados. Default: `agenciavou.cl,moovmediagroup.com,moovmedia.cl,metrix.digital,somosforma.com,mmglatam.com`. Dominio exacto, no subdominios ni metadata del cliente. Cuota individual 50/dia y global `AI_GLOBAL_DAILY_LIMIT` (default 1000/dia UTC). Una fila global bloqueada serializa reservas; la denegacion individual revierte tambien la reserva agregada. FK a Auth permite cuentas sin profiles. Denegaciones normales: 403 o 429, no 503 por FK a profiles.
- `activity_log`: INSERT propio; SELECT propio o superadmin; ninguna politica UPDATE/DELETE authenticated. Se cargaron y probaron las RPC reales de `09_migration_lead_rpcs.sql` en PGlite. Mi equipo consume `lead_list_my_teams`, `lead_team_projects`, `lead_team_activity` SECURITY DEFINER. El panel Uso actual consulta directamente activity_log como superadmin (`src/AdminView.tsx:88`); conserva lectura completa bajo la misma regla de produccion, no se invento una RPC distinta.
- DELETE de Storage exige escritura y propietario/admin tanto en permisiva como restrictiva; el negativo incluye un objeto cuyo propietario fue degradado a viewer. NSM consulta `gh_project_write` antes de fetch CSV o persistir estado, por lo que viewer no inicia sincronizacion.
- `visualProof` conserva referencias; `visualProofUrls` es un mapa de presentacion separado. Firma fallida da NULL en el mapa y muestra "Evidencia no disponible"; no elimina referencias. Upload retorna referencia aunque no pueda firmarse. La eliminacion requiere accion explicita. Cobertura de firma fallida, adicion, eliminacion y recuperacion en `security-evidence.test.mjs`.
- Biblioteca Global conserva acceso a evidencia publica terminada para no miembros habilitados. El endpoint `library-evidence` obtiene rutas de `gh_library_evidence_paths` SECURITY DEFINER con JWT del lector y firma mediante service role solo esas rutas persistidas. RPC devuelve [] para privado, activo o lector sin permiso. Firmas de una hora, respuesta private/no-store.
- Captura incluye relkind r/p, inventario metadata con `~* 'user_meta'`, columnas agregadas, politicas, triggers, funciones y flags. Ambas transacciones usan lock_timeout 5s. Un definer que decide roles con user_meta o auth.jwt aborta. Solo se reemplazan las nueve tablas Hub; politicas metadata en otras apps quedan intactas, con NOTICE e inventario de solo lectura, pendientes de sus responsables. Storage recibe guardas limitadas al bucket de evidencia; rollback restaura captura y omite ALTER RLS/force cuando ya coincide, incluido storage.objects.
- SQL companion `20261015_revertir_visual_proof.sql` convierte storage:// a URL publica al revertir frontend. Requiere configurar en la misma sesion `app.rollback_supabase_url` con el origen publico (sin credenciales). No debe ejecutarse con el frontend actual ni con bucket privado sin el rollback coordinado.

## Checks realmente ejecutados

| Comando | Resultado |
|---|---|
| `node scripts/verify-rls-local.mjs` | Primer intento exit 1 por colision variable p/alias pg_proc. Unica correccion: alias proc. Reintento exit 0, 92 checks, sin red. Incluye idempotencia, backup exacto, rollback exacto, padre particionado, definers con ambas formas de metadata, cuotas, RPCs lead, evidencia privada/publica/activa y conversion para frontend anterior. |
| `node --experimental-strip-types --experimental-test-module-mocks --test scripts/security-endpoints.test.mjs scripts/security-evidence.test.mjs scripts/security-runner.test.mjs` | Primer intento 23/24 por misma colision SQL. Reintento 23/24, exit 1: `Persisten metadata o bucket publico`, en el SQL generado por `scripts/verify-rls-remote.mjs:36`. Endpoints 15/15 y evidencia/NSM 4/4 pasan; runner 4/5. No se intento una segunda correccion. |
| `.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.app.json` | Sin diagnosticos; proceso agrupado con el siguiente finalizo exit 0. |
| `.\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.node.json` | Sin diagnosticos, exit 0. Incluye API. |
| `npm.cmd run build --cache "$env:TEMP\gh-npm-cache"` | Exit 0, Vite 7.3.1, 1783 modulos. Advertencia chunk JS 767.53 kB. |
| `node scripts/verify-security-lint.mjs` | Exit 0: 11 archivos TS; base 21 errores, actual 21, cero diagnosticos nuevos. No equivale a lint global limpio. |
| `git diff --check` | Exit 0. |

## Pendientes concretos que impiden cerrar esta ronda

1. **Fallo reproducido**: acotar el chequeo de metadata del runner a las nueve tablas Hub y usar `~* 'user_meta'`. Las otras apps deben listarse como pendientes, no causar error. No modificar sus politicas para hacer pasar el runner. Volver a ejecutar los checks tras autorizacion de continuar del coordinador.
2. **Revision estatica, sin reproduccion adicional por la regla de parada**: invitacion a Auth confirmado sin profiles puede violar FK `project_members.user_id -> profiles.id` y romper la respuesta uniforme. Agregar condicion de existencia de perfil/captura uniforme de esa excepcion y test conservando el contador.
3. **Revision estatica**: la reconstruccion de politicas Storage anteriores agrega `bucket_id <> 'experiment-evidence' AND ...` tambien cuando la politica es RESTRICTIVE. Eso puede bloquear evidencia legitima. Preservar el efecto externo y hacer neutra para evidencia la restrictiva antigua (rama OR correspondiente); agregar fixture de politica restrictiva mixta antes de aprobar.
4. **Revision estatica**: el RPC Biblioteca compara URLs legacy contra nombre sin decodificar. Nombres con espacios o caracteres percent-encoded pueden no firmarse. Normalizar de manera canonica y sin wildcards, con pruebas positivas de esos nombres y negativas de referencias privadas/ajenas. URLs legacy simples y referencias storage:// estan cubiertas.
5. El enlace de propietarios por nombre sigue siendo compatibilidad con la UI actual; nombres ambiguos no envian correo. Revisar asignacion de identidad en importacion/creacion masiva y nombres duplicados. No se probo navegador ni datos reales.

## Prechequeo de produccion: solo lectura, no ejecutado en esta ronda

Ejecutar por el responsable autorizado sobre el catalogo vigente; el inventario del 31-ago es historico. Guardar resultados para comparar con captura/rollback. No leer claves ni tokens.

```sql
-- Catalogo completo: politicas, grants, propietarios, RLS, particiones.
SELECT schemaname,tablename,policyname,permissive,cmd,roles,qual,with_check
FROM pg_policies ORDER BY 1,2,3;
SELECT table_schema,table_name,grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema IN ('public','storage') ORDER BY 1,2,3,4;
SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner,
 c.relrowsecurity,c.relforcerowsecurity,pg_get_partkeydef(c.oid) AS partition_key
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','storage') ORDER BY 1,2;
SELECT inhparent::regclass,inhrelid::regclass FROM pg_inherits;

-- Campos/tipos reales: incluye project_members.role, team_members,
-- north_star_metrics, storage.objects.owner_id y nuevo experiments.owner_id.
SELECT table_schema,table_name,column_name,data_type,udt_name,is_nullable
FROM information_schema.columns WHERE
 (table_schema='public' AND table_name IN ('projects','project_members','profiles',
 'experiments','objectives','strategies','north_star_metrics','team_members','activity_log'))
 OR (table_schema='storage' AND table_name IN ('objects','buckets')) ORDER BY 1,2,ordinal_position;
SELECT n.nspname,t.typname,e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
JOIN pg_namespace n ON n.oid=t.typnamespace ORDER BY 1,2,e.enumsortorder;
SELECT conrelid::regclass,conname,pg_get_constraintdef(oid) FROM pg_constraint
WHERE connamespace='public'::regnamespace ORDER BY 1,2;
SELECT tgrelid::regclass,tgname,tgenabled,pg_get_triggerdef(oid)
FROM pg_trigger WHERE NOT tgisinternal ORDER BY 1,2;

-- Todas las RPC, cuerpos/owners/grants, no solo los helpers nuevos.
SELECT n.nspname,p.proname,p.oid::regprocedure,pg_get_userbyid(p.proowner) AS owner,
 p.prosecdef,p.proconfig,p.proacl,pg_get_functiondef(p.oid)
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public','storage') AND p.prokind='f' ORDER BY 1,2;
SELECT pg_get_functiondef('public.is_superadmin()'::regprocedure);

-- Metadata: separar Hub/storage de campaigns, clients, influencers,
-- purchase_orders y cualquier otra app. Esas politicas NO se migran aqui.
SELECT schemaname,tablename,policyname,qual,with_check FROM pg_policies
WHERE concat(qual,with_check) ~* 'user_meta' ORDER BY 1,2,3;
SELECT n.nspname,p.proname,p.oid::regprocedure,p.prosrc FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prosecdef
AND (p.prosrc ~* 'user_meta' OR p.prosrc ~* 'auth[.]jwt[[:space:]]*[(]') ORDER BY 1,2;
-- El resultado de arriba incluye funciones de alta que solo copian nombre:
-- revisar decisiones de rol, no confundirlas con presentacion.
SELECT u.id,u.raw_user_meta_data->>'global_role' AS metadata_role,p.global_role
FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
WHERE u.raw_user_meta_data->>'global_role'='superadmin'
AND p.global_role::text IS DISTINCT FROM 'superadmin';
SELECT lower(email),count(*) FROM public.profiles GROUP BY lower(email) HAVING count(*)>1;
SELECT p.id,p.email AS profile_email,u.email AS auth_email,
 (u.email_confirmed_at IS NOT NULL) AS confirmed FROM public.profiles p
LEFT JOIN auth.users u ON u.id=p.id WHERE p.email IS DISTINCT FROM u.email;

-- Colisiones antes de primera aplicacion y permisos de captura efectiva.
SELECT schemaname,tablename FROM pg_tables WHERE schemaname='public'
AND (tablename LIKE 'gh\_%' ESCAPE '\' OR tablename IN
 ('ai_usage','ai_global_usage','_rls_backup_20261015'));
SELECT n.nspname,p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'gh\_%' ESCAPE '\';
SELECT current_user,session_user,pg_get_userbyid(c.relowner) AS owner,
 pg_has_role(current_user,c.relowner,'USAGE') AS member_of_owner,
 has_table_privilege(current_user,c.oid,'SELECT') AS can_select,
 has_table_privilege(current_user,c.oid,'UPDATE') AS can_update
FROM pg_class c WHERE c.oid='storage.objects'::regclass;
-- Revisar capacidad owner/miembro para ALTER, LOCK y CREATE POLICY sobre
-- storage.objects en clon. SELECT/UPDATE no demuestran permiso DDL.
SELECT id,name,public,file_size_limit FROM storage.buckets WHERE id='experiment-evidence';
SELECT pid,mode,granted,relation::regclass FROM pg_locks
WHERE relation IN ('public.profiles'::regclass,'storage.objects'::regclass);
```

Confirmar permisos efectivos del backup y ausencia de colisiones antes del GO. Congelar DDL durante captura/aplicacion. Ensayar en clon completo con esquema Auth/Storage de Supabase real, politicas de multiples buckets, triggers de registro y de ultimo superadmin; comparar pg_policies, triggers, funciones, flags y grants tras rollback. PGlite no demuestra permisos de administracion de Storage ni normalizacion HTTP.

## Orden de despliegue, cuando la ronda este cerrada y exista GO de CK

1. Preparar frontend y API en el mismo release. Configurar en Vercel primero `SUPABASE_SERVICE_ROLE_KEY` (solo servidor), `AI_ALLOWED_EMAIL_DOMAINS`, `AI_GLOBAL_DAILY_LIMIT`, `NOTIFICATIONS_FROM` y verificar en Resend el dominio permitido; confirmar disponibilidad de las claves servidor ya configuradas sin exponerlas. No usar prefijo VITE para service role ni proveedor.
2. Ejecutar prechequeos de solo lectura, completar pendientes, ensayar clon, respaldar y coordinar breve pausa de escrituras. Obtener GO explicito de CK para el SQL/deploy concretos. No aplicar esta version mientras existan los pendientes anteriores.
3. Aplicar `20261015_cierre_brechas_rls.sql` y revisar captura, NOTICE, politicas y bucket privado. Lock_timeout 5s aborta ante contencion: no aumentar a ciegas.
4. Desplegar frontend/API **inmediatamente despues de la migracion**, en el mismo mantenimiento. Frontend viejo no entiende storage:// ni bucket privado; API nueva sin RPCs da 503. Evitar convivencia prolongada.
5. Ejecutar checklist siguiente y conservar resultados antes de reanudar trafico normal.

## Checklist posterior a aplicacion autorizada (no ejecutado aqui)

- [ ] Captura legible solo por roles previstos, politicas de nueve tablas sin metadata; otras apps sin cambios y NOTICE entregados a sus responsables. Revisar funciones SECURITY DEFINER y search_path.
- [ ] Registro real (`handle_new_user`), creacion de proyecto, invitacion confirmada/desconocida/no confirmada/sin profiles, duplicado, cuota y respuesta uniforme. Email propio bloqueado, service role/superadmin permitidos; ultimo superadmin protegido por trigger existente.
- [ ] Negativos anon/authenticated con metadata falsificada, viewer y usuario ajeno; permisos REST tras revocar membresia. INSERT propio de actividad; UPDATE/DELETE nunca para authenticated; miembro no lee actividad ajena.
- [ ] Panel administracion y Uso como superadmin, Mi equipo por RPCs lead_* y liderazgo real; NSM viewer sin fetch ni escritura.
- [ ] Biblioteca de no miembro habilitado ve evidencia publica terminada; privado/activo/sin permiso no devuelve firmas. Comprobar nombres codificados y politicas Storage mixtas despues de corregir los pendientes.
- [ ] Evidencia nueva project/experiment y legacy experiment/file, URL publica antigua inaccesible tras bucket privado, firma y renovacion al recargar, propietario degradado sin DELETE. Probar `..`, `%2e%2e`, separadores codificados en Storage HTTP real.
- [ ] Interrumpir firma: se conserva referencia y se muestra no disponible; agregar otra evidencia y quitar una explicitamente no borra las restantes.
- [ ] IA: dominio confirmado permitido, externo/no confirmado 403, excepcion admin/superadmin, cuenta sin perfil, 51 individual 429, global agregado 429 y concurrencia entre instancias sin exceder ambos topes.
- [ ] Correo Winner ligado a experimento/owner real, preferencias none/notify_winner=false, remitente permitido, cuota/dedupe entre instancias, proveedor fallido con reserva retenida.

## Reversion coordinada (requiere GO especifico)

Detener escrituras, conservar respaldo y decidir si se mantiene frontend compatible. Si se vuelve al frontend anterior, configurar `app.rollback_supabase_url` (origen publico de Supabase sin clave) y ejecutar `20261015_revertir_visual_proof.sql` junto a `20261015_cierre_brechas_rls.rollback.sql` en el mismo mantenimiento; desplegar frontend/API anterior inmediatamente. El companion convierte datos, el rollback restaura autorizacion/bucket y elimina tablas de cuota/dedupe. La conversion no la revierte el rollback. Las politicas vulnerables capturadas se restauran deliberadamente; no es un estado seguro de operacion normal. Si el bucket no existia y recibio objetos, el FK puede impedir eliminarlo y abortar el rollback: resolverlo en clon, sin borrar evidencia por defecto. Owner_id agregado se retira solo si no existia en captura; conservar su informacion si interesa para una reaplicacion.

## Limites

No se verifico Supabase/Vercel/Resend/OpenAI real, secretos/env, permisos DDL de Storage ni navegador. No se uso GitNexus porque no estaba expuesto; se revisaron llamadores localmente. No se instalaron dependencias ni ejecutaron procesos remotos. La concurrencia se protege con locks/UPSERT en SQL y se ejercitaron limites secuenciales locales; no se simularon dos conexiones de produccion. 
