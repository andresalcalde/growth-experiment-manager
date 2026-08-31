import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Users, Activity, FlaskConical } from 'lucide-react';
import { supabase } from './lib/supabase';

// ============================================================================
// Vista "Mi equipo" — para líderes (global_role='admin') y superadmins.
// Consume las RPCs SECURITY DEFINER de 09_migration_lead_rpcs.sql:
//   lead_list_my_teams() / lead_team_projects(uuid) / lead_team_activity(uuid, ts, ts)
// Las RPCs ya devuelven arrays garantizados (COALESCE en la DB), pero las
// interfaces siguen tolerando null: defensa barata ante datos legacy.
// ============================================================================

interface TeamMemberRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  last_seen_at: string | null;
  area: string[] | null;
}

interface TeamProjectLite {
  project_id: string;
  name: string;
  archived: boolean;
}

interface TeamRow {
  id: string;
  name: string;
  lead_user_id: string;
  lead_name: string | null;
  members: TeamMemberRow[] | null;
  projects: TeamProjectLite[] | null;
}

interface TeamProjectRow {
  id: string;
  name: string;
  archived: boolean;
  active_experiments: number;
  finished_experiments: number;
  last_activity: string | null;
}

interface TeamActivityRow {
  id: string;
  user_id: string;
  user_name: string | null;
  project_id: string | null;
  project_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: { from?: string | null; to?: string | null; title?: string | null } | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  experiment_created: 'creó el experimento',
  experiment_moved: 'movió el experimento',
  experiment_deleted: 'eliminó un experimento',
  project_created: 'creó el proyecto',
  role_changed: 'cambió un rol',
};

const DAY = 86400000;

