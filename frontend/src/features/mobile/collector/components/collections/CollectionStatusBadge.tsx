import { COLLECTION_STATUS_META } from "../../collections/constants";
import MobileStatusBadge from "@/features/mobile/shared/components/MobileStatusBadge";

interface CollectionStatusBadgeProps {
  result: string;
}

export default function CollectionStatusBadge({ result }: CollectionStatusBadgeProps) {
  const meta = COLLECTION_STATUS_META[result] ?? COLLECTION_STATUS_META.PENDING;

  return <MobileStatusBadge meta={meta} />;
}
