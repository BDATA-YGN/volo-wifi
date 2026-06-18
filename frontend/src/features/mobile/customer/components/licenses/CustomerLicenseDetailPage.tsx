"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ExternalLink, FileText, MapPin } from "lucide-react";
import clsx from "clsx";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { resolveCurrencyCode } from "@/common/utils/formatCurrency";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import * as LicenseApi from "../../licenses/query";
import {
  deviceTypeLabel,
  formatLicenseAmount,
  formatLicenseDate,
  isLicenseCertificatable,
  isPaidThroughExpired,
  isPaidThroughSoon,
  kitLocationLabel,
  kitMapsUrl,
  kitStatusLabel,
  licenseClassLabel,
  licenseStatusLabel,
  planBillingLabel,
  planPeriodFee,
} from "../../licenses/utils";
import LicenseCertificateSection from "./LicenseCertificateSection";
import styles from "./licenses.module.css";

interface CustomerLicenseDetailPageProps {
  licenseId: string;
}

export default function CustomerLicenseDetailPage({ licenseId }: CustomerLicenseDetailPageProps) {
  const detailQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["license", licenseId]),
    queryFn: () => LicenseApi.getCustomerLicense(licenseId),
  });

  const license = detailQuery.data;
  const expired = license ? isPaidThroughExpired(license.paidThroughAt) : false;
  const expiringSoon = license ? isPaidThroughSoon(license.paidThroughAt) : false;
  const mapsUrl = license ? kitMapsUrl(license.kit) : null;
  const periodFee = license ? planPeriodFee(license.plan) : null;
  const currency = resolveCurrencyCode(license?.plan?.currency);

  useEffect(() => {
    if (!license || window.location.hash !== "#certificate") return;
    const timer = window.setTimeout(() => {
      document.getElementById("certificate")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [license]);

  if (detailQuery.isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading license…</span>
      </div>
    );
  }

  if (detailQuery.isError || !license) {
    return (
      <div className={styles.page}>
        <Link href={MOBILE_ROUTES.customer.licenses} className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden />
          Back to licenses
        </Link>
        <div className={styles.errorWrap}>
          License not found.
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => void detailQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Link href={MOBILE_ROUTES.customer.licenses} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden />
        Back to licenses
      </Link>

      {license.status === "SUSPENDED" ? (
        <div className={styles.alertBanner} role="status">
          <AlertTriangle size={18} aria-hidden />
          <div>
            <span className={styles.alertTitle}>License suspended</span>
            Service may be interrupted. Contact support if you need help restoring access.
          </div>
        </div>
      ) : null}

      {expired ? (
        <div className={clsx(styles.alertBanner, styles.alertBannerDanger)} role="status">
          <AlertTriangle size={18} aria-hidden />
          <div>
            <span className={styles.alertTitle}>Coverage expired</span>
            Paid-through date has passed. Check invoices to bring your account current.
          </div>
        </div>
      ) : expiringSoon ? (
        <div className={styles.alertBanner} role="status">
          <AlertTriangle size={18} aria-hidden />
          <div>
            <span className={styles.alertTitle}>Coverage expiring soon</span>
            Your paid-through date is within the next week. Review unpaid invoices to avoid interruption.
          </div>
        </div>
      ) : null}

      <section className={styles.detailHero} aria-label="License summary">
        <div className={styles.detailHeroTop}>
          <div>
            <h1 className={styles.detailLicenseCode}>{license.licenseCode}</h1>
            <p className={styles.detailPlanName}>
              <span className={styles.classChip}>{licenseClassLabel(license.licenseClass)}</span>
              {license.plan?.name ?? "No plan assigned"}
            </p>
          </div>
          <span className={clsx(styles.statusBadge, styles.detailHeroBadge)}>
            {licenseStatusLabel(license.status)}
          </span>
        </div>
        <div>
          <div className={styles.detailHeroStatLabel}>Recurring charge</div>
          <div className={styles.detailHeroStatValue}>
            {periodFee != null ? formatLicenseAmount(periodFee, currency) : "—"}
          </div>
          {license.plan ? (
            <p className={styles.detailPlanName}>{planBillingLabel(license.plan)}</p>
          ) : null}
        </div>
      </section>

      <section className={styles.section} aria-label="Service dates">
        <div className={styles.sectionHeader}>Service dates</div>
        <div className={styles.infoGrid}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Activated</span>
            <span className={styles.infoValue}>{formatLicenseDate(license.activatedAt) ?? "—"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Handed over</span>
            <span className={styles.infoValue}>{formatLicenseDate(license.handedOverAt) ?? "—"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Paid through</span>
            <span
              className={clsx(
                styles.infoValue,
                (expired || expiringSoon) && styles.infoValueWarn,
              )}
            >
              {formatLicenseDate(license.paidThroughAt) ?? "—"}
            </span>
          </div>
        </div>
      </section>

      {license.plan ? (
        <section className={styles.section} aria-label="Plan">
          <div className={styles.sectionHeader}>Plan</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>{license.plan.name}</span>
            </div>
            {/* <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Device type</span>
              <span className={styles.infoValue}>{deviceTypeLabel(license.plan.starlinkType)}</span>
            </div> */}
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Billing</span>
              <span className={styles.infoValue}>{planBillingLabel(license.plan)}</span>
            </div>
            {/* <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Monthly fee</span>
              <span className={styles.infoValue}>
                {formatLicenseAmount(license.plan.monthlyFee, license.plan.currency)}
              </span>
            </div> */}
          </div>
        </section>
      ) : null}

      <section className={styles.section} aria-label="Device">
        <div className={styles.sectionHeader}>Device</div>
        {license.kit ? (
          <>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Terminal</span>
                <span className={styles.infoValue}>{deviceTypeLabel(license.kit.starlinkType)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Kit status</span>
                <span className={styles.infoValue}>{kitStatusLabel(license.kit.kitStatus)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Kit number</span>
                <span className={styles.infoValue}>{license.kit.kitNumber ?? "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Dish S/N</span>
                <span className={styles.infoValue}>{license.kit.dishSn ?? "—"}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Router S/N</span>
                <span className={styles.infoValue}>{license.kit.routerSn ?? "—"}</span>
              </div>
            </div>
            {kitLocationLabel(license.kit) ? (
              <div className={styles.locationBlock}>
                <p className={styles.locationText}>
                  {/* <MapPin size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} aria-hidden /> */}
                  {kitLocationLabel(license.kit)}
                </p>
                {/* {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={clsx(styles.actionLink, styles.actionLinkPrimary)}
                  >
                    <ExternalLink size={16} aria-hidden />
                    Open in Maps
                  </a>
                ) : null} */}
              </div>
            ) : null}
          </>
        ) : (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Status</span>
            <span className={styles.infoValue}>No device linked yet</span>
          </div>
        )}
      </section>

      {isLicenseCertificatable(license.status) ? (
        <LicenseCertificateSection licenseId={license.id} licenseCode={license.licenseCode} />
      ) : null}

      <div className={styles.actionLinks}>
        <Link href={MOBILE_ROUTES.customer.invoices} className={styles.actionLink}>
          <FileText size={16} aria-hidden />
          View invoices
        </Link>
      </div>
    </div>
  );
}
