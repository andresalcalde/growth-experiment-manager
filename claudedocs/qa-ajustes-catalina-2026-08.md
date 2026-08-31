# QA multi-rol — Ajustes visibilidad y trazabilidad (Catalina 2026-08)

Ejecutado: 2026-08-31, dev local (localhost:5173) contra BD de prod, post-migraciones 06-09.
Precondición: `verify-rls.mjs` 11/11 PASS. Cuentas: test-member / test-lead / test-security (superadmin temporal).

## Resultados

### test-member (user normal)
- ✅ Portfolio muestra solo su proyecto (Test Post-Security Hotfix); sin botones "Mi equipo" ni "Admin" (header y sidebar).
- ✅ Creó experimento "QA Trazabilidad 2026-08-31" → BD: `created_by` = id del member (DEFAULT auth.uid()), log `experiment_created` con `details.title`.
- ✅ Movió Idea → Analysis (select de Explore) → log `experiment_moved` con `details {from: Idea, to: Analysis, title}` correcto.
- ✅ Finalizó como Winner vía Learning Modal → BD: `status = Finished - Winner`, `resolved_by` = member, `resolved_at` seteado, verdict guardado, log con `{from: Analysis, to: Finished - Winner}`.

### test-lead (admin, líder de Equipo QA)
- ✅ Ve botón "Mi equipo"; NO ve "Admin". Portfolio propio en 0 (sin membresías de proyecto — esperado).
- ✅ Vista Mi equipo: solo SU equipo (sin selector de equipos ajenos); miembros con área y último uso; proyecto con activos (3) / finalizados (3) / última actividad al día.
- ✅ Feed de actividad con títulos y transiciones legibles: «QA Trazabilidad 2026-08-31» (Analysis → Finished - Winner). Entradas históricas sin details muestran fallback `#id` (limitación conocida).
- ✅ Filtro de fechas (jun 2026) → solo las 2 entradas de junio; botón Limpiar aparece.

### test-security (superadmin)
- ✅ Portfolio: 91 proyectos / 261 experimentos activos sin membresía explícita (coincide con `admin_list_projects` — verify-rls check).
- ✅ Vista Mi equipo como superadmin: lista los 10 equipos con selector; datos de cada uno cargan.
- ✅ Abre proyecto ajeno (The North Face): NSM, kanban y tabla Explore (19 experimentos) legibles.
- ✅ Panel Uso: banner de limitación histórica presente; filtro de fechas (31/8) recalcula ranking (Test Post-Security Hotfix #1, actividad 3) y trazabilidad (409 → 1 filas).
- ✅ Trazabilidad: fila del experimento QA con Creado por = test 2, Resuelto por = test 2, fechas 31/8; banner declara reconstrucción histórica, "resuelto por" solo hacia adelante y exclusión de archivados.
- ✅ Exportar CSV: click sin errores JS (la descarga en sí no es verificable en el navegador embebido; el código usa Blob + BOM).
- ✅ Archivar "Jockey Plaza demo": desaparece del portfolio (refetchAll) y de la lista admin; "Mostrar archivados" lo revela con botón Desarchivar; desarchivar lo restaura. El `window.confirm` de guard funciona (bloqueó el primer intento automatizado — comportamiento correcto).

## Observaciones (no bloqueantes)
1. **Carrera post-login**: inmediatamente tras iniciar sesión, el portfolio puede mostrar "0 proyectos" hasta un refresh (se observó 1 vez con superadmin; un reload lo corrige y no se reprodujo en logins posteriores). Preexistente al cambio; candidato a follow-up.
2. **Warnings de DOM nesting** (`<button>` dentro de `<button>` en InfoTooltip) en consola — preexistentes, sin efecto funcional.
3. **Escritura de superadmin en proyectos ajenos**: prod ya tenía políticas `Superadmins manage experiments upd/ins/del`, así que el superadmin SÍ puede escribir en proyectos ajenos (no es el no-op que se asumió en la review — I6 queda resuelto en la práctica: hay visibilidad Y escritura). No se probó escritura sobre datos reales de clientes deliberadamente.
4. Regresión de creación de proyecto no ejercitada para no ensuciar prod (flujo `create_project_with_membership` sin cambios en esta rama).

## Datos de prueba generados
- Experimento `9a1969a6-de1a-4913-97bd-5b86a5162780` "QA Trazabilidad 2026-08-31" (Finished - Winner) en Test Post-Security Hotfix + 3 entradas de activity_log.
- test-member agregado como editor de Test Post-Security Hotfix.
- Jockey Plaza demo: archivado y desarchivado (estado final: activo, sin cambios).

## Veredicto
**APROBADO.** Los 3 puntos del requerimiento funcionan end-to-end contra prod. Listo para Gate B (push a main → deploy Vercel).
Pendiente post-deploy: revertir test-security a `user` y smoke test en prod.
