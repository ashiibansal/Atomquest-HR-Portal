"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AuditAction, EntityType, GoalProgressStatus, Quarter, Role, UomType } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { roleHome, getCurrentUser } from "@/lib/auth";
import { validateGoalSheet } from "@/lib/goal-validation";
import { calculateProgressScore } from "@/lib/scoring";
import { isGoalSettingWindowOpen, isQuarterOpen, parseCycleDate } from "@/lib/schedule";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalNumber(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

async function audit(userId: string, entityType: EntityType, entityId: string, action: AuditAction, oldValue?: unknown, newValue?: unknown) {
  await prisma.auditLog.create({
    data: {
      userId,
      entityType,
      entityId,
      action,
      oldValue: oldValue === undefined ? null : JSON.stringify(oldValue),
      newValue: newValue === undefined ? null : JSON.stringify(newValue),
    },
  });
}

async function requireActionUser(allowedRoles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (allowedRoles && !allowedRoles.includes(user.role as Role)) redirect(roleHome(user.role as Role));
  return user;
}

export async function loginAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) redirect("/?error=Invalid credentials");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) redirect("/?error=Invalid credentials");

  const cookieStore = await cookies();
  cookieStore.set("demoUserId", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(roleHome(user.role as Role));
}

export async function quickLoginAction(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/");

  const cookieStore = await cookies();
  cookieStore.set("demoUserId", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(roleHome(user.role as Role));
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("demoUserId");
  redirect("/");
}

async function activeCycle() {
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true }, orderBy: { year: "desc" } });
  if (!cycle) throw new Error("No active goal cycle found. Seed the database first.");
  return cycle;
}

async function employeeSheet(employeeId: string) {
  const cycle = await activeCycle();
  return prisma.goalSheet.upsert({
    where: { employeeId_cycleId: { employeeId, cycleId: cycle.id } },
    update: {},
    create: { employeeId, cycleId: cycle.id, status: "DRAFT" },
    include: { goals: true, cycle: true },
  });
}

export async function createGoalAction(formData: FormData) {
  const user = await requireActionUser(["EMPLOYEE"]);
  const sheet = await employeeSheet(user.id);

  if (!isGoalSettingWindowOpen(sheet.cycle)) {
    redirect("/employee/goals?error=Goal creation is closed for the current cycle window.");
  }

  if (sheet.isLocked || sheet.status === "APPROVED" || sheet.status === "LOCKED" || sheet.status === "SUBMITTED") {
    redirect("/employee/goals?error=This goal sheet is locked or already submitted.");
  }

  if (sheet.goals.length >= 8) {
    redirect("/employee/goals?error=Maximum 8 goals are allowed.");
  }

  const uomType = text(formData, "uomType") as UomType;
  const targetValue = uomType === "TIMELINE" ? null : optionalNumber(formData, "targetValue");
  const targetDate = uomType === "TIMELINE" ? optionalDate(formData, "targetDate") : null;

  const goal = await prisma.goal.create({
    data: {
      goalSheetId: sheet.id,
      thrustArea: text(formData, "thrustArea"),
      title: text(formData, "title"),
      description: text(formData, "description"),
      uomType,
      targetValue,
      targetDate,
      weightage: Number(optionalNumber(formData, "weightage") ?? 0),
    },
  });

  await audit(user.id, "GOAL", goal.id, "CREATE", undefined, goal);
  revalidatePath("/employee/goals");
  redirect("/employee/goals?success=Goal added.");
}

export async function deleteGoalAction(formData: FormData) {
  const user = await requireActionUser(["EMPLOYEE", "ADMIN"]);
  const goalId = text(formData, "goalId");
  const goal = await prisma.goal.findUnique({ include: { goalSheet: { include: { cycle: true } } }, where: { id: goalId } });
  if (!goal) redirect("/employee/goals?error=Goal not found.");

  if (user.role === "EMPLOYEE" && goal.goalSheet.employeeId !== user.id) redirect("/employee/goals?error=Not allowed.");
  if (user.role === "EMPLOYEE" && !isGoalSettingWindowOpen(goal.goalSheet.cycle)) redirect("/employee/goals?error=Goal editing is closed for the current cycle window.");
  if (goal.goalSheet.isLocked && user.role !== "ADMIN") redirect("/employee/goals?error=Goal sheet is locked.");

  await prisma.goal.delete({ where: { id: goalId } });
  await audit(user.id, "GOAL", goalId, "DELETE", goal, undefined);

  revalidatePath("/employee/goals");
  redirect(user.role === "ADMIN" ? "/admin" : "/employee/goals?success=Goal deleted.");
}

