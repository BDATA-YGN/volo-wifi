"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { CoverageLagBucket, EligibilityStatus } from "../types";
import { LAG_BUCKET_COLOR, LAG_BUCKET_ELIGIBILITY } from "../constant";
import { formatCount, formatPercent } from "../utils";

type Props = {
  buckets: CoverageLagBucket[];
  loading?: boolean;
  selectedEligibility?: EligibilityStatus;
  onSelectBucket?: (eligibility: EligibilityStatus) => void;
};

const CoverageLagChart: React.FC<Props> = ({
  buckets,
  loading,
  selectedEligibility,
  onSelectBucket,
}) => {
  const total = useMemo(() => buckets.reduce((sum, b) => sum + b.count, 0), [buckets]);
  const maxCount = useMemo(() => Math.max(...buckets.map((b) => b.count), 1), [buckets]);
  const hasData = buckets.some((b) => b.count > 0);

  return (
    <Card
      size="small"
      title="Gap distribution"
      loading={loading}
      extra={
        <WifiMutedText style={{ fontSize: 12 }}>
          Click a bar to filter the ledger
        </WifiMutedText>
      }
      styles={{ body: { padding: 16 } }}
    >
      {!hasData ? (
        <Empty description="No coverage scopes" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ minHeight: 168 }}>
          {buckets.map((bucket) => {
            const height = Math.max(8, (bucket.count / maxCount) * 120);
            const share = total > 0 ? (bucket.count / total) * 100 : 0;
            const eligibility = LAG_BUCKET_ELIGIBILITY[bucket.bucket];
            const active = eligibility != null && selectedEligibility === eligibility;
            const color = LAG_BUCKET_COLOR[bucket.bucket] ?? "#8c8c8c";

            return (
              <Tooltip
                key={bucket.bucket}
                title={
                  <div style={{ fontSize: 12 }}>
                    <div>{bucket.bucket}</div>
                    <div>Scopes: {formatCount(bucket.count)}</div>
                    <div>Share: {formatPercent(Math.round(share * 10) / 10)}</div>
                  </div>
                }
              >
                <button
                  type="button"
                  onClick={() => eligibility && onSelectBucket?.(eligibility)}
                  className="flex flex-col items-center"
                  style={{
                    minWidth: 76,
                    flex: 1,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: onSelectBucket ? "pointer" : "default",
                    opacity: selectedEligibility && !active ? 0.45 : 1,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    {formatCount(bucket.count)}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 36,
                      height,
                      background: color,
                      borderRadius: 4,
                      outline: active ? `2px solid ${color}` : undefined,
                      outlineOffset: 2,
                    }}
                  />
                  <WifiMutedText
                    style={{
                      fontSize: 10,
                      marginTop: 8,
                      textAlign: "center",
                      lineHeight: 1.2,
                      maxWidth: 88,
                    }}
                  >
                    {bucket.bucket}
                  </WifiMutedText>
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default CoverageLagChart;
