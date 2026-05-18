import { Goal } from "@prisma/client";

export function validateGoalSheet(goals: Pick<Goal, "weightage" | "title" | "thrustArea" | "uomType" | "targetValue" | "targetDate">[]) {
  if (goals.length === 0) return "At least one goal is required before submission.";
  if (goals.length > 8) return "Maximum 8 goals are allowed per employee.";

  const missingCore = goals.find((goal) => !goal.title || !goal.thrustArea || !goal.uomType);
  if (missingCore) return "Each goal needs a thrust area, title, and UoM type.";

  const missingTarget = goals.find((goal) => {
    if (goal.uomType === "TIMELINE") return !goal.targetDate;
    if (goal.uomType === "ZERO") return false;
    return goal.targetValue === null || goal.targetValue === undefined;
  });
  if (missingTarget) return "Each non-zero goal needs a target value; timeline goals need a target date.";

  const invalidWeightage = goals.find((goal) => Number(goal.weightage) < 10);
  if (invalidWeightage) return "Each goal must have at least 10% weightage.";

  const totalWeightage = goals.reduce((sum, goal) => sum + Number(goal.weightage), 0);
  if (Math.round(totalWeightage * 100) / 100 !== 100) {
    return `Total weightage must be exactly 100%. Current total is ${totalWeightage}%.`;
  }

  return null;
}
