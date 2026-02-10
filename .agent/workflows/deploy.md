---
description: Deploy workflow - preview and production
---

# Deploy Workflow

## URLs
- **Preview (pruebas):** Se genera automáticamente al pushear a `dev`
- **Production:** https://growth-experiment-manager.vercel.app

## Flujo de trabajo

### 1. Trabajar en cambios (branch dev)
```bash
git checkout dev
```

### 2. Hacer cambios y pushear a Preview
```bash
git add -A
git commit -m "descripción del cambio"
git push origin dev
```

### 3. Probar en la Preview URL
Vercel te dará una URL como: `https://growth-experiment-manager-XXXXX.vercel.app`

### 4. Pasar a Producción
```bash
git checkout main
git merge dev
git push origin main
```

### 5. Volver a dev para seguir trabajando
```bash
git checkout dev
```

## Deploy manual (si los auto-deploys fallan)
```bash
# Preview
npx vercel

# Production
npx vercel --prod
```
