import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { GoalSheetStatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { GoalBuilder } from "@/components/client/GoalBuilder";
import { ToastFromQuery } from "@/components/client/ToastFromQuery";
import { ConfirmSubmitButton } from "@/components/client/ConfirmSubmitButton";
import { deleteGoalAction, employeeUpdateWeightageAction, submitGoalSheetAction } from "@/app/actions";
import { currencyLike, formatDate, percent } from "@/lib/format";
import { getActiveWindow, isGoalSettingWindowOpen } from "@/lib/schedule";

export default async function EmployeeGoals({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const user = await requireUser(["EMPLOYEE"]);
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });
  const sheet = cycle
    ? await prisma.goalSheet.upsert({
        where: { employeeId_cycleId: { employeeId: user.id, cycleId: cycle.id } },
        update: {},
        create: { employeeId: user.id, cycleId: cycle.id, status: "DRAFT" },
        include: { goals: { orderBy: { createdAt: "asc" }, include: { sharedGoal: true } } },
      })
    : null;

  const goals = sheet?.goals ?? [];
  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  const remaining = 100 - totalWeightage;
  const activeWindow = cycle ? getActiveWindow(cycle) : null;
  const goalSettingOpen = cycle ? isGoalSettingWindowOpen(cycle) : false;
  const editable = sheet && goalSettingOpen && !sheet.isLocked && !["SUBMITTED", "LOCKED"].includes(sheet.status);

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">My Goal Sheet</h1>
          <p className="mt-1 text-slate-500">Create goals before submission. After manager approval, the sheet is locked.</p>
        </div>
        <div className="flex gap-2">
          <GoalSheetStatusBadge status={sheet?.status} isLocked={sheet?.isLocked} />
          <Badge tone={totalWeightage === 100 ? "green" : "red"}>{percent(totalWeightage)} weightage</Badge>
        </div>
      </div>

      <ToastFromQuery error={params?.error} success={params?.success} />
      {sheet?.returnedComment ? <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Manager comment: {sheet.returnedComment}</p> : null}

      <Card className="mt-6 border-l-4 border-l-blue-500">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black">Current cycle window</h2>
            <p className="mt-1 text-sm text-slate-600">{activeWindow?.description ?? "No active cycle configured."}</p>
          </div>
          <Badge tone={goalSettingOpen ? "green" : "yellow"}>{goalSettingOpen ? "Goal setting open" : "Goal setting closed"}</Badge>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="grid gap-4 md:grid-cols-[1fr_220px] md:items-center">
          <div>
            <h2 className="text-lg font-black">Submission readiness</h2>
            <p className="mt-1 text-sm text-slate-500">The portal only allows submission when weightage is exactly 100%, each goal is at least 10%, and max goal count is 8.</p>
          </div>
          <ProgressBar value={totalWeightage} label={`${goals.length}/8 goals`} tone={totalWeightage === 100 ? "green" : totalWeightage > 100 ? "rose" : "blue"} />
        </div>
      </Card>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="text-xl font-black">Goals</h2>
              <p className="text-sm text-slate-500">{goals.length}/8 goals · {remaining === 0 ? "ready to submit" : `${remaining}% remaining`}</p>
            </div>
            <form action={submitGoalSheetAction}>
              <PrimaryButton disabled={!editable || totalWeightage !== 100 || goals.length === 0}>Submit to Manager</PrimaryButton>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="table-cell">Goal</th>
                  <th className="table-cell">UoM</th>
                  <th className="table-cell">Target</th>
                  <th className="table-cell">Weightage</th>
                  <th className="table-cell">Type</th>
                  <th className="table-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-slate-50">
                    <td className="table-cell">
                      <p className="font-black text-slate-950">{goal.title}</p>
                      <p className="text-xs font-semibold text-slate-500">{goal.thrustArea}</p>
                      <p className="mt-1 text-slate-600">{goal.description}</p>
                    </td>
                    <td className="table-cell">{goal.uomType}</td>
                    <td className="table-cell">{goal.uomType === "TIMELINE" ? formatDate(goal.targetDate) : currencyLike(goal.targetValue)}</td>
                    <td className="table-cell">
                      {editable ? (
                        <form action={employeeUpdateWeightageAction} className="flex gap-2">
                          <input type="hidden" name="goalId" value={goal.id} />
                          <input className="w-24" name="weightage" type="number" min="10" max="100" step="1" defaultValue={goal.weightage} />
                          <SecondaryButton>Save</SecondaryButton>
                        </form>
                      ) : (
                        <strong>{goal.weightage}%</strong>
                      )}
                    </td>
                    <td className="table-cell">{goal.isShared ? <Badge tone="purple">Shared KPI</Badge> : <Badge>Individual</Badge>}</td>
                    <td className="table-cell">
                      {editable && !goal.isShared ? (
                        <form action={deleteGoalAction}>
                          <input type="hidden" name="goalId" value={goal.id} />
                          <ConfirmSubmitButton variant="danger" message="Delete this goal? This cannot be undone.">Delete</ConfirmSubmitButton>
                        </form>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}

                {goals.length === 0 ? (
                  <tr><td className="table-cell text-slate-500" colSpan={6}>No goals yet. Add your first goal from the interactive builder on the right. The sheet can be submitted only after total weightage reaches exactly 100%.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="card-hover">
          <h2 className="text-xl font-black">Interactive Goal Builder</h2>
          <p className="mt-1 text-sm text-slate-500">Use templates, live weightage checks, and UoM-specific target fields.</p>
          <div className="mt-5">
            <GoalBuilder
              editable={Boolean(editable)}
              disabledReason={goalSettingOpen ? undefined : "Goal editing is closed because the current cycle is not in the Goal Setting window."}
              goalsCount={goals.length}
              totalWeightage={totalWeightage}
            />
          </div>
        </Card>
      </div>
    </Shell>
  );
}
