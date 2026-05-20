import { supabase } from './supabase'

export type ActivityAction =
  | 'experiment_created'
  | 'experiment_moved'
  | 'experiment_deleted'
  | 'project_created'
  | 'role_changed'

interface LogActivityParams {
  userId: string
  projectId?: string | null
  action: ActivityAction
  entityType?: string
  entityId?: string
}

// Registra una acción de entidad en activity_log. Best-effort: nunca lanza —
// un fallo de logging no debe romper el flujo del usuario.
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await supabase.from('activity_log').insert({
      user_id: params.userId,
      project_id: params.projectId ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
    })
  } catch (err) {
    console.warn('activity log failed (non-critical):', err)
  }
}
