"use client";

import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { mobileFetch } from "../api-client";
import { MOBILE_API_ROUTES } from "../constants";
import styles from "./mobile.module.css";

interface MobileHomeSummaryProps {
  apiPath: string;
  title: string;
  description: string;
  actor?: "collector" | "customer";
}

export default function MobileHomeSummary({
  apiPath,
  title,
  description,
  actor = apiPath.includes("/collector/") ? "collector" : "customer",
}: MobileHomeSummaryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: mobileQueryKey(actor, ["home-summary", apiPath]),
    queryFn: () => mobileFetch<Record<string, unknown>>(apiPath, { actor }),
  });

  return (
    <section className={styles.screen}>
      <h2 className={styles.screenTitle}>{title}</h2>
      <p className={styles.screenDesc}>{description}</p>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
          <Spin />
        </div>
      ) : error ? (
        <div className={styles.placeholder}>
          {(error as Error).message || "Could not load summary."}
        </div>
      ) : (
        <pre
          className={styles.placeholder}
          style={{ overflow: "auto", fontSize: "0.75rem", whiteSpace: "pre-wrap" }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  );
}
