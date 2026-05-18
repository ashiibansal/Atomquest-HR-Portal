import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card, PrimaryButton } from "@/components/ui";
import { NextActionCard } from "@/components/NextActionCard";
import { AdminCharts } from "@/components/client/DashboardCharts";
import { AdminSheetsExplorer } from "@/components/client/AdminSheetsExplorer";
import { ToastFromQuery } from "@/components/client/ToastFromQuery";
import { createSharedGoalAction } from "@/app/actions";
import { formatDateTime, percent } from "@/lib/format";
import { getActiveWindow } from "@/lib/schedule";

export default async function AdminDashboard({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const user = await requireUser(["ADMIN"]);
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });
  const employees = await prisma.user.findMany({ where: { role: "EMPLOYEE" }, include: { manager: true } });
  const managers = await prisma.user.findMany({ where: { role: "MANAGER" } });
  const sheets = await prisma.goalSheet.findMany({
    include: { employee: { include: { manager: true } }, goals: true, checkIns: true, cycle: true },
    orderBy: { updatedAt: "desc" },
  });

  const submittedOrLocked = sheets.filter((sheet) => ["SUBMITTED", "LOCKED", "APPROVED"].includes(sheet.status)).length;
  const approved = sheets.filter((sheet) => sheet.isLocked).length;
  const q1CheckIns = sheets.filter((sheet) => sheet.checkIns.some((c) => c.quarter === "Q1")).length;
  const statusData = ["DRAFT", "SUBMITTED", "RETURNED", "LOCKED"].map((status) => ({
    name: status,
    value: sheets.filter((sheet) => sheet.status === status).length,
  })).filter((item) => item.value > 0);
  const departmentData = Array.from(new Set(employees.map((employee) => employee.department ?? "Unknown"))).map((department) => ({
    name: department,
    value: sheets.filter((sheet) => sheet.employee.department === department).length,
  }));
  const activeWindow = cycle ? getActiveWindow(cycle) : null;
  const nextAction = cycle
    ? { title: `${activeWindow?.label ?? "Cycle"} is current`, body: activeWindow?.description ?? "Cycle windows are configured. Use Cycle Management to adjust dates for demo or production readiness.", href: "/admin/cycles", action: "Manage Cycle Windows", tone: "purple" as const }
    : { title: "Create an active cycle", body: "No active cycle exists. Create and activate a cycle before employees create goals.", href: "/admin/cycles", action: "Create Cycle", tone: "amber" as const };
  const explorerRows = sheets.map((sheet) => ({
    id: sheet.id,
    employee: sheet.employee.name,
    department: sheet.employee.department ?? "—",
    manager: sheet.employee.manager?.name ?? "—",
    cycle: sheet.cycle.name,
    status: sheet.status,
    isLocked: sheet.isLocked,
    goals: sheet.goals.length,
    updatedAt: formatDateTime(sheet.updatedAt),
  }));

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Admin / HR Dashboard</h1>
          <p className="mt-1 text-slate-500">Monitor completion, unlock exceptions, create shared goals, and export reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/cycles" className="button border border-slate-300 bg-white text-slate-900">Manage Cycles</Link>
          <Badge tone="purple">{cycle?.name ?? "No active cycle"}</Badge>
        </div>
      </div>

      <ToastFromQuery error={params?.error} success={params?.success} />

      <div className="mt-6">
        <NextActionCard {...nextAction} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card><p className="text-sm font-semibold text-slate-500">Goal submission</p><p className="mt-2 text-3xl font-black">{percent(employees.length ? (submittedOrLocked / employees.length) * 100 : 0)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Approval completion</p><p className="mt-2 text-3xl font-black">{percent(employees.length ? (approved / employees.length) * 100 : 0)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Q1 check-ins</p><p className="mt-2 text-3xl font-black">{percent(employees.length ? (q1CheckIns / employees.length) * 100 : 0)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Managers</p><p className="mt-2 text-3xl font-black">{managers.length}</p></Card>
      </div>

      <div className="mt-6"><AdminCharts statusData={statusData.length ? statusData : [{ name: "No sheets", value: 1 }]} departmentData={departmentData} /></div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
        <AdminSheetsExplorer sheets={explorerRows} />

        <Card>
          <h2 className="text-xl font-black">Create Shared Departmental KPI</h2>
          <p className="mt-1 text-sm text-slate-500">Pushed to all employees in the selected department. Recipients can adjust weightage only.</p>
          <form action={createSharedGoalAction} className="mt-5 space-y-4">
            <div>
              <label>Department</label>
              <select name="department" defaultValue="Operations">
                <option value="Operations">Operations</option>
                <option value="HR">HR</option>
              </select>
            </div>
            <div>
              <label>Primary Owner</label>
              <select name="primaryOwnerId" required>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </div>
            <div>
              <label>Thrust Area</label>
              <input name="thrustArea" defaultValue="Customer Excellence" required />
            </div>
            <div>
              <label>Goal Title</label>
              <input name="title" placeholder="Reduce escalated customer complaints" required />
            </div>
            <div>
              <label>Description</label>
              <textarea name="description" rows={3} required />
            </div>
            <div>
              <label>UoM Type</label>
              <select name="uomType" required>
                <option value="NUMERIC_MIN">Numeric Min</option>
                <option value="NUMERIC_MAX">Numeric Max</option>
                <option value="PERCENT_MIN">Percent Min</option>
                <option value="PERCENT_MAX">Percent Max</option>
                <option value="TIMELINE">Timeline</option>
                <option value="ZERO">Zero</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label>Target Value</label><input name="targetValue" type="number" step="0.01" /></div>
              <div><label>Target Date</label><input name="targetDate" type="date" /></div>
            </div>
            <PrimaryButton className="w-full">Push Shared KPI</PrimaryButton>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
