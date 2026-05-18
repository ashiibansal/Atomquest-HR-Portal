import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card } from "@/components/ui";

export default async function ManagerTeamPage() {
  const user = await requireUser(["MANAGER"]);
  const employees = await prisma.user.findMany({
    where: { managerId: user.id },
    include: { goalSheets: { include: { goals: true, checkIns: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <Shell user={user}>
      <h1 className="text-3xl font-black">My Team</h1>
      <p className="mt-1 text-slate-500">Reporting hierarchy visible to L1 manager.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {employees.map((employee) => {
          const sheet = employee.goalSheets[0];
          return (
            <Card key={employee.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{employee.name}</h2>
                  <p className="text-sm text-slate-500">{employee.email} · {employee.department}</p>
                </div>
                <Badge tone={sheet?.isLocked ? "green" : sheet?.status === "SUBMITTED" ? "blue" : "yellow"}>{sheet?.status ?? "NO SHEET"}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-500">Goals</p><p className="text-xl font-black">{sheet?.goals.length ?? 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-500">Check-ins</p><p className="text-xl font-black">{sheet?.checkIns.length ?? 0}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-500">Locked</p><p className="text-xl font-black">{sheet?.isLocked ? "Yes" : "No"}</p></div>
              </div>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}
