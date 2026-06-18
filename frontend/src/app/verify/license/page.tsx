"use client";

import React, { useEffect, useState } from "react";
import { Card, Descriptions, Result, Spin, Tag, Typography } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { LicenseVerificationResult } from "@/features/mobile/shared/license-verification";
import styles from "./page.module.css";

const { Title, Text, Paragraph } = Typography;

async function verifyToken(_token: string): Promise<LicenseVerificationResult & { valid: boolean }> {
  return {
    valid: false,
    reason: "License verification is not available. The SMS billing module has been removed.",
  };
}

export default function VerifyLicensePage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<(LicenseVerificationResult & { valid: boolean }) | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("t") ?? params.get("token") ?? "";
    if (!token.trim()) {
      setResult({ valid: false, reason: "No verification token in URL." });
      setLoading(false);
      return;
    }
    void verifyToken(token.trim())
      .then(setResult)
      .catch(() => setResult({ valid: false, reason: "Could not reach verification service." }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className={styles.page}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(160deg, #f5f0e6 0%, #e8eef5 50%, #faf8f3 100%)",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 560, borderRadius: 12 }} variant="borderless">
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src="/assets/ula.svg"
            alt="United League of Arakan"
            style={{ height: 44, width: "auto", display: "inline-block" }}
          />
          <Title level={3} style={{ marginTop: 12, marginBottom: 4 }}>
            United League of Arakan
          </Title>
          <Text type="secondary" className={styles.mm} style={{ display: "block" }}>
            ရက္ခိုင်အမျိုးသားအဖွဲ့ချုပ် · Starlink license verification
          </Text>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <Spin size="large" />
            <Paragraph type="secondary" style={{ marginTop: 16 }}>
              Validating cryptographic signature…
            </Paragraph>
          </div>
        ) : result?.valid && result.license ? (
          <Result
            status="success"
            icon={<CheckCircleOutlined />}
            title="Authentic certificate"
            subTitle={`Serial ${result.certificate?.serial ?? "—"}`}
            extra={
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="License code">
                  <Text strong copyable>
                    {result.license.licenseCode}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Class">{result.license.licenseClass}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color="success">{result.license.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Customer">
                  <span className={styles.mm}>{result.license.customer?.fullName ?? "—"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Township">
                  {result.license.customer?.township ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Issued">
                  {result.certificate?.issuedAt
                    ? dayjs(result.certificate.issuedAt).format("DD MMM YYYY")
                    : "—"}
                </Descriptions.Item>
              </Descriptions>
            }
          />
        ) : (
          <Result
            status="error"
            icon={<CloseCircleOutlined />}
            title="Verification failed"
            subTitle={result?.reason ?? "This certificate could not be verified."}
          />
        )}

        <Paragraph type="secondary" style={{ fontSize: 11, marginTop: 16, marginBottom: 0 }}>
          Certificates use HMAC-SHA256 signed payloads (ISO/IEC 18004 QR, error correction level H).
          Forged documents without a valid server signature will not pass this check.
        </Paragraph>
      </Card>
    </div>
  );
}
