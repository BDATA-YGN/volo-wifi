"use client";

import { useEffect, useState } from "react";
import { loadPartnerStationScope, storePartnerStationScope } from "../station-scope";
import styles from "./partner.module.css";

export type PartnerSiteOption = {
  stationId: string;
  stationName: string;
  tokenCount: number;
  amount: number;
};

type Props = {
  sites: PartnerSiteOption[];
  value: string | null;
  onChange: (stationId: string | null) => void;
};

export default function PartnerSiteFilter({ sites, value, onChange }: Props) {
  if (sites.length < 2) return null;

  return (
    <div className={styles.siteChipRow} role="tablist" aria-label="Shop">
      <button
        type="button"
        role="tab"
        aria-selected={value == null}
        className={`${styles.siteChip} ${value == null ? styles.siteChipActive : ""}`}
        onClick={() => onChange(null)}
      >
        <span className={styles.siteChipName}>All shops</span>
        <span className={styles.siteChipMeta}>{sites.length}</span>
      </button>
      {sites.map((site) => (
        <button
          key={site.stationId}
          type="button"
          role="tab"
          aria-selected={value === site.stationId}
          className={`${styles.siteChip} ${value === site.stationId ? styles.siteChipActive : ""}`}
          onClick={() => onChange(site.stationId)}
        >
          <span className={styles.siteChipName}>{site.stationName}</span>
          <span className={styles.siteChipMeta}>{site.tokenCount}</span>
        </button>
      ))}
    </div>
  );
}

export function usePartnerStationScope(validIds: string[]): {
  stationId: string | null;
  setStationId: (id: string | null) => void;
} {
  const [stationId, setStationIdState] = useState<string | null>(null);
  const validKey = validIds.slice().sort().join("|");

  useEffect(() => {
    if (!validKey) return;
    const ids = validKey.split("|");
    const stored = loadPartnerStationScope();
    if (stored && ids.includes(stored)) {
      setStationIdState(stored);
      return;
    }
    if (stored) {
      storePartnerStationScope(null);
    }
    setStationIdState(null);
  }, [validKey]);

  const setStationId = (id: string | null) => {
    setStationIdState(id);
    storePartnerStationScope(id);
  };

  return { stationId, setStationId };
}
