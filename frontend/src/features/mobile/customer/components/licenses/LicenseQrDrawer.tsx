"use client";

import { App, Drawer } from "antd";
import { Download } from "lucide-react";
import dayjs from "dayjs";
import { useMobileThemeStore } from "@/features/mobile/shared/mobileThemeStore";
import { getMobileDrawerStyles } from "@/features/mobile/shared/mobileDrawerChrome";
import drawerStyles from "@/features/mobile/shared/components/mobileDrawerPortal.module.css";
import type { MobileLicenseCertificateData } from "../../licenses/types";
import { certificateQrFilename, downloadDataUrlPng, formatLicenseDate } from "../../licenses/utils";
import styles from "./licenses.module.css";

interface LicenseQrDrawerProps {
  open: boolean;
  onClose: () => void;
  licenseCode: string;
  certificate: MobileLicenseCertificateData;
}

export default function LicenseQrDrawer({
  open,
  onClose,
  licenseCode,
  certificate,
}: LicenseQrDrawerProps) {
  const { message } = App.useApp();
  const colorScheme = useMobileThemeStore((s) => s.theme);
  const chrome = getMobileDrawerStyles(colorScheme);

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
    <Drawer
      title="License certificate QR"
      placement="bottom"
      size="auto"
      open={open}
      onClose={onClose}
      destroyOnHidden
      styles={{
        ...chrome,
        body: {
          ...chrome.body,
          padding: 0,
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0))",
          maxHeight: "90vh",
          overflowY: "auto",
        },
      }}
    >
      <div
        className={drawerStyles.drawerPortalTheme}
        data-theme={colorScheme}
        data-actor="customer"
      >
      <div className={styles.qrDrawerBody}>
        <p className={styles.qrDrawerHint}>
          This is the same signed code printed on your ULA license certificate. Collectors can scan
          it when recording a payment.
        </p>

        <div className={styles.qrDrawerImageWrap}>
          <img
            src={certificate.qrDataUrl}
            alt={`Certificate QR for ${licenseCode}`}
            className={styles.qrDrawerImage}
          />
        </div>

        <div className={styles.qrDrawerMeta}>
          <div className={styles.qrMetaRow}>
            <span className={styles.qrMetaLabel}>License</span>
            <span className={styles.qrMetaValue}>{licenseCode}</span>
          </div>
          <div className={styles.qrMetaRow}>
            <span className={styles.qrMetaLabel}>Serial</span>
            <span className={styles.qrMetaValueMono}>{certificate.serial}</span>
          </div>
          <div className={styles.qrMetaRow}>
            <span className={styles.qrMetaLabel}>Issued</span>
            <span className={styles.qrMetaValue}>
              {formatLicenseDate(certificate.issuedAt) ??
                dayjs(certificate.issuedAt).format("D MMM YYYY")}
            </span>
          </div>
        </div>

        <button type="button" className={styles.qrDownloadBtn} onClick={handleDownload}>
          <Download size={18} aria-hidden />
          Download QR image
        </button>
      </div>
      </div>
    </Drawer>
  );
}
