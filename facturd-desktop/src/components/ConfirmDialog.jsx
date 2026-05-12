import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Eliminar', cancelText = 'Cancelar', variant = 'danger' }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const btnClass = variant === 'danger'
    ? 'bg-error text-on-error hover:bg-error/90'
    : 'bg-primary text-on-primary hover:bg-primary/90';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]" onClick={onCancel}>
      <div className="bg-surface rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-headline text-xl font-bold text-on-surface mb-3">{title}</h3>
        <p className="text-on-surface-variant mb-8 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest transition-all"
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${btnClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
