import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card, StatCard } from "@/components/ui";
import { GoalSheetStatusBadge } from "@/components/StatusBadge";
import { NextActionCard } from "@/components/NextActionCard";
import { ProgressBar } from "@/components/ProgressBar";
import { EmployeeGoalDistributionChart } from "@/components/client/DashboardCharts";
import { percent, formatDate } from "@/lib/format";
import { getActiveWindow } from "@/lib/schedule";

export default async function EmployeeDashboard() {
  const user = await requireUser(["EMPLOYEE"]);
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });
  const sheet = cycle
    ? await prisma.goalSheet.findUnique({
        where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
        include: { goals: { include: { achievements: true } }, checkIns: true },
      })
    : null;

  const totalWeightage = sheet?.goals.reduce((sum, goal) => sum + goal.weightage, 0) ?? 0;
  const q1Updates = sheet?.goals.filter((goal) => goal.achievements.some((a) => a.quarter === "Q1" && a.status !== "NOT_STARTED")).length ?? 0;
  const goalDistribution = sheet?.goals.map((goal) => ({ name: goal.thrustArea.replace(" ", "\n"), value: goal.weightage })) ?? [];
  const currentStep = sheet?.isLocked ? 4 : sheet?.status === "SUBMITTED" ? 3 : sheet?.status === "RETURNED" ? 2 : sheet?.goals.length ? 1 : 0;
  const activeWindow = cycle ? getActiveWindow(cycle) : null;
  const nextAction = getEmployeeNextAction(sheet, totalWeightage, activeWindow?.openQuarter ?? null);

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Employee Dashboard</h1>
          <p className="mt-1 text-slate-500">Create your goal sheet, submit it for approval, then update quarterly achievement.</p>
        </div>
        <Badge tone="blue">{cycle?.name ?? "No active cycle"}</Badge>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Goal Sheet Status</p>
          <div className="mt-3"><GoalSheetStatusBadge status={sheet?.status} isLocked={sheet?.isLocked} /></div>
          <p className="mt-2 text-sm text-slate-500">{sheet?.isLocked ? "Locked after approval" : "Editable before submission"}</p>
        </Card>
        <StatCard label="Goals Added" value={`${sheet?.goals.length ?? 0}/8`} helper="Max 8 allowed" />
        <StatCard label="Weightage" value={percent(totalWeightage)} helper="Must equal 100%" />
        <StatCard label="Q1 Updates" value={`${q1Updates}/${sheet?.goals.length ?? 0}`} helper="Achievement capture" />
      </div>

      <div className="mt-6">
        <NextActionCard {...nextAction} />
      </div>

      <Card className="mt-6 card-hover">
        <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-center">
          <div>
            <h2 className="text-xl font-black">Workflow Progress</h2>
            <p className="mt-1 text-sm text-slate-500">A quick visual path from draft to quarterly tracking.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {["Draft", "Validated", "Submitted", "Locked"].map((step, index) => (
                <div key={step} className={index < currentStep ? "rounded-xl bg-emerald-50 p-3 text-sm font-black text-emerald-700" : "rounded-xl bg-slate-100 p-3 text-sm font-bold text-slate-500"}>{index + 1}. {step}</div>
              ))}
            </div>
          </div>
          <ProgressBar value={(currentStep / 4) * 100} label="Lifecycle completion" tone={currentStep === 4 ? "green" : "blue"} />
        </div>
      </Card>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <EmployeeGoalDistributionChart data={goalDistribution} />
        <Card>
          <h2 className="text-xl font-black">Goal workflow</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li><strong>1.</strong> Draft goals with thrust area, UoM, target, and weightage.</li>
            <li><strong>2.</strong> Submit only when total weightage is exactly 100%.</li>
            <li><strong>3.</strong> Manager approves or returns for rework.</li>
            <li><strong>4.</strong> Approved goals become locked.</li>
          </ol>
          <Link href="/employee/goals" className="button mt-5 inline-flex bg-slate-950 text-white">Open Goal Sheet</Link>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Current cycle windows</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between"><span>Goal Setting</span><strong>{formatDate(cycle?.goalSettingOpenDate)}</strong></div>
            <div className="flex justify-between"><span>Q1 Check-in</span><strong>{formatDate(cycle?.q1OpenDate)}</strong></div>
            <div className="flex justify-between"><span>Q2 Check-in</span><strong>{formatDate(cycle?.q2OpenDate)}</strong></div>
            <div className="flex justify-between"><span>Q3 Check-in</span><strong>{formatDate(cycle?.q3OpenDate)}</strong></div>
            <div className="flex justify-between"><span>Q4 / Annual</span><strong>{formatDate(cycle?.q4OpenDate)}</strong></div>
          </div>
          <Link href="/employee/checkins" className="button mt-5 inline-flex border border-slate-300 bg-white text-slate-900">Update Achievements</Link>
        </Card>
      </div>
    </Shell>
  );
}


function getEmployeeNextAction(sheet: any, totalWeightage: number, openQuarter: string | null) {
  if (!sheet) {
    return {
      title: "Start your goal sheet",
      body: "Create your first goal, assign a UoM and weightage, then continue until your total reaches exactly 100%.",
      href: "/employee/goals",
      action: "Create Goals",
      tone: "blue" as const,
    };
  }

  if (sheet.status === "RETURNED") {
    return {
      title: "Revise returned goals",
      body: sheet.returnedComment ?? "Your manager returned the sheet for rework. Update the goals and submit again during the goal-setting window.",
      href: "/employee/goals",
      action: "Review Feedback",
      tone: "amber" as const,
    };
  }

  if (!sheet.isLocked && sheet.status !== "SUBMITTED") {
    const remaining = 100 - totalWeightage;
    return {
      title: totalWeightage === 100 ? "Submit your goal sheet" : "Complete your weightage",
      body: totalWeightage === 100
        ? "Your weightage is exactly 100%. Submit the sheet so your manager can review and approve it."
        : `Your current weightage is ${totalWeightage}%. Adjust goals until it reaches exactly 100%. Remaining: ${remaining}%.`,
      href: "/employee/goals",
      action: totalWeightage === 100 ? "Submit Goals" : "Open Goal Builder",
      tone: totalWeightage === 100 ? "green" as const : "blue" as const,
    };
  }

  if (sheet.status === "SUBMITTED") {
    return {
      title: "Waiting for manager approval",
      body: "Your sheet is submitted. Your manager can edit targets or weightage inline, then approve or return it for rework.",
      href: "/employee/goals",
      action: "View Submitted Sheet",
      tone: "blue" as const,
    };
  }

  if (sheet.isLocked && openQuarter) {
    return {
      title: `${openQuarter} achievement capture is active`,
      body: "Your goals are approved and locked. Enter actual achievement for the currently open quarter.",
      href: "/employee/checkins",
      action: "Update Achievements",
      tone: "green" as const,
    };
  }

  return {
    title: "Your goals are approved",
    body: "The goal sheet is locked. You can view it now, and achievement entry will open when the next quarterly window starts.",
    href: "/employee/checkins",
    action: "View Quarterly Updates",
    tone: "purple" as const,
  };
}
