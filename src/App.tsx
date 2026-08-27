import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  LayoutDashboard,
  Table as TableIcon,
  Search,
  Target,
  Book,
  GitBranch,
  X,
  CheckCircle2,
  HelpCircle,
  Settings,
  LogOut,
  ShieldCheck,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  Loader2,
  Pencil,
  UserCircle
} from 'lucide-react';
import { uploadExperimentEvidence, deleteExperimentEvidence } from './lib/uploadEvidence';
import { MethodologyToolkit } from './components/MethodologyToolkit';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Status, Experiment, NorthStarMetric, FunnelStage, Project, TeamMember } from './types';
import { CreateProjectModal } from './CreateProjectModal';
import { SettingsView } from './SettingsView';
import { PortfolioView } from './PortfolioView';
import { UserProfileModal } from './components/UserProfileModal';
import { ExperimentDrawer } from './ExperimentDrawer';
import { RoadmapView } from './RoadmapView';
import { ExperimentModal } from './ExperimentModal';
import type { ExperimentFormData } from './ExperimentModal';
import { KeyLearningModal } from './KeyLearningModal';
import { NorthStarBar } from './components/NorthStarBar';
import { StatusChip } from './components/StatusChip';
import { SectionGuide } from './components/SectionGuide';
import { InfoTooltip } from './components/InfoTooltip';
import { useProjectContext } from './contexts/ProjectContext';
import { useAuth } from './contexts/AuthContext';
import { AdminView } from './AdminView';
import { GlobalLibraryView } from './GlobalLibraryView';
import { AreaPromptModal } from './components/AreaPromptModal';
import { Lightbox, type LightboxItem } from './components/Lightbox';
import { notifyExperimentWinner } from './lib/notify';


// Original MOCK_EXPERIMENTS replaced with Laboratorio Polanco data
// See laboratorioPolancoData.ts for the data source

// Board only shows these columns
const BOARD_COLUMNS: Status[] = ['Prioritized', 'Building', 'Live Testing', 'Analysis'];


const IceBadge = ({ impact, confidence, ease, score }: { impact: number, confidence: number, ease: number, score: number }) => {
  const getICEColor = (s: number) => {
    if (s >= 500) return 'ice-high';
    if (s >= 250) return 'ice-medium';
    return 'ice-low';
  };

  return (
    <div className={'ice-badge ' + getICEColor(score)}>
      <span title="Impact">{impact}</span>
      <span>•</span>
      <span title="Confidence">{confidence}</span>
      <span>•</span>
      <span title="Ease">{ease}</span>
      <span style={{ marginLeft: '4px', opacity: 0.6 }}>({score})</span>
    </div>
  );
};


