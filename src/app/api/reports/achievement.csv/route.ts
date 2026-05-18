import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { weightedScore } from "@/lib/scoring";

function csvEscape(value: unknown) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("demoUserId")?.value;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

  if (!user || user.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const achievements = await prisma.quarterlyAchievement.findMany({
    include: {
      goal: {
        include: {
          goalSheet: { include: { employee: { include: { manager: true } }, cycle: true } },
        },
      },
    },
    orderBy: [{ quarter: "asc" }, { updatedAt: "desc" }],
  });

  const header = [
    "Employee Name",
    "Department",
    "Manager",
    "Cycle",
    "Quarter",
    "Thrust Area",
    "Goal Title",
    "UoM Type",
    "Target Value",
    "Target Date",
    "Actual Value",
    "Completion Date",
    "Status",
    "Progress Score",
    "Weightage",
    "Weighted Score",
  ];

  const rows = achievements.map((achievement) => {
    const goal = achievement.goal;
    const sheet = goal.goalSheet;
    return [
      sheet.employee.name,
      sheet.employee.department,
      sheet.employee.manager?.name ?? "",
      sheet.cycle.name,
      achievement.quarter,
      goal.thrustArea,
      goal.title,
      goal.uomType,
      goal.targetValue ?? "",
      goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : "",
      achievement.actualValue ?? "",
      achievement.completionDate ? achievement.completionDate.toISOString().slice(0, 10) : "",
      achievement.status,
      achievement.progressScore.toFixed(2),
      goal.weightage,
      weightedScore(achievement.progressScore, goal.weightage).toFixed(2),
    ];
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entityType: "REPORT",
      entityId: "achievement-report",
      action: "EXPORT",
      newValue: `Exported ${rows.length} achievement rows`,
    },
  });

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=achievement-report.csv",
    },
  });
}
