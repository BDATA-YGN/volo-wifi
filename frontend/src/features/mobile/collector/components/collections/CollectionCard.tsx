import Link from "next/link";
import type { MobileCollectionRecord } from "../../collections/types";
import {
  formatMmk,
  formatScheduleLabel,
  isVisitOverdue,
} from "../../collections/utils";
import CollectionStatusBadge from "./CollectionStatusBadge";
import styles from "./collections.module.css";

interface CollectionCardProps {
  collection: MobileCollectionRecord;
}

export default function CollectionCard({ collection }: CollectionCardProps) {
  const overdue = isVisitOverdue(collection.scheduledAt, collection.result);
  const customerName = collection.license?.customer?.fullName ?? "Customer";
  const licenseCode = collection.license?.licenseCode ?? "License";
  const township = collection.license?.customer?.township;

  return (
    <Link
      href={`/collector/collections/${collection.id}`}
      className={`${styles.collectionCard} ${overdue ? styles.collectionCardOverdue : ""}`}
    >
      <div className={styles.collectionTop}>
        <div>
          <h3 className={styles.collectionTitle}>{customerName}</h3>
          <p className={styles.collectionSub}>
            {licenseCode}
            {township ? ` · ${township}` : null}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
          <CollectionStatusBadge result={collection.result} />
          {overdue ? <span className={styles.overdueBadge}>Overdue</span> : null}
        </div>
      </div>

      <div className={styles.collectionMeta}>
        <span>{formatScheduleLabel(collection.scheduledAt, collection.result)}</span>
        {collection.invoice ? (
          <span>Due {formatMmk(collection.invoice.balanceDue, collection.invoice.currency)}</span>
        ) : null}
        {["COLLECTED", "PARTIAL"].includes(collection.result) && collection.collectedAmount > 0 ? (
          <span>Collected {formatMmk(collection.collectedAmount)}</span>
        ) : null}
      </div>
    </Link>
  );
}
