"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { GoalSheetStatusBadge } from "@/components/StatusBadge";

type NameValue = { name: string; value: number };
type ManagerSheet = { id: string; employee: string; department: string; status: string; goals: number; submittedAt: string; approvalUrl?: string; checkinUrl?: string; isLocked: boolean };

export function AdminCharts({ statusData, departmentData }: { statusData: NameValue[]; departmentData: NameValue[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h2 className="text-xl font-black">Goal Sheet Status Mix</h2>
        <p className="mt-1 text-sm text-slate-500">Instant governance view across all employees.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4} label>
                {statusData.map((_, index) => <Cell key={index} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black">Department Completion</h2>
        <p className="mt-1 text-sm text-slate-500">How many sheets exist per department.</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

export function EmployeeGoalDistributionChart({ data }: { data: NameValue[] }) {
  if (data.length === 0) return null;
  return (
    <Card>
      <h2 className="text-xl font-black">Weightage Distribution</h2>
      <p className="mt-1 text-sm text-slate-500">Shows where the employee's effort is concentrated.</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function ManagerSheetsExplorer({ sheets }: { sheets: ManagerSheet[] }) {
  const [query, setQuery] = useSearchState();
  const [status, setStatus] = useSearchState("ALL");
  const filtered = sheets.filter((sheet) => {
    const text = `${sheet.employee} ${sheet.department} ${sheet.status}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === "ALL" || sheet.status === status);
  });

  return (
    <Card className="mt-6 overflow-hidden p-0">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Team Goal Sheets</h2>
            <p className="text-sm text-slate-500">Search, filter, review submissions, and open locked sheets for check-ins.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px] lg:w-[520px]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee or department" />
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
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="table-cell">Employee</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Goals</th>
              <th className="table-cell">Submitted</th>
              <th className="table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sheet) => (
              <tr key={sheet.id} className="hover:bg-slate-50">
                <td className="table-cell"><strong>{sheet.employee}</strong><p className="text-xs text-slate-500">{sheet.department}</p></td>
                <td className="table-cell"><GoalSheetStatusBadge status={sheet.status} isLocked={sheet.isLocked} /></td>
                <td className="table-cell">{sheet.goals}</td>
                <td className="table-cell">{sheet.submittedAt}</td>
                <td className="table-cell">
                  <div className="flex flex-wrap gap-2">
                    {sheet.approvalUrl ? <a className="button bg-slate-950 text-white" href={sheet.approvalUrl}>Review</a> : null}
                    {sheet.checkinUrl ? <a className="button border border-slate-300 bg-white" href={sheet.checkinUrl}>Check-in</a> : null}
                    {!sheet.approvalUrl && !sheet.checkinUrl ? <span className="text-slate-400">No action</span> : null}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? <tr><td colSpan={5} className="table-cell text-slate-500">No matching sheets.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function useSearchState(initial = "") {
  return useState(initial);
}
