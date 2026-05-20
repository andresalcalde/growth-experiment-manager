# Platform Feedback UX Improvements - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar los 5 cambios de UX solicitados en el feedback de la plataforma Growth para mejorar claridad, usabilidad y adopcion.

**Architecture:** Cambios puramente frontend (React components + CSS) excepto el Task 1 que requiere schema de DB (Supabase storage para logos PNG). Los cambios son independientes entre si y pueden implementarse en paralelo.

**Tech Stack:** React 19 + TypeScript + Tailwind CSS + Supabase Storage (para logos)

---

## Resumen de Cambios

| # | Feedback | Impacto | Complejidad |
|---|----------|---------|-------------|
| 1 | Customizacion de marca (logo PNG por agencia) | Alto | Alta |
| 2 | Visibilidad del Status en Explore | Medio | Baja |
| 3 | Jerarquia de la seccion Analysis en Be Agile | Medio | Baja |
| 4 | Accion de cierre del experimento (boton Finalizar) | Alto | Media |
| 5 | North Star Metric visible en Explore y Be Agile | Medio | Baja |

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/App.tsx` | Modify | North Star bar en Explore/BeAgile, logo en sidebar, status chips en tabla |
| `src/components/NorthStarBar.tsx` | Create | Componente reutilizable de la barra North Star (extraido de RoadmapView) |
| `src/components/StatusChip.tsx` | Create | Componente visual prominente para status de experimento |
| `src/components/FinalizeExperimentButton.tsx` | Create | Boton primario "Finalizar experimento" con opciones Winner/Loser/Inconclusive |
| `src/ExperimentDrawer.tsx` | Modify | Integrar FinalizeExperimentButton, reorganizar ICE Score |
| `src/RoadmapView.tsx` | Modify | Extraer North Star rendering a componente compartido |
| `src/SettingsView.tsx` | Modify | Agregar upload de logo en settings del proyecto |
| `src/PortfolioView.tsx` | Modify | Mostrar logo PNG en project cards |
| `src/index.css` | Modify | Estilos para status chips, Analysis column highlight, North Star bar compact |
| `supabase/migration_logo_url.sql` | Create | Agregar campo `logo_url` a tabla projects + storage bucket |
| `src/lib/supabase.ts` | Modify | Helper para upload de imagen a Supabase Storage |
| `src/types.ts` | Modify | Agregar `logoUrl?: string` a ProjectMetadata |
| `src/contexts/ProjectContext.tsx` | Modify | CRUD para logo_url del proyecto |

---

## Task 1: Customizacion de Marca (Logo PNG)

**Descripcion:** Permitir que cada agencia/proyecto cargue su logo en formato PNG, reemplazando el emoji actual. El logo se muestra en sidebar, portfolio cards y project switcher.

**Files:**
- Create: `supabase/migration_logo_url.sql`
- Create: `src/lib/uploadLogo.ts`
- Modify: `src/types.ts:81` (agregar logoUrl)
- Modify: `src/contexts/ProjectContext.tsx` (CRUD logoUrl)
- Modify: `src/SettingsView.tsx` (UI de upload)
- Modify: `src/App.tsx:754-760` (sidebar logo)
- Modify: `src/PortfolioView.tsx:140-141` (project cards)
- Modify: `src/CreateProjectModal.tsx` (opcion de subir logo en creacion)

### Task 1.1: Schema y Storage

- [ ] **Step 1: Crear migration SQL para logo_url**

```sql
-- supabase/migration_logo_url.sql
-- Agregar campo logo_url a projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo_url text;

-- Crear bucket para logos si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: usuarios autenticados pueden subir logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-logos');

-- Policy: logos son publicos para lectura
CREATE POLICY "Public logo access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-logos');

