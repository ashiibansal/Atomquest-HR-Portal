import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card, PrimaryButton } from "@/components/ui";
import { ToastFromQuery } from "@/components/client/ToastFromQuery";
import { ProgressBar } from "@/components/ProgressBar";
import { addCheckInAction } from "@/app/actions";
import { currencyLike, formatDate, percent } from "@/lib/format";
import { weightedScore } from "@/lib/scoring";
import { getActiveWindow, getOpenQuarter, getQuarterAvailability } from "@/lib/schedule";

const quarters = ["Q1", "Q2", "Q3", "Q4"] as const;

export default async function ManagerCheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ sheetId: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { sheetId } = await params;
  const query = await searchParams;
  const user = await requireUser(["MANAGER"]);

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: {
      employee: true,
      cycle: true,
      checkIns: { orderBy: { createdAt: "desc" } },
      goals: { orderBy: { createdAt: "asc" }, include: { achievements: true } },
    },
  });

  if (!sheet || sheet.employee.managerId !== user.id) notFound();
  const activeWindow = getActiveWindow(sheet.cycle);
  const openQuarter = getOpenQuarter(sheet.cycle);
  const quarterAvailability = getQuarterAvailability(sheet.cycle);

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Quarterly Check-in</h1>
          <p className="mt-1 text-slate-500">{sheet.employee.name} · planned vs actual achievement review</p>
        </div>
        <Badge tone="green">{sheet.status}</Badge>
      </div>

      <ToastFromQuery error={query?.error} success={query?.success} />

      <Card className="mt-6 border-l-4 border-l-blue-500">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Active manager check-in window</h2>
            <p className="mt-1 text-sm text-slate-600">{activeWindow.description}</p>
          </div>
          <Badge tone={activeWindow.achievementOpen ? "green" : "yellow"}>{activeWindow.label}</Badge>
        </div>
        <div className="mt-4 grid gap-2 text-xs font-semibold sm:grid-cols-4">
          {quarterAvailability.map((item) => (
            <div key={item.quarter} className={item.isOpen ? "rounded-xl bg-emerald-50 p-3 text-emerald-700" : "rounded-xl bg-slate-100 p-3 text-slate-500"}>
              <p className="font-black">{item.quarter}{item.isOpen ? " · Open" : ""}</p>
              <p>{item.range}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-black">Planned vs Actual</h2>
          <p className="text-sm text-slate-500">Scores are for tracking only, not ratings.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="table-cell">Goal</th>
                <th className="table-cell">Target</th>
                <th className="table-cell">Quarter</th>
                <th className="table-cell">Actual</th>
                <th className="table-cell">Status</th>
                <th className="table-cell">Score</th>
                <th className="table-cell">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {sheet.goals.flatMap((goal) =>
                quarters.map((quarter) => {
                  const achievement = goal.achievements.find((a) => a.quarter === quarter);
                  return (
                    <tr key={`${goal.id}-${quarter}`} className="hover:bg-slate-50">
                      <td className="table-cell"><strong>{goal.title}</strong><p className="text-xs text-slate-500">{goal.thrustArea} · {goal.uomType}</p></td>
                      <td className="table-cell">{goal.uomType === "TIMELINE" ? formatDate(goal.targetDate) : currencyLike(goal.targetValue)}</td>
                      <td className="table-cell"><Badge>{quarter}</Badge></td>
                      <td className="table-cell">{goal.uomType === "TIMELINE" ? formatDate(achievement?.completionDate) : currencyLike(achievement?.actualValue)}</td>
                      <td className="table-cell">{achievement?.status ?? "NOT_STARTED"}</td>
                      <td className="table-cell"><ProgressBar value={achievement?.progressScore ?? 0} label={percent(achievement?.progressScore)} tone={(achievement?.progressScore ?? 0) >= 90 ? "green" : "blue"} /></td>
                      <td className="table-cell">{weightedScore(achievement?.progressScore ?? 0, goal.weightage).toFixed(1)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-xl font-black">Add check-in comment</h2>
          <form action={addCheckInAction} className="mt-4 space-y-4">
            <input type="hidden" name="sheetId" value={sheet.id} />
            <input type="hidden" name="employeeId" value={sheet.employeeId} />
            <div>
              <label>Quarter</label>
              <select name="quarter" defaultValue={openQuarter ?? "Q1"} disabled={!openQuarter}>
                {quarters.map((quarter) => <option key={quarter} value={quarter} disabled={quarter !== openQuarter}>{quarter}{quarter === openQuarter ? " · Open" : " · Closed"}</option>)}
              </select>
            </div>
            <div>
              <label>Structured manager comment</label>
              <textarea name="comment" rows={5} placeholder="Discussed progress, blockers, support required, and next action items." required />
            </div>
            {!openQuarter ? <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">No quarterly check-in window is currently open. Saving is disabled.</p> : null}
            <PrimaryButton disabled={!openQuarter} className="w-full">Save Check-in</PrimaryButton>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Previous comments</h2>
          <div className="mt-4 space-y-3">
            {sheet.checkIns.map((checkIn) => (
              <div key={checkIn.id} className="rounded-xl bg-slate-50 p-4">
                <Badge tone="blue">{checkIn.quarter}</Badge>
                <p className="mt-2 text-slate-700">{checkIn.comment}</p>
                <p className="mt-2 text-xs font-semibold text-slate-400">{formatDate(checkIn.createdAt)}</p>
              </div>
            ))}
            {sheet.checkIns.length === 0 ? <p className="text-sm text-slate-500">No manager check-in comments yet.</p> : null}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
