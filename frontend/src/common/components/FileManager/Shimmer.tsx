"use client";

import { Skeleton } from 'antd';

const GridShimmer = () => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
      gap: 16,
      padding: 16,
    }}
  >
    {Array.from({ length: 10 }).map((_, index) => (
      <Skeleton.Node
        key={index}
        active
        style={{
          width: "100%",
          height: 180,
        }}
      />
    ))}
  </div>
);

const ListShimmer = () => (
  <div style={{ padding: 16 }}>
    <Skeleton active avatar paragraph={{ rows: 1 }} />
    <Skeleton active avatar paragraph={{ rows: 1 }} />
    <Skeleton active avatar paragraph={{ rows: 1 }} />
  </div>
);

export { GridShimmer, ListShimmer };