import { useEffect } from "react";

export interface ToastData {
  id: string;
  level: "ok" | "error" | "info";
  msg: string;
}

interface Props {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`
        pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border
        font-mono text-xs animate-slide-up shadow-lg
        ${toast.level === "ok"
          ? "bg-gp-surface border-gp-green/30 text-gp-green"
          : toast.level === "error"
          ? "bg-gp-surface border-red-900/40 text-red-400"
          : "bg-gp-surface border-gp-border-2 text-gp-ghost-dim"
        }
      `}
    >
      <span>{toast.level === "ok" ? "✓" : toast.level === "error" ? "✗" : "·"}</span>
      <span>{toast.msg}</span>
      <button onClick={() => onDismiss(toast.id)} className="ml-2 opacity-40 hover:opacity-70">✕</button>
    </div>
  );
}

// Hook for managing toasts
import { useState, useCallback } from "react";

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const push = useCallback((level: ToastData["level"], msg: string) => {
    const id = crypto.randomUUID();
    setToasts((p) => [...p, { id, level, msg }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  return { toasts, push, dismiss };
}
