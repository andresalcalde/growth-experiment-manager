# 🚀 Guía Completa: Activar Usuarios en Producción

**Fecha:** Febrero 2026  
**Estado actual:** El código con autenticación está listo localmente, pero Vercel sigue con la versión vieja (sin auth).

---

## 📋 Resumen de lo que vamos a hacer

| Paso | Dónde | Qué |
|------|-------|-----|
| 1 | Supabase Dashboard | Crear las tablas en la base de datos |
| 2 | Supabase Dashboard | Configurar URLs de autenticación |
| 3 | Vercel Dashboard | Agregar credenciales de Supabase |
| 4 | Terminal (tu Mac) | Subir código nuevo y deployar |
| 5 | Navegador | Verificar que todo funcione |

**Tiempo estimado:** ~15 minutos

---

## PASO 1: Ejecutar la migración SQL en Supabase 🗄️

Este es el paso más importante. La migración crea todas las tablas que la app necesita.

### 1.1 Abrir Supabase SQL Editor

1. Ve a: **https://supabase.com/dashboard** 
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: **`oumhhngnwjijtmgpnhba`**
4. En el menú izquierdo, haz click en **"SQL Editor"** (icono de código `<>`)

### 1.2 Ejecutar el script

1. Click en **"+ New query"** (botón azul arriba)
2. **Copia TODO** el contenido del archivo `supabase/migration.sql` de tu proyecto
   - Este archivo está en: `/Users/andres/.gemini/antigravity/scratch/growth-experiment-manager/supabase/migration.sql`
   - Puedes abrirlo en tu editor y hacer Cmd+A → Cmd+C
3. **Pega** todo el contenido en el editor SQL de Supabase
4. Click en **"Run"** (botón verde, o Cmd+Enter)

### 1.3 Verificar que funcionó

Después de ejecutar, deberías ver en el panel de resultados:
```
Success. No rows returned.
```

Para verificar que las tablas se crearon, ve a **"Table Editor"** en el menú izquierdo. Deberías ver estas tablas:
- ✅ `profiles`
- ✅ `projects` 
- ✅ `project_members`
- ✅ `objectives`
- ✅ `strategies`
- ✅ `experiments`

> **⚠️ IMPORTANTE:** Si ves errores, es probablemente porque ya ejecutaste parte del script antes. El script está diseñado para ser idempotente (seguro de ejecutar múltiples veces), así que los errores de "ya existe" son normales.

---

## PASO 2: Configurar Authentication URLs en Supabase 🔒

Esto le dice a Supabase qué dominios son válidos para login/signup.

### 2.1 Configurar Site URL

1. En Supabase Dashboard, ve a **Authentication** (icono de persona) en el menú izquierdo
2. Click en **"URL Configuration"** (en el sub-menú)
3. En **"Site URL"**, pon:
   ```
   https://growth-experiment-manager.vercel.app
   ```
4. Click **"Save"**

### 2.2 Agregar Redirect URLs

En la misma página, abajo en **"Redirect URLs"**:

1. Click **"Add URL"**
2. Agrega:
   ```
   https://growth-experiment-manager.vercel.app/**
   ```
3. Click **"Save"**

> **💡 ¿Por qué?** Sin esto, cuando un usuario intente hacer signup (con confirmación por email), Supabase no sabrá a dónde redirigirlo después de confirmar.

---

## PASO 3: Agregar Variables de Entorno en Vercel ⚙️

Las variables de entorno conectan tu app en Vercel con tu proyecto de Supabase.

### 3.1 Ir al Dashboard de Vercel

1. Ve a: **https://vercel.com**
2. Inicia sesión
3. Selecciona tu proyecto **"growth-experiment-manager"** (o "major-growth")

### 3.2 Agregar las variables

1. Ve a **Settings** → **Environment Variables**
2. Agrega estas 2 variables:

**Variable 1:**
| Campo | Valor |
|-------|-------|
| Name | `VITE_SUPABASE_URL` |
| Value | `https://oumhhngnwjijtmgpnhba.supabase.co` |
| Environments | ✅ Production, ✅ Preview, ✅ Development |

**Variable 2:**
| Campo | Valor |
|-------|-------|
| Name | `VITE_SUPABASE_ANON_KEY` |
| Value | (copia el valor completo de abajo) |
| Environments | ✅ Production, ✅ Preview, ✅ Development |

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91bWhobmdud2ppanRtZ3BuaGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjYyMjAsImV4cCI6MjA1NDIwMjIyMH0.UXQ3GZkdUY3Toqbrymv-ew_dxYOm2yB
```

3. Click **"Save"** después de agregar cada una

> **⚠️ IMPORTANTE:** Asegurate que la ANON_KEY la copies completa. Si se corta, el login no va a funcionar.

---

## PASO 4: Subir el Código y Deployar 🚢

Hay 2 opciones — elige la que prefieras:

### Opción A: Git Push (Recomendado si Vercel está conectado al repo)

Abre tu terminal y ejecuta:

```bash
cd /Users/andres/.gemini/antigravity/scratch/growth-experiment-manager

