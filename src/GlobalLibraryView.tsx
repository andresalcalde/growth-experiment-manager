import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Book, Search, X, Target } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';

interface GlobalExperimentRow {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  status: string;
  owner_name: string;
  owner_avatar: string;
  owner_area: string | null;
  hypothesis: string;
  observation: string | null;
  problem: string | null;
  funnel_stage: string;
  north_star_metric: string;
  impact: number;
  confidence: number;
  ease: number;
  ice_score: number;
  start_date: string | null;
  end_date: string | null;
  key_learnings: string | null;
  verdict: string | null;
  visual_proof: string[] | null;
}

const isUrl = (s: string) => s.startsWith('http') || s.startsWith('data:');

function statusBadge(status: string): { text: string; bg: string; color: string } {
  if (status === 'Finished - Winner') return { text: 'WINNER', bg: 'var(--status-winner)', color: 'white' };
  if (status === 'Finished - Loser') return { text: 'LOSER', bg: '#FEE2E2', color: '#991B1B' };
  return { text: 'INCONCLUSIVE', bg: '#F3F4F6', color: '#9CA3AF' };
}

export const GlobalLibraryView: React.FC = () => {
  const { areas } = useAuth();
  const [rows, setRows] = useState<GlobalExperimentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [areaFilter, setAreaFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<GlobalExperimentRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('get_global_finished_experiments');
    if (error) {
      console.error('Error loading global library:', error);
      setError('No se pudo cargar la biblioteca global.');
    } else {
      setRows((data as GlobalExperimentRow[]) || []);
    }
    setLoading(false);
  }, []);

  // Carga inicial (fetch on mount); el setState ocurre tras el await.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData(); }, [loadData]);

  const brands = useMemo(() => {
    const set = new Set(rows.map(r => r.project_name));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (areaFilter !== 'All' && r.owner_area !== areaFilter) return false;
      if (brandFilter !== 'All' && r.project_name !== brandFilter) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, areaFilter, brandFilter, search]);

  return (
    <div style={{ padding: '0 32px 32px', overflowY: 'auto', height: '100%' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', margin: '24px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '8px 12px', background: 'white' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar experimento…"
            style={{ border: 'none', outline: 'none', fontSize: '14px', width: '200px' }}
          />
        </div>
        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={selectStyle}>
          <option value="All">Todas las áreas</option>
          {areas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
        </select>
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} style={selectStyle}>
          <option value="All">Todas las marcas</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{filtered.length} experimentos</span>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-subtle)' }}>Cargando…</div>
      ) : error ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ color: '#dc2626', fontSize: '14px', marginBottom: '16px' }}>{error}</div>
          <button
            onClick={loadData}
            style={{
              padding: '8px 16px', border: '1px solid #c7d2fe', borderRadius: '8px',
              background: '#eef2ff', color: '#4F46E5', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-subtle)' }}>
          <Book size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h3>Sin experimentos</h3>
          <p>Ajusta los filtros para ver más resultados.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', paddingBottom: '32px' }}>
          {filtered.map(r => {
            const badge = statusBadge(r.status);
            const hasImg = r.visual_proof && r.visual_proof.length > 0 && isUrl(r.visual_proof[0]);
            return (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className="library-card"
                style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              >
                {hasImg ? (
                  <div style={{ height: '150px', background: '#f3f4f6', position: 'relative' }}>
                    <img src={r.visual_proof![0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: badge.bg, color: badge.color, padding: '4px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>{badge.text}</div>
                  </div>
                ) : (
                  <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ background: badge.bg, color: badge.color, padding: '4px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700 }}>{badge.text}</div>
                  </div>
                )}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: '#eef2ff', color: '#4F46E5' }}>{r.project_name}</span>
                    {r.owner_area && (
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', background: '#f3f4f6', color: '#6b7280' }}>{r.owner_area}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '12px' }}>
                    {r.verdict || r.key_learnings || r.hypothesis}
                  </p>
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-subtle)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <Target size={13} />
                    {r.funnel_stage}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

const DetailModal: React.FC<{ row: GlobalExperimentRow; onClose: () => void }> = ({ row, onClose }) => {
  const badge = statusBadge(row.status);
  return (
    <div className="drawer-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', width: '720px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700 }}>{badge.text}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', background: '#eef2ff', color: '#4F46E5' }}>{row.project_name}</span>
                {row.owner_area && <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', background: '#f3f4f6', color: '#6b7280' }}>{row.owner_area}</span>}
              </div>
              <h1 style={{ fontSize: '24px', lineHeight: 1.2 }}>{row.title}</h1>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="var(--text-subtle)" /></button>
          </div>

          <Section title="Etapa del experimento">
            <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
              <div><strong>Estado:</strong> {row.status}</div>
              <div><strong>Funnel:</strong> {row.funnel_stage}</div>
              <div><strong>ICE:</strong> {row.ice_score}</div>
            </div>
          </Section>

          <Section title="Hipótesis">{row.hypothesis || '—'}</Section>
          {row.problem && <Section title="Problema">{row.problem}</Section>}
          {row.observation && <Section title="Observación">{row.observation}</Section>}
          <Section title="The Verdict">{row.verdict || '—'}</Section>
          <Section title="Key Learnings">{row.key_learnings || '—'}</Section>

          {row.visual_proof && row.visual_proof.filter(isUrl).length > 0 && (
            <Section title="Evidencia visual">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {row.visual_proof.filter(isUrl).map((src, i) => (
                  <div key={i} style={{ aspectRatio: '16/9', background: '#f3f4f6', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                    <img src={src} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div style={{ fontSize: '13px', color: 'var(--text-subtle)', marginTop: '16px' }}>
            Owner: {row.owner_name || '—'} · Cierre: {row.end_date || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '8px' }}>{title}</h3>
    <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-main)' }}>{children}</div>
  </div>
);

const selectStyle: React.CSSProperties = {
  padding: '9px 12px', border: '1px solid var(--border-subtle)', borderRadius: '8px',
  fontSize: '14px', background: 'white', cursor: 'pointer', outline: 'none',
};
