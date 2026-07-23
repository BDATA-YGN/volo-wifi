"use client";

import React, { useMemo } from "react";
import { Card, Empty, Tooltip, Typography } from "antd";
import type { CoverageLagBucket } from "../types";

const { Text } = Typography;

type Props = {
  buckets: CoverageLagBucket[];
  loading?: boolean;
};

const CoverageLagChart: React.FC<Props> = ({ buckets, loading }) => {
  const maxCount = useMemo(() => Math.max(...buckets.map((b) => b.count), 1), [buckets]);

  return (
    <Card size="small" title="Gap distribution" loading={loading} styles={{ body: { padding: 16 } }}>
      {buckets.length === 0 ? (
        <Empty description="No coverage scopes" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="flex items-end gap-3 overflow-x-auto pb-2" style={{ minHeight: 140 }}>
          {buckets.map((bucket) => {
            const height = Math.max(8, (bucket.count / maxCount) * 100);
            return (
              <Tooltip key={bucket.bucket} title={`${bucket.bucket}: ${bucket.count}`}>
                <div className="flex flex-col items-center" style={{ minWidth: 72, flex: 1 }}>
                  <Text strong style={{ fontSize: 12, marginBottom: 4 }}>
                    {bucket.count}
                  </Text>
                  <div
                    style={{
                      width: 28,
                      height,
                      background:
                        bucket.bucket === "Fully sealed"
                          ? "#52c41a"
                          : bucket.bucket === "No coverage record"
                            ? "#ff4d4f"
                            : bucket.bucket === "Unsealed posting"
                              ? "#1677ff"
                              : "#faad14",
                      borderRadius: 4,
                      opacity: 0.9,
                    }}
                  />
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 10,
                      marginTop: 8,
                      textAlign: "center",
                      lineHeight: 1.2,
                      maxWidth: 80,
                    }}
                  >
                    {bucket.bucket}
                  </Text>
                </div>
              </Tooltip>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default CoverageLagChart;
