import Link from "next/link";
import { User } from "@prisma/client";
import { Role } from "@/lib/domain";
import { logoutAction } from "@/app/actions";
import { NavLink } from "@/components/ui";

export function Shell({ user, children }: { user: User; children: React.ReactNode }) {
  const nav = navigationForRole(user.role as Role);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <Link href={nav[0]?.href ?? "/"} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-white">AQ</div>
            <div>
              <p className="font-black leading-none text-slate-950">AtomQuest Goal Portal</p>
              <p className="text-xs font-semibold text-slate-500">{user.name} · {prettyRole(user.role as Role)}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <NavLink href={item.href} key={item.href}>{item.label}</NavLink>
            ))}
            <NavLink href="/demo">Demo Guide</NavLink>
          </nav>

          <form action={logoutAction}>
            <button className="border border-slate-300 bg-white text-slate-700">Logout</button>
          </form>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-5 py-2 md:hidden">
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto text-sm">
          {nav.map((item) => (
            <NavLink href={item.href} key={item.href}>{item.label}</NavLink>
          ))}
          <NavLink href="/demo">Demo Guide</NavLink>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8">{children}</div>
    </main>
  );
}

function prettyRole(role: Role) {
  if (role === "ADMIN") return "Admin / HR";
  if (role === "MANAGER") return "Manager L1";
  return "Employee";
}

function navigationForRole(role: Role) {
  if (role === "EMPLOYEE") {
    return [
      { href: "/employee", label: "Dashboard" },
      { href: "/employee/goals", label: "My Goals" },
      { href: "/employee/checkins", label: "Quarterly Updates" },
    ];
  }

  if (role === "MANAGER") {
    return [
      { href: "/manager", label: "Dashboard" },
      { href: "/manager/team", label: "Team Approvals" },
    ];
  }

  return [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/cycles", label: "Cycle Management" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/audit", label: "Audit Logs" },
  ];
}