export async function submitGoalSheetAction() {
  const user = await requireActionUser(["EMPLOYEE"]);
  const sheet = await employeeSheet(user.id);
  if (!isGoalSettingWindowOpen(sheet.cycle)) redirect("/employee/goals?error=Goal submission is closed for the current cycle window.");
  const validationError = validateGoalSheet(sheet.goals);

  if (validationError) redirect(`/employee/goals?error=${encodeURIComponent(validationError)}`);

  const updated = await prisma.goalSheet.update({
    where: { id: sheet.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      returnedComment: null,
    },
  });

  await audit(user.id, "GOAL_SHEET", sheet.id, "SUBMIT", sheet.status, updated.status);
  revalidatePath("/employee/goals");
  redirect("/employee/goals?success=Goal sheet submitted to manager.");
}

export async function managerUpdateGoalAction(formData: FormData) {
  const user = await requireActionUser(["MANAGER"]);
  const goalId = text(formData, "goalId");
  const sheetId = text(formData, "sheetId");
  const goal = await prisma.goal.findUnique({ include: { goalSheet: { include: { employee: true, cycle: true } } }, where: { id: goalId } });

  if (!goal || goal.goalSheet.employee.managerId !== user.id) redirect("/manager?error=Not allowed.");
  if (!isGoalSettingWindowOpen(goal.goalSheet.cycle)) redirect(`/manager/approvals/${sheetId}?error=Manager edits are closed for the current cycle window.`);
  if (goal.goalSheet.status !== "SUBMITTED") redirect(`/manager/approvals/${sheetId}?error=Only submitted sheets can be edited.`);

  const oldValue = { targetValue: goal.targetValue, targetDate: goal.targetDate, weightage: goal.weightage };
  const uomType = goal.uomType;
  const updated = await prisma.goal.update({
    where: { id: goalId },
    data: {
      targetValue: goal.isShared ? goal.targetValue : uomType === "TIMELINE" ? null : optionalNumber(formData, "targetValue"),
      targetDate: goal.isShared ? goal.targetDate : uomType === "TIMELINE" ? optionalDate(formData, "targetDate") : null,
      weightage: Number(optionalNumber(formData, "weightage") ?? goal.weightage),
    },
  });

  await audit(user.id, "GOAL", goalId, "UPDATE", oldValue, {
    targetValue: updated.targetValue,
    targetDate: updated.targetDate,
    weightage: updated.weightage,
  });

  revalidatePath(`/manager/approvals/${sheetId}`);
  redirect(`/manager/approvals/${sheetId}?success=Goal updated.`);
}

export async function approveGoalSheetAction(formData: FormData) {
  const user = await requireActionUser(["MANAGER"]);
  const sheetId = text(formData, "sheetId");
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: { employee: true, goals: true, cycle: true },
  });

  if (!sheet || sheet.employee.managerId !== user.id) redirect("/manager?error=Not allowed.");
  if (!isGoalSettingWindowOpen(sheet.cycle)) redirect(`/manager/approvals/${sheetId}?error=Approval is closed for the current cycle window.`);
  const validationError = validateGoalSheet(sheet.goals);
  if (validationError) redirect(`/manager/approvals/${sheetId}?error=${encodeURIComponent(validationError)}`);

  const updated = await prisma.goalSheet.update({
    where: { id: sheetId },
    data: {
      status: "LOCKED",
      isLocked: true,
      approvedAt: new Date(),
      approvedById: user.id,
      returnedComment: null,
    },
  });

  for (const goal of sheet.goals) {
    for (const quarter of ["Q1", "Q2", "Q3", "Q4"] as Quarter[]) {
      await prisma.quarterlyAchievement.upsert({
        where: { goalId_quarter: { goalId: goal.id, quarter } },
        update: {},
        create: { goalId: goal.id, quarter, status: "NOT_STARTED", progressScore: 0 },
      });
    }
  }

  await audit(user.id, "GOAL_SHEET", sheetId, "APPROVE", sheet.status, updated.status);
  await audit(user.id, "GOAL_SHEET", sheetId, "LOCK", { isLocked: false }, { isLocked: true });

  revalidatePath("/manager");
  redirect("/manager?success=Goal sheet approved and locked.");
}