-- Policy: miembros del proyecto pueden actualizar/eliminar logos
CREATE POLICY "Project members can manage logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-logos');
```

- [ ] **Step 2: Ejecutar migration en Supabase SQL Editor**

Run en Supabase Dashboard > SQL Editor.

### Task 1.2: Upload Helper

- [ ] **Step 3: Agregar logoUrl al tipo ProjectMetadata**

Modify `src/types.ts:81`:
```typescript
export interface ProjectMetadata {
  id: string;
  name: string;
  logo?: string;        // emoji (legacy)
  logoUrl?: string;      // URL de imagen PNG
  createdAt: string;
  industry?: string;
}
```

- [ ] **Step 4: Crear helper de upload**

Create `src/lib/uploadLogo.ts`:
```typescript
import { supabase } from './supabase';

export async function uploadProjectLogo(
  projectId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${projectId}/logo.${ext}`;

  const { error } = await supabase.storage
    .from('project-logos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('project-logos')
    .getPublicUrl(path);

  return data.publicUrl;
}
```

- [ ] **Step 5: Actualizar ProjectContext para manejar logo_url**

En `src/contexts/ProjectContext.tsx` (~950 lineas), realizar estos cambios especificos:

a) **En la funcion `fetchProjects`** (~linea 180-220): Agregar `logo_url` al `.select()` de Supabase y mapearlo a `logoUrl` en el objeto ProjectMetadata:
```typescript
// En el .select() agregar logo_url
const { data } = await supabase.from('projects').select('id, name, logo, logo_url, industry, ...');

// En el mapping a ProjectMetadata:
metadata: {
  ...existing fields,
  logoUrl: project.logo_url || undefined,
}
```

b) **En la funcion `updateProject`** (~linea 350-400): Permitir actualizar `logo_url`:
```typescript
// Agregar logo_url al objeto de update cuando logoUrl este presente
const updates: any = { ...fields };
if ('logoUrl' in fields) {
  updates.logo_url = fields.logoUrl;
  delete updates.logoUrl;
}
```

c) **En el tipo de retorno del context**: Asegurar que `logoUrl` se propague correctamente al re-fetch.

- [ ] **Step 6: Commit**

```bash
git add supabase/migration_logo_url.sql src/lib/uploadLogo.ts src/types.ts src/contexts/ProjectContext.tsx
git commit -m "feat: add logo_url field and Supabase storage for project logos"
```

### Task 1.3: UI de Upload en Settings

- [ ] **Step 7: Agregar seccion de logo en SettingsView**

En `src/SettingsView.tsx`, dentro de la seccion de configuracion del proyecto, agregar:
- Preview del logo actual (imagen si `logoUrl` existe, emoji si solo `logo` existe)
- Input file type="file" accept="image/png,image/jpeg"
- Handler que llama `uploadProjectLogo()` y actualiza el proyecto
- Boton para eliminar logo (volver a emoji)

```typescript
// Dentro del form de settings del proyecto
<div style={{ marginBottom: '24px' }}>
  <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
    Logo del Proyecto
  </label>
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
    {project.metadata.logoUrl ? (
      <img
        src={project.metadata.logoUrl}
        alt="Project logo"
        style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
      />
    ) : (
      <span style={{ fontSize: '48px' }}>{project.metadata.logo || '📁'}</span>
    )}
    <div>
      <input
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleLogoUpload}
        style={{ display: 'none' }}
        ref={logoInputRef}
      />
      <button onClick={() => logoInputRef.current?.click()}>
        Cambiar Logo
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 8: Commit**

```bash
git add src/SettingsView.tsx
git commit -m "feat: add logo upload UI in project settings"
```

### Task 1.4: Mostrar Logo en Sidebar y Portfolio

- [ ] **Step 9: Actualizar sidebar en App.tsx**

En `src/App.tsx:754-760`, reemplazar el SVG hardcodeado de "Growth Lab":
- Si el proyecto activo tiene `logoUrl`, mostrar `<img>` con el logo
- Si no, mostrar el SVG default de Growth Lab

```typescript
<div className="logo-area" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={handleBackToPortfolio}>
  {activeProject?.metadata.logoUrl ? (
    <img
      src={activeProject.metadata.logoUrl}
      alt={activeProject.metadata.name}
      style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
    />
  ) : (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      {/* existing SVG paths */}
    </svg>
  )}
  <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>
    {activeProject?.metadata.logoUrl ? activeProject.metadata.name : 'Growth Lab'}
  </span>
