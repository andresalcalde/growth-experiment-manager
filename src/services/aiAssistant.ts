/**
 * aiAssistant — cliente del Design Assistant (etapa Design).
 *
 * Llama a OpenAI Chat Completions con un system prompt enfocado en
 * estructuración de hipótesis Growth (SI → ENTONCES → PORQUE) y revisión
 * de los campos del Design.
 *
 * La API key se lee de `import.meta.env.VITE_OPENAI_API_KEY`. Esto la
 * expone al cliente — para producción real conviene mover esta llamada
 * detrás de una Supabase Edge Function (TODO marcado abajo).
 */

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
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      reply: [
        'El asistente IA no está configurado.',
        '',
        'Para habilitarlo:',
        '1. Pide a tu admin la API key de OpenAI.',
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

  // TODO (prod): mover esta llamada a una Supabase Edge Function que use
  // la API key desde el server (no expuesta al cliente). El cliente solo
  // llamaría a `supabase.functions.invoke('design-assistant', { body })`.
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        reply: `Error de OpenAI (${res.status}): ${text.slice(0, 200) || 'sin detalles'}.`,
        warnings,
      };
    }
    const data = await res.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? '(sin respuesta)';
    return { reply, warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { reply: `No se pudo contactar a OpenAI: ${msg}`, warnings };
  }
}
