import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card } from "@/components/ui";
import { AchievementEditor } from "@/components/client/AchievementEditor";
import { ToastFromQuery } from "@/components/client/ToastFromQuery";
import { getActiveWindow, getOpenQuarter, getQuarterAvailability } from "@/lib/schedule";

export default async function EmployeeCheckins({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const user = await requireUser(["EMPLOYEE"]);
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });
  const sheet = cycle
    ? await prisma.goalSheet.findUnique({
        where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
        include: { goals: { include: { achievements: true, sharedGoal: true } }, checkIns: true },
      })
    : null;
  const activeWindow = cycle ? getActiveWindow(cycle) : null;
  const openQuarter = cycle ? getOpenQuarter(cycle) : null;
  const quarterAvailability = cycle ? getQuarterAvailability(cycle) : [];

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Quarterly Achievement Updates</h1>
          <p className="mt-1 text-slate-500">Enter actual achievement and status after your manager has approved the goal sheet.</p>
        </div>
        <Badge tone={sheet?.isLocked ? "green" : "yellow"}>{sheet?.isLocked ? "Approved / Locked" : "Awaiting approval"}</Badge>
      </div>

      <ToastFromQuery error={params?.error} success={params?.success} />

      <Card className="mt-6 border-l-4 border-l-blue-500">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Active capture window</h2>
            <p className="mt-1 text-sm text-slate-600">{activeWindow?.description ?? "No active cycle configured."}</p>
          </div>
          <Badge tone={activeWindow?.achievementOpen ? "green" : "yellow"}>{activeWindow?.label ?? "No cycle"}</Badge>
        </div>
        <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-4">
          {quarterAvailability.map((item) => (
            <div key={item.quarter} className={item.isOpen ? "rounded-xl bg-emerald-50 p-3 text-emerald-700" : "rounded-xl bg-slate-100 p-3 text-slate-500"}>
              <p className="font-black">{item.quarter}{item.isOpen ? " · Open" : ""}</p>
              <p>{item.range}</p>
            </div>
          ))}
        </div>
      </Card>

      {!sheet?.isLocked ? (
        <Card className="mt-6">
          <h2 className="text-xl font-black">Approval needed first</h2>
          <p className="mt-2 text-slate-600">Quarterly updates open after the manager approves and locks your goal sheet.</p>
        </Card>
      ) : null}

      {sheet?.isLocked && !openQuarter ? (
        <Card className="mt-6 border-l-4 border-l-amber-500">
          <h2 className="text-xl font-black">Achievement capture is closed</h2>
          <p className="mt-2 text-slate-600">You can view existing achievements, but saving is disabled until the next configured check-in window opens.</p>
        </Card>
      ) : null}

      <div className="mt-6 space-y-5">
        {sheet?.goals.map((goal) => (
          <AchievementEditor
            key={goal.id}
            locked={Boolean(sheet.isLocked)}
            goal={{
              id: goal.id,
              title: goal.title,
              description: goal.description,
              thrustArea: goal.thrustArea,
              uomType: goal.uomType as "NUMERIC_MIN" | "NUMERIC_MAX" | "PERCENT_MIN" | "PERCENT_MAX" | "TIMELINE" | "ZERO",
              targetValue: goal.targetValue,
              targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
              weightage: goal.weightage,
              isShared: goal.isShared,
              achievements: goal.achievements.map((achievement) => ({
                quarter: achievement.quarter as "Q1" | "Q2" | "Q3" | "Q4",
                actualValue: achievement.actualValue,
                completionDate: achievement.completionDate ? achievement.completionDate.toISOString().slice(0, 10) : null,
                status: achievement.status as "NOT_STARTED" | "ON_TRACK" | "COMPLETED",
                progressScore: achievement.progressScore,
                employeeComment: achievement.employeeComment,
              })),
            }}
            openQuarter={openQuarter}
          />
        ))}
      </div>
    </Shell>
  );
}
