"use client";

import { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button, Spin } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as CollectionApi from "../../collections/query";
import {
  canRecordOutcome,
  formatMmk,
  formatScheduleLabel,
  isVisitOverdue,
  kitLocationLabel,
  mapsUrlForCollection,
  methodLabel,
} from "../../collections/utils";
import CollectionStatusBadge from "./CollectionStatusBadge";
import RecordOutcomeDrawer from "./RecordOutcomeDrawer";
import styles from "./collections.module.css";

interface CollectorCollectionDetailPageProps {
  collectionId: string;
}

export default function CollectorCollectionDetailPage({
  collectionId,
}: CollectorCollectionDetailPageProps) {
  const queryClient = useQueryClient();
  const [outcomeOpen, setOutcomeOpen] = useState(false);

  const collectionQuery = useQuery({
    queryKey: ["mobile-collector-collection", collectionId],
    queryFn: () => CollectionApi.getCollectorCollection(collectionId),
  });

  const collection = collectionQuery.data;
  const overdue =
    collection && isVisitOverdue(collection.scheduledAt, collection.result);
  const mapsUrl = collection ? mapsUrlForCollection(collection) : null;
  const locationLabel = collection ? kitLocationLabel(collection) : null;
  const showRecord = collection ? canRecordOutcome(collection) : false;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["mobile-collector-collection", collectionId] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-collector-collections"] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-collector-collections-overdue-count"] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-collector-home"] }),
    ]);
  };

  if (collectionQuery.isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading visit…</span>
      </div>
    );
  }

  if (collectionQuery.isError || !collection) {
    return (
      <div className={styles.page}>
        <Link href="/collector/collections" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Back to collections
        </Link>
        <div className={styles.errorWrap}>
          Collection visit not found.
          <button type="button" className={styles.retryBtn} onClick={() => void collectionQuery.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href="/collector/collections" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Back to collections
      </Link>

      <div className={styles.detailHero}>
        <div className={styles.detailHeroTop}>
          <div>
            <h2 className={styles.detailLicense}>{collection.license?.licenseCode ?? "License"}</h2>
            <p className={styles.detailCustomer}>
              {collection.license?.customer?.fullName ?? "Customer"}
              {collection.license?.customer?.township
                ? ` · ${collection.license.customer.township}`
                : null}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
            <CollectionStatusBadge result={collection.result} />
            {overdue ? <span className={styles.overdueBadge}>Overdue</span> : null}
          </div>
        </div>
        <p className={styles.detailCustomer}>
          {formatScheduleLabel(collection.scheduledAt, collection.result)}
        </p>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>Customer & invoice</div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Customer</span>
          <span className={styles.detailValue}>
            {collection.license?.customer?.fullName ?? "—"}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Address</span>
          <span className={styles.detailValue}>
            {collection.license?.customer?.addressLine1 ?? locationLabel ?? "—"}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Target invoice</span>
          <span className={styles.detailValue}>{collection.invoice?.invoiceNo ?? "—"}</span>
        </div>
        {collection.invoice ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Balance due</span>
            <span className={styles.detailValue}>
              {formatMmk(collection.invoice.balanceDue, collection.invoice.currency)}
            </span>
          </div>
        ) : null}
      </div>

      {(locationLabel || mapsUrl) && (
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Device location</div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Kit</span>
            <span className={styles.detailValue}>
              {collection.license?.kit?.kitNumber ?? "—"}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Site</span>
            <span className={styles.detailValue}>{locationLabel ?? "—"}</span>
          </div>
          {mapsUrl ? (
            <div style={{ padding: "0 1rem 1rem" }}>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mapBtn}
              >
                <MapPin size={16} aria-hidden />
                Open in Maps
              </a>
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.detailSection}>
        <div className={styles.detailSectionTitle}>Visit</div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Scheduled</span>
          <span className={styles.detailValue}>
            {collection.scheduledAt
              ? dayjs(collection.scheduledAt).format("D MMM YYYY, HH:mm")
              : "—"}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Visited</span>
          <span className={styles.detailValue}>
            {collection.visitedAt
              ? dayjs(collection.visitedAt).format("D MMM YYYY, HH:mm")
              : "—"}
          </span>
        </div>
        {["COLLECTED", "PARTIAL"].includes(collection.result) ? (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Collected</span>
            <span className={styles.detailValue}>
              {formatMmk(collection.collectedAmount)}
            </span>
          </div>
        ) : null}
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Note</span>
          <span className={styles.detailValue}>{collection.note || "—"}</span>
        </div>
        <div className={styles.detailHint}>
          {showRecord
            ? "Record the visit outcome when you return from the customer site."
            : collection.payment?.status === "PENDING"
              ? "Payment is pending finance confirmation before invoice balances update."
              : "This visit is closed."}
        </div>
      </div>

      {collection.payment ? (
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Payment</div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Amount</span>
            <span className={styles.detailValue}>
              {formatMmk(collection.payment.amount, collection.payment.currency)}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Status</span>
            <span className={styles.detailValue}>{collection.payment.status}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Method</span>
            <span className={styles.detailValue}>{methodLabel(collection.payment.method)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Reference</span>
            <span className={styles.detailValue}>{collection.payment.referenceNo || "—"}</span>
          </div>
        </div>
      ) : null}

      {showRecord ? (
        <div className={styles.stickyAction}>
          <Button
            type="primary"
            block
            size="large"
            onClick={() => setOutcomeOpen(true)}
          >
            Record visit outcome
          </Button>
        </div>
      ) : null}

      <RecordOutcomeDrawer
        open={outcomeOpen}
        collection={collection}
        onClose={() => setOutcomeOpen(false)}
        onRecorded={() => void refresh()}
      />
    </div>
  );
}
