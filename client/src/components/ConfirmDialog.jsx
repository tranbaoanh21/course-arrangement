import { useEffect, useRef } from 'react';
import { AlertTriangle, LoaderCircle, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Xác nhận',
  loading = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll('button:not(:disabled)');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !loading && onCancel()}
    >
      <section
        ref={dialogRef}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className="flex items-start gap-4 px-5 py-5 sm:px-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
            <div id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">{children}</div>
          </div>
          <button className="icon-button -mr-2 -mt-2" disabled={loading} onClick={onCancel} aria-label="Đóng hộp thoại">
            <X size={18} />
          </button>
        </div>

        {error && <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 sm:mx-6">{error}</p>}

        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <button ref={cancelButtonRef} className="secondary-button" disabled={loading} onClick={onCancel}>Hủy</button>
          <button className="danger-button" disabled={loading} onClick={onConfirm}>
            {loading && <LoaderCircle className="animate-spin" size={16} />}
            {loading ? 'Đang xóa…' : confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
