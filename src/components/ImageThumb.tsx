import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { Lightbox, type LightboxItem } from './Lightbox';

/**
 * ImageThumb — miniatura con hover (scale + sombra) que abre Lightbox al click.
 *
 * - Si el item NO es imagen (ej. PDF), muestra un placeholder con ícono y
 *   sigue abriendo el Lightbox (que decide si embebe o abre en pestaña).
 * - Para mostrar varias imágenes navegables, pásalas todas vía `gallery` con
 *   el índice de la imagen actual; el Lightbox permitirá ir/volver entre todas.
 */

interface ImageThumbProps {
  src: string;
  alt?: string;
  size?: number;            // Tamaño cuadrado en px (default 96)
  /** Si se pasa, el lightbox navega entre todas las imágenes. */
  gallery?: LightboxItem[];
  /** Índice de `src` dentro de `gallery`. Default 0. */
  galleryIndex?: number;
  rounded?: number;
  /** Renderiza estilo "cover" o "contain". Default cover. */
  fit?: 'cover' | 'contain';
  /** Estilo extra (override) */
  style?: React.CSSProperties;
  /** Caption opcional. */
  caption?: string;
}

const isImage = (src: string): boolean => {
  if (src.startsWith('data:image/')) return true;
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?|#|$)/i.test(src);
};

export const ImageThumb: React.FC<ImageThumbProps> = ({
  src,
  alt = '',
  size = 96,
  gallery,
  galleryIndex = 0,
  rounded = 8,
  fit = 'cover',
  style,
  caption,
}) => {
  const [open, setOpen] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(galleryIndex);
  const [hovered, setHovered] = useState(false);

  const items: LightboxItem[] = gallery ?? [{ src, caption }];
  const isImg = isImage(src);

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: rounded,
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    cursor: 'zoom-in',
    background: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    transform: hovered ? 'scale(1.04)' : 'scale(1)',
    boxShadow: hovered ? '0 8px 20px rgba(0,0,0,0.12)' : 'none',
    flexShrink: 0,
    ...style,
  };

  return (
    <>
      <div
        onClick={() => { setCurrentIdx(galleryIndex); setOpen(true); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={baseStyle}
        title={alt || caption || 'Ver'}
      >
        {isImg ? (
          <img
            src={src}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: fit }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#6b7280' }}>
            <FileText size={Math.max(20, size * 0.32)} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>Archivo</span>
          </div>
        )}
      </div>
      {open && (
        <Lightbox
          items={items}
          index={currentIdx}
          onIndexChange={setCurrentIdx}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};
