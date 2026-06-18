import { PAYMENT_STATUS_META } from "../../payments/constants";
import MobileStatusBadge from "@/features/mobile/shared/components/MobileStatusBadge";

interface PaymentStatusBadgeProps {
  status: string;
}

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const meta = PAYMENT_STATUS_META[status] ?? PAYMENT_STATUS_META.PENDING;

  return <MobileStatusBadge meta={meta} />;
}
