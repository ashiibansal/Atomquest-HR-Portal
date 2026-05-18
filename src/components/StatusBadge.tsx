import { Badge } from "@/components/ui";
import type { GoalSheetStatus, Quarter } from "@/lib/domain";

export function GoalSheetStatusBadge({ status, isLocked = false }: { status?: GoalSheetStatus | string | null; isLocked?: boolean }) {
  const normalized = isLocked ? "LOCKED" : status ?? "NOT_STARTED";

  const config: Record<string, { label: string; tone: "slate" | "green" | "blue" | "yellow" | "red" | "purple" }> = {
    DRAFT: { label: "Draft", tone: "yellow" },
    SUBMITTED: { label: "Submitted", tone: "blue" },
    RETURNED: { label: "Returned for Rework", tone: "red" },
    APPROVED: { label: "Approved", tone: "green" },
    LOCKED: { label: "Approved / Locked", tone: "green" },
    NOT_STARTED: { label: "Not Started", tone: "slate" },
  };

  const item = config[normalized] ?? { label: String(normalized), tone: "slate" as const };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function WindowStatusBadge({ open, label }: { open: boolean; label: string }) {
  return <Badge tone={open ? "green" : "yellow"}>{open ? `${label} Open` : `${label} Closed`}</Badge>;
}

export function QuarterBadge({ quarter, isOpen }: { quarter: Quarter; isOpen: boolean }) {
  return <Badge tone={isOpen ? "green" : "slate"}>{isOpen ? `${quarter} Active` : `${quarter} Locked`}</Badge>;
}
