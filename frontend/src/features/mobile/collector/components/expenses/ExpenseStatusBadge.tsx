import type { SmsExpenseStatus } from "../../expenses/interface";
import { EXPENSE_STATUS_META } from "../../expenses/constants";
import MobileStatusBadge from "@/features/mobile/shared/components/MobileStatusBadge";

interface ExpenseStatusBadgeProps {
  status: SmsExpenseStatus | string;
}

export default function ExpenseStatusBadge({ status }: ExpenseStatusBadgeProps) {
  const key = status as SmsExpenseStatus;
  const meta = EXPENSE_STATUS_META[key] ?? EXPENSE_STATUS_META.DRAFT;

  return <MobileStatusBadge meta={meta} />;
}
