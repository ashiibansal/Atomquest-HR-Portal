import type { GoalCycle } from "@prisma/client";
import type { Quarter } from "@/lib/domain";

export type WindowKey = "BEFORE_GOAL_SETTING" | "GOAL_SETTING" | Quarter;

export type ActiveWindow = {
  key: WindowKey;
  label: string;
  description: string;
  openQuarter: Quarter | null;
  goalSettingOpen: boolean;
  achievementOpen: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

export const quarterLabels: Record<Quarter, string> = {
  Q1: "Q1 Check-in",
  Q2: "Q2 Check-in",
  Q3: "Q3 Check-in",
  Q4: "Q4 / Annual",
};

const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export function dateInputValue(date?: Date | string | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function parseCycleDate(value: FormDataEntryValue | null, fieldName: string) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error(`${fieldName} is required.`);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`${fieldName} must be a valid date.`);
  return date;
}

export function getQuarterWindow(cycle: GoalCycle, quarter: Quarter) {
  if (quarter === "Q1") return { startsAt: cycle.q1OpenDate, endsAt: cycle.q2OpenDate };
  if (quarter === "Q2") return { startsAt: cycle.q2OpenDate, endsAt: cycle.q3OpenDate };
  if (quarter === "Q3") return { startsAt: cycle.q3OpenDate, endsAt: cycle.q4OpenDate };
  return { startsAt: cycle.q4OpenDate, endsAt: null };
}

export function isGoalSettingWindowOpen(cycle: GoalCycle, now = new Date()) {
  return now >= cycle.goalSettingOpenDate && now < cycle.q1OpenDate;
}

export function isQuarterOpen(cycle: GoalCycle, quarter: Quarter, now = new Date()) {
  const window = getQuarterWindow(cycle, quarter);
  return now >= window.startsAt && (!window.endsAt || now < window.endsAt);
}

export function getOpenQuarter(cycle: GoalCycle, now = new Date()): Quarter | null {
  return quarters.find((quarter) => isQuarterOpen(cycle, quarter, now)) ?? null;
}

export function getActiveWindow(cycle: GoalCycle, now = new Date()): ActiveWindow {
  if (now < cycle.goalSettingOpenDate) {
    return {
      key: "BEFORE_GOAL_SETTING",
      label: "Cycle not open yet",
      description: `Goal setting opens on ${formatCompactDate(cycle.goalSettingOpenDate)}.`,
      openQuarter: null,
      goalSettingOpen: false,
      achievementOpen: false,
      startsAt: null,
      endsAt: cycle.goalSettingOpenDate,
    };
  }

  if (isGoalSettingWindowOpen(cycle, now)) {
    return {
      key: "GOAL_SETTING",
      label: "Goal Setting Window",
      description: `Goal creation, submission, and L1 approval are open until ${formatCompactDate(cycle.q1OpenDate)}.`,
      openQuarter: null,
      goalSettingOpen: true,
      achievementOpen: false,
      startsAt: cycle.goalSettingOpenDate,
      endsAt: cycle.q1OpenDate,
    };
  }

  const openQuarter = getOpenQuarter(cycle, now);
  if (openQuarter) {
    const window = getQuarterWindow(cycle, openQuarter);
    return {
      key: openQuarter,
      label: quarterLabels[openQuarter],
      description: window.endsAt
        ? `${quarterLabels[openQuarter]} is open until ${formatCompactDate(window.endsAt)}.`
        : `${quarterLabels[openQuarter]} is currently open for final achievement capture.`,
      openQuarter,
      goalSettingOpen: false,
      achievementOpen: true,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    };
  }

  return {
    key: "Q4",
    label: "Cycle closed",
    description: "No active capture window is currently open.",
    openQuarter: null,
    goalSettingOpen: false,
    achievementOpen: false,
    startsAt: null,
    endsAt: null,
  };
}

export function getQuarterAvailability(cycle: GoalCycle, now = new Date()) {
  return quarters.map((quarter) => {
    const window = getQuarterWindow(cycle, quarter);
    return {
      quarter,
      label: quarterLabels[quarter],
      isOpen: isQuarterOpen(cycle, quarter, now),
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      range: window.endsAt
        ? `${formatCompactDate(window.startsAt)} → ${formatCompactDate(window.endsAt)}`
        : `${formatCompactDate(window.startsAt)} onward`,
    };
  });
}

export function formatCompactDate(date?: Date | string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}
