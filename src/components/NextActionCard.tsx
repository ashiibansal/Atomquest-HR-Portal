import Link from "next/link";
import { Card } from "@/components/ui";

export function NextActionCard({
  eyebrow = "Recommended next step",
  title,
  body,
  href,
  action,
  tone = "blue",
}: {
  eyebrow?: string;
  title: string;
  body: string;
  href?: string;
  action?: string;
  tone?: "blue" | "green" | "amber" | "purple";
}) {
  const toneClass = {
    blue: "border-l-blue-500 bg-blue-50/50",
    green: "border-l-emerald-500 bg-emerald-50/50",
    amber: "border-l-amber-500 bg-amber-50/50",
    purple: "border-l-purple-500 bg-purple-50/50",
  }[tone];

  return (
    <Card className={`border-l-4 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      {href && action ? <Link href={href} className="button mt-4 inline-flex bg-slate-950 text-white">{action}</Link> : null}
    </Card>
  );
}
