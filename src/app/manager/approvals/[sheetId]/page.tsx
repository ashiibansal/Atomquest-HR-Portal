import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card, SecondaryButton } from "@/components/ui";
import { GoalSheetStatusBadge } from "@/components/StatusBadge";
import { ConfirmSubmitButton } from "@/components/client/ConfirmSubmitButton";
import { ToastFromQuery } from "@/components/client/ToastFromQuery";
import { ProgressBar } from "@/components/ProgressBar";
import { approveGoalSheetAction, managerUpdateGoalAction, returnGoalSheetAction } from "@/app/actions";
import { currencyLike, formatDate, percent } from "@/lib/format";
import { getActiveWindow, isGoalSettingWindowOpen } from "@/lib/schedule";

export default async function ApprovalPage({
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
    include: { employee: true, goals: { orderBy: { createdAt: "asc" }, include: { sharedGoal: true } }, cycle: true },
  });

  if (!sheet || sheet.employee.managerId !== user.id) notFound();
  const totalWeightage = sheet.goals.reduce((sum, goal) => sum + goal.weightage, 0);
  const activeWindow = getActiveWindow(sheet.cycle);
  const approvalOpen = isGoalSettingWindowOpen(sheet.cycle);

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Review Goal Sheet</h1>
          <p className="mt-1 text-slate-500">{sheet.employee.name} · {sheet.cycle.name}</p>
        </div>
        <div className="flex gap-2">
          <GoalSheetStatusBadge status={sheet.status} isLocked={sheet.isLocked} />
          <Badge tone={totalWeightage === 100 ? "green" : "red"}>{percent(totalWeightage)} weightage</Badge>
        </div>
      </div>

      <ToastFromQuery error={query?.error} success={query?.success} />

      <Card className="mt-6 border-l-4 border-l-blue-500">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black">Current approval window</h2>
            <p className="mt-1 text-sm text-slate-600">{activeWindow.description}</p>
          </div>
          <Badge tone={approvalOpen ? "green" : "yellow"}>{approvalOpen ? "Approval open" : "Approval closed"}</Badge>
        </div>
      </Card>

      <Card className="mt-6 card-hover">
        <div className="grid gap-4 md:grid-cols-[1fr_260px] md:items-center">
          <div>
            <h2 className="text-lg font-black">Approval readiness</h2>
            <p className="mt-1 text-sm text-slate-500">Approval is enabled only when the submitted sheet still satisfies the 100% weightage rule.</p>
          </div>
          <ProgressBar value={totalWeightage} label="Weightage validation" tone={totalWeightage === 100 ? "green" : "rose"} />
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-black">Submitted Goals</h2>
          <p className="text-sm text-slate-500">Manager can edit target/weightage inline before approval.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="table-cell">Goal</th>
                <th className="table-cell">UoM</th>
                <th className="table-cell">Target</th>
                <th className="table-cell">Target Date</th>
                <th className="table-cell">Weightage</th>
                <th className="table-cell">Save</th>
              </tr>
            </thead>
            <tbody>
              {sheet.goals.map((goal) => (
                <tr key={goal.id} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <p className="font-black">{goal.title}</p>
                    <p className="text-xs font-semibold text-slate-500">{goal.thrustArea}</p>
                    <p className="mt-1 text-slate-600">{goal.description}</p>
                    {goal.isShared ? <Badge tone="purple">Shared KPI</Badge> : null}
                  </td>
                  <td className="table-cell">{goal.uomType}</td>
                  <td className="table-cell">
                    <form id={`goal-${goal.id}`} action={managerUpdateGoalAction} className="contents">
                      <input type="hidden" name="goalId" value={goal.id} />
                      <input type="hidden" name="sheetId" value={sheet.id} />
                      <input name="targetValue" type="number" step="0.01" defaultValue={goal.targetValue ?? ""} placeholder={currencyLike(goal.targetValue)} disabled={!approvalOpen || goal.uomType === "TIMELINE" || goal.isShared} />
                    </form>
                  </td>
                  <td className="table-cell">
                    <input form={`goal-${goal.id}`} name="targetDate" type="date" defaultValue={goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : ""} disabled={!approvalOpen || goal.uomType !== "TIMELINE" || goal.isShared} />
                    <p className="mt-1 text-xs text-slate-400">Current: {formatDate(goal.targetDate)}</p>
                  </td>
                  <td className="table-cell"><input form={`goal-${goal.id}`} name="weightage" type="number" min="10" max="100" defaultValue={goal.weightage} disabled={!approvalOpen} /></td>
                  <td className="table-cell"><SecondaryButton form={`goal-${goal.id}`} disabled={!approvalOpen}>Save</SecondaryButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">Approve and lock</h2>
          <p className="mt-2 text-slate-600">Approval locks the sheet. Employee cannot edit goals afterward without Admin/HR unlocking.</p>
          <form action={approveGoalSheetAction} className="mt-4">
            <input type="hidden" name="sheetId" value={sheet.id} />
            <ConfirmSubmitButton disabled={!approvalOpen || totalWeightage !== 100} message="Approve and lock this goal sheet? The employee cannot edit it afterward unless Admin unlocks it.">Approve Goal Sheet</ConfirmSubmitButton>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Return for rework</h2>
          <p className="mt-2 text-slate-600">Use this when the employee needs to revise goals, target logic, or weightage.</p>
          <form action={returnGoalSheetAction} className="mt-4 space-y-3">
            <input type="hidden" name="sheetId" value={sheet.id} />
            <textarea name="comment" rows={3} placeholder="Please revise the weightage distribution and resubmit." required />
            <ConfirmSubmitButton disabled={!approvalOpen} message="Return this sheet for employee rework? The manager comment will be visible to the employee.">Return to Employee</ConfirmSubmitButton>
          </form>
        </Card>
      </div>
    </Shell>
  );
}