const isUrl = (s: string) => s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:');
const isImageUrl = (s: string) => s.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i.test(s);
const isPdfUrl = (s: string) => s.startsWith('data:application/pdf') || /\.pdf(\?|#|$)/i.test(s);
const isPreviewable = (s: string) => isImageUrl(s) || isPdfUrl(s);
const fileNameFromUrl = (s: string) => {
  try {
    const last = decodeURIComponent(s.split('?')[0].split('/').pop() || '');
    return last.replace(/^\d+-/, '') || 'archivo';
  } catch {
    return 'archivo';
  }
};

const OwnerAvatar = ({ avatar, name, size = 20 }: { avatar: string; name: string; size?: number }) => {
  if (avatar && isUrl(avatar)) {
    return <img src={avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  if (avatar && avatar.length <= 2) {
    return <span style={{ fontSize: size * 0.75 }}>{avatar}</span>;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--border-subtle, #E5E7EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, fontWeight: 600, color: '#6B7280' }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
};

const ExperimentCard = ({
  experiment,
  onClick,
  isOverlay,
  style
}: {
  experiment: Experiment;
  onClick?: () => void;
  isOverlay?: boolean;
  style?: React.CSSProperties;
}) => (
  <div
    className="experiment-card"
    onClick={onClick}
    style={{
      ...style,
      cursor: isOverlay ? 'grabbing' : 'grab',
      boxShadow: isOverlay ? 'var(--shadow-md)' : undefined,
      transform: isOverlay ? 'scale(1.05)' : style?.transform,
    }}
  >
    <div className="card-title">{experiment.title}</div>
    <div className="card-footer">
      <IceBadge impact={experiment.impact} confidence={experiment.confidence} ease={experiment.ease} score={experiment.iceScore} />
      <OwnerAvatar avatar={experiment.owner.avatar} name={experiment.owner.name} size={20} />
    </div>
  </div>
);

const SortableExperimentCard = ({ experiment, onClick }: { experiment: Experiment; onClick: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: experiment.id, data: { experiment } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };


  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ExperimentCard experiment={experiment} onClick={onClick} />
    </div>
  );
};


const KanbanColumn = ({
  status,
  experiments,
  onClickExperiment
}: {
  status: Status;
  experiments: Experiment[];
  onClickExperiment: (e: Experiment) => void;
}) => {
  const { setNodeRef } = useDroppable({
    id: status,
  });
  const isAnalysis = status === 'Analysis';

  return (
    <div ref={setNodeRef} className={`kanban-column ${isAnalysis ? 'kanban-column--analysis' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="column-header">
        <span>{status}</span>
        <span style={{ opacity: 0.5 }}>{experiments.length}</span>
      </div>
      {isAnalysis && (
        <div className="analysis-cta">
          <span>📊</span>
          <span>Registra resultados para avanzar a Learning</span>
        </div>
      )}
      <SortableContext
        id={status}
        items={experiments.map(e => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '150px', flex: 1 }}>
          {experiments.map(exp => (
            <SortableExperimentCard
              key={exp.id}
              experiment={exp}
              onClick={() => onClickExperiment(exp)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};








const LibraryCard = ({ experiment, onClick }: { experiment: Experiment; onClick: () => void }) => {
  const isWinner = experiment.status === 'Finished - Winner';
  const isLoser = experiment.status === 'Finished - Loser';

  let badgeColor = '#9CA3AF'; // gray
  let badgeText = 'INCONCLUSIVE';
  let badgeBg = '#F3F4F6';

  if (isWinner) {
    badgeColor = 'white';
    badgeText = 'WINNER';
    badgeBg = 'var(--status-winner)';
  } else if (isLoser) {
    badgeColor = '#991B1B';
    badgeText = 'LOSER';
    badgeBg = '#FEE2E2';
  }

  const hasImage = experiment.visualProof && experiment.visualProof.length > 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      className="library-card"
    >
      {/* Hero Image or compact badge */}
      {hasImage ? (
        <div style={{ height: '160px', background: '#f3f4f6', position: 'relative' }}>
          <img src={experiment.visualProof![0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: '12px', right: '12px', background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>
            {badgeText}
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>
            {badgeText}
          </div>
        </div>
      )}

      {/* Card Body */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {experiment.title}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '16px' }}>
          {experiment.verdict || experiment.keyLearnings || experiment.hypothesis}
        </p>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-subtle)', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={14} />
            {experiment.funnelStage}
          </div>
          <div>{experiment.endDate ? experiment.endDate.split('-').slice(1).join('/') : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};


const CaseStudyModal = ({ experiment, onClose, onUpdate, onEdit, onDelete }: { experiment: Experiment; onClose: () => void; onUpdate: (updates: Partial<Experiment>) => void; onEdit: () => void; onDelete: () => void }) => {
  const isWinner = experiment.status === 'Finished - Winner';
  const isLoser = experiment.status === 'Finished - Loser';

  let highlightColor = '#F3F4F6'; // gray
  if (isWinner) highlightColor = 'rgba(74, 222, 128, 0.2)';
  if (isLoser) highlightColor = '#FEE2E2';

  // Lightbox: solo items previsualizables (imágenes y PDF)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxItems: LightboxItem[] = (experiment.visualProof || [])
    .filter(p => isUrl(p) && isPreviewable(p))
    .map(p => ({ src: p, caption: fileNameFromUrl(p) }));

  // Edición inline de The Verdict y Key Learnings desde el propio detalle, sin
  // alterar la clasificación final (Winner/Loser/Inconclusive). Cubre el feedback
  // de "completar datos y aprendizajes después del cierre".
  const [editingVerdict, setEditingVerdict] = useState(false);
  const [tempVerdict, setTempVerdict] = useState(experiment.verdict || '');
  const [editingLearnings, setEditingLearnings] = useState(false);
  const [tempLearnings, setTempLearnings] = useState(experiment.keyLearnings || '');

  const saveVerdict = () => { onUpdate({ verdict: tempVerdict }); setEditingVerdict(false); };
  const saveLearnings = () => { onUpdate({ keyLearnings: tempLearnings }); setEditingLearnings(false); };

  const inlineEditBtnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600,
    color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer',
  };
  const inlineTextareaStyle: React.CSSProperties = {
    width: '100%', minHeight: '110px', padding: '12px', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', fontSize: '15px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '8px',
  };
  const inlineSaveBtnStyle: React.CSSProperties = {
    background: '#4F46E5', color: 'white', border: 'none', padding: '8px 16px',
    borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
  };

  // Subida de evidencia a Supabase Storage (cualquier tipo de archivo)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of list) {
        if (file.size > 25 * 1024 * 1024) {
          setUploadError(`"${file.name}" supera 25MB y no se subió.`);
          continue;
        }
        urls.push(await uploadExperimentEvidence(experiment.id, file));
      }
      if (urls.length > 0) {
        onUpdate({ visualProof: [...(experiment.visualProof || []), ...urls] });
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handlePick = () => fileInputRef.current?.click();

  const handleRemove = async (idx: number) => {
    const cur = experiment.visualProof || [];
    const target = cur[idx];
    onUpdate({ visualProof: cur.filter((_, i) => i !== idx) });
    if (target && isUrl(target)) {
      // El registro ya se quitó; un fallo al borrar en Storage no debe romper la UI.
      try { await deleteExperimentEvidence(target); } catch { /* ignore */ }
    }
  };

  const openLightbox = (proof: string) => {
    const i = lightboxItems.findIndex(it => it.src === proof);
    setLightboxIndex(i >= 0 ? i : 0);
  };

  return (
    <div className="drawer-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                  color: isWinner ? 'var(--status-winner)' : isLoser ? 'var(--status-loser)' : 'var(--text-subtle)'
                }}>
                  {experiment.status.replace('Finished - ', '')}
                </span>
                <span style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>EXP-{experiment.id}</span>
              </div>
              <h1 style={{ fontSize: '28px', lineHeight: '1.2' }}>{experiment.title}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={onEdit}
                title="Editar detalle del experimento"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer' }}
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={onDelete}
                title="Eliminar experimento"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#DC2626', background: 'none', border: '1px solid #fecaca', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer' }}
              >
                <Trash2 size={14} /> Eliminar
              </button>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="var(--text-subtle)" /></button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '48px' }}>
            <div>
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '12px' }}>The Context</h3>
                <div className="rich-text" style={{ fontSize: '16px', lineHeight: '1.6' }}>
                  {experiment.problem ? (
                    <p style={{ marginBottom: '12px' }}><strong>Problem:</strong> {experiment.problem}</p>
                  ) : null}
                  <p><strong>Hypothesis:</strong> {experiment.hypothesis}</p>
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-subtle)', margin: 0 }}>The Evidence</h3>
                  {(experiment.visualProof && experiment.visualProof.length > 0) && (
                    <button
                      onClick={handlePick}
                      disabled={uploading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '6px 10px', cursor: uploading ? 'default' : 'pointer' }}
                    >
                      {uploading ? <Loader2 size={14} className="spin" /> : <UploadCloud size={14} />}
                      {uploading ? 'Subiendo…' : 'Subir'}
                    </button>
                  )}
                </div>

                {/* Input de archivo oculto, compartido por dropzone y botón */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }}
                />

                {(experiment.visualProof && experiment.visualProof.length > 0) ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {experiment.visualProof.map((proof, i) => {
                      const removeBtn = (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                          aria-label="Eliminar evidencia"
                          title="Eliminar"
                          style={{ position: 'absolute', top: '6px', right: '6px', width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      );

                      // Evidencia legacy en texto plano (no es URL)
                      if (!isUrl(proof)) {
                        return (
                          <div key={i} style={{ position: 'relative', aspectRatio: '16/9', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                            {removeBtn}
                            <span style={{ fontSize: '12px', color: 'var(--text-subtle)', padding: '0 12px', textAlign: 'center' }}>{proof}</span>
                          </div>
                        );
                      }

                      // Imagen → miniatura con zoom al Lightbox
                      if (isImageUrl(proof)) {
                        return (
                          <div
                            key={i}
                            onClick={() => openLightbox(proof)}
                            style={{ position: 'relative', aspectRatio: '16/9', maxHeight: '70vh', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)', overflow: 'hidden', cursor: 'zoom-in', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            {removeBtn}
                            <img src={proof} alt="Evidencia visual" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }} />
                          </div>
                        );
                      }

                      // PDF → tarjeta que abre el Lightbox (iframe)
                      if (isPdfUrl(proof)) {
                        return (
                          <div
                            key={i}
                            onClick={() => openLightbox(proof)}
                            style={{ position: 'relative', aspectRatio: '16/9', background: '#f3f4f6', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid var(--border-subtle)', cursor: 'zoom-in', padding: '12px' }}
                          >
                            {removeBtn}
                            <FileText size={28} color="var(--text-subtle)" />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{fileNameFromUrl(proof)}</span>
                          </div>
                        );
                      }

                      // Otro archivo → chip descargable (abre en nueva pestaña)
                      return (
                        <a
                          key={i}
                          href={proof}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ position: 'relative', aspectRatio: '16/9', background: '#f3f4f6', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid var(--border-subtle)', textDecoration: 'none', padding: '12px' }}
                        >
                          {removeBtn}
                          <Download size={26} color="var(--text-subtle)" />
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{fileNameFromUrl(proof)}</span>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  /* Estado vacío → zona de carga */
                  <div
                    onClick={handlePick}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files); }}
                    style={{ aspectRatio: '16/6', minHeight: '140px', background: dragOver ? 'rgba(79,70,229,0.06)' : '#f9fafb', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: `1px dashed ${dragOver ? 'var(--accent, #4F46E5)' : 'var(--border-subtle)'}`, cursor: uploading ? 'default' : 'pointer', transition: 'background 0.15s ease, border-color 0.15s ease' }}
                  >
                    {uploading ? <Loader2 size={28} className="spin" color="var(--text-subtle)" /> : <UploadCloud size={28} color="var(--text-subtle)" />}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {uploading ? 'Subiendo…' : 'Arrastra o haz clic para subir evidencia'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>Imágenes, PDF u otros archivos (máx. 25MB c/u)</span>
                  </div>
                )}

                {uploadError && (
                  <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--status-loser, #DC2626)' }}>{uploadError}</p>
                )}
              </div>

              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-subtle)', margin: 0 }}>The Verdict</h3>
                  <button
                    onClick={() => { setTempVerdict(experiment.verdict || ''); setEditingVerdict(!editingVerdict); }}
                    style={inlineEditBtnStyle}
                  >
                    <Pencil size={14} /> {editingVerdict ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {editingVerdict ? (
                  <div>
                    <textarea
                      value={tempVerdict}
                      onChange={(e) => setTempVerdict(e.target.value)}
                      placeholder="Resume el veredicto del experimento…"
                      style={inlineTextareaStyle}
                    />
                    <button onClick={saveVerdict} style={inlineSaveBtnStyle}>Guardar</button>
                  </div>
                ) : (
                  <div style={{ background: highlightColor, padding: '24px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <p style={{ fontSize: '18px', fontWeight: 500, lineHeight: '1.5' }}>
                      {experiment.verdict || experiment.keyLearnings || "Sin veredicto registrado."}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-subtle)', margin: 0 }}>Key Learnings</h3>
                  <button
                    onClick={() => { setTempLearnings(experiment.keyLearnings || ''); setEditingLearnings(!editingLearnings); }}
                    style={inlineEditBtnStyle}
                  >
                    <Pencil size={14} /> {editingLearnings ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {editingLearnings ? (
                  <div>
                    <textarea
                      value={tempLearnings}
                      onChange={(e) => setTempLearnings(e.target.value)}
                      placeholder="Documenta los key learnings y aprendizajes del experimento…"
                      style={inlineTextareaStyle}
                    />
                    <button onClick={saveLearnings} style={inlineSaveBtnStyle}>Guardar</button>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-sidebar)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-main)' }}>
                      {experiment.keyLearnings || "Aún no hay Key Learnings. Haz clic en “Editar” para agregarlos."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Meta */}
            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <div className="label">Owner</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <OwnerAvatar avatar={experiment.owner.avatar} name={experiment.owner.name} size={24} />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{experiment.owner.name}</span>
                  </div>
                </div>
                <div>
                  <div className="label">Metric Impact</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="var(--text-subtle)" />
                    {experiment.northStarMetric}
                  </div>
                </div>
                <div>
                  <div className="label">Funnel Stage</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                    {experiment.funnelStage}
                  </div>
                </div>
                <div>
                  <div className="label">Concluded</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                    {experiment.endDate || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {lightboxIndex !== null && lightboxItems.length > 0 && (
        <Lightbox
          items={lightboxItems}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};



const App: React.FC = () => {
  if (import.meta.env.DEV) console.log("App rendering");
  const [view, setView] = useState<'portfolio' | 'board' | 'table' | 'library' | 'roadmap' | 'admin'>('portfolio');

  const { signOut, profile, updatePanelLogo, updateArea, isSuperAdmin, canAccessGlobalLibrary } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Multi-Project State Management via Context
  const {
    projects,
    teamMembers,
    activeProjectId,
    activeProject,
    setActiveProjectId,
    northStar,
    objectives,
    strategies,
    experiments,
    updateNorthStar,
    addObjective,
    editObjective,
    deleteObjective,
    addStrategy,
    editStrategy,
    deleteStrategy,
    addExperiment,
    updateExperiment,
    deleteExperiment,
    setExperiments,
    createProject: ctxCreateProject,
    deleteProject,
    updateProjectLogo,
    updateProjectPlatformLogo,
    updateProjectName,
    addTeamMember: ctxAddTeamMember,
    updateTeamMemberRole: ctxUpdateTeamMemberRole,
    removeTeamMember: ctxRemoveTeamMember,
  } = useProjectContext();

  // const setNorthStar = updateNorthStar; // Removed alias
  // Wrappers for state setters to match old API where possible, or replace usage
  // Note: setObjectives, setStrategies are complex because they took updater functions.
  // We need to update handlers to use context methods directly.

  // UI State (Modals)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<Experiment | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  // Library Filters
  const [libraryFilterResult, setLibraryFilterResult] = useState<'All' | 'Winners' | 'Losers'>('All');
  const [libraryFilterStage, setLibraryFilterStage] = useState<string>('All');
  const [libraryMode, setLibraryMode] = useState<'project' | 'global'>('project');
  const [iceSortDirection, setIceSortDirection] = useState<'desc' | 'asc'>('desc'); // Default: highest first
  // Filtro de experimentos por iniciativa (al clicar el tag de una initiative en el Roadmap)
  const [strategyFilter, setStrategyFilter] = useState<string | null>(null);
  // El filtro por iniciativa solo aplica en la vista Explore; al salir de ella se limpia.
  useEffect(() => {
    if (view !== 'table') setStrategyFilter(null);
  }, [view]);

  const [activeId, setActiveId] = useState<string | null>(null);
  // Etapa de origen del experimento que se está arrastrando, capturada en dragStart
  // (handleDragOver ya la habrá sobreescrito para cuando llegue el drop).
  const dragFromStatusRef = useRef<Status | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  // Learning Modal State
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [pendingExperimentId, setPendingExperimentId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  // COMMITMENT FILTER IMPLEMENTATION

  // 02. Explore (Table): Show Idea, Prioritized, Live Testing, Analysis
  // Si hay un filtro por iniciativa activo, mostramos TODOS los experimentos
  // vinculados a esa initiative (cualquier estado, incluidos los finalizados).
  const exploreExperiments = experiments.filter(e => {
    if (!e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (strategyFilter) return e.linkedStrategyId === strategyFilter;
    return e.status === 'Idea' || e.status === 'Prioritized' || e.status === 'Live Testing' || e.status === 'Analysis';
  });

  // 03. Be Agile (Board): Show ONLY committed experiments (Prioritized, Building, Live Testing, Analysis - NO Idea)
  const boardExperiments = experiments.filter(e =>
    BOARD_COLUMNS.includes(e.status) &&
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 04. Learning (Library): Show ONLY Finished experiments
  const libraryExperiments = experiments
    .filter(e => e.status.includes('Finished'))
    .filter(e => {
      if (libraryFilterResult === 'Winners') return e.status === 'Finished - Winner';
      if (libraryFilterResult === 'Losers') return e.status === 'Finished - Loser';
      return true;
    })
    .filter(e => {
      if (libraryFilterStage === 'All') return true;
      return e.funnelStage === libraryFilterStage;
    })
    .filter(e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.keyLearnings && e.keyLearnings.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.endDate && b.endDate) return b.endDate.localeCompare(a.endDate);
      return 0;
    });

  // Sort Explore table by ICE Score
  const tableExperiments = [...exploreExperiments].sort((a, b) =>
    iceSortDirection === 'desc' ? b.iceScore - a.iceScore : a.iceScore - b.iceScore
  );


  const updateFunnelStage = (id: string, stage: FunnelStage) => {
    updateExperiment(id, { funnelStage: stage });
  };
  const updateIceScore = (id: string, field: 'impact' | 'confidence' | 'ease', val: number) => {
    const exp = experiments.find(e => e.id === id);
    if (!exp) return;
    const updated = { ...exp, [field]: val };
    updated.iceScore = updated.impact * updated.confidence * updated.ease;
    updateExperiment(id, { [field]: val, iceScore: updated.iceScore });

    if (selectedExperiment && selectedExperiment.id === id) {
      setSelectedExperiment(prev => {
        if (!prev) return null;
        const u = { ...prev, [field]: val };
        u.iceScore = u.impact * u.confidence * u.ease;
        return u;
      });
    }
  };

  const handleStatusChangeAttempt = (id: string, newStatus: Status) => {
    if (newStatus.includes('Finished')) {
      setPendingExperimentId(id);
      setPendingStatus(newStatus);
      setIsLearningModalOpen(true);
    } else {
      updateExperiment(id, { status: newStatus });
    }
  };

  const handleLearningSave = (learning: string) => {
    if (pendingExperimentId && pendingStatus) {
      updateExperiment(pendingExperimentId, {
        status: pendingStatus,
        verdict: learning,
        endDate: new Date().toISOString().split('T')[0]
      });
      // Notificación por correo si el experimento resultó Winner (fire-and-forget).
      if (pendingStatus === 'Finished - Winner') {
        const exp = experiments.find(e => e.id === pendingExperimentId);
        if (exp) void notifyExperimentWinner(exp.owner.name, exp.title);
      }
      setIsLearningModalOpen(false);
      setPendingExperimentId(null);
      setPendingStatus(null);
      setSelectedExperiment(null);
    }
  };

  const handleExperimentUpdate = (id: string, updates: Partial<Experiment>) => {
    updateExperiment(id, updates);
    if (selectedExperiment && selectedExperiment.id === id) {
      setSelectedExperiment(prev => prev ? { ...prev, ...updates } : null);
    }
    if (selectedCaseStudy && selectedCaseStudy.id === id) {
      setSelectedCaseStudy(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleDeleteExperiment = (id: string) => {
    deleteExperiment(id);
    setSelectedExperiment(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string;
    // handleDragOver muta el status en el contexto durante el arrastre, así que
    // el origen real hay que capturarlo acá. Solo hay un drag activo a la vez.
    dragFromStatusRef.current = experiments.find(e => e.id === draggedId)?.status ?? null;
    setActiveId(draggedId);
  };


  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type !== 'Column';
    const isOverTask = over.data.current?.type !== 'Column';

    if (!isActiveTask) return;

    // Dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setExperiments((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);

        if (activeIndex === -1 || overIndex === -1) return prev;

        const newExperiments = [...prev];
        if (newExperiments[activeIndex].status !== newExperiments[overIndex].status) {
          newExperiments[activeIndex] = { ...newExperiments[activeIndex], status: newExperiments[overIndex].status };
        }

        return arrayMove(newExperiments, activeIndex, overIndex);
      });
    }

    const isOverColumn = BOARD_COLUMNS.includes(overId as Status);
    if (isOverColumn) {
      setExperiments((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        if (activeIndex === -1) return prev;

        if (prev[activeIndex].status !== overId) {
          const newExperiments = [...prev];
          newExperiments[activeIndex] = { ...newExperiments[activeIndex], status: overId as Status };
          // Don't move index here, usually wait for drop, but dnd-kit sortable needs it for visual
          return arrayMove(newExperiments, activeIndex, activeIndex);
        }
        return prev;
      });
    }
  };


  const handleDragEnd = (_event: DragEndEvent) => {
    // Persist the status change that happened during drag over
    if (activeId) {
      const exp = experiments.find(e => e.id === activeId);
      // Si el status no cambió es un reorden dentro de la misma columna: no hay
      // nada que persistir (el orden no vive en BD) ni que loguear.
      if (exp && dragFromStatusRef.current !== exp.status) {
        updateExperiment(exp.id, { status: exp.status }, { fromStatus: dragFromStatusRef.current ?? undefined });
      }
    }
    dragFromStatusRef.current = null;
    setActiveId(null);
  };


  const handleCreateExperiment = (formData: ExperimentFormData) => {
    // Find the selected team member
    const selectedMember = teamMembers.find(m => m.id === formData.ownerId) || teamMembers[0];

    // Use context addExperiment
    // We pass the full object except ID (DB generates ID)
    addExperiment({
      // id: We pass undefined or let context ignore it
      title: formData.title,
      status: formData.status,
      owner: { name: selectedMember.name, avatar: selectedMember.avatar },
      hypothesis: formData.hypothesis,
      observation: formData.observation,
      problem: formData.problem,
      source: formData.source,
      labels: formData.labels,
      impact: formData.impact,
      confidence: formData.confidence,
      ease: formData.ease,
      iceScore: formData.impact * formData.confidence * formData.ease,
      funnelStage: formData.funnelStage,
      northStarMetric: northStar.name,
      campaignObjective: formData.campaignObjective,
      linkedStrategyId: formData.linkedStrategyId,
      startDate: new Date().toISOString().split('T')[0]
    });

    setIsNewModalOpen(false);
  };

  const handleAddObjective = (title: string) => {
    addObjective(title);
  };

  const handleUpdateNorthStar = (updatedNorthStar: NorthStarMetric) => {
    updateNorthStar(updatedNorthStar);
  };

  const handleAddStrategy = (objectiveId: string, title: string) => {
    addStrategy(objectiveId, title);
  };

  const handleDeleteObjective = (objectiveId: string) => {
    const linkedStrategies = strategies.filter(s => s.parentObjectiveId === objectiveId);
    if (linkedStrategies.length > 0) {
      if (!window.confirm(`Delete objective and its ${linkedStrategies.length} strategies?`)) return;
    }
    deleteObjective(objectiveId);
  };

  const handleEditObjective = (objectiveId: string, newTitle: string, newDescription?: string) => {
    editObjective(objectiveId, newTitle, newDescription);
  };

  const handleEditStrategy = (strategyId: string, newTitle: string) => {
    editStrategy(strategyId, newTitle);
  };

  // ============================================================================
  // PORTFOLIO NAVIGATION HANDLERS
  // ============================================================================

  const handleSelectProjectFromPortfolio = (projectId: string) => {
    console.log('📂 Selected project from portfolio:', projectId);
    setActiveProjectId(projectId);
    setView('roadmap');
  };

  const handleBackToPortfolio = () => {
    console.log('🏠 Returning to portfolio');
    // We can't set activeProjectId to null if the type doesn't allow it, 
    // but context.setActiveProjectId takes string.
    // However, we can handle view state.
    // Ideally we switch to a 'no project selected' state or just 'portfolio' view.
    setView('portfolio');
  };

  // Project Management Handlers
  const handleCreateProject = async (newProject: Project) => {
    try {
      await ctxCreateProject(newProject);
      setView('roadmap'); // Navigate to the new project after creation
    } catch (err: any) {
      console.error('Error creating project:', err);
      // Ensure we alert the user so they know why it "hung" or failed
      alert(`Error creating project: ${err.message || 'Unknown error'}`);
      throw err;
    }
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setIsSettingsOpen(false);
    setView('portfolio');
  };

  // Team Management Handlers
  const handleAddTeamMember = (member: TeamMember) => {
    ctxAddTeamMember(member.email, member.role);
  };

  const handleRemoveTeamMember = (memberId: string) => {
    ctxRemoveTeamMember(memberId);
  };

  const handleUpdateTeamMember = (memberId: string, updates: Partial<TeamMember>) => {
    if (updates.role) {
      ctxUpdateTeamMemberRole(memberId, updates.role);
    }
  };



  // ============================================================================
  // RENDER
  // ============================================================================

  // Portfolio View - Show when no project is selected or view is 'portfolio'
  if (view === 'admin' && isSuperAdmin) {
    return (
      <>
        <AdminView projects={projects} onBack={() => setView('portfolio')} />
        <AreaPromptModal />
      </>
    );
  }

  if (view === 'portfolio') {
    return (
      <>
        <PortfolioView
          projects={projects}
          onSelectProject={handleSelectProjectFromPortfolio}
          onCreateProject={() => setIsCreateProjectOpen(true)}
          onSignOut={signOut}
          onOpenAdmin={isSuperAdmin ? () => setView('admin') : undefined}
          onOpenProfile={() => setIsProfileOpen(true)}
          onDeleteProject={handleDeleteProject}
        />
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onSave={handleCreateProject}
        />
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />
        <AreaPromptModal />
      </>
    );
  }

  // Main App View - Show when project is selected
  return (
    <div className="app-container">
      {/* Sidebar - Simplified for brevity in this view */}
      <nav className="sidebar">
        <div className="logo-area" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={handleBackToPortfolio}>
          {profile?.panel_logo_url ? (
            <img
              src={profile.panel_logo_url}
              alt="Logo"
              style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
            />
          ) : activeProject?.metadata.platformLogoUrl ? (
            <img
              src={activeProject.metadata.platformLogoUrl}
              alt="Logo"
              style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
            />
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#4F46E5" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="10" stroke="#4F46E5" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
              <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', fontFamily: 'var(--font-sans)' }}>
                Growth Hub
              </span>
            </>
          )}
        </div>

        {/* Project Switcher */}
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderRadius: '12px',
          border: '1px solid #e9d5ff'
        }}>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 600,
            color: '#6b7280',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Active Project
          </label>
          <select
            value={activeProjectId || ''}
            onChange={(e) => {
              if (e.target.value === '__create_new__') {
                setIsCreateProjectOpen(true);
                // Reset to current project
                setTimeout(() => { if (activeProjectId) { (e.target as HTMLSelectElement).value = activeProjectId } }, 0);
              } else {
                setActiveProjectId(e.target.value);
              }
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: 'white',
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {projects.map(project => (
              <option key={project.metadata.id} value={project.metadata.id}>
                {project.metadata.logo || '📁'} {project.metadata.name}
              </option>
            ))}
            <option value="__create_new__" style={{ color: '#4F46E5', fontWeight: 700 }}>
              + Create New Project
            </option>
          </select>
        </div>


        {/* Primary CTA */}
        <button
          className="btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            marginBottom: '24px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => setIsNewModalOpen(true)}
        >
          <Plus size={18} />
          New Experiment
        </button>

        {/* Back to Portfolio - Prominent */}
        <button
          onClick={handleBackToPortfolio}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
            borderRadius: '8px', width: '100%', textAlign: 'left',
            border: '1px solid #E5E7EB',
            cursor: 'pointer', background: '#F9FAFB', color: '#4F46E5',
            marginBottom: '16px', fontSize: '13px', fontWeight: 600,
            transition: 'all 0.2s',
            letterSpacing: '-0.1px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#EEF2FF';
            e.currentTarget.style.borderColor = '#C7D2FE';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#F9FAFB';
            e.currentTarget.style.borderColor = '#E5E7EB';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
          <span>All Projects</span>
        </button>

        <button
          className={'tab ' + (view === 'roadmap' ? 'active' : '')}
          onClick={() => setView('roadmap')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'roadmap' ? 'var(--accent-soft)' : 'transparent', color: view === 'roadmap' ? 'var(--accent)' : 'inherit' }}
        >
          <GitBranch size={18} />
          <span style={{ fontWeight: 500 }}>01. Design</span>
          <InfoTooltip content="Define tu hipótesis de crecimiento. Estructura: 'Si hacemos [Acción], entonces veremos un cambio en [Métrica] porque [Razón estratégica]'. No lances experimentos sin una tesis clara." position="right" />
        </button>

        <button
          className={'tab ' + (view === 'table' ? 'active' : '')}
          onClick={() => setView('table')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'table' ? 'var(--accent-soft)' : 'transparent', color: view === 'table' ? 'var(--accent)' : 'inherit' }}
        >
          <TableIcon size={18} />
          <span style={{ fontWeight: 500 }}>02. Explore</span>
          <InfoTooltip content="Usa el framework ICE para decidir qué probar primero. Evalúa el Impacto potencial, la Confianza en que funcionará y la Facilidad (Ease) de ejecución. Prioriza lo que mueva la aguja con el menor esfuerzo." position="right" />
        </button>

        <button
          className={'tab ' + (view === 'board' ? 'active' : '')}
          onClick={() => setView('board')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'board' ? 'var(--accent-soft)' : 'transparent', color: view === 'board' ? 'var(--accent)' : 'inherit' }}
        >
          <LayoutDashboard size={18} />
          <span style={{ fontWeight: 500 }}>03. Be Agile</span>
          <InfoTooltip content="Este es tu motor de High-Tempo Testing. Mueve los experimentos de 'Builders' a 'Live Testers' rápidamente para generar datos reales. El objetivo es la velocidad de aprendizaje, no la perfección inicial." position="right" />
        </button>

        <button
          className={'tab ' + (view === 'library' ? 'active' : '')}
          onClick={() => setView('library')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'library' ? 'var(--accent-soft)' : 'transparent', color: view === 'library' ? 'var(--accent)' : 'inherit' }}
        >
          <Book size={18} />
          <span style={{ fontWeight: 500 }}>04. Learning</span>
          <InfoTooltip content="Cierra el Growth Loop. Documenta aquí si la hipótesis se validó o se rechazó. El aprendizaje es el activo más valioso; un experimento 'fallido' es un éxito si nos dice qué no hacer en el futuro." position="right" />
        </button>

        {/* Admin — top-level (cross-project), solo para superadmin */}
        {isSuperAdmin && (
          <>
            <div style={{ height: 1, background: '#E5E7EB', margin: '12px 4px' }} />
            <button
              onClick={() => setView('admin')}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#4F46E5',
                fontWeight: 600,
              }}
              title="Panel de Administración — gestión de usuarios, áreas y métricas globales"
            >
              <ShieldCheck size={18} />
              <span style={{ fontWeight: 600 }}>Administración</span>
            </button>
          </>
        )}

        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              width: '100%',
              cursor: 'pointer',
              color: '#6b7280',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'all 0.2s',
              marginBottom: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.color = '#4F46E5';
              e.currentTarget.style.background = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Settings size={16} />
            Settings
          </button>

          <button
            onClick={() => setIsMethodologyOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 12px',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              width: '100%',
              cursor: 'pointer',
              color: '#6b7280',
              fontWeight: 500,
              fontSize: '13px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.color = '#4F46E5';
              e.currentTarget.style.background = '#eff6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <HelpCircle size={16} />
            Methodology Guide
          </button>
        </div>
      </nav>

      <main className="main-content">
        <header className="header">
          <h2 style={{ fontSize: '18px' }}>
            {view === 'roadmap' && '01. Design'}
            {view === 'table' && '02. Explore'}
            {view === 'board' && '03. Be Agile'}
            {view === 'library' && '04. Learning'}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Search experiments..."
                style={{ paddingLeft: '36px', width: '240px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                title={profile?.full_name || profile?.email || ''}
              >
                {profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ME'}
              </div>
              {showUserMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowUserMenu(false)} />
                  <div style={{ position: 'absolute', top: '40px', right: 0, background: 'white', borderRadius: '8px', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '200px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{profile?.full_name || 'User'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{profile?.email}</div>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setIsProfileOpen(true); }}
                      style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <UserCircle size={14} />
                      Mi perfil
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); setIsSettingsOpen(true); }}
                      style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Settings size={14} />
                      Settings
                    </button>
                    <button
                      onClick={() => { setShowUserMenu(false); signOut(); }}
                      style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <LogOut size={14} />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Section Guide — Contextual guide for each view */}
        <div style={{ padding: '16px 24px 0 24px' }}>
          {view === 'roadmap' && <SectionGuide guideId="roadmap" />}
          {view === 'table' && <SectionGuide guideId="table" />}
          {view === 'board' && <SectionGuide guideId="board" />}
          {view === 'library' && <SectionGuide guideId="library" />}
        </div>

        {view === 'board' ? (
          <>
          {northStar && northStar.name && <NorthStarBar northStar={northStar} />}
          <div className="kanban-board">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {BOARD_COLUMNS.map(status => (
                <KanbanColumn
                  key={status}
                  status={status}
                  experiments={boardExperiments.filter(e => e.status === status)}
                  onClickExperiment={setSelectedExperiment}
                />
              ))}
              <DragOverlay>
                {activeId ? (
                  <ExperimentCard
                    experiment={experiments.find(e => e.id === activeId)!}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          </>
        ) : view === 'table' ? (
          <>
          {northStar && northStar.name && <NorthStarBar northStar={northStar} />}
          {strategyFilter && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', margin: '16px 32px 0', padding: '10px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: '#4338ca', fontWeight: 600 }}>
                Mostrando experimentos de la iniciativa: {strategies.find(s => s.id === strategyFilter)?.title || '—'}
              </span>
              <button
                onClick={() => setStrategyFilter(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#4F46E5', background: 'white', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer' }}
              >
                <X size={14} /> Quitar filtro
              </button>
            </div>
          )}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Title</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '8%' }}>Impact</th>
                  <th style={{ width: '8%' }}>Confidence</th>
                  <th style={{ width: '8%' }}>Ease</th>
                  <th
                    style={{
                      width: '12%',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => setIceSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      justifyContent: 'center'
                    }}>
                      ICE Score
                      <span style={{
                        fontSize: '10px',
                        opacity: 0.6
                      }}>
                        {iceSortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '15%' }}>Stage</th>
                </tr>
              </thead>
              <tbody>
                {tableExperiments.map(exp => {
                  const linkedStrategy = strategies.find(s => s.id === exp.linkedStrategyId);

                  return (
                    <tr key={exp.id} onClick={() => setSelectedExperiment(exp)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontWeight: 500 }}>{exp.title}</div>
                          {linkedStrategy && (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: '#eff6ff',
                              color: '#4F46E5',
                              fontWeight: 600,
                              width: 'fit-content'
                            }}>
                              <span style={{ fontSize: '10px' }}>⚡</span>
                              {linkedStrategy.title}
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {exp.northStarMetric}
                          </div>
                        </div>
                      </td>
                      <td>
                        <StatusChip
                          status={exp.status}
                          onChange={(newStatus) => handleStatusChangeAttempt(exp.id, newStatus)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                        {exp.impact}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                        {exp.confidence}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                        {exp.ease}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div
                          className={'ice-badge ' + (exp.iceScore >= 500 ? 'ice-high' : exp.iceScore >= 250 ? 'ice-medium' : 'ice-low')}
                          style={{
                            display: 'inline-block',
                            minWidth: '60px'
                          }}
                        >
                          {exp.iceScore}
                        </div>
                      </td>
                      <td>
                        <select
                          value={exp.funnelStage}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateFunnelStage(exp.id, e.target.value as FunnelStage);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            background: "white",
                            fontSize: "13px",
                            color: "var(--text-main)",
                            cursor: "pointer",
                            outline: "none",
                            width: '100%'
                          }}
                        >
                          {["Acquisition", "Activation", "Retention", "Referral", "Revenue"].map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        ) : view === 'library' ? (
          <div style={{ overflowY: 'auto', height: '100%' }}>
            {/* Library mode toggle: este proyecto vs biblioteca global.
                La pestaña "Biblioteca Global" solo se muestra a quien tiene acceso. */}
            <div style={{ display: 'flex', gap: '8px', padding: '24px 32px 0' }}>
              {(['project', 'global'] as const).filter(mode => mode === 'project' || canAccessGlobalLibrary).map(mode => (
                <button
                  key={mode}
                  onClick={() => setLibraryMode(mode)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    border: '1px solid ' + (libraryMode === mode ? '#4F46E5' : 'var(--border-subtle)'),
                    background: libraryMode === mode ? '#eef2ff' : 'white',
                    color: libraryMode === mode ? '#4F46E5' : 'var(--text-muted)',
                  }}
                >
                  {mode === 'project' ? 'Este Proyecto' : 'Biblioteca Global'}
                </button>
              ))}
            </div>
            {libraryMode === 'global' && canAccessGlobalLibrary ? (
              <GlobalLibraryView />
            ) : (
            <div style={{ padding: '0 32px 32px 32px' }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '16px', margin: '24px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
              {['All', 'Winners', 'Losers'].map(f => (
                <button
                  key={f}
                  onClick={() => setLibraryFilterResult(f as any)}
                  style={{
                    fontWeight: 600,
                    color: libraryFilterResult === f ? 'var(--accent)' : 'var(--text-muted)',
                    background: 'none', border: 'none'
                  }}
                >
                  {f}
                </button>
              ))}
              <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 8px' }}></div>
              {/* Stage Filter */}
              <select
                value={libraryFilterStage}
                onChange={e => setLibraryFilterStage(e.target.value)}
                style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontWeight: 600, outline: 'none' }}
              >
                <option value="All">All Stages</option>
                <option value="Acquisition">Acquisition</option>
                <option value="Activation">Activation</option>
                <option value="Retention">Retention</option>
                <option value="Referral">Referral</option>
                <option value="Revenue">Revenue</option>
              </select>
            </div>

            {libraryExperiments.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-subtle)' }}>
                <Book size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <h3>No finished experiments found</h3>
                <p>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', paddingBottom: '32px' }}>
                {libraryExperiments.map(exp => (
                  <LibraryCard
                    key={exp.id}
                    experiment={exp}
                    onClick={() => setSelectedCaseStudy(exp)}
                  />
                ))}
              </div>
            )}
            </div>
            )}
          </div>
        ) : view === 'roadmap' ? (
          <RoadmapView
            northStar={northStar}
            onUpdateNorthStar={handleUpdateNorthStar}
            objectives={objectives}
            strategies={strategies}
            experiments={experiments}
            onAddObjective={handleAddObjective}
            onAddStrategy={handleAddStrategy}
            onEditObjective={handleEditObjective}
            onEditStrategy={handleEditStrategy}
            onDeleteObjective={handleDeleteObjective}
            onDeleteStrategy={deleteStrategy}
            onSelectExperiment={setSelectedExperiment}
            onViewStrategyExperiments={(strategyId) => { setStrategyFilter(strategyId); setView('table'); }}
          />
        ) : (
          <div>Invalid view</div>
        )}
      </main>

      {selectedExperiment && !selectedCaseStudy && (
        <ExperimentDrawer
          experiment={selectedExperiment}
          onClose={() => setSelectedExperiment(null)}
          onStatusChange={handleStatusChangeAttempt}
          onIceUpdate={(field, val) => updateIceScore(selectedExperiment.id, field, val)}
          objectives={objectives}
          strategies={strategies}
          onExperimentUpdate={handleExperimentUpdate}
          onDelete={handleDeleteExperiment}
          teamMembers={teamMembers}
        />
      )}

      {selectedCaseStudy && (
        <CaseStudyModal
          experiment={selectedCaseStudy}
          onClose={() => setSelectedCaseStudy(null)}
          onUpdate={(updates) => handleExperimentUpdate(selectedCaseStudy.id, updates)}
          onEdit={() => {
            // Abre el drawer editable completo (hipótesis, métricas, aprendizajes, etc.).
            const exp = selectedCaseStudy;
            setSelectedCaseStudy(null);
            setSelectedExperiment(exp);
          }}
          onDelete={() => {
            if (window.confirm(`¿Eliminar el experimento "${selectedCaseStudy.title}"? Esta acción no se puede deshacer.`)) {
              handleDeleteExperiment(selectedCaseStudy.id);
              setSelectedCaseStudy(null);
            }
          }}
        />
      )}

      <ExperimentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={(data) => {
          handleCreateExperiment(data);
          setIsNewModalOpen(false);
        }}
        strategies={strategies}
        teamMembers={teamMembers}
      />

      <KeyLearningModal
        isOpen={isLearningModalOpen}
        onClose={() => setIsLearningModalOpen(false)}
        onSave={handleLearningSave}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <MethodologyToolkit
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSave={handleCreateProject}
      />

      <SettingsView
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        teamMembers={teamMembers}
        projects={projects}
        activeProject={activeProject}
        onAddMember={handleAddTeamMember}
        onRemoveMember={handleRemoveTeamMember}
        onUpdateMember={handleUpdateTeamMember}
        onUpdateProjectLogo={updateProjectLogo}
        onUpdateProjectPlatformLogo={updateProjectPlatformLogo}
        onUpdateProjectName={updateProjectName}
        onDeleteProject={handleDeleteProject}
        userId={profile?.id}
        userPanelLogoUrl={profile?.panel_logo_url ?? null}
        onUpdateUserPanelLogo={updatePanelLogo}
        userArea={profile?.area ?? null}
        onUpdateArea={updateArea}
        onSignOut={signOut}
      />

      <AreaPromptModal />
    </div>
  );
};

export default App;
