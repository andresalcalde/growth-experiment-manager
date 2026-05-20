import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Shield, Users, Activity, Download, Search, Plus, Trash2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
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

type UserState = 'Activo' | 'En riesgo' | 'Inactivo';

const DAY = 86400000;

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
  const { profile, updateUserGlobalRole, areas } = useAuth();
  const [tab, setTab] = useState<'manage' | 'usage'>('manage');
  const [users, setUsers] = useState<Profile[]>([]);
  const [members, setMembers] = useState<MembershipRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
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
      const inArea = users.filter(u => u.area === name);
      const active = inArea.filter(u => daysSince(u.last_seen_at) <= 30).length;
      return { area: name, total: inArea.length, active };
    });
  }, [users, areas]);

  // Proyectos inactivos +7d: sin actividad registrada en 7 días
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
    return projects.map(p => {
      const acts = activity.filter(a => a.project_id === p.metadata.id);
      const last7 = acts.filter(a => (now - new Date(a.created_at).getTime()) / DAY <= 7).length;
      const prev7 = acts.filter(a => {
        const d = (now - new Date(a.created_at).getTime()) / DAY;
        return d > 7 && d <= 14;
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
  }, [projects, activity, members]);

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
      if (areaFilter !== 'All' && r.area !== areaFilter) return false;
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

  const toggleSuperadmin = async (u: Profile) => {
    const next: GlobalRole = u.global_role === 'superadmin' ? 'user' : 'superadmin';
    if (next === 'user' && superadminCount <= 1) {
      alert('No se puede degradar al último superadmin.');
      return;
    }
    if (!window.confirm(
      next === 'superadmin'
        ? `¿Promover a ${u.full_name || u.email} a superadmin?`
        : `¿Quitar superadmin a ${u.full_name || u.email}?`
    )) return;
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

  const exportCsv = () => {
    const headers = ['Nombre', 'Email', 'Area', 'Ultimo uso', 'Experimentos activos', 'Estado', 'Rol global', 'Proyectos'];
    const rows = filteredUserRows.map(r => [
      r.full_name || '',
      r.email || '',
      r.area || '',
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
            projects={projects}
            members={members}
            busyUserId={busyUserId}
            currentUserId={profile?.id}
            onToggleSuperadmin={toggleSuperadmin}
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
            onAreaFilter={setAreaFilter}
            onStateFilter={setStateFilter}
            onSearch={setSearch}
            onExport={exportCsv}
          />
        )}
      </div>
    </div>
  );
};

// ── Manage tab ───────────────────────────────────────────────────────────────

const ManageTab: React.FC<{
  users: Profile[];
  projects: Project[];
  members: MembershipRow[];
  busyUserId: string | null;
  currentUserId?: string;
  onToggleSuperadmin: (u: Profile) => void;
}> = ({ users, projects, members, busyUserId, currentUserId, onToggleSuperadmin }) => {
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
              {['Nombre', 'Email', 'Área', 'Rol global', 'Acción'].map(h => (
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
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{u.area || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                    background: u.global_role === 'superadmin' ? '#ede9fe' : '#f3f4f6',
                    color: u.global_role === 'superadmin' ? '#7C3AED' : '#6b7280',
                  }}>
                    {u.global_role === 'superadmin' ? 'SUPERADMIN' : 'USUARIO'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => onToggleSuperadmin(u)}
                    disabled={busyUserId === u.id}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                      cursor: busyUserId === u.id ? 'wait' : 'pointer',
                      border: '1px solid ' + (u.global_role === 'superadmin' ? '#fca5a5' : '#c7d2fe'),
                      background: u.global_role === 'superadmin' ? '#fef2f2' : '#eef2ff',
                      color: u.global_role === 'superadmin' ? '#dc2626' : '#4F46E5',
                    }}
                  >
                    {u.global_role === 'superadmin' ? 'Quitar superadmin' : 'Promover a superadmin'}
                  </button>
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

    {/* Projects */}
    <section>
      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
        Proyectos ({projects.length})
      </h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Proyecto', 'Experimentos', 'Miembros'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p.metadata.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{p.metadata.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{p.experiments.length}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                  {members.filter(m => m.project_id === p.metadata.id).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {/* Áreas */}
    <AreasSection users={users} />
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
    const inUse = users.filter(u => u.area === area.name).length;
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
          const inUse = users.filter(u => u.area === a.name).length;
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
  onAreaFilter: (v: string) => void;
  onStateFilter: (v: string) => void;
  onSearch: (v: string) => void;
  onExport: () => void;
}> = ({ metrics, adoptionByArea, projectRanking, userRows, inactiveUsers, areaFilter, stateFilter, search, onAreaFilter, onStateFilter, onSearch, onExport }) => {
  const { areas } = useAuth();
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
                  <td style={{ padding: '10px 16px', fontSize: '13px' }}>{r.area || '—'}</td>
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