</div>
```

- [ ] **Step 10: Actualizar project cards en PortfolioView**

En `src/PortfolioView.tsx:140-141`, priorizar `logoUrl` sobre emoji:

```typescript
{project.metadata.logoUrl ? (
  <img
    src={project.metadata.logoUrl}
    alt=""
    style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
  />
) : (
  <span style={{ fontSize: '32px' }}>{project.metadata.logo || initials}</span>
)}
```

- [ ] **Step 11: Actualizar project switcher dropdown en App.tsx**

En `src/App.tsx:805-813`, el dropdown de `<option>` no soporta imagenes nativas. Mostrar el emoji como fallback en el `<option>`, pero considerar un custom dropdown si se quiere mostrar el logo PNG.

- [ ] **Step 12: Verificar build**

```bash
npm run build
```

- [ ] **Step 13: Commit**

```bash
git add src/App.tsx src/PortfolioView.tsx
git commit -m "feat: display project logo in sidebar and portfolio cards"
```

---

## Task 2: Visibilidad del Status en Explore

**Descripcion:** El status del experimento en la tabla Explore es un `<select>` pequeno que pasa desapercibido. Convertirlo en un elemento visual destacado con colores, iconos y affordance clara.

**Files:**
- Create: `src/components/StatusChip.tsx`
- Modify: `src/App.tsx:1128-1153` (tabla Explore, columna status)
- Modify: `src/index.css` (estilos del chip)

- [ ] **Step 1: Crear componente StatusChip**

Create `src/components/StatusChip.tsx`:
```typescript
import { Status } from '../types';

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  'Idea': { icon: '💡', label: 'Idea', color: 'var(--status-idea)' },
  'Prioritized': { icon: '🎯', label: 'Priorizado', color: 'var(--status-prioritized)' },
  'Building': { icon: '🔧', label: 'Construyendo', color: 'var(--status-dev)' },
  'Live Testing': { icon: '🧪', label: 'En Prueba', color: 'var(--status-testing)' },
  'Analysis': { icon: '📊', label: 'Analisis', color: 'var(--status-analysis, #8b5cf6)' },
};

interface StatusChipProps {
  status: Status;
  onChange: (newStatus: Status) => void;
}

export function StatusChip({ status, onChange }: StatusChipProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['Idea'];

  return (
    <div
      className="status-chip"
      style={{ '--chip-color': config.color } as React.CSSProperties}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="status-chip__icon">{config.icon}</span>
      <select
        value={status}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value as Status);
        }}
        onClick={(e) => e.stopPropagation()}
        className="status-chip__select"
      >
        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
          <option key={key} value={key}>{val.label}</option>
        ))}
      </select>
      <span className="status-chip__arrow">▾</span>
    </div>
  );
}
```

> **Nota:** Los `stopPropagation()` son criticos para evitar que el click en el chip abra el ExperimentDrawer (el row tiene `onClick` que abre el drawer).
```

- [ ] **Step 2: Agregar estilos del chip en index.css**

```css
/* Status Chip - Explore View */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--chip-color) 15%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--chip-color) 30%, transparent);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  min-width: 140px;
}

.status-chip:hover {
  background: color-mix(in srgb, var(--chip-color) 25%, transparent);
  border-color: var(--chip-color);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--chip-color) 20%, transparent);
}

.status-chip__icon {
  font-size: 14px;
}

.status-chip__select {
  appearance: none;
  background: none;
  border: none;
  color: var(--chip-color);
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  outline: none;
  padding-right: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-chip__arrow {
  color: var(--chip-color);
  font-size: 10px;
  position: absolute;
  right: 10px;
}
```

- [ ] **Step 3: Integrar StatusChip en la tabla Explore de App.tsx**

