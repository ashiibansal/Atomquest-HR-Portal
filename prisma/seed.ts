import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.quarterlyAchievement.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.sharedGoal.deleteMany();
  await prisma.goalSheet.deleteMany();
  await prisma.goalCycle.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Demo1234", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Ananya HR Admin",
      email: "admin@demo.com",
      passwordHash,
      role: "ADMIN",
      department: "HR",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Rohan L1 Manager",
      email: "manager@demo.com",
      passwordHash,
      role: "MANAGER",
      department: "Operations",
    },
  });

  const employee = await prisma.user.create({
    data: {
      name: "Isha Employee",
      email: "employee@demo.com",
      passwordHash,
      role: "EMPLOYEE",
      department: "Operations",
      managerId: manager.id,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      name: "Kabir Employee",
      email: "kabir@demo.com",
      passwordHash,
      role: "EMPLOYEE",
      department: "Operations",
      managerId: manager.id,
    },
  });

  const cycle = await prisma.goalCycle.create({
    data: {
      year: 2026,
      name: "FY 2026-27",
      goalSettingOpenDate: new Date("2026-05-01"),
      q1OpenDate: new Date("2026-07-01"),
      q2OpenDate: new Date("2026-10-01"),
      q3OpenDate: new Date("2027-01-01"),
      q4OpenDate: new Date("2027-03-01"),
      isActive: true,
    },
  });

  await prisma.goalSheet.create({
    data: {
      employeeId: employee.id,
      cycleId: cycle.id,
      status: "DRAFT",
      goals: {
        create: [
          {
            thrustArea: "Customer Excellence",
            title: "Improve customer satisfaction score",
            description: "Increase CSAT through faster issue closure and better communication hygiene.",
            uomType: "PERCENT_MIN",
            targetValue: 90,
            weightage: 30,
          },
          {
            thrustArea: "Operational Efficiency",
            title: "Reduce ticket turnaround time",
            description: "Lower average ticket resolution time for priority cases.",
            uomType: "NUMERIC_MAX",
            targetValue: 24,
            weightage: 25,
          },
          {
            thrustArea: "Compliance",
            title: "Zero safety incidents",
            description: "Maintain zero reportable safety or process-compliance incidents.",
            uomType: "ZERO",
            targetValue: 0,
            weightage: 20,
          },
        ],
      },
    },
  });

  const submittedSheet = await prisma.goalSheet.create({
    data: {
      employeeId: employee2.id,
      cycleId: cycle.id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      goals: {
        create: [
          {
            thrustArea: "Revenue Growth",
            title: "Achieve quarterly sales target",
            description: "Deliver planned sales revenue for enterprise customers.",
            uomType: "NUMERIC_MIN",
            targetValue: 1200000,
            weightage: 40,
          },
          {
            thrustArea: "Cost Optimisation",
            title: "Reduce operating cost variance",
            description: "Maintain process cost below approved budget envelope.",
            uomType: "PERCENT_MAX",
            targetValue: 100,
            weightage: 30,
          },
          {
            thrustArea: "People Development",
            title: "Complete team training plan",
            description: "Finish planned development interventions before annual review.",
            uomType: "TIMELINE",
            targetDate: new Date("2027-03-31"),
            weightage: 30,
          },
        ],
      },
    },
    include: { goals: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: employee2.id,
      entityType: "GOAL_SHEET",
      entityId: submittedSheet.id,
      action: "SUBMIT",
      newValue: "Goal sheet submitted by seeded demo employee.",
    },
  });

  // Keep one active cycle so the employee -> manager -> admin demo path is easy to follow.

  const sharedGoal = await prisma.sharedGoal.create({
    data: {
      title: "Reduce escalated customer complaints",
      description: "Department-level KPI pushed by HR to multiple Operations employees.",
      thrustArea: "Customer Excellence",
      uomType: "NUMERIC_MAX",
      targetValue: 5,
      primaryOwnerId: employee.id,
      createdById: admin.id,
    },
  });

  const employeeSheet = await prisma.goalSheet.findUnique({
    where: { employeeId_cycleId: { employeeId: employee.id, cycleId: cycle.id } },
  });

  if (employeeSheet) {
    await prisma.goal.create({
      data: {
        goalSheetId: employeeSheet.id,
        thrustArea: sharedGoal.thrustArea,
        title: sharedGoal.title,
        description: sharedGoal.description,
        uomType: sharedGoal.uomType,
        targetValue: sharedGoal.targetValue,
        weightage: 25,
        isShared: true,
        sharedGoalId: sharedGoal.id,
      },
    });
  }

  const goals = await prisma.goal.findMany({ where: { goalSheetId: employeeSheet?.id } });
  for (const goal of goals) {
    await prisma.quarterlyAchievement.upsert({
      where: { goalId_quarter: { goalId: goal.id, quarter: "Q1" } },
      update: {},
      create: {
        goalId: goal.id,
        quarter: "Q1",
        actualValue: null,
        status: "NOT_STARTED",
        progressScore: 0,
      },
    });
  }

  console.log("Seed complete:");
  console.log("Employee: employee@demo.com / Demo1234");
  console.log("Manager: manager@demo.com / Demo1234");
  console.log("Admin: admin@demo.com / Demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
