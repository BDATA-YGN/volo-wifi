"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import dayjs from "dayjs";
import type { ApprovalDailyPoint } from "../types";


type Props = {
  points: ApprovalDailyPoint[];
  loading?: boolean;
};

const ApprovalsTrendChart: React.FC<Props> = ({ points, loading }) => {
  const maxAttestations = useMemo(
    () => Math.max(...points.map((p) => p.attestationsSigned), 1),
    [points]
  );
  const maxPostings = useMemo(
    () => Math.max(...points.map((p) => p.postingsSealed), 1),
    [points]
  );
  const showEveryNth = points.length > 14 ? Math.ceil(points.length / 10) : 1;

  return (
    <Card
      size="small"
      title="Attestation & posting activity"
      loading={loading}
      styles={{ body: { padding: 16 } }}
    >
      {points.length === 0 ? (
        <Empty description="No activity in this period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#fa8c16" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Attestations signed
              </WifiMutedText>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "#722ed1" }} />
              <WifiMutedText style={{ fontSize: 12 }}>
                Postings sealed
              </WifiMutedText>
            </div>
          </div>
          <div className="flex items-end gap-px overflow-x-auto pb-6" style={{ minHeight: 160 }}>
            {points.map((point, index) => {
              const attestationHeight = Math.max(
                4,
                (point.attestationsSigned / maxAttestations) * 120
              );
              const postingHeight = Math.max(4, (point.postingsSealed / maxPostings) * 120);

              return (
                <Tooltip
                  key={point.date}
                  title={
                    <div style={{ fontSize: 12 }}>
                      <div>{dayjs(point.date).format("D MMM YYYY")}</div>
                      <div>Attestations: {point.attestationsSigned}</div>
                      <div>Postings: {point.postingsSealed}</div>
                    </div>
                  }
                >
                  <div
                    className="flex flex-col items-center justify-end"
                    style={{ minWidth: points.length > 20 ? 18 : 28, flex: 1 }}
                  >
                    <div className="flex items-end gap-0.5" style={{ height: 124 }}>
                      <div
                        style={{
                          width: points.length > 20 ? 6 : 10,
                          height: attestationHeight,
                          background: "#fa8c16",
                          borderRadius: 2,
                          opacity: 0.9,
                        }}
                      />
                      <div
                        style={{
                          width: points.length > 20 ? 5 : 8,
                          height: postingHeight,
                          background: "#722ed1",
                          borderRadius: 2,
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    {index % showEveryNth === 0 ? (
                      <WifiMutedText
                                                style={{
                          fontSize: 10,
                          marginTop: 6,
                          transform: "rotate(-45deg)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dayjs(point.date).format("D/M")}
                      </WifiMutedText>
                    ) : (
                      <span style={{ height: 14 }} />
                    )}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};

export default ApprovalsTrendChart;
