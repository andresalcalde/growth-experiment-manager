import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { NSMSourceConfig, NorthStarMetric } from '../types';

/**
 * useNSMAutosync — sincroniza el valor actual de la North Star Metric
 * desde una hoja de Google Sheets publicada como CSV.
 *
 * Flujo:
 *   1. Fetch al URL CSV público (docs.google.com/.../export?format=csv)
 *   2. Parseo del CSV → busca la celda apuntada por (column, row) — 1-indexed.
 *      Si solo se da `column`, toma la primera celda numérica de esa columna
 *      después del `headerRow`.
 *   3. Update de `projects.nsm_value` + `nsm_last_synced_at` + `nsm_sync_status`.
 *
 * Limitaciones:
 *   - La hoja debe estar publicada como "cualquiera con el enlace puede ver"
 *     y exportable como CSV (la URL típica termina en `?format=csv` o similar).
 *   - Para webhook real (push-based) se requiere una edge function Supabase
 *     `nsm-webhook` (TODO marcado más abajo).
 */

interface SyncResult {
  success: boolean;
  value?: number;
  error?: string;
  rawCell?: string;
}

const columnLetterToIndex = (letter: string): number => {
  // "A" → 0, "B" → 1, ..., "Z" → 25, "AA" → 26
  let acc = 0;
  for (const ch of letter.toUpperCase()) {
    const code = ch.charCodeAt(0) - 64; // A=1
    if (code < 1 || code > 26) return -1;
    acc = acc * 26 + code;
  }
  return acc - 1;
};

// Parser CSV minimalista que respeta comillas dobles y comas dentro de campos.
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch === '\r') { /* skip */ }
      else { cell += ch; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
};

const extractNumber = (raw: string): number | null => {
  if (!raw) return null;
  // Acepta "$1,234.56", "1.234,56" (es-CL), "85%", " 1234 ".
  const trimmed = raw.trim().replace(/[$€£%\s]/g, '');
  if (!trimmed) return null;

  // Heurística: si tiene tanto "." como ",", el último es el separador decimal.
  const hasDot = trimmed.includes('.');
  const hasComma = trimmed.includes(',');
  let normalized = trimmed;
  if (hasDot && hasComma) {
    normalized = trimmed.lastIndexOf(',') > trimmed.lastIndexOf('.')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed.replace(/,/g, '');
  } else if (hasComma && !hasDot) {
    // "1234,5" → "1234.5"; "1.234,56" cubierto arriba.
    normalized = trimmed.replace(',', '.');
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

export function useNSMAutosync() {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const syncFromGoogleSheets = useCallback(async (
    projectId: string,
    sourceUrl: string,
    config: NSMSourceConfig,
  ): Promise<SyncResult> => {
    setSyncing(true);
    try {
      if (!sourceUrl) {
        const result: SyncResult = { success: false, error: 'URL no configurada.' };
        await persistStatus(projectId, 'Error: URL vacía');
        setLastResult(result);
        return result;
      }

      const res = await fetch(sourceUrl, { method: 'GET', mode: 'cors' });
      if (!res.ok) {
        const result: SyncResult = { success: false, error: `HTTP ${res.status}` };
        await persistStatus(projectId, `Error HTTP ${res.status}`);
        setLastResult(result);
        return result;
      }
      const text = await res.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        const result: SyncResult = { success: false, error: 'CSV vacío.' };
        await persistStatus(projectId, 'CSV vacío');
        setLastResult(result);
        return result;
      }

      const headerRow = Math.max(0, (config.headerRow ?? 1) - 1); // 1-indexed → 0-indexed
      const colIdx = config.column ? columnLetterToIndex(config.column) : 0;
      if (colIdx < 0) {
        const result: SyncResult = { success: false, error: `Columna inválida: ${config.column}` };
        await persistStatus(projectId, `Columna inválida: ${config.column}`);
        setLastResult(result);
        return result;
      }

      let value: number | null = null;
      let rawCell = '';
      if (config.row !== undefined && config.row > 0) {
        const rowIdx = config.row - 1;
        rawCell = rows[rowIdx]?.[colIdx] ?? '';
        value = extractNumber(rawCell);
      } else {
        // Sin row específica: primera celda numérica de esa columna después del header.
        for (let i = headerRow + 1; i < rows.length; i++) {
          const cell = rows[i]?.[colIdx] ?? '';
          const n = extractNumber(cell);
          if (n !== null) { value = n; rawCell = cell; break; }
        }
      }

      if (value === null) {
        const result: SyncResult = {
          success: false,
          error: `No se encontró valor numérico en columna ${config.column || 'A'}.`,
          rawCell,
        };
        await persistStatus(projectId, `Sin valor numérico (col ${config.column || 'A'})`);
        setLastResult(result);
        return result;
      }

      // Update DB
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('projects')
        .update({
          nsm_value: value,
          nsm_last_synced_at: nowIso,
          nsm_sync_status: `OK: ${value.toLocaleString()} desde ${rawCell || 'CSV'}`,
        })
        .eq('id', projectId);

      if (error) {
        const result: SyncResult = { success: false, error: error.message };
        setLastResult(result);
        return result;
      }

      const result: SyncResult = { success: true, value, rawCell };
      setLastResult(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      await persistStatus(projectId, `Error: ${msg}`);
      const result: SyncResult = { success: false, error: msg };
      setLastResult(result);
      return result;
    } finally {
      setSyncing(false);
    }
  }, []);

  // Best-effort: ignora errores aquí porque el error original ya se reporta.
  const persistStatus = async (projectId: string, status: string) => {
    try {
      await supabase
        .from('projects')
        .update({ nsm_sync_status: status, nsm_last_synced_at: new Date().toISOString() })
        .eq('id', projectId);
    } catch { /* ignore */ }
  };

  /**
   * Webhook URL helper — devuelve la URL pública para que el cliente la copie.
   * La edge function real `nsm-webhook` debe:
   *   1. Validar el token contra projects.nsm_webhook_token
   *   2. Aceptar { value: number } en el body
   *   3. UPDATE projects SET nsm_value, nsm_last_synced_at, nsm_sync_status
   *
   * TODO: implementar como Supabase Edge Function en `supabase/functions/nsm-webhook/`
   * y agendarla con Supabase Scheduled Functions si se quiere polling de
   * Google Sheets en background (cron).
   */
  const buildWebhookUrl = useCallback((token: string | null | undefined): string => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!supabaseUrl || !token) return '';
    return `${supabaseUrl}/functions/v1/nsm-webhook?token=${token}`;
  }, []);

  return { syncing, lastResult, syncFromGoogleSheets, buildWebhookUrl };
}

// Helper exportado por si otra parte del código necesita parsear cifras.
export const __nsmAutosyncInternals = { columnLetterToIndex, parseCsv, extractNumber };

// Marca de tipo para evitar import-orphan
export type { NorthStarMetric };