En `src/App.tsx:1128-1153`, reemplazar el `<select>` actual por `<StatusChip>`:

```typescript
import { StatusChip } from './components/StatusChip';

// En la celda de status de la tabla:
<td>
  <StatusChip
    status={exp.status}
    onChange={(newStatus) => handleStatusChangeAttempt(exp.id, newStatus)}
  />
</td>
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/StatusChip.tsx src/index.css src/App.tsx
git commit -m "feat: prominent status chips with icons in Explore table view"
```

---

## Task 3: Jerarquia de la Seccion Analysis (Be Agile)

**Descripcion:** La columna Analysis en el Kanban no se percibe como paso critico. Destacarla visualmente para indicar que aqui se registran los resultados.

**Files:**
- Modify: `src/App.tsx` (Kanban column rendering, ~line 1033-1049)
- Modify: `src/index.css` (estilos especiales para Analysis column)

- [ ] **Step 1: Agregar clase especial a la columna Analysis**

En `src/App.tsx`, modificar el componente `KanbanColumn` (definido ~linea 165-195) para aceptar un prop `className` opcional y aplicarlo condicionalmente:

```typescript
// Dentro de la definicion de KanbanColumn, agregar className al tipo de props:
function KanbanColumn({ status, className, ... }: { status: string; className?: string; ... }) {
  return (
    <div className={`kanban-column ${className || ''}`}>
      {/* ... existing content */}
    </div>
  );
}

// En el call site del board (donde se mapean BOARD_COLUMNS):
<KanbanColumn
  status={col}
  className={col === 'Analysis' ? 'kanban-column--analysis' : ''}
  // ... existing props
>
```

- [ ] **Step 2: Agregar indicador visual en el header de Analysis**

Dentro del componente `KanbanColumn`, despues del `<div className="column-header">` y antes del `<SortableContext>`, agregar un CTA condicional:

```typescript
// Dentro de KanbanColumn, justo despues del header div:
{status === 'Analysis' && (
  <div className="analysis-cta">
    <span>📊</span>
    <span>Registra resultados para avanzar a Learning</span>
  </div>
)}
```

- [ ] **Step 3: Estilos CSS para columna Analysis destacada**

En `src/index.css`:

```css
/* Analysis Column Highlight */
.kanban-column--analysis {
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.02) 100%) !important;
  border: 1.5px dashed rgba(139, 92, 246, 0.3);
  border-radius: 12px;
}

.kanban-column--analysis .kanban-column-header {
  color: #7c3aed;
}

.analysis-cta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.08);
  border-radius: 8px;
  font-size: 11px;
  color: #7c3aed;
  font-weight: 500;
  margin-bottom: 8px;
}
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/index.css
git commit -m "feat: highlight Analysis column as critical step in Be Agile kanban"
```

---

## Task 4: Accion de Cierre del Experimento

**Descripcion:** Reemplazar el dropdown de status por un boton primario "Finalizar Experimento" cuando el experimento esta en Analysis. Reorganizar el ICE Score para que no interfiera visualmente.

**Files:**
- Create: `src/components/FinalizeExperimentButton.tsx`
- Modify: `src/ExperimentDrawer.tsx:129-175` (status area + ICE Score position)
- Modify: `src/index.css` (estilos del boton)

- [ ] **Step 1: Crear componente FinalizeExperimentButton**

