import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { Badge, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export default async function AuditPage() {
  const user = await requireUser(["ADMIN"]);
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <Shell user={user}>
      <h1 className="text-3xl font-black">Audit Trail</h1>
      <p className="mt-1 text-slate-500">Tracks who changed what and when, especially after lock/unlock operations.</p>

      <Card className="mt-6 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="table-cell">Time</th>
                <th className="table-cell">User</th>
                <th className="table-cell">Action</th>
                <th className="table-cell">Entity</th>
                <th className="table-cell">Old Value</th>
                <th className="table-cell">New Value</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="table-cell">{formatDateTime(log.createdAt)}</td>
                  <td className="table-cell"><strong>{log.user.name}</strong><p className="text-xs text-slate-500">{log.user.role}</p></td>
                  <td className="table-cell"><Badge tone="blue">{log.action}</Badge></td>
                  <td className="table-cell">{log.entityType}<p className="text-xs text-slate-400">{log.entityId}</p></td>
                  <td className="table-cell"><pre className="max-w-xs whitespace-pre-wrap break-words text-xs text-slate-500">{log.oldValue ?? "—"}</pre></td>
                  <td className="table-cell"><pre className="max-w-xs whitespace-pre-wrap break-words text-xs text-slate-500">{log.newValue ?? "—"}</pre></td>
                </tr>
              ))}
              {logs.length === 0 ? <tr><td colSpan={6} className="table-cell text-slate-500">No audit logs yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </Shell>
  );
}
