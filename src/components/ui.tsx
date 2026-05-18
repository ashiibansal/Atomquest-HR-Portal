import Link from "next/link";
import { clsx } from "clsx";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded-2xl border border-slate-200 bg-white p-5 shadow-soft", className)}>{children}</section>;
}

export function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
    </Card>
  );
}

export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "blue" | "yellow" | "red" | "purple" }) {
  const classes = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-700",
    purple: "bg-purple-100 text-purple-700",
  }[tone];

  return <span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-bold", classes)}>{children}</span>;
}

export function PrimaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={clsx("bg-slate-950 text-white disabled:cursor-not-allowed disabled:opacity-40", className)}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={clsx("border border-slate-300 bg-white text-slate-900", className)}>
      {children}
    </button>
  );
}

export function DangerButton({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={clsx("bg-rose-600 text-white", className)}>
      {children}
    </button>
  );
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950">
      {children}
    </Link>
  );
}