export async function returnGoalSheetAction(formData: FormData) {
  const user = await requireActionUser(["MANAGER"]);
  const sheetId = text(formData, "sheetId");
  const comment = text(formData, "comment");
  const sheet = await prisma.goalSheet.findUnique({ where: { id: sheetId }, include: { employee: true, cycle: true } });
  if (!sheet || sheet.employee.managerId !== user.id) redirect("/manager?error=Not allowed.");
  if (!isGoalSettingWindowOpen(sheet.cycle)) redirect(`/manager/approvals/${sheetId}?error=Return for rework is closed for the current cycle window.`);

  const updated = await prisma.goalSheet.update({
    where: { id: sheetId },
    data: { status: "RETURNED", returnedComment: comment || "Please revise and resubmit." },
  });

  await audit(user.id, "GOAL_SHEET", sheetId, "RETURN", sheet.status, updated.returnedComment);
  revalidatePath("/manager");
  redirect("/manager?success=Goal sheet returned for rework.");
}

export async function updateAchievementAction(formData: FormData) {
  const user = await requireActionUser(["EMPLOYEE"]);
  const goalId = text(formData, "goalId");
  const quarter = text(formData, "quarter") as Quarter;
  const actualValue = optionalNumber(formData, "actualValue");
  const completionDate = optionalDate(formData, "completionDate");
  const status = text(formData, "status") as GoalProgressStatus;
  const employeeComment = text(formData, "employeeComment");

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { goalSheet: { include: { cycle: true } }, sharedGoal: true },
  });

  if (!goal || goal.goalSheet.employeeId !== user.id) redirect("/employee/checkins?error=Not allowed.");
  if (!goal.goalSheet.isLocked) redirect("/employee/checkins?error=Goal sheet must be approved before achievements can be updated.");
  if (!isQuarterOpen(goal.goalSheet.cycle, quarter)) {
    const message = encodeURIComponent(`${quarter} is not currently open for achievement capture.`);
    redirect(`/employee/checkins?error=${message}`);
  }

  const linkedGoals = goal.isShared && goal.sharedGoal?.primaryOwnerId === user.id
    ? await prisma.goal.findMany({ where: { sharedGoalId: goal.sharedGoalId } })
    : [goal];

  for (const linkedGoal of linkedGoals) {
    const progressScore = calculateProgressScore({
      uomType: linkedGoal.uomType as UomType,
      targetValue: linkedGoal.targetValue,
      targetDate: linkedGoal.targetDate,
      actualValue,
      completionDate,
    });

    const updated = await prisma.quarterlyAchievement.upsert({
      where: { goalId_quarter: { goalId: linkedGoal.id, quarter } },
      update: { actualValue, completionDate, status, employeeComment, progressScore },
      create: { goalId: linkedGoal.id, quarter, actualValue, completionDate, status, employeeComment, progressScore },
    });

    await audit(user.id, "ACHIEVEMENT", updated.id, "UPDATE", undefined, updated);
  }

  revalidatePath("/employee/checkins");
  redirect("/employee/checkins?success=Achievement updated.");
}

export async function addCheckInAction(formData: FormData) {
  const user = await requireActionUser(["MANAGER"]);
  const sheetId = text(formData, "sheetId");
  const employeeId = text(formData, "employeeId");
  const quarter = text(formData, "quarter") as Quarter;
  const comment = text(formData, "comment");

  const sheet = await prisma.goalSheet.findUnique({ where: { id: sheetId }, include: { employee: true, cycle: true } });
  if (!sheet || sheet.employee.managerId !== user.id) redirect("/manager?error=Not allowed.");
  if (!isQuarterOpen(sheet.cycle, quarter)) {
    const message = encodeURIComponent(`${quarter} is not currently open for manager check-ins.`);
    redirect(`/manager/checkins/${sheetId}?error=${message}`);
  }

  const checkIn = await prisma.checkIn.upsert({
    where: { goalSheetId_quarter: { goalSheetId: sheetId, quarter } },
    update: { comment, managerId: user.id, employeeId },
    create: { goalSheetId: sheetId, managerId: user.id, employeeId, quarter, comment },
  });

  await audit(user.id, "CHECK_IN", checkIn.id, "CHECK_IN", undefined, checkIn);
  revalidatePath(`/manager/checkins/${sheetId}`);
  redirect(`/manager/checkins/${sheetId}?success=Check-in comment saved.`);
}

