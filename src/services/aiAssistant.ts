/**
 * aiAssistant — cliente del Design Assistant (etapa Design) y revisión de
 * redacción de campos de experimentos.
 *
 * Llamadas a OpenAI:
 * - En PRODUCCIÓN se enrutan por la función serverless `/api/ai-assistant`
 *   (la API key vive server-side en Vercel como `OPENAI_API_KEY` y nunca
 *   llega al navegador). El cliente adjunta el token de sesión Supabase.
 * - En DESARROLLO local, si hay `VITE_OPENAI_API_KEY` en el `.env`, se llama
 *   directo a OpenAI por conveniencia (esa key solo existe localmente y no se
 *   incluye en el build de producción).
 */
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DesignContext {
  projectName?: string;
  northStarName?: string;
  northStarTarget?: number | string;
  northStarCurrent?: number | string;
  objectives: { title: string; description?: string }[];
  strategies: { title: string; objectiveTitle?: string; targetMetric?: string }[];
}

export interface DesignDraft {
  hypothesis?: string;
  successCriteria?: string;
  targetMetric?: string;
  problem?: string;
  observation?: string;
}

export interface AssistantRequest {
  projectContext: DesignContext;
  currentDesign?: DesignDraft;
  history?: ChatMessage[];
  userMessage: string;
}

export interface AssistantResponse {
  reply: string;
  warnings: string[];
}

const SYSTEM_PROMPT = `Eres un asistente experto en metodología Growth y experimentación.

Tu rol:
1. Ayudas al usuario a estructurar HIPÓTESIS bien formuladas con el formato:
   "SI [acción concreta] ENTONCES [resultado esperado y medible] PORQUE [insight o razón estratégica]".
2. Recibes el CONTEXTO ESTRATÉGICO del proyecto (North Star, objetivos, iniciativas) y el ESTADO ACTUAL del Design (hipótesis, criterios de éxito, métrica objetivo).
3. Detectas si el contexto estratégico, los criterios de éxito o la métrica objetivo están incompletos o inconsistentes con el North Star, y propones mejoras concretas.

Cómo respondes:
- En español, conciso, accionable. Sin texto de relleno.
- Cuando sugieras una hipótesis, devuélvela formateada en una sola línea con las tres partes claramente separadas.
- Cuando detectes un problema en el draft, dilo arriba con "⚠️ Atención:" y luego propones el fix.
- Usa viñetas cortas si listas 2+ ítems.
- No inventes datos del proyecto que no estén en el contexto. Si falta info, pregúntala.`;

const formatContextBlock = (ctx: DesignContext, draft?: DesignDraft): string => {
  const lines: string[] = [];
  lines.push('# Contexto del proyecto');
  if (ctx.projectName) lines.push(`- Proyecto: ${ctx.projectName}`);
  if (ctx.northStarName) {
    lines.push(`- North Star: ${ctx.northStarName} (actual: ${ctx.northStarCurrent ?? 'n/a'} / target: ${ctx.northStarTarget ?? 'n/a'})`);
  }
  if (ctx.objectives.length > 0) {
    lines.push('- Objetivos / Growth Levers:');
    for (const o of ctx.objectives) {
      lines.push(`  · ${o.title}${o.description ? ` — ${o.description}` : ''}`);
    }
  } else {
    lines.push('- Objetivos: (ninguno)');
  }
  if (ctx.strategies.length > 0) {
    lines.push('- Initiatives / Strategies:');
    for (const s of ctx.strategies) {
      lines.push(`  · ${s.title}${s.objectiveTitle ? ` (objetivo: ${s.objectiveTitle})` : ''}${s.targetMetric ? ` 🎯 ${s.targetMetric}` : ''}`);
    }
  }
  if (draft) {
    lines.push('');
    lines.push('# Estado actual del Design');
    if (draft.problem) lines.push(`- Problem: ${draft.problem}`);
    if (draft.observation) lines.push(`- Observación: ${draft.observation}`);
    if (draft.hypothesis) lines.push(`- Hipótesis: ${draft.hypothesis}`);
    if (draft.successCriteria) lines.push(`- Criterios de éxito: ${draft.successCriteria}`);
    if (draft.targetMetric) lines.push(`- Métrica objetivo: ${draft.targetMetric}`);
    if (!draft.hypothesis && !draft.successCriteria && !draft.targetMetric) {
      lines.push('(El draft está vacío.)');
    }
  }
  return lines.join('\n');
};

