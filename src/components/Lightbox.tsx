import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';

/**
 * Lightbox — visor de imágenes / archivos en overlay.
 *
 * - Soporta navegación con flechas (←/→) y Escape para cerrar.
 * - Click en backdrop cierra.
 * - Click en imagen NO cierra (la imagen swallowea el evento).
 * - Para PDFs y otros archivos no-imagen, embebe con <iframe> con fallback
 *   a "abrir en nueva pestaña".
 */

export interface LightboxItem {
  src: string;
  /** Inferido si no se provee. */
  type?: 'image' | 'pdf' | 'other';
  caption?: string;
}

interface LightboxProps {
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}

const isImage = (src: string): boolean => {
  if (src.startsWith('data:image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i.test(src);
};

const isPdf = (src: string): boolean => {
  if (src.startsWith('data:application/pdf')) return true;
  return /\.pdf(\?|#|$)/i.test(src);
};

const inferType = (src: string): LightboxItem['type'] => {
  if (isImage(src)) return 'image';
  if (isPdf(src)) return 'pdf';
  return 'other';
};

export const Lightbox: React.FC<LightboxProps> = ({ items, index, onClose, onIndexChange }) => {
  const current = items[index];
  const total = items.length;
  const canPrev = total > 1;
  const canNext = total > 1;

  const goPrev = useCallback(() => {
    if (total === 0) return;
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange]);

  const goNext = useCallback(() => {
    if (total === 0) return;
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    // Bloquea scroll del body mientras el lightbox está abierto.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [goPrev, goNext, onClose]);

  if (!current) return null;
  const type = current.type ?? inferType(current.src);

  const overlay = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}
      >
        <X size={22} />
      </button>

      {/* Counter */}
      {total > 1 && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            left: 24,
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.1)',
            padding: '6px 12px',
            borderRadius: 99,
            backdropFilter: 'blur(8px)',
          }}
        >
          {index + 1} / {total}
        </div>
      )}

      {/* Prev */}
      {canPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Anterior"
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {type === 'image' ? (
          <img
            src={current.src}
            alt={current.caption || ''}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          />
        ) : type === 'pdf' ? (
          <iframe
            src={current.src}
            title={current.caption || 'PDF preview'}
            style={{
              width: '85vw',
              height: '80vh',
              border: 'none',
              borderRadius: 8,
              background: 'white',
            }}
          />
        ) : (
          <div
            style={{
              background: 'white',
              borderRadius: 12,
              padding: 32,
              maxWidth: 480,
              textAlign: 'center',
            }}
          >
            <p style={{ marginBottom: 16, color: '#374151', fontSize: 14 }}>
              No es posible previsualizar este archivo dentro de la app.
            </p>
            <a
              href={current.src}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: '#4F46E5',
                color: 'white',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={16} />
              Abrir en nueva pestaña
            </a>
          </div>
        )}

        {current.caption && (
          <div
            style={{
              color: 'white',
              fontSize: 13,
              maxWidth: '80vw',
              textAlign: 'center',
              opacity: 0.8,
            }}
          >
            {current.caption}
          </div>
        )}
      </div>

      {/* Next */}
      {canNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Siguiente"
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
};
