"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as SharedApi from "../../shared/query";
import styles from "../support/support.module.css";

const MAP_CENTER: [number, number] = [19.7633, 96.0785];
const MAP_ZOOM = 6;

const CollectorMapLeaflet = dynamic(() => import("./CollectorMapLeaflet"), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingWrap} style={{ minHeight: "16rem" }}>
      <Spin />
      <span>Loading map…</span>
    </div>
  ),
});

export default function CollectorMapPage() {
  const listRef = useRef<HTMLDivElement>(null);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const pinsQuery = useQuery({
    queryKey: mobileQueryKey("collector", ["map-pins"]),
    queryFn: () => SharedApi.listCollectorMapPins(),
  });

  const pins = pinsQuery.data ?? [];
  const pinsWithCoords = useMemo(
    () => pins.filter((p) => p.kit?.latitude != null && p.kit?.longitude != null),
    [pins],
  );

  useEffect(() => {
    if (pinsQuery.isSuccess && pinsWithCoords.length === 0 && listRef.current) {
      listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pinsQuery.isSuccess, pinsWithCoords.length]);

  return (
    <div className={styles.page}>
      <p className={styles.pageIntro}>
        Pending collection visits with GPS coordinates from assigned kits.
      </p>

      {pinsQuery.isLoading ? (
        <div className={styles.loadingWrap}>
          <Spin />
          <span>Loading locations…</span>
        </div>
      ) : pinsQuery.isError ? (
        <div className={styles.errorWrap}>Could not load map data.</div>
      ) : (
        <>
          {pinsWithCoords.length > 0 && clientReady ? (
            <div className={styles.mapWrap}>
              <CollectorMapLeaflet pins={pinsWithCoords} center={MAP_CENTER} zoom={MAP_ZOOM} />
            </div>
          ) : pinsWithCoords.length > 0 ? (
            <div className={styles.mapWrap}>
              <div className={styles.loadingWrap} style={{ minHeight: "18rem" }}>
                <Spin />
                <span>Loading map…</span>
              </div>
            </div>
          ) : (
            <div className={styles.emptyWrap}>
              <strong>No GPS pins yet</strong>
              <span>Assigned pending visits need kit latitude/longitude to appear on the map.</span>
            </div>
          )}

          <div ref={listRef} className={styles.mapList}>
            {pins.map((pin) => (
              <Link
                key={pin.collectionId}
                href={`/collector/collections/${pin.collectionId}`}
                className={styles.mapListItem}
              >
                <strong>{pin.licenseCode}</strong>
                <div className={styles.mapListItemMeta}>
                  {pin.customerName ?? "Customer"}
                  {pin.township ? ` · ${pin.township}` : ""}
                </div>
                {pin.kit?.addressLine1 ? (
                  <div className={styles.mapListItemAddress}>{pin.kit.addressLine1}</div>
                ) : null}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