const getApiKey = (): string | null => {
  const key = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();
  return key && key.length > 0 ? key : null;
};

/**
 * `true` si la IA está disponible: en dev necesita la key local; en prod
 * asumimos que la función serverless `/api/ai-assistant` está desplegada.
 */
const aiAvailable = (): boolean => !import.meta.env.DEV || getApiKey() !== null;

type ChatBody = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
};

/**
 * Ejecuta una Chat Completion. En dev local con key → directo a OpenAI;
 * en prod → vía la función serverless con el token de sesión Supabase.
 */
async function callChatCompletion(body: ChatBody): Promise<Response> {
  const localKey = getApiKey();
  if (import.meta.env.DEV && localKey) {
    return fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localKey}`,
      },
      body: JSON.stringify(body),
    });
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? '';
  return fetch('/api/ai-assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Detecta heurísticamente si el draft tiene problemas obvios (sin gastar tokens).
 * Las warnings se muestran como badges amarillos en la UI.
 */
export const validateDesignDraft = (draft: DesignDraft | undefined): string[] => {
  const warnings: string[] = [];
  const hyp = (draft?.hypothesis || '').toUpperCase();
  if (draft?.hypothesis !== undefined && draft.hypothesis.trim().length > 0) {
    const hasSi = /\bSI\b/.test(hyp);
    const hasEntonces = /\bENTONCES\b/.test(hyp);
    const hasPorque = /\bPORQUE\b/.test(hyp);
    if (!hasSi || !hasEntonces || !hasPorque) {
      warnings.push(
        `La hipótesis no usa el formato SI / ENTONCES / PORQUE (falta: ${[
          !hasSi && 'SI', !hasEntonces && 'ENTONCES', !hasPorque && 'PORQUE',
        ].filter(Boolean).join(', ')}).`
      );
    }
  }
  if (draft?.successCriteria !== undefined && draft.successCriteria.trim().length === 0) {
    warnings.push('Criterios de éxito vacíos: define un umbral medible.');
  }
  if (draft?.targetMetric !== undefined && draft.targetMetric.trim().length === 0) {
    warnings.push('Métrica objetivo sin definir.');
  }
  return warnings;
};

/**
 * Llama a OpenAI gpt-4o-mini con el system prompt + contexto + historial.
 * Si no hay API key, devuelve una respuesta canned indicando cómo configurarla.
 */
export async function askDesignAssistant(req: AssistantRequest): Promise<AssistantResponse> {
  const warnings = validateDesignDraft(req.currentDesign);

  if (!aiAvailable()) {
    return {
      reply: [
        'El asistente IA no está configurado en este entorno local.',
        '',
        'Para habilitarlo en dev:',
        '1. Pide la API key de OpenAI.',
        '2. Agrégala como `VITE_OPENAI_API_KEY=sk-...` en el `.env` local.',
        '3. Reinicia el dev server.',
        '',
        'Mientras tanto, recuerda: tu hipótesis debe seguir el formato',
        '*SI [acción] ENTONCES [métrica esperada] PORQUE [insight]*.',
      ].join('\n'),
      warnings,
    };
  }

  const contextBlock = formatContextBlock(req.projectContext, req.currentDesign);
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: contextBlock },
    ...(req.history || []),
    { role: 'user', content: req.userMessage },
  ];

  try {
    const res = await callChatCompletion({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.4,
      max_tokens: 600,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        reply: `Error del asistente (${res.status}): ${text.slice(0, 200) || 'sin detalles'}.`,
        warnings,
      };
    }
    const data = await res.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? '(sin respuesta)';
    return { reply, warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { reply: `No se pudo contactar al asistente: ${msg}`, warnings };
  }
}

// ---------------------------------------------------------------------------
// Revisión de redacción por campo (botón "✨ Revisar" en el ExperimentDrawer)
// ---------------------------------------------------------------------------

export type ReviewField = 'hypothesis' | 'successCriteria' | 'verdict' | 'keyLearnings';

export interface ReviewResult {
  /** Versión corregida/mejorada del texto. */
  suggestion: string;
  /** Lista breve de qué estaba mal (ortografía, claridad, formato, etc.). */
  issues: string[];
}

const REVIEW_GUIDANCE: Record<ReviewField, string> = {
  hypothesis:
    'Es una HIPÓTESIS de experimento. Debe seguir el formato "SI [acción concreta] ENTONCES [resultado esperado y medible] PORQUE [insight o razón]". Si no lo sigue, reestructúrala a ese formato sin inventar datos.',
  successCriteria:
    'Son CRITERIOS DE ÉXITO (definición de done). Deben ser específicos y medibles (umbral numérico, métrica y/o plazo). Hazlos concretos.',
  verdict:
    'Es el VEREDICTO / insight de cierre de un experimento. Debe ser claro, conciso y orientado a la decisión.',
  keyLearnings:
    'Son los KEY LEARNINGS de un experimento. Deben capturar el aprendizaje accionable de forma clara.',
};

/**
 * Revisa la redacción de un campo de experimento con OpenAI y devuelve una
 * versión corregida + la lista de problemas detectados. No reescribe nada por
 * su cuenta: la UI muestra la sugerencia para que el humano la apruebe.
 *
 * Lanza Error si no hay API key o si la llamada/parsing falla, para que la UI
 * lo muestre. (El asistente de chat usa respuestas "canned"; aquí preferimos
 * errores explícitos porque es una acción puntual disparada por el usuario.)
 */
export async function reviewText(req: {
  field: ReviewField;
  text: string;
  context?: string;
}): Promise<ReviewResult> {
  if (!aiAvailable()) {
    throw new Error(
      'El asistente IA no está configurado en este entorno local. Agrega VITE_OPENAI_API_KEY en el .env local y reinicia el dev server.'
    );
  }

  const sys = `Eres un editor experto en metodología Growth. Corriges y mejoras la redacción de campos de experimentos, en español.
${REVIEW_GUIDANCE[req.field]}
Reglas:
- Conserva el significado e intención del autor. No inventes datos que no estén en el texto o el contexto.
- Corrige ortografía, gramática, acentuación y claridad.
- Responde SOLO con un objeto JSON válido EXACTAMENTE con esta forma:
  {"suggestion": "<texto corregido y mejorado>", "issues": ["<problema 1>", "<problema 2>"]}
- "issues": viñetas breves de qué estaba mal (máximo 4). Si el texto ya está bien, devuelve el mismo texto e issues: ["El texto ya está bien redactado."].`;

  const user = `${req.context ? `Contexto del experimento: ${req.context}\n\n` : ''}Texto a revisar:\n"""${req.text}"""`;

  let res: Response;
  try {
    res = await callChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      temperature: 0.3,
      max_tokens: 700,
      response_format: { type: 'json_object' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    throw new Error(`No se pudo contactar al asistente: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error del asistente (${res.status}): ${text.slice(0, 200) || 'sin detalles'}.`);
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? '{}';

  let parsed: { suggestion?: unknown; issues?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('No se pudo interpretar la respuesta de la IA.');
  }

  const suggestion = typeof parsed.suggestion === 'string' ? parsed.suggestion.trim() : '';
  const issues = Array.isArray(parsed.issues)
    ? parsed.issues.filter((x): x is string => typeof x === 'string')
    : [];

  if (!suggestion) {
    throw new Error('La IA no devolvió una sugerencia válida.');
  }

  return { suggestion, issues };
}
