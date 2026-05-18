"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

export function ToastFromQuery({ error, success }: { error?: string; success?: string }) {
  const message = error || success;
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const timer = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;

  return (
    <div className="fixed right-5 top-20 z-50 max-w-md animate-slide-in">
      <div className={clsx("rounded-2xl border p-4 text-sm font-bold shadow-soft", error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
        <div className="flex items-start gap-3">
          <span className="text-lg">{error ? "⚠️" : "✅"}</span>
          <p>{message}</p>
          <button type="button" onClick={() => setVisible(false)} className="ml-auto -m-2 rounded-lg px-2 py-1 text-xs hover:bg-white/70">×</button>
        </div>
      </div>
    </div>
  );
}
