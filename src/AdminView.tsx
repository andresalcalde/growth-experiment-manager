import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Shield, Users, Activity, Download, Search, Plus, Trash2, Archive, ArchiveRestore, UserCog, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import { useProjectContext } from './contexts/ProjectContext';
import type { Profile, GlobalRole, UserAreaRecord } from './contexts/AuthContext';
import type { Project } from './types';

interface AdminViewProps {
  projects: Project[];
  onBack: () => void;
}

interface MembershipRow {
  project_id: string;
  user_id: string;
  role: string;
}

interface ActivityRow {
  user_id: string;
  project_id: string | null;
  action: string;
  created_at: string;
}

interface TraceRow {
  id: string;
  projectName: string;
  title: string;
  status: string;
  verdict: string;
  ownerName: string;
  creatorName: string;
  createdAt: string | null;
  resolverName: string;
  resolvedAt: string | null;
}

type UserState = 'Activo' | 'En riesgo' | 'Inactivo';

const DAY = 86400000;

// La tabla de trazabilidad puede tener miles de filas; se muestran las primeras
// y el CSV exporta siempre el conjunto completo.
const TRACE_ROW_LIMIT = 200;

function daysSince(ts: string | null): number {
  if (!ts) return Infinity;
  return (Date.now() - new Date(ts).getTime()) / DAY;
}

function userState(lastSeen: string | null): UserState {
  const d = daysSince(lastSeen);
  if (d <= 14) return 'Activo';
  if (d <= 30) return 'En riesgo';
  return 'Inactivo';
}

const STATE_COLOR: Record<UserState, string> = {
  'Activo': '#16a34a',
  'En riesgo': '#d97706',
  'Inactivo': '#dc2626',
};

