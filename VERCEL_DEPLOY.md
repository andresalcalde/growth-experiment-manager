# 🚀 Vercel Deployment Guide - Enterprise Supabase

## ✅ Pre-requisitos Completados:

- [x] Credenciales Enterprise configuradas
- [x] `.env` actualizado con nueva URL
- [x] `.env.production` creado
- [x] Hooks de Supabase listos

---

## 📋 Pasos para Deploy en Vercel:

### Opción A: Vercel CLI (Más Rápido)

```bash
# 1. Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy a producción
vercel --prod
```

### Opción B: Vercel Dashboard (Recomendado)

#### Paso 1: Importar Proyecto
1. Ve a: https://vercel.com/innovacion-3226s-projects
2. Click **"Add New Project"**
3. Import tu repositorio Git
4. Framework: **Vite**
5. Root Directory: `./`

#### Paso 2: Configurar Variables de Entorno
En la sección **"Environment Variables"**, agrega:

**Variable 1:**
```
Name: VITE_SUPABASE_URL
Value: https://oumhhngnwjijtmgpnhba.supabase.co
```

**Variable 2:**
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91bWhobmdud2ppanRtZ3BuaGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjYyMjAsImV4cCI6MjA1NDIwMjIyMH0.UXQ3GZkdUY3Toqbrymv-ew_dxYOm2yB
```

**IMPORTANTE:** Asegúrate de marcar ambas para:
- [x] Production
- [x] Preview
- [x] Development

#### Paso 3: Deploy
1. Click **"Deploy"**
2. Espera ~2 minutos
3. ¡Listo! 🎉

---

## 🔒 Configuración de Seguridad (Opcional pero Recomendado)

### En Supabase Dashboard:

1. Ve a **Settings** → **API**
2. En **"URL Configuration"** → **"Site URL"**:
   - Agrega tu dominio de Vercel (ej: `https://tu-app.vercel.app`)
3. En **"Redirect URLs"**:
   - Agrega: `https://tu-app.vercel.app/**`

---

## 📊 Verificación Post-Deploy:

Después del deploy, verifica:

- [ ] App carga sin errores
- [ ] Console del navegador: Sin errores de Supabase
- [ ] Network tab: Requests a `oumhhngnwjijtmgpnhba.supabase.co` exitosos
- [ ] Datos se cargan correctamente
- [ ] Real-time sync funciona

---

## 🐛 Troubleshooting:

### Error: "Missing environment variables"
**Solución:** Verifica que agregaste las variables en Vercel y redeploya

### Error: "Failed to fetch"
**Solución:** Verifica que ejecutaste `supabase-schema.sql` en Supabase

### Error: "Invalid JWT"
**Solución:** Verifica que copiaste el ANON_KEY completo (sin espacios)

---

## 🎯 Checklist Final:

- [ ] SQL Schema ejecutado en Supabase
- [ ] Variables de entorno configuradas en Vercel
- [ ] Deploy exitoso
- [ ] App funciona en producción
- [ ] Real-time sync verificado

---

**¡Tu Growth Experiment Manager está listo para producción! 🚀**
