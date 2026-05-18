import Link from "next/link";
import { Card, Badge } from "@/components/ui";
import { DemoFlow } from "@/components/DemoFlow";

export default function DemoGuidePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),#f8fafc] px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge tone="blue">Submission Demo Guide</Badge>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">How to evaluate the portal</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Use this page as the judge-facing walkthrough. It shows the exact path for Employee, Manager, and Admin without needing to read the README first.
            </p>
          </div>
          <Link href="/" className="button border border-slate-300 bg-white text-slate-900">Back to Login</Link>
        </div>

        <section className="mt-8">
          <DemoFlow />
        </section>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_360px]">
          <Card>
            <h2 className="text-2xl font-black">Recommended live demo sequence</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <p><strong>1. Employee:</strong> Create goals with thrust area, UoM, target, and weightage. Submit only when total weightage is exactly 100%.</p>
              <p><strong>2. Manager:</strong> Review submitted goals, edit target or weightage inline, then approve and lock the sheet.</p>
              <p><strong>3. Employee:</strong> Open Quarterly Updates. The app allows achievement capture only for the active quarter configured by Admin.</p>
              <p><strong>4. Manager:</strong> Compare planned target against actual achievement and save a structured check-in comment.</p>
              <p><strong>5. Admin:</strong> Configure cycle dates, monitor completion, unlock exceptions, view audit logs, and export CSV reports.</p>
            </div>
          </Card>

          <Card className="bg-slate-950 text-white">
            <h2 className="text-xl font-black">Demo Credentials</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div><p className="font-black">Employee</p><p className="text-slate-300">employee@demo.com</p></div>
              <div><p className="font-black">Manager</p><p className="text-slate-300">manager@demo.com</p></div>
              <div><p className="font-black">Admin</p><p className="text-slate-300">admin@demo.com</p></div>
              <div className="rounded-xl bg-white/10 p-3"><p className="text-slate-300">Password for all users - Demo1234</p></div>
            </div>
          </Card>
        </div>

        <footer className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          <strong className="text-slate-900">Built for AtomQuest Hackathon 1.0.</strong> Stack: Next.js, Prisma, PostgreSQL-ready schema, Tailwind CSS, role-based dashboards, audit logs, and CSV export.
        </footer>
      </div>
    </main>
  );
}
