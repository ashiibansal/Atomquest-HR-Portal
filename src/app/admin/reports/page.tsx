import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card } from "@/components/ui";
import { currencyLike, formatDate, percent } from "@/lib/format";
import { weightedScore } from "@/lib/scoring";

export default async function ReportsPage() {
  const user = await requireUser(["ADMIN"]);
  const achievements = await prisma.quarterlyAchievement.findMany({
    include: {
      goal: {
        include: {
          goalSheet: { include: { employee: { include: { manager: true } }, cycle: true } },
        },
      },
    },
    orderBy: [{ quarter: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <Shell user={user}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Achievement Report</h1>
          <p className="mt-1 text-slate-500">Exportable planned target vs actual achievement for all employees.</p>
        </div>
        <a href="/api/reports/achievement.csv" className="button bg-slate-950 text-white">Export CSV</a>
      </div>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="table-cell">Employee</th>
                <th className="table-cell">Department</th>
                <th className="table-cell">Manager</th>
                <th className="table-cell">Cycle</th>
                <th className="table-cell">Quarter</th>
                <th className="table-cell">Goal</th>
                <th className="table-cell">UoM</th>
                <th className="table-cell">Target</th>
                <th className="table-cell">Actual</th>
                <th className="table-cell">Status</th>
                <th className="table-cell">Score</th>
                <th className="table-cell">Weighted</th>
              </tr>
            </thead>
            <tbody>
              {achievements.map((achievement) => {
                const goal = achievement.goal;
                const sheet = goal.goalSheet;
                return (
                  <tr key={achievement.id}>
                    <td className="table-cell"><strong>{sheet.employee.name}</strong></td>
                    <td className="table-cell">{sheet.employee.department}</td>
                    <td className="table-cell">{sheet.employee.manager?.name ?? "—"}</td>
                    <td className="table-cell">{sheet.cycle.name}</td>
                    <td className="table-cell"><Badge>{achievement.quarter}</Badge></td>
                    <td className="table-cell">{goal.title}</td>
                    <td className="table-cell">{goal.uomType}</td>
                    <td className="table-cell">{goal.uomType === "TIMELINE" ? formatDate(goal.targetDate) : currencyLike(goal.targetValue)}</td>
                    <td className="table-cell">{goal.uomType === "TIMELINE" ? formatDate(achievement.completionDate) : currencyLike(achievement.actualValue)}</td>
                    <td className="table-cell">{achievement.status}</td>
                    <td className="table-cell">{percent(achievement.progressScore)}</td>
                    <td className="table-cell">{weightedScore(achievement.progressScore, goal.weightage).toFixed(1)}</td>
                  </tr>
                );
              })}
              {achievements.length === 0 ? <tr><td colSpan={12} className="table-cell text-slate-500">No achievement rows yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
