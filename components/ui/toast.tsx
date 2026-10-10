"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface Toast {
  id: number;
  text: string;
  link?: { href: string; label: string };
}

const ToastContext = createContext<(text: string, link?: Toast["link"]) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, link?: Toast["link"]) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, text, link }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="border border-ink bg-white px-3 py-2 text-sm shadow-[0_1px_0_#E9ECEF] max-w-sm"
          >
            <span>{t.text}</span>
            {t.link && (
              <a href={t.link.href} className="ml-2 text-slate underline">
                {t.link.label}
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
