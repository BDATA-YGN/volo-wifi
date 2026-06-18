import Link from "next/link";
import { ChevronRight, MapPin, QrCode, Satellite } from "lucide-react";
import clsx from "clsx";
import { resolveCurrencyCode } from "@/common/utils/formatCurrency";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import type { MobileLicense } from "../../licenses/types";
import {
  deviceTypeLabel,
  formatLicenseAmount,
  formatLicenseDate,
  isLicenseCertificatable,
  isPaidThroughExpired,
  isPaidThroughSoon,
  kitLocationLabel,
  licenseClassLabel,
  licenseNeedsAttention,
  licenseStatusLabel,
  licenseStatusTone,
  planBillingLabel,
  planPeriodFee,
} from "../../licenses/utils";
import styles from "./licenses.module.css";

interface LicenseCardProps {
  license: MobileLicense;
}

export default function LicenseCard({ license }: LicenseCardProps) {
  const attention = licenseNeedsAttention(license);
  const paidThrough = formatLicenseDate(license.paidThroughAt);
  const expired = isPaidThroughExpired(license.paidThroughAt);
  const expiringSoon = isPaidThroughSoon(license.paidThroughAt);
  const location = kitLocationLabel(license.kit);
  const periodFee = planPeriodFee(license.plan);
  const currency = resolveCurrencyCode(license.plan?.currency);

  return (
    <div
      className={clsx(styles.licenseCardWrap, attention && styles.licenseCardWrapAttention)}
    >
    <Link
      href={`${MOBILE_ROUTES.customer.licenses}/${license.id}`}
      className={styles.licenseCard}
    >
      <div className={styles.licenseTop}>
        <div>
          <h3 className={styles.licenseCode}>{license.licenseCode}</h3>
          <p className={styles.licensePlan}>
            <span className={styles.classChip}>{licenseClassLabel(license.licenseClass)}</span>
            {license.plan?.name ?? "No plan assigned"}
          </p>
        </div>
        <span className={clsx(styles.statusBadge, styles[licenseStatusTone(license.status)])}>
          {licenseStatusLabel(license.status)}
        </span>
      </div>

      <div className={styles.licenseStats}>
        <div className={styles.statBlock}>
          <span className={styles.statLabel}>Billing</span>
          <span className={styles.statValue}>
            {periodFee != null ? formatLicenseAmount(periodFee, currency, true) : "—"}
          </span>
          {license.plan ? (
            <span className={styles.summarySub}>{planBillingLabel(license.plan)}</span>
          ) : null}
        </div>
        <div className={styles.statBlock} style={{ textAlign: "right" }}>
          <span className={styles.statLabel}>Paid through</span>
          <span className={clsx(styles.statValue, (expired || expiringSoon) && styles.statValueWarn)}>
            {paidThrough ?? "—"}
          </span>
        </div>
        <ChevronRight className={styles.cardChevron} size={18} aria-hidden />
      </div>

      <div className={styles.licenseMeta}>
        {license.kit ? (
          <span className={styles.deviceLine}>
            <Satellite size={12} aria-hidden />
            {deviceTypeLabel(license.kit.starlinkType)}
            {license.kit.kitNumber ? ` · ${license.kit.kitNumber}` : ""}
          </span>
        ) : (
          <span>No device linked</span>
        )}
        {location ? (
          <span className={styles.deviceLine}>
            <MapPin size={12} aria-hidden />
            {location}
          </span>
        ) : null}
        {expired ? (
          <span className={clsx(styles.metaBadge, styles.metaBadgeDanger)}>Coverage expired</span>
        ) : expiringSoon ? (
          <span className={clsx(styles.metaBadge, styles.metaBadgeWarn)}>Expiring soon</span>
        ) : null}
        {license.status === "SUSPENDED" ? (
          <span className={clsx(styles.metaBadge, styles.metaBadgeWarn)}>Suspended</span>
        ) : null}
      </div>

    </Link>

      {isLicenseCertificatable(license.status) ? (
        <Link
          href={`${MOBILE_ROUTES.customer.licenses}/${license.id}#certificate`}
          className={styles.qrQuickLink}
        >
          <QrCode size={14} aria-hidden />
          Certificate QR
        </Link>
      ) : null}
    </div>
  );
}