# 1. Ver qué archivos cambiaron
git status

# 2. Agregar todos los cambios
git add -A

# 3. Hacer commit 
git commit -m "feat: add Supabase auth & user management"

# 4. Push a GitHub (Vercel auto-deploya)
git push origin main
```

Después del push, Vercel automáticamente va a:
1. Detectar el cambio en GitHub
2. Hacer build del proyecto
3. Deployar a producción (~2-3 minutos)

Puedes ver el progreso en: **https://vercel.com** → tu proyecto → **Deployments**

### Opción B: Vercel CLI (Si no tienes auto-deploy)

```bash
# 1. Instalar CLI de Vercel (solo la primera vez)
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy directamente
cd /Users/andres/.gemini/antigravity/scratch/growth-experiment-manager
vercel --prod
```

---

## PASO 5: Verificar en Producción ✅

Una vez que el deploy termine:

### 5.1 Cargar la app

1. Ve a: **https://growth-experiment-manager.vercel.app**
2. Deberías ver la **pantalla de login** (formulario con "Growth Lab" y el gradiente morado)
   - Si ves esto: ✅ ¡El código nuevo se deployó correctamente!
   - Si ves el dashboard viejo sin login: ❌ Las variables de entorno no se configuraron o el deploy no se completó

### 5.2 Crear tu primera cuenta

1. Click en **"Sign Up"**
2. Llena: nombre, email, y contraseña (min. 6 caracteres)
3. Click **"Create Account"**
4. Verás: *"Account created! Check your email to confirm, then sign in."*
5. Ve a tu email → click en el link de confirmación de Supabase
6. Regresa a la app → **"Sign In"** con tu email y contraseña

### 5.3 Verificar onboarding automático

Después de tu primer login:
- La app debería clonar automáticamente un **"Demo Project"** para ti
- Lo verás en el Portfolio con datos de ejemplo
- Esto confirma que la conexión a Supabase está funcionando 🎉

### 5.4 Verificar en la consola del navegador

1. Abre DevTools (Cmd+Option+I)
2. Ve a la pestaña **Console**
3. Deberías ver:
   ```
   🔐 Auth event: INITIAL_SESSION
   🎯 New user detected – cloning demo project...
   ✅ Demo project cloned: <uuid>
   ```
4. **NO** deberías ver errores rojos

---

## 🐛 Solución de Problemas Comunes

### "Invalid API key" 
→ La ANON_KEY está incompleta o mal copiada en Vercel. Verifica y redeploya.

### "Auth session missing" después de login
→ Falta configurar el Site URL en Supabase (Paso 2.1).

### Se queda en "Initializing Growth Lab..." infinitamente
→ Las variables de entorno no llegaron al build. Ve a Vercel → Settings → Environment Variables y verifica. Luego haz un **Redeploy** (Deployments → ⋯ → Redeploy).

### "relation 'profiles' does not exist"
→ No se ejecutó la migración SQL (Paso 1). Regresa y ejecútala.

### Login funciona pero no carga proyectos
→ Las tablas existen pero no tienen datos. Verifica que el `clone_demo_project` RPC funciona correctamente buscando en SQL Editor:
```sql
SELECT * FROM projects;
SELECT * FROM project_members;
```

---

## 📊 Resumen Visual del Flujo

```
┌────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Tu Browser   │───▶│  Vercel (React)  │───▶│    Supabase      │
│                │    │                  │    │                  │
│ 1. Login form  │    │ AuthGate.tsx     │    │ Auth (usuarios)  │
│ 2. Dashboard   │    │ ProjectContext   │    │ PostgreSQL (DB)  │
│ 3. Experiments │    │ AuthContext      │    │ RLS (seguridad)  │
└────────────────┘    └─────────────────┘    └──────────────────┘
```

---

## ✅ Checklist Final

- [ ] **Paso 1:** Migración SQL ejecutada en Supabase
- [ ] **Paso 2:** Site URL y Redirect URLs configurados  
- [ ] **Paso 3:** Variables de entorno en Vercel
- [ ] **Paso 4:** Código nuevo deployado
- [ ] **Paso 5:** Login funciona en producción
- [ ] **Paso 5:** Demo project se clona automáticamente

**¡Una vez que todo esté ✅, tu app tendrá usuarios reales en producción! 🚀**
