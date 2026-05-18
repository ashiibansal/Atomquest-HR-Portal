import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card, PrimaryButton, SecondaryButton } from "@/components/ui";
import { ToastFromQuery } from "@/components/client/ToastFromQuery";
import { activateGoalCycleAction, createGoalCycleAction, updateGoalCycleAction } from "@/app/actions";
import { dateInputValue, getActiveWindow, getQuarterAvailability } from "@/lib/schedule";
import { formatDate, formatDateTime } from "@/lib/format";

export default async function CycleManagementPage({ searchParams }: { searchParams?: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const user = await requireUser(["ADMIN"]);
  const cycles = await prisma.goalCycle.findMany({ orderBy: [{ isActive: "desc" }, { year: "desc" }] });
  const activeCycle = cycles.find((cycle) => cycle.isActive) ?? null;
  const activeWindow = activeCycle ? getActiveWindow(activeCycle) : null;
  const quarterAvailability = activeCycle ? getQuarterAvailability(activeCycle) : [];

  const nextYear = (activeCycle?.year ?? new Date().getFullYear()) + 1;

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Cycle Management</h1>
          <p className="mt-1 text-slate-500">Configure goal-setting and quarterly check-in windows used by server-side enforcement.</p>
        </div>
        <Badge tone={activeWindow?.achievementOpen ? "green" : activeWindow?.goalSettingOpen ? "blue" : "yellow"}>{activeWindow?.label ?? "No active cycle"}</Badge>
      </div>

      <ToastFromQuery error={params?.error} success={params?.success} />

      {activeCycle ? (
        <Card className="mt-6 border-l-4 border-l-blue-500">
          <div className="grid gap-5 lg:grid-cols-[1fr_420px] lg:items-start">
            <div>
              <h2 className="text-xl font-black">Active cycle: {activeCycle.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{activeWindow?.description}</p>
              <div className="mt-4 grid gap-2 text-xs font-semibold sm:grid-cols-4">
                {quarterAvailability.map((item) => (
                  <div key={item.quarter} className={item.isOpen ? "rounded-xl bg-emerald-50 p-3 text-emerald-700" : "rounded-xl bg-slate-100 p-3 text-slate-500"}>
                    <p className="font-black">{item.quarter}{item.isOpen ? " · Open" : ""}</p>
                    <p>{item.range}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Demo tip: to test Q1 achievement capture today, set the Q1 open date to today and keep Q2 in the future. The server will then allow only Q1 updates.
              </p>
            </div>

            <form action={updateGoalCycleAction} className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <input type="hidden" name="cycleId" value={activeCycle.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label>Cycle Year</label>
                  <input name="year" type="number" defaultValue={activeCycle.year} required />
                </div>
                <div>
                  <label>Cycle Name</label>
                  <input name="name" defaultValue={activeCycle.name} required />
                </div>
              </div>
              <CycleDateFields cycle={activeCycle} />
              <PrimaryButton className="w-full">Save Active Cycle Windows</PrimaryButton>
            </form>
          </div>
        </Card>
      ) : (
        <Card className="mt-6">
          <h2 className="text-xl font-black">No active cycle configured</h2>
          <p className="mt-2 text-slate-600">Create a cycle below, then activate it.</p>
        </Card>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-black">All Cycles</h2>
            <p className="text-sm text-slate-500">Only one active cycle drives the Employee, Manager, and Admin workflows.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="table-cell">Cycle</th>
                  <th className="table-cell">Goal Setting</th>
                  <th className="table-cell">Q1</th>
                  <th className="table-cell">Q2</th>
                  <th className="table-cell">Q3</th>
                  <th className="table-cell">Q4</th>
                  <th className="table-cell">Updated</th>
                  <th className="table-cell">Action</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className="hover:bg-slate-50">
                    <td className="table-cell"><strong>{cycle.name}</strong><p className="text-xs text-slate-500">{cycle.year} {cycle.isActive ? "· Active" : ""}</p></td>
                    <td className="table-cell">{formatDate(cycle.goalSettingOpenDate)}</td>
                    <td className="table-cell">{formatDate(cycle.q1OpenDate)}</td>
                    <td className="table-cell">{formatDate(cycle.q2OpenDate)}</td>
                    <td className="table-cell">{formatDate(cycle.q3OpenDate)}</td>
                    <td className="table-cell">{formatDate(cycle.q4OpenDate)}</td>
                    <td className="table-cell">{formatDateTime(cycle.updatedAt)}</td>
                    <td className="table-cell">
                      {cycle.isActive ? <Badge tone="green">Active</Badge> : (
                        <form action={activateGoalCycleAction}>
                          <input type="hidden" name="cycleId" value={cycle.id} />
                          <SecondaryButton>Make Active</SecondaryButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Create New Cycle</h2>
          <p className="mt-1 text-sm text-slate-500">New cycles are created inactive first so they do not accidentally disrupt the live workflow.</p>
          <form action={createGoalCycleAction} className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label>Cycle Year</label>
                <input name="year" type="number" defaultValue={nextYear} required />
              </div>
              <div>
                <label>Cycle Name</label>
                <input name="name" defaultValue={`FY ${nextYear}-${String((nextYear + 1) % 100).padStart(2, "0")}`} required />
              </div>
            </div>
            <CycleDateFields baseYear={nextYear} />
            <PrimaryButton className="w-full">Create Inactive Cycle</PrimaryButton>
          </form>
        </Card>
      </div>
    </Shell>
  );
}

function CycleDateFields({ cycle, baseYear }: { cycle?: { goalSettingOpenDate: Date; q1OpenDate: Date; q2OpenDate: Date; q3OpenDate: Date; q4OpenDate: Date }; baseYear?: number }) {
  const year = baseYear ?? new Date().getFullYear();
  return (
    <div className="grid gap-3">
      <div>
        <label>Goal Setting Opens</label>
        <input name="goalSettingOpenDate" type="date" defaultValue={dateInputValue(cycle?.goalSettingOpenDate) || `${year}-05-01`} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label>Q1 Opens</label>
          <input name="q1OpenDate" type="date" defaultValue={dateInputValue(cycle?.q1OpenDate) || `${year}-07-01`} required />
        </div>
        <div>
          <label>Q2 Opens</label>
          <input name="q2OpenDate" type="date" defaultValue={dateInputValue(cycle?.q2OpenDate) || `${year}-10-01`} required />
        </div>
        <div>
          <label>Q3 Opens</label>
          <input name="q3OpenDate" type="date" defaultValue={dateInputValue(cycle?.q3OpenDate) || `${year + 1}-01-01`} required />
        </div>
        <div>
          <label>Q4 / Annual Opens</label>
          <input name="q4OpenDate" type="date" defaultValue={dateInputValue(cycle?.q4OpenDate) || `${year + 1}-03-01`} required />
        </div>
      </div>
    </div>
  );
}
