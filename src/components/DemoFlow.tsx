import Link from "next/link";
import { Card, Badge } from "@/components/ui";

const flows = [
  {
    role: "Employee",
    tone: "green" as const,
    href: "/employee",
    steps: ["Create goals", "Reach 100% weightage", "Submit to manager", "Update active-quarter achievement"],
  },
  {
    role: "Manager",
    tone: "blue" as const,
    href: "/manager",
    steps: ["Review team submissions", "Edit targets or weightage", "Approve or return", "Add quarterly check-in comments"],
  },
  {
    role: "Admin / HR",
    tone: "purple" as const,
    href: "/admin",
    steps: ["Configure cycle windows", "Monitor completion", "Unlock exceptions", "Export reports and audit logs"],
  },
];

export function DemoFlow({ showLinks = false }: { showLinks?: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {flows.map((flow) => (
        <Card key={flow.role} className="card-hover">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">{flow.role}</h2>
            <Badge tone={flow.tone}>{flow.steps.length} steps</Badge>
          </div>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            {flow.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-700">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {showLinks ? <Link className="button mt-5 inline-flex border border-slate-300 bg-white text-slate-900" href={flow.href}>Open {flow.role}</Link> : null}
        </Card>
      ))}
    </div>
  );
}