Create `src/components/FinalizeExperimentButton.tsx`:
```typescript
import { useState } from 'react';
import { Status } from '../types';

interface Props {
  onFinalize: (status: Status) => void;
}

const OUTCOMES = [
  { status: 'Finished - Winner' as Status, label: 'Winner', icon: '🏆', color: '#10b981', desc: 'La hipotesis fue validada' },
  { status: 'Finished - Loser' as Status, label: 'Loser', icon: '❌', color: '#ef4444', desc: 'La hipotesis fue invalidada' },
  { status: 'Finished - Inconclusive' as Status, label: 'Inconclusive', icon: '🔄', color: '#6b7280', desc: 'No hay datos suficientes' },
];

export function FinalizeExperimentButton({ onFinalize }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        className="finalize-btn"
        onClick={() => setExpanded(true)}
      >
        <span>🏁</span>
        Finalizar Experimento
      </button>
    );
  }

  return (
    <div className="finalize-options">
      <p className="finalize-options__title">Selecciona el resultado:</p>
      {OUTCOMES.map(({ status, label, icon, color, desc }) => (
        <button
          key={status}
          className="finalize-option"
          style={{ '--option-color': color } as React.CSSProperties}
          onClick={() => {
            onFinalize(status);
            setExpanded(false);
          }}
        >
          <span className="finalize-option__icon">{icon}</span>
          <div>
            <span className="finalize-option__label">{label}</span>
            <span className="finalize-option__desc">{desc}</span>
          </div>
        </button>
      ))}
      <button
        className="finalize-cancel"
        onClick={() => setExpanded(false)}
      >
        Cancelar
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Estilos para FinalizeExperimentButton**

En `src/index.css`:
```css
/* Finalize Experiment Button */
.finalize-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.finalize-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
}

.finalize-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.finalize-options__title {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin: 0 0 4px 0;
}

.finalize-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--option-color) 8%, white);
  border: 1.5px solid color-mix(in srgb, var(--option-color) 25%, transparent);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.finalize-option:hover {
  background: color-mix(in srgb, var(--option-color) 15%, white);
  border-color: var(--option-color);
  transform: translateX(4px);
}

.finalize-option__icon {
  font-size: 20px;
}

.finalize-option__label {
  display: block;
  font-weight: 700;
  font-size: 14px;
  color: var(--option-color);
}

.finalize-option__desc {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.finalize-cancel {
  padding: 8px;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
}
```

- [ ] **Step 3: Integrar en ExperimentDrawer**

En `src/ExperimentDrawer.tsx`:

a) Reemplazar el bloque del boton "Concluir y Archivar" existente (~linea 727-754) con el nuevo componente. Mantener el mensaje de fallback para experimentos que no estan en Analysis.

b) El `onFinalize` callback debe llamar `onStatusChange(experiment.id, selectedStatus)` (requiere ambos argumentos: id + status) que ya triggerea el `handleStatusChangeAttempt` en App.tsx (que abre KeyLearningModal).

c) Eliminar el import de `CheckCircle2` de lucide-react si ya no se usa en otro lugar del drawer.

```typescript
import { FinalizeExperimentButton } from './components/FinalizeExperimentButton';

// Reemplazar el bloque completo del boton "Concluir y Archivar" (lineas 727-754):
{experiment.status === 'Analysis' ? (
  <FinalizeExperimentButton
    onFinalize={(status) => onStatusChange(experiment.id, status)}
  />
) : (
  <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
    Cambia el status a "Analysis" para finalizar este experimento
  </p>
)}
```

- [ ] **Step 4: Reorganizar ICE Score en el drawer**

En `src/ExperimentDrawer.tsx:159-175`, mover el ICE Score de su posicion absoluta (`position: absolute; top: 16px; right: 60px`) a dentro del flow normal del drawer, debajo del status:

```typescript
// Antes: position absolute superpuesta
// Despues: inline dentro del header, debajo del titulo
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginTop: '12px',
}}>
  <div style={{
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    borderRadius: '8px',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }}>
    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>ICE</span>
    <span style={{ color: 'white', fontSize: '20px', fontWeight: 800 }}>
      {experiment.iceScore || 0}
    </span>
  </div>
  {/* Status badge al lado */}
</div>
```

- [ ] **Step 5: Verificar build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/FinalizeExperimentButton.tsx src/ExperimentDrawer.tsx src/index.css
git commit -m "feat: replace status dropdown with Finalize Experiment button and reorganize ICE Score"
```

---

## Task 5: North Star Metric Visible en Explore y Be Agile

**Descripcion:** La North Star Metric solo aparece en Design (RoadmapView). Agregarla como barra compacta en Explore y Be Agile.

