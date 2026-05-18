"use client";

import { useMemo, useState, useTransition } from "react";
import { createGoalAction } from "@/app/actions";
import { PrimaryButton } from "@/components/ui";
import { ProgressBar } from "@/components/ProgressBar";

type UomType = "NUMERIC_MIN" | "NUMERIC_MAX" | "PERCENT_MIN" | "PERCENT_MAX" | "TIMELINE" | "ZERO";

const examples: Record<string, { title: string; description: string; uomType: UomType; targetValue?: string; targetDate?: string; weightage: number }> = {
  revenue: {
    title: "Increase quarterly sales revenue",
    description: "Improve revenue through faster lead conversion and stronger follow-up discipline.",
    uomType: "NUMERIC_MIN",
    targetValue: "1000000",
    weightage: 25,
  },
  efficiency: {
    title: "Reduce average turnaround time",
    description: "Lower process completion time by removing bottlenecks and improving handoffs.",
    uomType: "NUMERIC_MAX",
    targetValue: "24",
    weightage: 20,
  },
  compliance: {
    title: "Maintain zero critical compliance incidents",
    description: "Ensure zero unresolved critical compliance deviations during the cycle.",
    uomType: "ZERO",
    weightage: 15,
  },
};

const uomHelp: Record<UomType, string> = {
  NUMERIC_MIN: "Higher is better. Example: revenue, output, resolved tickets.",
  NUMERIC_MAX: "Lower is better. Example: cost, turnaround time, defects.",
  PERCENT_MIN: "Higher percentage is better. Example: satisfaction %, completion %.",
  PERCENT_MAX: "Lower percentage is better. Example: error %, attrition %, rework %.",
  TIMELINE: "Deadline-based. The target is a date, not a number.",
  ZERO: "Zero is success. Example: safety incidents or critical defects.",
};

export function GoalBuilder({ editable, disabledReason, goalsCount, totalWeightage }: { editable: boolean; disabledReason?: string; goalsCount: number; totalWeightage: number }) {
  const [uomType, setUomType] = useState<UomType>("NUMERIC_MIN");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [weightage, setWeightage] = useState("10");
  const [thrustArea, setThrustArea] = useState("Customer Excellence");
  const [isPending, startTransition] = useTransition();

  const projectedTotal = totalWeightage + Number(weightage || 0);
  const remainingAfterAdd = 100 - projectedTotal;
  const isTimeline = uomType === "TIMELINE";
  const isZero = uomType === "ZERO";

  const localWarning = useMemo(() => {
    if (goalsCount >= 8) return "Maximum 8 goals already reached.";
    if (Number(weightage) < 10) return "This goal needs at least 10% weightage.";
    if (projectedTotal > 100) return `This would push total weightage to ${projectedTotal}%. Reduce it by ${projectedTotal - 100}%.`;
    if (!title.trim()) return "Add a crisp goal title before saving.";
    if (!description.trim()) return "Add a short outcome-focused description.";
    if (isTimeline && !targetDate) return "Timeline goals need a target deadline.";
    if (!isTimeline && !isZero && !targetValue) return "This UoM needs a numeric target.";
    return "Looks valid locally. Server-side validation will still verify everything.";
  }, [description, goalsCount, isTimeline, isZero, projectedTotal, targetDate, targetValue, title, weightage]);

  function applyExample(key: keyof typeof examples) {
    const example = examples[key];
    setTitle(example.title);
    setDescription(example.description);
    setUomType(example.uomType);
    setTargetValue(example.targetValue ?? "");
    setTargetDate(example.targetDate ?? "");
    setWeightage(String(example.weightage));
  }

  if (!editable) {
    return (
      <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">
        {disabledReason ?? "This sheet is not editable in its current state. Manager/Admin intervention is required for changes."}
      </div>
    );
  }

  return (
    <form action={(formData) => startTransition(() => createGoalAction(formData))} className="space-y-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-bold text-slate-600">Projected total after add</span>
          <span className="font-black text-slate-950">{Math.max(0, projectedTotal)}%</span>
        </div>
        <div className="mt-3"><ProgressBar value={projectedTotal} tone={projectedTotal === 100 ? "green" : projectedTotal > 100 ? "rose" : "blue"} /></div>
        <p className="mt-2 text-xs font-semibold text-slate-500">{remainingAfterAdd === 0 ? "Perfect: this would make the sheet submission-ready." : remainingAfterAdd > 0 ? `${remainingAfterAdd}% would still remain.` : `${Math.abs(remainingAfterAdd)}% over the limit.`}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => applyExample("revenue")} className="border border-slate-200 bg-white text-xs text-slate-700">+ Revenue template</button>
        <button type="button" onClick={() => applyExample("efficiency")} className="border border-slate-200 bg-white text-xs text-slate-700">+ Efficiency template</button>
        <button type="button" onClick={() => applyExample("compliance")} className="border border-slate-200 bg-white text-xs text-slate-700">+ Zero-risk template</button>
      </div>

      <div>
        <label>Thrust Area</label>
        <select name="thrustArea" required value={thrustArea} onChange={(event) => setThrustArea(event.target.value)}>
          <option value="Customer Excellence">Customer Excellence</option>
          <option value="Operational Efficiency">Operational Efficiency</option>
          <option value="Revenue Growth">Revenue Growth</option>
          <option value="Cost Optimisation">Cost Optimisation</option>
          <option value="Compliance">Compliance</option>
          <option value="People Development">People Development</option>
        </select>
      </div>
      <div>
        <label>Goal Title</label>
        <input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Reduce ticket turnaround time" />
      </div>
      <div>
        <label>Description</label>
        <textarea name="description" required rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Briefly describe expected outcome." />
      </div>
      <div>
        <label>UoM Type</label>
        <select name="uomType" required value={uomType} onChange={(event) => setUomType(event.target.value as UomType)}>
          <option value="NUMERIC_MIN">Numeric Min: higher is better</option>
          <option value="NUMERIC_MAX">Numeric Max: lower is better</option>
          <option value="PERCENT_MIN">% Min: higher is better</option>
          <option value="PERCENT_MAX">% Max: lower is better</option>
          <option value="TIMELINE">Timeline</option>
          <option value="ZERO">Zero-based</option>
        </select>
        <p className="mt-2 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700">{uomHelp[uomType]}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={isTimeline || isZero ? "opacity-40" : ""}>
          <label>Target Value</label>
          <input name="targetValue" type="number" step="0.01" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} disabled={isTimeline || isZero} placeholder={isZero ? "Not needed" : "90"} />
        </div>
        <div className={!isTimeline ? "opacity-40" : ""}>
          <label>Target Date</label>
          <input name="targetDate" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} disabled={!isTimeline} />
        </div>
      </div>
      <div>
        <label>Weightage</label>
        <input name="weightage" type="number" min="10" max="100" value={weightage} onChange={(event) => setWeightage(event.target.value)} required />
      </div>
      <p className={projectedTotal > 100 || Number(weightage) < 10 ? "rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700" : "rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700"}>{localWarning}</p>
      <PrimaryButton disabled={isPending || goalsCount >= 8 || projectedTotal > 100} className="w-full">{isPending ? "Adding..." : "Add Goal"}</PrimaryButton>
    </form>
  );
}