function formatDate(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function formatDateTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function lastSeenColor(ts: string | null): string {
  if (!ts) return '#dc2626';
  const days = (Date.now() - new Date(ts).getTime()) / DAY;
  if (days <= 14) return '#16a34a';
  if (days <= 30) return '#d97706';
  return '#dc2626';
}

// Título legible de la entidad tocada: si el log viejo no guardó `title`,
// caemos al id corto para que la línea siga siendo identificable.
function entityLabel(row: TeamActivityRow): string | null {
  const title = row.details?.title;
  if (title) return `«${title}»`;
  if (row.entity_id) return `#${row.entity_id.slice(0, 8)}`;
  return null;
}

export const TeamView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [projects, setProjects] = useState<TeamProjectRow[]>([]);
  const [activity, setActivity] = useState<TeamActivityRow[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard de request obsoleto: cambiar de equipo o de rango de fechas dos veces
  // seguidas deja dos pares de RPCs en vuelo. Sin esto, la respuesta más lenta
  // (la del equipo/rango anterior) pisa el estado de la más reciente. Cada
  // invocación se queda con su número de secuencia y descarta sus propios
  // resultados si ya arrancó otra después.
  const loadSeqRef = useRef(0);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('lead_list_my_teams');
    if (error) {
      console.error('Error lead_list_my_teams:', error);
      setError(error.message);
      setLoading(false);
      return;
    }
    const rows = (data as TeamRow[]) || [];
    setTeams(rows);
    setSelected(prev => (prev && rows.some(r => r.id === prev) ? prev : rows[0]?.id ?? null));
    setLoading(false);
  }, []);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const loadTeamData = useCallback(async (teamId: string) => {
    const seq = ++loadSeqRef.current;
    setLoadingData(true);
    setError(null);
    const args: Record<string, unknown> = { p_team_id: teamId };
    const actArgs: Record<string, unknown> = { ...args };
    // 'T00:00:00' fuerza medianoche LOCAL: `new Date('YYYY-MM-DD')` se parsea como
    // UTC y corría el rango ~4h en Chile.
    if (fromDate) actArgs.p_from = new Date(fromDate + 'T00:00:00').toISOString();
    if (toDate) actArgs.p_to = new Date(new Date(toDate + 'T00:00:00').getTime() + 86400000).toISOString();
    const [pRes, aRes] = await Promise.all([
      supabase.rpc('lead_team_projects', args),
      supabase.rpc('lead_team_activity', actArgs),
    ]);
    if (pRes.error || aRes.error) {
      const failed = (pRes.error || aRes.error)!;
      console.error('Error cargando datos del equipo:', failed);
      // Carga obsoleta: no mostramos el error de una petición que ya nadie
      // espera, ni apagamos el spinner de la carga vigente.
      if (seq !== loadSeqRef.current) return;
      setError(failed.message);
      setLoadingData(false);
      return;
    }
    if (seq !== loadSeqRef.current) return;
    setProjects((pRes.data as TeamProjectRow[]) || []);
    setActivity((aRes.data as TeamActivityRow[]) || []);
    setLoadingData(false);
  }, [fromDate, toDate]);

  useEffect(() => { if (selected) loadTeamData(selected); }, [selected, loadTeamData]);

  const retry = useCallback(() => {
    if (selected) loadTeamData(selected);
    else loadTeams();
  }, [selected, loadTeamData, loadTeams]);

  const team = teams.find(t => t.id === selected) ?? null;
  const members = team?.members ?? [];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top bar */}
      <div style={{
        padding: '16px 40px', borderBottom: '1px solid #e5e7eb', background: 'white',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white',
            cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#374151',
          }}
        >
          <ArrowLeft size={16} />
          Volver
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={22} color="#4F46E5" />
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Mi equipo</h1>
        </div>
        {teams.length > 1 && (
          <select
            value={selected || ''}
            onChange={e => setSelected(e.target.value || null)}
            style={{ ...selectStyle, marginLeft: 'auto' }}
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Cargando…</div>
        ) : error && teams.length === 0 ? (
          <ErrorBox message={error} onRetry={retry} />
        ) : teams.length === 0 ? (
          <div style={{
            padding: '48px', textAlign: 'center', background: 'white',
            border: '1px solid #e5e7eb', borderRadius: '12px',
          }}>
            <Users size={28} color="#c7d2fe" style={{ marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              No tienes equipos asignados
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              Pide a un superadmin que te asigne uno.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {error && <ErrorBox message={error} onRetry={retry} />}

            {/* Cabecera del equipo */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{team?.name}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                Líder: {team?.lead_name || '— sin líder —'}
                <span style={{ color: '#d1d5db', margin: '0 8px' }}>·</span>
                {members.length} miembro(s)
                <span style={{ color: '#d1d5db', margin: '0 8px' }}>·</span>
                {projects.length} proyecto(s)
              </div>
            </div>

            {/* ── Miembros ─────────────────────────────────────────────── */}
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
                Miembros ({members.length})
              </h2>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
                Las personas que forman parte de tu equipo y cuándo usaron la plataforma por última vez.
              </p>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      {['Nombre', 'Email', 'Área', 'Último uso'].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.user_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}>{m.full_name || '—'}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{m.email || '—'}</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px' }}>
                          {m.area && m.area.length ? m.area.join(', ') : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: lastSeenColor(m.last_seen_at) }}>
                          {m.last_seen_at ? formatDate(m.last_seen_at) : 'Nunca'}
                        </td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr><td colSpan={4} style={emptyCellStyle}>
                        Este equipo aún no tiene miembros.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Proyectos del equipo ─────────────────────────────────── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FlaskConical size={16} color="#4F46E5" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Proyectos del equipo ({projects.length})
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
                Avance de los proyectos asignados a tu equipo.
              </p>
              {loadingData ? (
                <div style={{ padding: '24px', color: '#9ca3af', fontSize: '13px' }}>Cargando proyectos…</div>
              ) : (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {['Proyecto', 'Exp. activos', 'Exp. finalizados', 'Última actividad'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: p.archived ? 0.55 : 1 }}>
                          <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}>
                            {p.name}
                            {p.archived && (
                              <span style={{
                                marginLeft: '8px', fontSize: '11px', fontWeight: 700, padding: '2px 6px',
                                borderRadius: '6px', background: '#f3f4f6', color: '#9ca3af',
                              }}>ARCHIVADO</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{p.active_experiments}</td>
                          <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{p.finished_experiments}</td>
                          <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>
                            {p.last_activity ? formatDate(p.last_activity) : 'Sin actividad'}
                          </td>
                        </tr>
                      ))}
                      {projects.length === 0 && (
                        <tr><td colSpan={4} style={emptyCellStyle}>
                          Este equipo aún no tiene proyectos asignados.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ── Actividad ────────────────────────────────────────────── */}
            <section>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '4px', flexWrap: 'wrap', gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="#4F46E5" />
                  <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                    Actividad ({activity.length})
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '12px', color: '#6b7280' }}>Desde</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    style={inputStyle}
                  />
                  <label style={{ fontSize: '12px', color: '#6b7280' }}>Hasta</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    style={inputStyle}
                  />
                  {(fromDate || toDate) && (
                    <button
                      onClick={() => { setFromDate(''); setToDate(''); }}
                      style={{
                        padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px',
                        background: 'white', color: '#6b7280', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
                Últimos movimientos en los proyectos de tu equipo (máximo 500 registros).
              </p>

              {loadingData ? (
                <div style={{ padding: '24px', color: '#9ca3af', fontSize: '13px' }}>Cargando actividad…</div>
              ) : activity.length === 0 ? (
                <div style={{
                  padding: '32px', textAlign: 'center', background: 'white',
                  border: '1px solid #e5e7eb', borderRadius: '12px',
                  color: '#9ca3af', fontSize: '13px',
                }}>
                  {fromDate || toDate
                    ? 'No hay actividad en el rango de fechas seleccionado.'
                    : 'Aún no hay actividad registrada para este equipo.'}
                </div>
              ) : (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
                  {activity.map(a => {
                    const label = ACTION_LABEL[a.action] || a.action;
                    const entity = entityLabel(a);
                    const from = a.details?.from;
                    const to = a.details?.to;
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex', gap: '12px', padding: '10px 16px',
                          borderBottom: '1px solid #f3f4f6', alignItems: 'baseline',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap', minWidth: '132px' }}>
                          {formatDateTime(a.created_at)}
                        </span>
                        <span style={{ fontSize: '13px', color: '#374151' }}>
                          <strong style={{ fontWeight: 600 }}>{a.user_name || 'Alguien'}</strong>
                          {' '}{label}
                          {entity && <span style={{ color: '#111827', fontWeight: 600 }}> {entity}</span>}
                          {from && to && (
                            <span style={{ color: '#6b7280' }}> ({from} → {to})</span>
                          )}
                          {a.project_name && (
                            <span style={{ color: '#6b7280' }}> en <span style={{ color: '#4F46E5', fontWeight: 600 }}>{a.project_name}</span></span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Helpers de UI ────────────────────────────────────────────────────────────

const ErrorBox: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div style={{
    padding: '24px', textAlign: 'center', background: 'white',
    border: '1px solid #fecaca', borderRadius: '12px',
  }}>
    <div style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>
      No se pudieron cargar los datos
    </div>
    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>{message}</div>
    <button
      onClick={onRetry}
      style={{
        padding: '8px 16px', border: '1px solid #c7d2fe', borderRadius: '8px',
        background: '#eef2ff', color: '#4F46E5', fontSize: '13px', fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      Reintentar
    </button>
  </div>
);

const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280',
};

const emptyCellStyle: React.CSSProperties = {
  padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px',
  fontSize: '13px', background: 'white', cursor: 'pointer', outline: 'none',
};

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '8px',
  fontSize: '13px', background: 'white', outline: 'none', color: '#374151',
};