export const AdminView: React.FC<AdminViewProps> = ({ projects, onBack }) => {
  const { profile, updateUserGlobalRole, updateUserGlobalLibraryAccess, areas } = useAuth();
  const [tab, setTab] = useState<'manage' | 'usage'>('manage');
  const [users, setUsers] = useState<Profile[]>([]);
  const [members, setMembers] = useState<MembershipRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, mRes, aRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('project_members').select('project_id, user_id, role'),
        supabase.from('activity_log').select('user_id, project_id, action, created_at'),
      ]);
      // Supabase no lanza excepción: el error viene en la respuesta. Sin este
      // chequeo, una query bloqueada por RLS dejaba la pantalla vacía en silencio.
      const failed = uRes.error || mRes.error || aRes.error;
      if (failed) throw new Error(failed.message);
      setUsers((uRes.data as Profile[]) || []);
      setMembers((mRes.data as MembershipRow[]) || []);
      setActivity((aRes.data as ActivityRow[]) || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived metrics ───────────────────────────────────────────────────────

  const superadminCount = users.filter(u => u.global_role === 'superadmin').length;

  const allExperiments = useMemo(
    () => projects.flatMap(p => p.experiments),
    [projects]
  );
  const activeExperiments = allExperiments.filter(e => !e.status.startsWith('Finished')).length;
  const learningExperiments = allExperiments.filter(e => e.status.startsWith('Finished')).length;

  const activeUsers30d = users.filter(u => daysSince(u.last_seen_at) <= 30).length;

  // Adopción por área: usuarios activos (≤30d) por área
  const adoptionByArea = useMemo(() => {
    return areas.map(({ name }) => {
      const inArea = users.filter(u => (u.area || []).includes(name));
      const active = inArea.filter(u => daysSince(u.last_seen_at) <= 30).length;
      return { area: name, total: inArea.length, active };
    });
  }, [users, areas]);

  // Actividad acotada al rango de fechas elegido (inclusivo hasta fin del día "hasta").
  // Alimenta el ranking de proyectos y la trazabilidad; el estado de usuarios y
  // "Proyectos inactivos (+7 días)" siguen siendo relativos a hoy.
  const filteredActivity = useMemo(() => {
    if (!fromDate && !toDate) return activity;
    const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const to = toDate ? new Date(toDate).getTime() + DAY : Infinity;
    return activity.filter(a => {
      const t = new Date(a.created_at).getTime();
      return t >= from && t < to;
    });
  }, [activity, fromDate, toDate]);

  // Proyectos inactivos +7d: sin actividad registrada en 7 días.
  // Usa `activity` sin filtrar a propósito: es una métrica relativa a hoy, no al rango elegido
  // (el rango solo acota el ranking de proyectos y la trazabilidad).
  const projectLastActivity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of activity) {
      if (!a.project_id) continue;
      const t = new Date(a.created_at).getTime();
      if (!map[a.project_id] || t > map[a.project_id]) map[a.project_id] = t;
    }
    return map;
  }, [activity]);

  const inactiveProjects = projects.filter(p => {
    const last = projectLastActivity[p.metadata.id];
    return !last || (Date.now() - last) / DAY > 7;
  }).length;

  // Ranking de proyectos más activos
  const projectRanking = useMemo(() => {
    const now = Date.now();
    // Con rango activo la tendencia compara las dos mitades del rango;
    // sin rango se mantienen las ventanas 7d / 14d.
    const rangeActive = Boolean(fromDate || toDate);
    const times = filteredActivity.map(a => new Date(a.created_at).getTime());
    const mid = rangeActive && times.length
      ? (Math.min(...times) + Math.max(...times)) / 2
      : now - 7 * DAY;
    return projects.map(p => {
      const acts = filteredActivity.filter(a => a.project_id === p.metadata.id);
      const last7 = acts.filter(a => new Date(a.created_at).getTime() >= mid).length;
      const prev7 = acts.filter(a => {
        const t = new Date(a.created_at).getTime();
        return rangeActive ? t < mid : t < mid && t >= now - 14 * DAY;
      }).length;
      const involvedUsers = members.filter(m => m.project_id === p.metadata.id).length;
      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (last7 > prev7) trend = 'up';
      else if (last7 < prev7) trend = 'down';
      return {
        id: p.metadata.id,
        name: p.metadata.name,
        experiments: p.experiments.length,
        involvedUsers,
        activityCount: acts.length,
        trend,
      };
    }).sort((a, b) => b.activityCount - a.activityCount);
  }, [projects, filteredActivity, members, fromDate, toDate]);

  // Trazabilidad: una fila por experimento con creador y quien lo resolvió.
  const profileById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  const traceRows = useMemo(() => {
    const from = fromDate ? new Date(fromDate).getTime() : -Infinity;
    const to = toDate ? new Date(toDate).getTime() + DAY : Infinity;
    return projects.flatMap(p => p.experiments.map(e => ({
      id: `${p.metadata.id}:${e.id}`,
      projectName: p.metadata.name,
      title: e.title,
      status: e.status as string,
      verdict: e.verdict || '',
      ownerName: e.owner?.name || '',
      creatorName: e.createdBy ? (profileById.get(e.createdBy)?.full_name || profileById.get(e.createdBy)?.email || '—') : '—',
      createdAt: e.createdAt || null,
      resolverName: e.resolvedBy ? (profileById.get(e.resolvedBy)?.full_name || profileById.get(e.resolvedBy)?.email || '—') : '—',
      resolvedAt: e.resolvedAt || null,
    }))).filter(r => {
      if (!fromDate && !toDate) return true;
      const c = r.createdAt ? new Date(r.createdAt).getTime() : null;
      const rv = r.resolvedAt ? new Date(r.resolvedAt).getTime() : null;
      return (c !== null && c >= from && c < to) || (rv !== null && rv >= from && rv < to);
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [projects, profileById, fromDate, toDate]);

  // Tabla de actividad por usuario
  const userRows = useMemo(() => {
    return users.map(u => {
      const memberships = members.filter(m => m.user_id === u.id);
      const projectIds = memberships.map(m => m.project_id);
      // Experimentos activos donde el usuario es owner (match por nombre)
      const ownExp = allExperiments.filter(
        e => e.owner?.name && u.full_name && e.owner.name === u.full_name && !e.status.startsWith('Finished')
      ).length;
      return {
        ...u,
        projectCount: projectIds.length,
        activeExperiments: ownExp,
        state: userState(u.last_seen_at),
      };
    });
  }, [users, members, allExperiments]);

  const filteredUserRows = useMemo(() => {
    return userRows.filter(r => {
      if (areaFilter !== 'All' && !(r.area || []).includes(areaFilter)) return false;
      if (stateFilter !== 'All' && r.state !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(r.full_name || '').toLowerCase().includes(q) &&
            !(r.email || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [userRows, areaFilter, stateFilter, search]);

  const inactiveUsers = userRows.filter(r => daysSince(r.last_seen_at) > 14);

  // ── Actions ───────────────────────────────────────────────────────────────

  const setUserRole = async (u: Profile, next: GlobalRole) => {
    if (u.global_role === next) return;
    // Proteger al último superadmin (además del trigger en la DB).
    if (u.global_role === 'superadmin' && next !== 'superadmin' && superadminCount <= 1) {
      alert('No se puede degradar al último superadmin.');
      return;
    }
    const labels: Record<GlobalRole, string> = { superadmin: 'Superadmin', admin: 'Admin (líder)', user: 'Usuario' };
    if (!window.confirm(`¿Cambiar el rol de ${u.full_name || u.email} a "${labels[next]}"?`)) return;
    try {
      setBusyUserId(u.id);
      await updateUserGlobalRole(u.id, next);
      await fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar el rol');
    } finally {
      setBusyUserId(null);
    }
  };

  // Concede/revoca acceso a la Biblioteca Global (admins y superadmin lo tienen
  // siempre; este flag controla a los usuarios normales / clientes externos).
  const setUserGlobalLibrary = async (u: Profile, value: boolean) => {
    try {
      setBusyUserId(u.id);
      await updateUserGlobalLibraryAccess(u.id, value);
      await fetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar el acceso');
    } finally {
      setBusyUserId(null);
    }
  };

  const exportCsv = () => {
    const headers = ['Nombre', 'Email', 'Area', 'Ultimo uso', 'Experimentos activos', 'Estado', 'Rol global', 'Proyectos'];
    const rows = filteredUserRows.map(r => [
      r.full_name || '',
      r.email || '',
      (r.area || []).join('; '),
      r.last_seen_at ? new Date(r.last_seen_at).toISOString().split('T')[0] : 'Nunca',
      String(r.activeExperiments),
      r.state,
      r.global_role,
      String(r.projectCount),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adopcion-growth-hub-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exporta SIEMPRE todas las filas de trazabilidad del rango, no solo las visibles.
  const exportTraceCsv = () => {
    const headers = ['Proyecto', 'Experimento', 'Estado', 'Veredicto', 'Responsable', 'Creado por', 'Fecha creacion', 'Resuelto por', 'Fecha resolucion'];
    const rows = traceRows.map(r => [
      r.projectName, r.title, r.status, r.verdict, r.ownerName, r.creatorName,
      r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '',
      r.resolverName,
      r.resolvedAt ? new Date(r.resolvedAt).toISOString().split('T')[0] : '',
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trazabilidad-growth-hub-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top bar */}
      <div style={{
        padding: '16px 40px', borderBottom: '1px solid #e5e7eb', background: 'white',
        display: 'flex', alignItems: 'center', gap: '16px',
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
          <Shield size={22} color="#4F46E5" />
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Administración</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 40px', borderBottom: '1px solid #e5e7eb', background: 'white', display: 'flex', gap: '8px' }}>
        {([['manage', 'Gestión', Users], ['usage', 'Uso de la plataforma', Activity]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px',
              border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
              fontWeight: 600, color: tab === id ? '#4F46E5' : '#6b7280',
              borderBottom: tab === id ? '2px solid #4F46E5' : '2px solid transparent',
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Cargando…</div>
        ) : error ? (
          <div style={{
            padding: '40px', textAlign: 'center', background: 'white',
            border: '1px solid #fecaca', borderRadius: '12px',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b', marginBottom: '4px' }}>
              No se pudieron cargar los datos
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>{error}</div>
            <button
              onClick={fetchAll}
              style={{
                padding: '8px 16px', border: '1px solid #c7d2fe', borderRadius: '8px',
                background: '#eef2ff', color: '#4F46E5', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        ) : tab === 'manage' ? (
          <ManageTab
            users={users}
            busyUserId={busyUserId}
            currentUserId={profile?.id}
            onSetRole={setUserRole}
            onToggleGlobalLibrary={setUserGlobalLibrary}
          />
        ) : (
          <UsageTab
            metrics={{ activeUsers30d, inactiveProjects, activeExperiments, learningExperiments }}
            adoptionByArea={adoptionByArea}
            projectRanking={projectRanking}
            userRows={filteredUserRows}
            inactiveUsers={inactiveUsers}
            areaFilter={areaFilter}
            stateFilter={stateFilter}
            search={search}
            fromDate={fromDate}
            toDate={toDate}
            traceRows={traceRows}
            onAreaFilter={setAreaFilter}
            onStateFilter={setStateFilter}
            onSearch={setSearch}
            onFromDate={setFromDate}
            onToDate={setToDate}
            onExport={exportCsv}
            onExportTrace={exportTraceCsv}
          />
        )}
      </div>
    </div>
  );
};

// ── Manage tab ───────────────────────────────────────────────────────────────

const ManageTab: React.FC<{
  users: Profile[];
  busyUserId: string | null;
  currentUserId?: string;
  onSetRole: (u: Profile, role: GlobalRole) => void;
  onToggleGlobalLibrary: (u: Profile, value: boolean) => void;
}> = ({ users, busyUserId, currentUserId, onSetRole, onToggleGlobalLibrary }) => {
  const [userSearch, setUserSearch] = useState('');
  const q = userSearch.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter(u =>
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q))
    : users;

  return (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
    {/* Users */}
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
          Usuarios ({q ? `${filteredUsers.length} / ${users.length}` : users.length})
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px 10px', background: 'white' }}>
          <Search size={14} color="#9ca3af" />
          <input
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            style={{ border: 'none', outline: 'none', fontSize: '13px', width: '200px' }}
          />
        </div>
      </div>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Nombre', 'Email', 'Área', 'Rol global', 'Biblioteca Global'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>
                  {u.full_name || '—'}
                  {u.id === currentUserId && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#9ca3af' }}>(tú)</span>}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{u.email}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{u.area && u.area.length ? u.area.join(', ') : '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <select
                    value={u.global_role}
                    onChange={e => onSetRole(u, e.target.value as GlobalRole)}
                    disabled={busyUserId === u.id}
                    style={{
                      padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      cursor: busyUserId === u.id ? 'wait' : 'pointer',
                      border: '1px solid #e5e7eb', background: 'white',
                      color: u.global_role === 'superadmin' ? '#7C3AED' : u.global_role === 'admin' ? '#2563eb' : '#6b7280',
                    }}
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Admin (líder)</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {u.global_role === 'superadmin' || u.global_role === 'admin' ? (
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }} title="Los admins y superadmin siempre tienen acceso">
                      Siempre
                    </span>
                  ) : (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: busyUserId === u.id ? 'wait' : 'pointer', fontSize: '12px', color: '#6b7280' }}>
                      <input
                        type="checkbox"
                        checked={!!u.can_access_global_library}
                        disabled={busyUserId === u.id}
                        onChange={e => onToggleGlobalLibrary(u, e.target.checked)}
                        style={{ cursor: busyUserId === u.id ? 'wait' : 'pointer', width: '15px', height: '15px' }}
                      />
                      {u.can_access_global_library ? 'Con acceso' : 'Sin acceso'}
                    </label>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                Ningún usuario coincide con la búsqueda.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>

    {/* Projects — TODOS los proyectos (admin), vía RPC SECURITY DEFINER */}
    <AdminProjectsSection users={users} />

    {/* Equipos (punto 6): agrupan usuarios y proyectos bajo un líder */}
    <TeamsSection users={users} />

    {/* Áreas */}
    <AreasSection users={users} />
  </div>
  );
};

// ── Admin projects section (TODOS los proyectos, punto 4) ────────────────────

interface AdminProjectRow {
  id: string;
  name: string;
  archived: boolean;
  created_at: string;
  member_count: number;
  experiment_count: number;
}

interface AdminMemberRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

const AdminProjectsSection: React.FC<{ users: Profile[] }> = ({ users }) => {
  const [rows, setRows] = useState<AdminProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [managing, setManaging] = useState<AdminProjectRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Archivar/desarchivar cambia qué proyectos ve el portfolio: hay que refrescar
  // el contexto, no solo la tabla local del panel Admin.
  const { refetchAll } = useProjectContext();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('admin_list_projects');
    if (error) {
      console.error('Error admin_list_projects:', error);
      setError(error.message);
    } else {
      setRows((data as AdminProjectRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleArchive = async (p: AdminProjectRow) => {
    if (!window.confirm(p.archived ? `¿Desarchivar "${p.name}"?` : `¿Archivar "${p.name}"?`)) return;
    try {
      setBusyId(p.id);
      const { error } = await supabase.rpc('admin_set_project_archived', { p_project_id: p.id, p_archived: !p.archived });
      if (error) throw new Error(error.message);
      await load();
      await refetchAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo archivar.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = rows.filter(r => showArchived || !r.archived);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
          Todos los proyectos ({visible.length})
        </h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>
          <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
          Mostrar archivados
        </label>
      </div>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
        Como superadmin ves y gestionas todos los proyectos, sin depender de que te los compartan.
      </p>

      {loading ? (
        <div style={{ padding: '24px', color: '#9ca3af', fontSize: '13px' }}>Cargando proyectos…</div>
      ) : error ? (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>
          {error} <button onClick={load} style={{ marginLeft: '8px', color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Reintentar</button>
        </div>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Proyecto', 'Experimentos', 'Miembros', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: p.archived ? 0.55 : 1 }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>
                    {p.name}
                    {p.archived && <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: '#f3f4f6', color: '#9ca3af' }}>ARCHIVADO</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{p.experiment_count}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{p.member_count}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setManaging(p)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4F46E5', cursor: 'pointer' }}
                      >
                        <UserCog size={13} /> Miembros
                      </button>
                      <button
                        onClick={() => toggleArchive(p)}
                        disabled={busyId === p.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: busyId === p.id ? 'wait' : 'pointer' }}
                      >
                        {p.archived ? <><ArchiveRestore size={13} /> Desarchivar</> : <><Archive size={13} /> Archivar</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No hay proyectos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {managing && (
        <ProjectMembersModal
          project={managing}
          allUsers={users}
          onClose={() => setManaging(null)}
          onChanged={load}
        />
      )}
    </section>
  );
};

const ProjectMembersModal: React.FC<{
  project: AdminProjectRow;
  allUsers: Profile[];
  onClose: () => void;
  onChanged: () => void;
}> = ({ project, allUsers, onClose, onChanged }) => {
  const [members, setMembers] = useState<AdminMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('editor');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('admin_list_project_members', { p_project_id: project.id });
    if (error) setError(error.message);
    else setMembers((data as AdminMemberRow[]) || []);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const memberIds = new Set(members.map(m => m.user_id));
  const candidates = allUsers.filter(u => !memberIds.has(u.id));

  const upsert = async (userId: string, role: string) => {
    try {
      setBusy(true);
      const { error } = await supabase.rpc('admin_upsert_project_member', { p_project_id: project.id, p_user_id: userId, p_role: role });
      if (error) throw new Error(error.message);
      await load();
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar el miembro.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: AdminMemberRow) => {
    if (!window.confirm(`¿Quitar a ${m.full_name || m.email} del proyecto?`)) return;
    try {
      setBusy(true);
      const { error } = await supabase.rpc('admin_remove_project_member', { p_project_id: project.id, p_user_id: m.user_id });
      if (error) throw new Error(error.message);
      await load();
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo quitar el miembro.');
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    if (!addUserId) return;
    await upsert(addUserId, addRole);
    setAddUserId('');
    setAddRole('editor');
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={onClose}
    >
      <div style={{ background: 'white', borderRadius: '16px', width: '560px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Miembros · {project.name}</h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0' }}>Agrega, quita o cambia el rol de los colaboradores.</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} color="#9ca3af" /></button>
          </div>

          {/* Agregar miembro */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={addUserId} onChange={e => setAddUserId(e.target.value)} style={{ ...selectStyle, flex: 1, minWidth: '180px' }}>
              <option value="">Agregar usuario…</option>
              {candidates.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
            <select value={addRole} onChange={e => setAddRole(e.target.value)} style={selectStyle}>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={busy || !addUserId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#111114', color: 'white', fontSize: '13px', fontWeight: 600, cursor: busy || !addUserId ? 'not-allowed' : 'pointer', opacity: busy || !addUserId ? 0.6 : 1 }}
            >
              <Plus size={14} /> Agregar
            </button>
          </div>

          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#991b1b', marginBottom: '16px' }}>{error}</div>}

          {loading ? (
            <div style={{ padding: '24px', color: '#9ca3af', fontSize: '13px' }}>Cargando miembros…</div>
          ) : members.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Este proyecto no tiene miembros.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {members.map(m => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{m.full_name || '—'}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{m.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select value={m.role} onChange={e => upsert(m.user_id, e.target.value)} disabled={busy} style={selectStyle}>
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button onClick={() => remove(m)} disabled={busy} title="Quitar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', border: 'none', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', cursor: busy ? 'wait' : 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Teams section (punto 6: equipos + líderes) ───────────────────────────────

interface TeamMemberLite { user_id: string; full_name: string | null; email: string | null; }
interface TeamProjectLite { project_id: string; name: string; }
interface TeamRow {
  id: string;
  name: string;
  lead_user_id: string | null;
  lead_name: string | null;
  members: TeamMemberLite[] | null;
  projects: TeamProjectLite[] | null;
}

const TeamsSection: React.FC<{ users: Profile[] }> = ({ users }) => {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [allProjects, setAllProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLead, setNewLead] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [tRes, pRes] = await Promise.all([
      supabase.rpc('admin_list_teams'),
      supabase.rpc('admin_list_projects'),
    ]);
    if (tRes.error) { setError(tRes.error.message); setLoading(false); return; }
    setTeams((tRes.data as TeamRow[]) || []);
    if (!pRes.error) setAllProjects(((pRes.data as { id: string; name: string }[]) || []).map(p => ({ id: p.id, name: p.name })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const call = async (fn: string, args: Record<string, unknown>) => {
    try {
      setBusy(true);
      const { error } = await supabase.rpc(fn, args);
      if (error) throw new Error(error.message);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Operación fallida.');
    } finally {
      setBusy(false);
    }
  };

  const createTeam = async () => {
    if (!newName.trim()) return;
    await call('admin_create_team', { p_name: newName.trim(), p_lead: newLead || null });
    setNewName('');
    setNewLead('');
  };

  return (
    <section>
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Equipos ({teams.length})</h2>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
        Agrupan usuarios y proyectos bajo un líder (rol <strong>Admin</strong>), que ve la actividad de sus proyectos sin acceder a los de otros equipos.
      </p>

      {/* Crear equipo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Nombre del equipo…"
          style={{ flex: 1, minWidth: '180px', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
        />
        <select value={newLead} onChange={e => setNewLead(e.target.value)} style={selectStyle}>
          <option value="">Líder (opcional)…</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
        </select>
        <button
          onClick={createTeam}
          disabled={busy || !newName.trim()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #c7d2fe', borderRadius: '8px', background: '#eef2ff', color: '#4F46E5', fontSize: '13px', fontWeight: 600, cursor: busy || !newName.trim() ? 'not-allowed' : 'pointer', opacity: busy || !newName.trim() ? 0.6 : 1 }}
        >
          <Plus size={14} /> Crear equipo
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '24px', color: '#9ca3af', fontSize: '13px' }}>Cargando equipos…</div>
      ) : error ? (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#991b1b' }}>
          {error} <button onClick={load} style={{ marginLeft: '8px', color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Reintentar</button>
        </div>
      ) : teams.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#9ca3af' }}>Aún no hay equipos.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {teams.map(t => (
            <TeamCard key={t.id} team={t} users={users} allProjects={allProjects} busy={busy} onCall={call} />
          ))}
        </div>
      )}
    </section>
  );
};

const TeamCard: React.FC<{
  team: TeamRow;
  users: Profile[];
  allProjects: { id: string; name: string }[];
  busy: boolean;
  onCall: (fn: string, args: Record<string, unknown>) => Promise<void>;
}> = ({ team, users, allProjects, busy, onCall }) => {
  const members = team.members || [];
  const projects = team.projects || [];
  const memberIds = new Set(members.map(m => m.user_id));
  const projectIds = new Set(projects.map(p => p.project_id));
  const candidateUsers = users.filter(u => !memberIds.has(u.id));
  const candidateProjects = allProjects.filter(p => !projectIds.has(p.id));

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', background: 'white', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>{team.name}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            Líder:&nbsp;
            <select
              value={team.lead_user_id || ''}
              onChange={e => onCall('admin_set_team_lead', { p_team_id: team.id, p_lead: e.target.value || null })}
              disabled={busy}
              style={{ ...selectStyle, padding: '4px 8px' }}
            >
              <option value="">— sin líder —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
            </select>
          </div>
        </div>
        <button
          onClick={() => { if (window.confirm(`¿Eliminar el equipo "${team.name}"?`)) onCall('admin_delete_team', { p_team_id: team.id }); }}
          disabled={busy}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', border: '1px solid #fecaca', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}
        >
          <Trash2 size={13} /> Eliminar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Miembros */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>Miembros ({members.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {members.map(m => (
              <span key={m.user_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 8px', background: '#f3f4f6', borderRadius: '99px' }}>
                {m.full_name || m.email}
                <button onClick={() => onCall('admin_remove_team_member', { p_team_id: team.id, p_user_id: m.user_id })} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}><X size={12} /></button>
              </span>
            ))}
            {members.length === 0 && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Sin miembros.</span>}
          </div>
          <select
            value=""
            onChange={e => { if (e.target.value) onCall('admin_add_team_member', { p_team_id: team.id, p_user_id: e.target.value }); }}
            disabled={busy || candidateUsers.length === 0}
            style={{ ...selectStyle, width: '100%' }}
          >
            <option value="">+ Agregar miembro…</option>
            {candidateUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
        </div>

        {/* Proyectos */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>Proyectos ({projects.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {projects.map(p => (
              <span key={p.project_id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 8px', background: '#eef2ff', color: '#4F46E5', borderRadius: '99px' }}>
                {p.name}
                <button onClick={() => onCall('admin_remove_team_project', { p_team_id: team.id, p_project_id: p.project_id })} disabled={busy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', padding: 0, display: 'flex' }}><X size={12} /></button>
              </span>
            ))}
            {projects.length === 0 && <span style={{ fontSize: '12px', color: '#9ca3af' }}>Sin proyectos.</span>}
          </div>
          <select
            value=""
            onChange={e => { if (e.target.value) onCall('admin_add_team_project', { p_team_id: team.id, p_project_id: e.target.value }); }}
            disabled={busy || candidateProjects.length === 0}
            style={{ ...selectStyle, width: '100%' }}
          >
            <option value="">+ Agregar proyecto…</option>
            {candidateProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

// ── Areas section (gestión de áreas, solo superadmin) ────────────────────────

const AreasSection: React.FC<{ users: Profile[] }> = ({ users }) => {
  const { areas, addArea, deleteArea } = useAuth();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    try {
      setBusy(true);
      await addArea(name);
      setNewName('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo agregar el área.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (area: UserAreaRecord) => {
    const inUse = users.filter(u => (u.area || []).includes(area.name)).length;
    if (inUse > 0) {
      alert(`No se puede eliminar "${area.name}": ${inUse} usuario(s) la tienen asignada. Reasígnalos primero.`);
      return;
    }
    if (!window.confirm(`¿Eliminar el área "${area.name}"?`)) return;
    try {
      setBusy(true);
      await deleteArea(area.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar el área.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
        Áreas ({areas.length})
      </h2>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px' }}>
        Segmentan usuarios, métricas de adopción y la biblioteca global.
      </p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', maxWidth: '420px' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="Nombre de la nueva área…"
          style={{
            flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px',
            fontSize: '13px', outline: 'none',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={busy || !newName.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
            border: '1px solid #c7d2fe', borderRadius: '8px',
            background: busy || !newName.trim() ? '#eef2ff' : '#eef2ff',
            color: '#4F46E5', fontSize: '13px', fontWeight: 600,
            cursor: busy || !newName.trim() ? 'not-allowed' : 'pointer',
            opacity: busy || !newName.trim() ? 0.6 : 1,
          }}
        >
          <Plus size={14} />
          Agregar
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {areas.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>Aún no hay áreas.</div>
        ) : areas.map(a => {
          const inUse = users.filter(u => (u.area || []).includes(a.name)).length;
          return (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px 6px 12px',
                background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{a.name}</span>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{inUse} usuario(s)</span>
              <button
                onClick={() => handleDelete(a)}
                disabled={busy}
                title="Eliminar área"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '24px', height: '24px', border: 'none', borderRadius: '6px',
                  background: '#fef2f2', color: '#dc2626',
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ── Usage tab ────────────────────────────────────────────────────────────────

const MetricCard: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
    <div style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
  </div>
);

const UsageTab: React.FC<{
  metrics: { activeUsers30d: number; inactiveProjects: number; activeExperiments: number; learningExperiments: number };
  adoptionByArea: { area: string; total: number; active: number }[];
  projectRanking: { id: string; name: string; experiments: number; involvedUsers: number; activityCount: number; trend: 'up' | 'down' | 'flat' }[];
  userRows: (Profile & { projectCount: number; activeExperiments: number; state: UserState })[];
  inactiveUsers: (Profile & { state: UserState })[];
  areaFilter: string;
  stateFilter: string;
  search: string;
  fromDate: string;
  toDate: string;
  traceRows: TraceRow[];
  onAreaFilter: (v: string) => void;
  onStateFilter: (v: string) => void;
  onSearch: (v: string) => void;
  onFromDate: (v: string) => void;
  onToDate: (v: string) => void;
  onExport: () => void;
  onExportTrace: () => void;
}> = ({ metrics, adoptionByArea, projectRanking, userRows, inactiveUsers, areaFilter, stateFilter, search, fromDate, toDate, traceRows, onAreaFilter, onStateFilter, onSearch, onFromDate, onToDate, onExport, onExportTrace }) => {
  const { areas } = useAuth();
  const visibleTraceRows = traceRows.slice(0, TRACE_ROW_LIMIT);
  const trendIcon = (t: 'up' | 'down' | 'flat') => t === 'up' ? '▲' : t === 'down' ? '▼' : '—';
  const trendColor = (t: 'up' | 'down' | 'flat') => t === 'up' ? '#16a34a' : t === 'down' ? '#dc2626' : '#9ca3af';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
        padding: '10px 14px', fontSize: '12px', color: '#92400e',
      }}>
        Las métricas de actividad se acumulan desde que se desplegó esta versión; los primeros 30 días pueden verse incompletos.
      </div>

      {/* Filtro por rango de fechas */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Rango de fechas:</span>
          <input type="date" value={fromDate} onChange={e => onFromDate(e.target.value)} style={selectStyle} />
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>—</span>
          <input type="date" value={toDate} onChange={e => onToDate(e.target.value)} style={selectStyle} />
          {(fromDate || toDate) && (
            <button
              onClick={() => { onFromDate(''); onToDate(''); }}
              style={{ border: 'none', background: 'none', color: '#4F46E5', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              Limpiar
            </button>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
          Afecta al ranking de proyectos y a la trazabilidad. El estado de los usuarios y los proyectos inactivos siguen siendo relativos a hoy.
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <MetricCard label="Usuarios activos (30 días)" value={metrics.activeUsers30d} />
        <MetricCard label="Proyectos inactivos (+7 días)" value={metrics.inactiveProjects} />
        <MetricCard label="Experimentos activos" value={metrics.activeExperiments} />
        <MetricCard label="Experimentos en Learning" value={metrics.learningExperiments} />
      </div>

      {/* Adopción por área */}
      <section>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Adopción por área</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {adoptionByArea.map(a => (
            <div key={a.area} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>{a.area}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#4F46E5' }}>
                {a.active}<span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}> / {a.total}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>activos / total</div>
            </div>
          ))}
        </div>
      </section>

      {/* Ranking proyectos */}
      <section>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Ranking de proyectos más activos</h2>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['#', 'Proyecto', 'Experimentos', 'Usuarios', 'Actividad', 'Tendencia'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectRanking.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#9ca3af' }}>{i + 1}</td>
                  <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{p.experiments}</td>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{p.involvedUsers}</td>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{p.activityCount}</td>
                  <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700, color: trendColor(p.trend) }}>
                    {trendIcon(p.trend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trazabilidad de experimentos */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
            Trazabilidad de experimentos — {traceRows.length}
          </h2>
          <button
            onClick={onExportTrace}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
              border: '1px solid #c7d2fe', borderRadius: '8px', background: '#eef2ff',
              color: '#4F46E5', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>

        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
          padding: '10px 14px', fontSize: '12px', color: '#92400e', marginBottom: '12px',
        }}>
          El creador se reconstruyó del historial; en experimentos antiguos puede faltar. «Resuelto por» se registra desde el despliegue de esta versión en adelante.
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Proyecto', 'Experimento', 'Estado', 'Veredicto', 'Responsable', 'Creado por', 'Fecha creación', 'Resuelto por', 'Fecha resolución'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleTraceRows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{r.projectName}</td>
                    <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}>{r.title}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>{r.status}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{r.verdict || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{r.ownerName || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{r.creatorName}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{r.resolverName}</td>
                    <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {traceRows.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                    No hay experimentos en el rango seleccionado.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {traceRows.length > TRACE_ROW_LIMIT && (
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
            Mostrando {TRACE_ROW_LIMIT} de {traceRows.length} — usa el filtro de fechas o exporta el CSV completo.
          </div>
        )}
      </section>

      {/* Usuarios inactivos +14d */}
      <section>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
          Usuarios inactivos (+14 días) — {inactiveUsers.length}
        </h2>
        {inactiveUsers.length === 0 ? (
          <div style={{ color: '#9ca3af', fontSize: '13px' }}>Ningún usuario inactivo.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {inactiveUsers.map(u => (
              <div key={u.id} style={{
                padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '8px', fontSize: '13px', color: '#991b1b',
              }}>
                {u.full_name || u.email}
                <span style={{ color: '#dc2626', marginLeft: '6px', fontSize: '11px' }}>
                  {u.last_seen_at ? `${Math.floor(daysSince(u.last_seen_at))}d` : 'nunca'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tabla de actividad por usuario */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Actividad por usuario</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px 10px', background: 'white' }}>
              <Search size={14} color="#9ca3af" />
              <input
                value={search}
                onChange={e => onSearch(e.target.value)}
                placeholder="Buscar usuario…"
                style={{ border: 'none', outline: 'none', fontSize: '13px', width: '140px' }}
              />
            </div>
            <select value={areaFilter} onChange={e => onAreaFilter(e.target.value)} style={selectStyle}>
              <option value="All">Todas las áreas</option>
              {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <select value={stateFilter} onChange={e => onStateFilter(e.target.value)} style={selectStyle}>
              <option value="All">Todos los estados</option>
              <option value="Activo">Activo</option>
              <option value="En riesgo">En riesgo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <button
              onClick={onExport}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                border: '1px solid #c7d2fe', borderRadius: '8px', background: '#eef2ff',
                color: '#4F46E5', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Nombre', 'Área', 'Último uso', 'Exp. activos', 'Estado', 'Rol'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userRows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}>
                    {r.full_name || '—'}
                    <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '13px' }}>{r.area && r.area.length ? r.area.join(', ') : '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>
                    {r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString() : 'Nunca'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#6b7280' }}>{r.activeExperiments}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: STATE_COLOR[r.state] }}>{r.state}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '12px', color: '#6b7280' }}>
                    {r.global_role === 'superadmin' ? 'Superadmin' : 'Usuario'}
                  </td>
                </tr>
              ))}
              {userRows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Sin resultados con los filtros aplicados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px',
  fontSize: '13px', background: 'white', cursor: 'pointer', outline: 'none',
};
