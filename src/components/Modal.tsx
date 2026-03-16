import React, { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal__overlay" ref={overlayRef} onClick={(e) => {
      if (e.target === overlayRef.current) onClose();
    }}>
      <div className={`modal__content ${wide ? 'modal__content--wide' : ''}`}>
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
