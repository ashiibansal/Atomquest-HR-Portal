"use client";

import { useMemo, useState, useTransition } from "react";
import { updateAchievementAction } from "@/app/actions";
import { Badge, Card, PrimaryButton } from "@/components/ui";
import { ProgressBar } from "@/components/ProgressBar";

type UomType = "NUMERIC_MIN" | "NUMERIC_MAX" | "PERCENT_MIN" | "PERCENT_MAX" | "TIMELINE" | "ZERO";
type Status = "NOT_STARTED" | "ON_TRACK" | "COMPLETED";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

type Achievement = {
  quarter: Quarter;
  actualValue: number | null;
  completionDate: string | null;
  status: Status;
  progressScore: number;
  employeeComment: string | null;
};

type GoalCard = {
  id: string;
  title: string;
  description: string;
  thrustArea: string;
  uomType: UomType;
  targetValue: number | null;
  targetDate: string | null;
  weightage: number;
  isShared: boolean;
  achievements: Achievement[];
};

const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export function AchievementEditor({ goal, locked, openQuarter }: { goal: GoalCard; locked: boolean; openQuarter: Quarter | null }) {
  const [quarter, setQuarter] = useState<Quarter>("Q1");
  const current = goal.achievements.find((achievement) => achievement.quarter === quarter);
  const [actualValue, setActualValue] = useState(current?.actualValue?.toString() ?? "");
  const [completionDate, setCompletionDate] = useState(current?.completionDate ?? "");
  const [status, setStatus] = useState<Status>(current?.status ?? "NOT_STARTED");
  const [comment, setComment] = useState(current?.employeeComment ?? "");
  const [isPending, startTransition] = useTransition();

  function selectQuarter(nextQuarter: Quarter) {
    const next = goal.achievements.find((achievement) => achievement.quarter === nextQuarter);
    setQuarter(nextQuarter);
    setActualValue(next?.actualValue?.toString() ?? "");
    setCompletionDate(next?.completionDate ?? "");
    setStatus(next?.status ?? "NOT_STARTED");
    setComment(next?.employeeComment ?? "");
  }

  const liveScore = useMemo(() => score(goal.uomType, goal.targetValue, goal.targetDate, actualValue, completionDate), [actualValue, completionDate, goal.targetDate, goal.targetValue, goal.uomType]);
  const weighted = (liveScore * goal.weightage) / 100;

  return (
    <Card>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black">{goal.title}</h2>
            {goal.isShared ? <Badge tone="purple">Shared KPI</Badge> : null}
            <Badge tone={status === "COMPLETED" ? "green" : status === "ON_TRACK" ? "blue" : "yellow"}>{status.replace("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">{goal.thrustArea} · {goal.uomType} · Weightage {goal.weightage}%</p>
          <p className="mt-3 text-slate-600">{goal.description}</p>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <Metric label="Target" value={goal.uomType === "TIMELINE" ? (goal.targetDate ?? "—") : goal.targetValue ?? "—"} />
            <Metric label="Live Score" value={`${liveScore.toFixed(0)}%`} />
            <Metric label="Weighted Score" value={weighted.toFixed(1)} />
          </div>

          <div className="mt-5"><ProgressBar value={liveScore} label="Live progress calculation" tone={liveScore >= 90 ? "green" : liveScore >= 50 ? "blue" : "amber"} /></div>
          <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-700">{scoreExplanation(goal.uomType)}</p>
        </div>

        <form action={(formData) => startTransition(() => updateAchievementAction(formData))} className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <input type="hidden" name="goalId" value={goal.id} />
          <input type="hidden" name="quarter" value={quarter} />

          <div>
            <label>Quarter</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {quarters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => selectQuarter(item)}
                  className={item === quarter ? "bg-slate-950 text-white" : item === openQuarter ? "border border-emerald-300 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-white text-slate-500"}
                >
                  {item}{item === openQuarter ? " open" : ""}
                </button>
              ))}
            </div>
          </div>

          <div className={goal.uomType === "TIMELINE" ? "opacity-40" : ""}>
            <label>Actual Achievement</label>
            <input name="actualValue" type="number" step="0.01" value={actualValue} onChange={(event) => setActualValue(event.target.value)} disabled={goal.uomType === "TIMELINE"} placeholder="Actual value" />
          </div>
          <div>
            <label>Completion Date</label>
            <input name="completionDate" type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} />
          </div>
          <div>
            <label>Status</label>
            <select name="status" value={status} onChange={(event) => setStatus(event.target.value as Status)}>
              <option value="NOT_STARTED">Not Started</option>
              <option value="ON_TRACK">On Track</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div>
            <label>Employee Comment</label>
            <textarea name="employeeComment" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Mention blockers, wins, or evidence." />
          </div>
          {quarter !== openQuarter ? (
            <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{openQuarter ? `${openQuarter} is the only active achievement window right now.` : "No quarterly achievement window is currently open."}</p>
          ) : null}
          <PrimaryButton disabled={!locked || isPending || quarter !== openQuarter} className="w-full">{isPending ? "Saving..." : "Save Achievement"}</PrimaryButton>
        </form>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-slate-500">{label}</p><p className="text-lg font-black">{value}</p></div>;
}

function score(uomType: UomType, targetValue: number | null, targetDate: string | null, actualRaw: string, completionDate: string) {
  const target = Number(targetValue ?? 0);
  const actual = Number(actualRaw || 0);

  if (uomType === "NUMERIC_MIN" || uomType === "PERCENT_MIN") {
    if (!target || !actualRaw) return 0;
    return clamp((actual / target) * 100);
  }
  if (uomType === "NUMERIC_MAX" || uomType === "PERCENT_MAX") {
    if (!actualRaw) return 0;
    if (actual === 0) return 100;
    if (!target) return 0;
    return clamp((target / actual) * 100);
  }
  if (uomType === "ZERO") {
    if (!actualRaw) return 0;
    return actual === 0 ? 100 : 0;
  }
  if (uomType === "TIMELINE") {
    if (!targetDate || !completionDate) return 0;
    return new Date(completionDate) <= new Date(targetDate) ? 100 : 0;
  }
  return 0;
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, 100));
}

function scoreExplanation(uomType: UomType) {
  if (uomType === "NUMERIC_MIN" || uomType === "PERCENT_MIN") return "Higher is better: score = actual ÷ target × 100.";
  if (uomType === "NUMERIC_MAX" || uomType === "PERCENT_MAX") return "Lower is better: score = target ÷ actual × 100.";
  if (uomType === "TIMELINE") return "Timeline scoring: completion on or before the deadline gives 100%.";
  return "Zero-based scoring: actual value of 0 gives 100%; anything above 0 gives 0%.";
}
