import { UomType } from "@/lib/domain";

export type ScoreInput = {
  uomType: UomType;
  targetValue?: number | null;
  targetDate?: Date | string | null;
  actualValue?: number | null;
  completionDate?: Date | string | null;
};

export function calculateProgressScore(input: ScoreInput) {
  const target = Number(input.targetValue ?? 0);
  const actual = Number(input.actualValue ?? 0);

  switch (input.uomType) {
    case "NUMERIC_MIN":
    case "PERCENT_MIN": {
      if (!target || input.actualValue === null || input.actualValue === undefined) return 0;
      return clamp((actual / target) * 100);
    }

    case "NUMERIC_MAX":
    case "PERCENT_MAX": {
      if (input.actualValue === null || input.actualValue === undefined) return 0;
      if (actual === 0) return 100;
      if (!target) return 0;
      return clamp((target / actual) * 100);
    }

    case "ZERO": {
      if (input.actualValue === null || input.actualValue === undefined) return 0;
      return actual === 0 ? 100 : 0;
    }

    case "TIMELINE": {
      if (!input.completionDate || !input.targetDate) return 0;
      return new Date(input.completionDate) <= new Date(input.targetDate) ? 100 : 0;
    }

    default:
      return 0;
  }
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, 100));
}

export function weightedScore(progressScore: number, weightage: number) {
  return (progressScore * weightage) / 100;
}