export async function unlockGoalSheetAction(formData: FormData) {
  const user = await requireActionUser(["ADMIN"]);
  const sheetId = text(formData, "sheetId");
  const sheet = await prisma.goalSheet.findUnique({ where: { id: sheetId } });
  if (!sheet) redirect("/admin?error=Goal sheet not found.");

  const updated = await prisma.goalSheet.update({
    where: { id: sheetId },
    data: { isLocked: false, status: "RETURNED", returnedComment: "Unlocked by Admin/HR for exceptional revision." },
  });

  await audit(user.id, "GOAL_SHEET", sheetId, "UNLOCK", sheet, updated);
  revalidatePath("/admin");
  redirect("/admin?success=Goal sheet unlocked and moved to Returned state.");
}

export async function createSharedGoalAction(formData: FormData) {
  const user = await requireActionUser(["ADMIN", "MANAGER"]);
  const primaryOwnerId = text(formData, "primaryOwnerId");
  const department = text(formData, "department");
  const uomType = text(formData, "uomType") as UomType;

  const cycle = await activeCycle();
  if (!isGoalSettingWindowOpen(cycle)) redirect("/admin?error=Shared KPI push is closed for the current goal-setting window.");

  const sharedGoal = await prisma.sharedGoal.create({
    data: {
      title: text(formData, "title"),
      description: text(formData, "description"),
      thrustArea: text(formData, "thrustArea"),
      uomType,
      targetValue: uomType === "TIMELINE" ? null : optionalNumber(formData, "targetValue"),
      targetDate: uomType === "TIMELINE" ? optionalDate(formData, "targetDate") : null,
      primaryOwnerId,
      createdById: user.id,
    },
  });

  const recipients = await prisma.user.findMany({ where: { role: "EMPLOYEE", department } });

  for (const recipient of recipients) {
    const sheet = await prisma.goalSheet.upsert({
      where: { employeeId_cycleId: { employeeId: recipient.id, cycleId: cycle.id } },
      update: {},
      create: { employeeId: recipient.id, cycleId: cycle.id, status: "DRAFT" },
      include: { goals: true },
    });

    const alreadyLinked = await prisma.goal.findFirst({ where: { goalSheetId: sheet.id, sharedGoalId: sharedGoal.id } });
    if (!alreadyLinked && sheet.goals.length < 8) {
      await prisma.goal.create({
        data: {
          goalSheetId: sheet.id,
          thrustArea: sharedGoal.thrustArea,
          title: sharedGoal.title,
          description: sharedGoal.description,
          uomType: sharedGoal.uomType,
          targetValue: sharedGoal.targetValue,
          targetDate: sharedGoal.targetDate,
          weightage: 10,
          isShared: true,
          sharedGoalId: sharedGoal.id,
        },
      });
    }
  }

  await audit(user.id, "SHARED_GOAL", sharedGoal.id, "CREATE", undefined, sharedGoal);
  revalidatePath("/admin");
  redirect("/admin?success=Shared departmental KPI pushed to matching employees.");
}

export async function employeeUpdateWeightageAction(formData: FormData) {
  const user = await requireActionUser(["EMPLOYEE"]);
  const goalId = text(formData, "goalId");
  const weightage = Number(optionalNumber(formData, "weightage") ?? 0);
  const goal = await prisma.goal.findUnique({ include: { goalSheet: { include: { cycle: true } } }, where: { id: goalId } });
  if (!goal || goal.goalSheet.employeeId !== user.id) redirect("/employee/goals?error=Not allowed.");
  if (!isGoalSettingWindowOpen(goal.goalSheet.cycle)) redirect("/employee/goals?error=Weightage updates are closed for the current cycle window.");
  if (goal.goalSheet.isLocked || goal.goalSheet.status === "SUBMITTED") redirect("/employee/goals?error=Submitted or locked goals cannot be edited.");

  const updated = await prisma.goal.update({ where: { id: goalId }, data: { weightage } });
  await audit(user.id, "GOAL", goalId, "UPDATE", { weightage: goal.weightage }, { weightage: updated.weightage });
  revalidatePath("/employee/goals");
  redirect("/employee/goals?success=Weightage updated.");
}


