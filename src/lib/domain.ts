export type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";
export type GoalSheetStatus = "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED" | "LOCKED";
export type UomType = "NUMERIC_MIN" | "NUMERIC_MAX" | "PERCENT_MIN" | "PERCENT_MAX" | "TIMELINE" | "ZERO";
export type GoalProgressStatus = "NOT_STARTED" | "ON_TRACK" | "COMPLETED";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "SUBMIT" | "APPROVE" | "RETURN" | "LOCK" | "UNLOCK" | "CHECK_IN" | "EXPORT";
export type EntityType = "USER" | "GOAL_CYCLE" | "GOAL_SHEET" | "GOAL" | "ACHIEVEMENT" | "CHECK_IN" | "SHARED_GOAL" | "REPORT";
