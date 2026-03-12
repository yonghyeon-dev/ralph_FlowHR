"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "danger" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (_toast: Omit<Toast, "id">) => void;
  removeToast: (_id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let toastCounter = 0;

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-status-success-border bg-status-success-bg text-status-success-text",
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-text",
  warning: "border-status-warning-border bg-status-warning-bg text-status-warning-text",
  info: "border-status-info-border bg-status-info-bg text-status-info-text",
};

const iconPaths: Record<ToastVariant, string> = {
  success: "M5 13l4 4L19 7",
  danger: "M6 18L18 6M6 6l12 12",
  warning: "M12 9v4m0 4h.01M12 3l9.5 16.5H2.5L12 3z",
  info: "M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z",
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (_id: string) => void;
}) {
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div
      role="alert"
      className={[
        "flex items-center gap-sp-3 rounded-md border px-sp-4 py-sp-3 shadow-md",
        "animate-slide-in-up",
        variantStyles[toast.variant],
      ].join(" ")}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d={iconPaths[toast.variant]} />
      </svg>
      <span className="flex-1 text-sm">{toast.message}</span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100"
        aria-label="알림 닫기"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="2" x2="12" y2="12" />
          <line x1="12" y1="2" x2="2" y2="12" />
        </svg>
      </button>
    </div>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (_id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-sp-6 right-sp-6 z-[300] flex flex-col gap-sp-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

export { ToastProvider, useToast };
export type { Toast, ToastVariant, ToastContextValue };