**Files:**
- Create: `src/components/NorthStarBar.tsx`
- Modify: `src/App.tsx` (agregar NorthStarBar en Explore y BeAgile views)
- Modify: `src/RoadmapView.tsx` (opcional: refactorizar para usar el componente compartido)

- [ ] **Step 1: Crear componente NorthStarBar compacto**

Create `src/components/NorthStarBar.tsx`:
```typescript
interface NorthStarBarProps {
  name: string;
  currentValue: number;
  targetValue: number;
  metricType: string;
}

function formatValue(value: number, type: string): string {
  switch (type) {
    case 'currency': return `$${value.toLocaleString()}`;
    case 'percentage': return `${value}%`;
    case 'ratio': return value.toFixed(2);
    default: return value.toLocaleString();
  }
}

export function NorthStarBar({ name, currentValue, targetValue, metricType }: NorthStarBarProps) {
  const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  return (
    <div className="north-star-bar">
      <div className="north-star-bar__info">
        <span className="north-star-bar__label">⭐ North Star</span>
        <span className="north-star-bar__name">{name}</span>
        <span className="north-star-bar__values">
          {formatValue(currentValue, metricType)} / {formatValue(targetValue, metricType)}
        </span>
      </div>
      <div className="north-star-bar__track">
        <div
          className="north-star-bar__fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Estilos para NorthStarBar**

En `src/index.css`:
```css
/* North Star Bar - Compact */
.north-star-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, rgba(124, 58, 237, 0.04) 100%);
  border: 1px solid rgba(79, 70, 229, 0.1);
  border-radius: 10px;
  margin-bottom: 16px;
}

.north-star-bar__info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.north-star-bar__label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #4F46E5;
  letter-spacing: 0.5px;
}

.north-star-bar__name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.north-star-bar__values {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.north-star-bar__track {
  flex: 1;
  height: 6px;
  background: rgba(79, 70, 229, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.north-star-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, #4F46E5, #7C3AED);
  border-radius: 3px;
  transition: width 0.5s ease;
}
```

- [ ] **Step 3: Integrar NorthStarBar en Explore y Be Agile**

En `src/App.tsx`, agregar `<NorthStarBar>` justo encima del contenido de la tabla (Explore) y del board (Be Agile):

```typescript
import { NorthStarBar } from './components/NorthStarBar';

// Antes de la tabla en Explore y antes del board en Be Agile:
{northStar && northStar.name && (
  <NorthStarBar
    name={northStar.name}
    currentValue={northStar.currentValue || 0}
    targetValue={northStar.targetValue || 0}
    metricType={northStar.type || 'count'}
  />
)}
```

Ubicaciones exactas:
- **Explore (table):** Antes del `<div className="table-container">` o equivalente (~linea 1090)
- **Be Agile (board):** Antes del `<div className="kanban-board">` o equivalente (~linea 1020)

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/NorthStarBar.tsx src/index.css src/App.tsx
git commit -m "feat: show North Star Metric bar in Explore and Be Agile views"
```

---

## Orden de Ejecucion Recomendado

Los tasks son independientes, pero para minimizar conflictos en `App.tsx` y `index.css`:

1. **Task 5** (North Star Bar) - menor riesgo, componente nuevo aislado
2. **Task 2** (Status Chips) - componente nuevo, cambio localizado en tabla
3. **Task 3** (Analysis Column) - solo CSS + clase condicional
4. **Task 4** (Finalizar Experimento) - cambio en ExperimentDrawer
5. **Task 1** (Logo/Branding) - mas complejo, requiere DB + Storage + multiples archivos

## Dependencias

```
Task 1 (Logo) ──── independiente (requiere Supabase migration primero)
Task 2 (Status) ── independiente
Task 3 (Analysis) ─ independiente
Task 4 (Finalizar) ─ independiente
Task 5 (North Star) ─ independiente
```

Todos modifican `App.tsx` e `index.css`, por lo que ejecutar en serie evita merge conflicts.
