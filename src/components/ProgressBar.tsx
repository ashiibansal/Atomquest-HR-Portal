import { clsx } from "clsx";

export function ProgressBar({ value, label, tone = "blue" }: { value: number; label?: string; tone?: "blue" | "green" | "amber" | "rose" | "purple" }) {
  const safe = Math.max(0, Math.min(Number.isFinite(value) ? value : 0, 100));
  const colors = {
    blue: "bg-blue-600",
    green: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-600",
    purple: "bg-purple-600",
  }[tone];

  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>{label}</span>
          <span>{safe.toFixed(0)}%</span>
        </div>
      ) : null}
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={clsx("h-full rounded-full transition-all duration-500", colors)} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}