function validateCycleDates(dates: {
  goalSettingOpenDate: Date;
  q1OpenDate: Date;
  q2OpenDate: Date;
  q3OpenDate: Date;
  q4OpenDate: Date;
}) {
  const ordered = [
    dates.goalSettingOpenDate,
    dates.q1OpenDate,
    dates.q2OpenDate,
    dates.q3OpenDate,
    dates.q4OpenDate,
  ];

  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index] <= ordered[index - 1]) {
      return "Cycle dates must be chronological: Goal Setting < Q1 < Q2 < Q3 < Q4.";
    }
  }

  return null;
}

function cycleDateOrRedirect(formData: FormData, key: string, label: string) {
  try {
    return parseCycleDate(formData.get(key), label);
  } catch (error) {
    const message = error instanceof Error ? error.message : `${label} is invalid.`;
    redirect(`/admin/cycles?error=${encodeURIComponent(message)}`);
  }
}

function cycleDataFromForm(formData: FormData) {
  return {
    year: Number(text(formData, "year")),
    name: text(formData, "name"),
    goalSettingOpenDate: cycleDateOrRedirect(formData, "goalSettingOpenDate", "Goal setting date"),
    q1OpenDate: cycleDateOrRedirect(formData, "q1OpenDate", "Q1 date"),
    q2OpenDate: cycleDateOrRedirect(formData, "q2OpenDate", "Q2 date"),
    q3OpenDate: cycleDateOrRedirect(formData, "q3OpenDate", "Q3 date"),
    q4OpenDate: cycleDateOrRedirect(formData, "q4OpenDate", "Q4 date"),
  };
}

export async function updateGoalCycleAction(formData: FormData) {
  const user = await requireActionUser(["ADMIN"]);
  const cycleId = text(formData, "cycleId");
  const current = await prisma.goalCycle.findUnique({ where: { id: cycleId } });
  if (!current) redirect("/admin/cycles?error=Cycle not found.");

  const data = cycleDataFromForm(formData);
  if (!data.year || !data.name) redirect("/admin/cycles?error=Cycle year and name are required.");
  const dateError = validateCycleDates(data);
  if (dateError) redirect(`/admin/cycles?error=${encodeURIComponent(dateError)}`);

  const updated = await prisma.goalCycle.update({ where: { id: cycleId }, data });
  await audit(user.id, "GOAL_CYCLE", cycleId, "UPDATE", current, updated);
  revalidatePath("/admin/cycles");
  revalidatePath("/admin");
  redirect("/admin/cycles?success=Cycle window configuration updated.");
}

export async function createGoalCycleAction(formData: FormData) {
  const user = await requireActionUser(["ADMIN"]);
  const baseData = cycleDataFromForm(formData);
  if (!baseData.year || !baseData.name) redirect("/admin/cycles?error=Cycle year and name are required.");
  const dateError = validateCycleDates(baseData);
  if (dateError) redirect(`/admin/cycles?error=${encodeURIComponent(dateError)}`);

  const cycle = await prisma.goalCycle.create({ data: { ...baseData, isActive: false } });
  await audit(user.id, "GOAL_CYCLE", cycle.id, "CREATE", undefined, cycle);
  revalidatePath("/admin/cycles");
  redirect("/admin/cycles?success=New cycle created as inactive.");
}

export async function activateGoalCycleAction(formData: FormData) {
  const user = await requireActionUser(["ADMIN"]);
  const cycleId = text(formData, "cycleId");
  const cycle = await prisma.goalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) redirect("/admin/cycles?error=Cycle not found.");

  await prisma.$transaction([
    prisma.goalCycle.updateMany({ data: { isActive: false } }),
    prisma.goalCycle.update({ where: { id: cycleId }, data: { isActive: true } }),
  ]);

  await audit(user.id, "GOAL_CYCLE", cycleId, "UPDATE", { isActive: cycle.isActive }, { isActive: true });
  revalidatePath("/admin/cycles");
  revalidatePath("/admin");
  redirect("/admin/cycles?success=Active cycle changed.");
}
