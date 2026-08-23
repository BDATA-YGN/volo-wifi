"use client";

import { useEffect, useState } from "react";
import { Drawer, Spin } from "antd";
import type {
  AccessTokenDetail,
  AccessTokenRecord,
  CaptiveSessionPreview,
  RadiusSessionPreview,
} from "@/features/wifi/commerce/access-tokens/types";
import {
  formatBytes,
  formatSessionDuration,
  formatStatusLabel,
} from "@/features/wifi/commerce/access-tokens/utils";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import { VoucherCodeText } from "@/features/wifi/shared/components/VoucherCodeText";
import {
  MobileDrawerBody,
  mobileDrawerStyleProps,
  useMobileDrawerChrome,
} from "@/features/mobile/shared/components/MobileDrawerChrome";
import styles from "./partner.module.css";

type Props = {
  open: boolean;
  tokenId: string | null;
  fallback?: AccessTokenRecord | null;
  onClose: () => void;
  loadToken: (id: string) => Promise<AccessTokenDetail>;
};

export default function PartnerTokenDetailDrawer({
  open,
  tokenId,
  fallback,
  onClose,
  loadToken,
}: Props) {
  const { colorScheme } = useMobileDrawerChrome("partner");
  const [detail, setDetail] = useState<AccessTokenDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !tokenId) {
      setDetail(null);
      return;
    }

    if (fallback?.id === tokenId) {
      setDetail(fallback as AccessTokenDetail);
    }

    setLoading(true);
    void loadToken(tokenId)
      .then(setDetail)
      .catch(() => {
        if (fallback?.id === tokenId) setDetail(fallback as AccessTokenDetail);
      })
      .finally(() => setLoading(false));
  }, [open, tokenId, fallback, loadToken]);

  const row = detail;
  const radiusSessions = row?.radiusSessions ?? [];
  const captiveSessions = row?.captiveSessions ?? [];

  return (
    <Drawer
      title="Token details"
      open={open}
      onClose={onClose}
      destroyOnClose
      size="auto"
      placement="bottom"
      styles={mobileDrawerStyleProps(colorScheme, {
        body: { maxHeight: "85vh", overflowY: "auto" },
      })}
    >
      <MobileDrawerBody actor="partner">
      <Spin spinning={loading}>
        {row ? (
          <div className={styles.detailStack}>
              <div className={styles.detailHero}>
              {row.token ? (
                <VoucherCodeText
                  value={row.token}
                  block
                  className={styles.detailTokenCode}
                  style={{ fontWeight: 700, fontSize: "1.35rem" }}
                />
              ) : (
                <p className={styles.detailTokenCode}>—</p>
              )}
              <p className={styles.listSecondary}>
                {row.plan?.name ?? "Plan"}
                {row.station ? ` · ${row.station.code}` : ""}
              </p>
              <span className={styles.badge}>{formatStatusLabel(row.status)}</span>
            </div>

            <div className={styles.detailMetaGrid}>
              <DetailMeta
                label="Sold"
                value={row.soldAt ? formatWifiDateTime(row.soldAt) : "—"}
              />
              <DetailMeta
                label="Activated"
                value={row.activatedAt ? formatWifiDateTime(row.activatedAt) : "—"}
              />
              <DetailMeta
                label="Expires"
                value={row.expiresAt ? formatWifiDateTime(row.expiresAt) : "—"}
              />
            </div>

            <section>
              <h3 className={styles.sectionTitle}>Network sessions</h3>
              {radiusSessions.length > 0 ? (
                <div className={styles.sessionStack}>
                  {radiusSessions.map((s) => (
                    <RadiusSessionCard key={`${s.source}-${s.id}`} session={s} />
                  ))}
                </div>
              ) : (
                <p className={styles.listSecondary}>No record.</p>
              )}
            </section>

            <section>
              <h3 className={styles.sectionTitle}>Captive portal logins</h3>
              {captiveSessions.length > 0 ? (
                <div className={styles.sessionStack}>
                  {captiveSessions.map((s) => (
                    <CaptiveSessionCard key={s.id} session={s} />
                  ))}
                </div>
              ) : (
                <p className={styles.listSecondary}>No record.</p>
              )}
            </section>
          </div>
        ) : null}
      </Spin>
      </MobileDrawerBody>
    </Drawer>
  );
}

function DetailMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.detailMetaValue}>{value}</p>
    </div>
  );
}

function RadiusSessionCard({ session }: { session: RadiusSessionPreview }) {
  const duration = formatSessionDuration(
    session.sessionTimeSec,
    session.startedAt,
    session.stoppedAt,
    session.status,
    session.createdAt,
    session.lastInterimAt
  );

  return (
    <div className={styles.sessionCard}>
      <div className={styles.listRow}>
        <span className={styles.badge}>{session.status}</span>
        {session.source === "archive" ? (
          <span className={styles.sessionArchiveTag}>Archived</span>
        ) : null}
      </div>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>MAC</span>
        <span className={styles.mono}>{session.callingStationId ?? "—"}</span>
      </p>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>IP</span>
        <span>{session.framedIpAddress ?? "—"}</span>
      </p>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>From</span>
        <span>{formatWifiDateTime(session.startedAt)}</span>
      </p>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>To</span>
        <span>
          {session.stoppedAt
            ? formatWifiDateTime(session.lastInterimAt ?? session.stoppedAt)
            : "Still online"}
        </span>
      </p>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>Duration</span>
        <span>{duration}</span>
      </p>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>Data</span>
        <span>
          {formatBytes(session.totalBytes)}
          <span className={styles.listSecondary}>
            {" "}
            (↓{formatBytes(session.outputBytes)} ↑{formatBytes(session.inputBytes)})
          </span>
        </span>
      </p>
    </div>
  );
}

function CaptiveSessionCard({ session }: { session: CaptiveSessionPreview }) {
  return (
    <div className={styles.sessionCard}>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>MAC</span>
        <span className={styles.mono}>{session.mac ?? "—"}</span>
      </p>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>IP</span>
        <span>{session.ip ?? "—"}</span>
      </p>
      <p className={styles.sessionLine}>
        <span className={styles.sessionKey}>Login</span>
        <span>{formatWifiDateTime(session.createdAt)}</span>
      </p>
    </div>
  );
}
