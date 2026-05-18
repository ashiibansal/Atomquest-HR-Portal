import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { StatCard } from "@/components/ui";
import { NextActionCard } from "@/components/NextActionCard";
import { ManagerSheetsExplorer } from "@/components/client/DashboardCharts";
import { ToastFromQuery } from "@/components/client/ToastFromQuery";
import { formatDateTime, percent } from "@/lib/format";
import { getActiveWindow } from "@/lib/schedule";

export default async function ManagerDashboard({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const user = await requireUser(["MANAGER"]);
  const directReports = await prisma.user.findMany({
    where: { managerId: user.id },
    include: { goalSheets: { include: { goals: true, checkIns: true, cycle: true } } },
    orderBy: { name: "asc" },
  });

  const sheets = directReports.flatMap((employee) => employee.goalSheets.map((sheet) => ({ ...sheet, employee })));
  const pendingApprovals = sheets.filter((sheet) => sheet.status === "SUBMITTED").length;
  const locked = sheets.filter((sheet) => sheet.isLocked).length;
  const q1CheckIns = sheets.filter((sheet) => sheet.checkIns.some((c) => c.quarter === "Q1")).length;
  const completion = sheets.length ? (q1CheckIns / sheets.length) * 100 : 0;
  const activeCycle = sheets[0]?.cycle;
  const activeWindow = activeCycle ? getActiveWindow(activeCycle) : null;
  const nextAction = pendingApprovals > 0
    ? { title: `Review ${pendingApprovals} pending goal sheet${pendingApprovals === 1 ? "" : "s"}`, body: "Submitted goal sheets are waiting for L1 approval. Open the team table, review targets and weightage, then approve or return for rework.", href: "/manager", action: "Review Pending Sheets", tone: "blue" as const }
    : activeWindow?.openQuarter
      ? { title: `${activeWindow.openQuarter} check-ins are active`, body: "Approved sheets can now be reviewed for planned versus actual achievement. Add structured manager comments before the window closes.", href: "/manager", action: "Open Check-ins", tone: "green" as const }
      : { title: "Team workflow is stable", body: "There are no pending approvals right now. Use the team explorer to monitor locked sheets and upcoming check-in windows.", href: "/manager/team", action: "View Team", tone: "purple" as const };
  const explorerRows = sheets.map((sheet) => ({
    id: sheet.id,
    employee: sheet.employee.name,
    department: sheet.employee.department ?? "—",
    status: sheet.status,
    isLocked: sheet.isLocked,
    goals: sheet.goals.length,
    submittedAt: formatDateTime(sheet.submittedAt),
    approvalUrl: sheet.status === "SUBMITTED" ? `/manager/approvals/${sheet.id}` : undefined,
    checkinUrl: sheet.isLocked ? `/manager/checkins/${sheet.id}` : undefined,
  }));

  return (
    <Shell user={user}>
      <div>
        <h1 className="text-3xl font-black">Manager Dashboard</h1>
        <p className="mt-1 text-slate-500">Review submitted goal sheets, approve or return them, and complete quarterly check-ins.</p>
      </div>

      <ToastFromQuery error={params?.error} success={params?.success} />

      <div className="mt-6">
        <NextActionCard {...nextAction} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Direct Reports" value={directReports.length} helper="Employees mapped to you" />
        <StatCard label="Pending Approvals" value={pendingApprovals} helper="Submitted sheets" />
        <StatCard label="Locked Sheets" value={locked} helper="Approved sheets" />
        <StatCard label="Q1 Check-ins" value={percent(completion)} helper="Completed by manager" />
      </div>

      <ManagerSheetsExplorer sheets={explorerRows} />
    </Shell>
  );
}
