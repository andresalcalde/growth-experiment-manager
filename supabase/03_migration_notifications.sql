-- ============================================================================
-- migration_notifications.sql
-- Punto 7 del feedback Growth Lab: notificaciones por correo + preferencias.
--
-- Esta migración crea la tabla de PREFERENCIAS. El ENVÍO real de correos lo hace
-- la función serverless `api/send-notification.ts`, que requiere:
--   - RESEND_API_KEY (o SMTP) configurado en Vercel, y
--   - el SMTP de Supabase configurado (mismo prerequisito que recuperar
--     contraseña — ver el bug reportado).
--
-- Correr en el SQL Editor de Supabase. Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- 'all' = todas | 'important' = solo importantes | 'none' = ninguna
  volume text NOT NULL DEFAULT 'all' CHECK (volume IN ('all', 'important', 'none')),
  notify_winner boolean NOT NULL DEFAULT true,       -- experimento exitoso (Winner)
  notify_assignment boolean NOT NULL DEFAULT true,   -- asignación a un experimento
  notify_new_project boolean NOT NULL DEFAULT true,  -- incorporación a un proyecto
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Cada usuario gestiona sus propias preferencias; el superadmin puede leerlas
-- (para decidir a quién notificar desde el backend).
DROP POLICY IF EXISTS np_select ON public.notification_preferences;
CREATE POLICY np_select ON public.notification_preferences
  FOR SELECT USING (user_id = auth.uid() OR public.is_superadmin());

DROP POLICY IF EXISTS np_insert ON public.notification_preferences;
CREATE POLICY np_insert ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS np_update ON public.notification_preferences;
CREATE POLICY np_update ON public.notification_preferences
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Helper: devuelve la preferencia efectiva de un usuario (con defaults si no
-- existe fila). SECURITY DEFINER para que el backend pueda consultarla.
DROP FUNCTION IF EXISTS public.get_notification_preference(uuid);
CREATE OR REPLACE FUNCTION public.get_notification_preference(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT to_jsonb(np) FROM notification_preferences np WHERE np.user_id = p_user_id),
    jsonb_build_object(
      'user_id', p_user_id, 'volume', 'all',
      'notify_winner', true, 'notify_assignment', true, 'notify_new_project', true
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_notification_preference(uuid) TO authenticated;
