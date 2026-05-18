"use client";

import { useMemo, useState, useTransition } from "react";
import { unlockGoalSheetAction } from "@/app/actions";
import { Card } from "@/components/ui";
import { GoalSheetStatusBadge } from "@/components/StatusBadge";
import { ConfirmSubmitButton } from "@/components/client/ConfirmSubmitButton";

type Sheet = {
  id: string;
  employee: string;
  department: string;
  manager: string;
  cycle: string;
  status: string;
  isLocked: boolean;
  goals: number;
  updatedAt: string;
};

export function AdminSheetsExplorer({ sheets }: { sheets: Sheet[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const departments = useMemo(() => Array.from(new Set(sheets.map((sheet) => sheet.department))).sort(), [sheets]);
  const filtered = sheets.filter((sheet) => {
    const text = `${sheet.employee} ${sheet.manager} ${sheet.department} ${sheet.status}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "ALL" || sheet.status === status) && (department === "ALL" || sheet.department === department);
  });

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-black">Governance Explorer</h2>
            <p className="text-sm text-slate-500">Search employee records, monitor status, and unlock approved sheets only as an exception.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-3 xl:w-[720px]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee, manager, department" />
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="ALL">All departments</option>
              {departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="RETURNED">Returned</option>
              <option value="LOCKED">Locked</option>
            </select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="table-cell">Employee</th>
              <th className="table-cell">Manager</th>
              <th className="table-cell">Cycle</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Goals</th>
              <th className="table-cell">Updated</th>
              <th className="table-cell">Exception</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sheet) => (
              <tr key={sheet.id} className="hover:bg-slate-50">
                <td className="table-cell"><strong>{sheet.employee}</strong><p className="text-xs text-slate-500">{sheet.department}</p></td>
                <td className="table-cell">{sheet.manager}</td>
                <td className="table-cell">{sheet.cycle}</td>
                <td className="table-cell"><GoalSheetStatusBadge status={sheet.status} isLocked={sheet.isLocked} /></td>
                <td className="table-cell">{sheet.goals}</td>
                <td className="table-cell">{sheet.updatedAt}</td>
                <td className="table-cell">
                  {sheet.isLocked ? (
                    <form action={(formData) => startTransition(() => unlockGoalSheetAction(formData))}>
                      <input type="hidden" name="sheetId" value={sheet.id} />
                      <ConfirmSubmitButton disabled={isPending} message="Unlock this approved goal sheet? This moves it back to Returned state and writes an audit log.">Unlock</ConfirmSubmitButton>
                    </form>
                  ) : <span className="text-slate-400">—</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-cell text-slate-500">
                  No matching goal sheets. Try clearing filters or changing the selected department/status.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
