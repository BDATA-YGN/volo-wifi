"use client";

import { useState } from "react";
import { Download, Expand, QrCode } from "lucide-react";
import { App, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import * as LicenseApi from "../../licenses/query";
import {
  certificateQrFilename,
  downloadDataUrlPng,
  formatLicenseDate,
} from "../../licenses/utils";
import LicenseQrDrawer from "./LicenseQrDrawer";
import styles from "./licenses.module.css";

interface LicenseCertificateSectionProps {
  licenseId: string;
  licenseCode: string;
}

export default function LicenseCertificateSection({
  licenseId,
  licenseCode,
}: LicenseCertificateSectionProps) {
  const { message } = App.useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const certQuery = useQuery({
    queryKey: mobileQueryKey("customer", ["license-certificate", licenseId]),
    queryFn: () => LicenseApi.getCustomerLicenseCertificate(licenseId),
  });

  if (certQuery.isLoading) {
    return (
      <section className={styles.section} id="certificate" aria-label="Certificate QR">
        <div className={styles.sectionHeader}>Certificate QR</div>
        <div className={styles.qrLoadingWrap}>
          <Spin size="small" />
          <span>Loading certificate…</span>
        </div>
      </section>
    );
  }

  if (certQuery.isError || !certQuery.data) {
    return (
      <section className={styles.section} id="certificate" aria-label="Certificate QR">
        <div className={styles.sectionHeader}>Certificate QR</div>
        <div className={styles.qrErrorWrap}>
          Could not load certificate QR.
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => void certQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  const { certificate } = certQuery.data;

  const handleDownload = async () => {
    const result = await downloadDataUrlPng(
      certificate.qrDataUrl,
      certificateQrFilename(licenseCode),
    );
    if (result.ok) {
      message.success(result.message ?? "Certificate QR saved.");
    } else {
      message.error(result.message ?? "Could not save the QR image.");
    }
  };

  return (
    <>
      <section className={styles.section} id="certificate" aria-label="Certificate QR">
        <div className={styles.sectionHeader}>Certificate QR</div>

        <div className={styles.qrSectionBody}>
          <p className={styles.qrSectionHint}>
            Same signed code as your printed ULA certificate — collectors can scan it to identify
            this license when taking payment.
          </p>

          <div className={styles.qrPreviewRow}>
            <button
              type="button"
              className={styles.qrPreviewBtn}
              onClick={() => setDrawerOpen(true)}
              aria-label={`View full certificate QR for ${licenseCode}`}
            >
              <img
                src={certificate.qrDataUrl}
                alt=""
                className={styles.qrPreviewImage}
                aria-hidden
              />
              <span className={styles.qrPreviewOverlay}>
                <Expand size={20} aria-hidden />
                Tap to enlarge
              </span>
            </button>

            <div className={styles.qrPreviewInfo}>
              <div className={styles.qrInfoLine}>
                <QrCode size={16} aria-hidden />
                <span className={styles.qrMetaValueMono}>{certificate.serial}</span>
              </div>
              <p className={styles.qrIssuedText}>
                Issued {formatLicenseDate(certificate.issuedAt) ?? "—"}
              </p>
              <div className={styles.qrActionRow}>
                <button
                  type="button"
                  className={styles.qrActionBtn}
                  onClick={() => setDrawerOpen(true)}
                >
                  <Expand size={16} aria-hidden />
                  View
                </button>
                <button type="button" className={styles.qrActionBtnPrimary} onClick={handleDownload}>
                  <Download size={16} aria-hidden />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LicenseQrDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        licenseCode={licenseCode}
        certificate={certificate}
      />
    </>
  );
}
