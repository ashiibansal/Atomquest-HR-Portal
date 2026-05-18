import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loginAction, quickLoginAction } from "@/app/actions";
import { Card, PrimaryButton, SecondaryButton, Badge } from "@/components/ui";
import { DemoFlow } from "@/components/DemoFlow";

export default async function Home({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),#f8fafc] px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              <Badge tone="blue">AtomQuest Hackathon 1.0</Badge>
              <Badge tone="green">Submission-ready demo</Badge>
            </div>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-slate-950 md:text-6xl">
              Goal Setting & Tracking Portal
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              A role-based HR portal for goal creation, L1 approval, locked goal sheets, quarterly achievement updates, manager check-ins, audit logs, dashboards, cycle windows, and CSV reports.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Card className="card-hover">
                <p className="text-3xl font-black">100%</p>
                <p className="text-sm font-semibold text-slate-500">Weightage validation</p>
              </Card>
              <Card className="card-hover">
                <p className="text-3xl font-black">8</p>
                <p className="text-sm font-semibold text-slate-500">Max goals per employee</p>
              </Card>
              <Card className="card-hover">
                <p className="text-3xl font-black">3</p>
                <p className="text-sm font-semibold text-slate-500">Role journeys</p>
              </Card>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/demo" className="button bg-slate-950 text-white">Open Demo Guide</Link>
              <a href="#login" className="button border border-slate-300 bg-white text-slate-900">Use Demo Login</a>
            </div>
          </section>

          <Card id="login" className="self-start">
            <h2 className="text-2xl font-black">Login</h2>
            <p className="mt-1 text-sm text-slate-500">Use <strong>Demo1234</strong> for all seeded users, or quick-switch role below.</p>

            {params?.error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{params.error}</p> : null}

            <form action={loginAction} className="mt-5 space-y-4">
              <div>
                <label>Email</label>
                <input name="email" type="email" defaultValue="employee@demo.com" required />
              </div>
              <div>
                <label>Password</label>
                <input name="password" type="password" defaultValue="Demo1234" required />
              </div>
              <PrimaryButton className="w-full">Login securely</PrimaryButton>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="mb-3 text-sm font-bold text-slate-600">One-click role switch for judges:</p>
              <div className="grid gap-3">
                {users.map((user) => (
                  <form action={quickLoginAction} key={user.id}>
                    <input type="hidden" name="email" value={user.email} />
                    <SecondaryButton className="flex w-full items-center justify-between">
                      <span>{user.name}</span>
                      <Badge tone={user.role === "ADMIN" ? "purple" : user.role === "MANAGER" ? "blue" : "green"}>{user.role}</Badge>
                    </SecondaryButton>
                  </form>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Recommended demo flow</h2>
              <p className="mt-1 text-sm text-slate-500">This is the fastest way to test the full employee → manager → admin journey.</p>
            </div>
            <Link href="/demo" className="text-sm font-black text-blue-700 hover:underline">View detailed guide →</Link>
          </div>
          <DemoFlow />
        </section>

        <footer className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          <strong className="text-slate-900">Built for AtomQuest Hackathon 1.0.</strong> Stack: Next.js, Prisma, Tailwind CSS, server actions, audit logs, and CSV reporting.
        </footer>
      </div>
    </main>
  );
}
