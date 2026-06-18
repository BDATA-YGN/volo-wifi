"use client";

import React from "react";
import { Card, Col, Descriptions, Divider, Row, Tag, Typography } from "antd";
import type { FormInstance } from "antd";
import dayjs from "dayjs";
import type { StationTierPrerequisite, TenantRegistrationFormValues } from "../types";
import { formatMoney } from "../utils";
import TierRatePreviewTable from "./TierRatePreviewTable";

const { Paragraph, Text, Title } = Typography;

interface Props {
  form: FormInstance<TenantRegistrationFormValues>;
  tiers: StationTierPrerequisite[];
}

const StepReview: React.FC<Props> = ({ form, tiers }) => {
  const values = form.getFieldsValue(true) as TenantRegistrationFormValues;

  return (
    <div>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Review the tenant profile before committing. Registration creates the organization, active
        subscription, and owner account in a single transaction.
      </Paragraph>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Organization">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">{values.orgName}</Descriptions.Item>
              <Descriptions.Item label="Code">
                <Tag>{values.orgCode}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Timezone">{values.timezone}</Descriptions.Item>
              <Descriptions.Item label="Currency">{values.currency}</Descriptions.Item>
              {values.orgDescription ? (
                <Descriptions.Item label="Description">{values.orgDescription}</Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Subscription">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Site limit">{values.stationLimit}</Descriptions.Item>
              <Descriptions.Item label="Billing cycle">Monthly</Descriptions.Item>
              <Descriptions.Item label="Effective from">
                {dayjs.isDayjs(values.effectiveFrom)
                  ? values.effectiveFrom.format("YYYY-MM-DD")
                  : String(values.effectiveFrom ?? "—")}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color="green">ACTIVE</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={24}>
          <Card size="small" title="Owner account">
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Name">{values.ownerFullName}</Descriptions.Item>
              <Descriptions.Item label="Username">{values.ownerUsername}</Descriptions.Item>
              <Descriptions.Item label="Email">{values.ownerEmail || "—"}</Descriptions.Item>
              <Descriptions.Item label="Phone">{values.ownerPhone || "—"}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Divider />

      <Title level={5}>Billing rates</Title>
      {values.usePlatformTierRates ? (
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Platform default monthly rates will apply unless tenant-specific overrides are added later.
        </Paragraph>
      ) : (
        <Paragraph type="secondary" style={{ fontSize: 13 }}>
          Custom tenant tier rates configured at registration:
        </Paragraph>
      )}

      <div className="space-y-2">
        {tiers.map((tier, index) => {
          const override = values.tierRateOverrides?.[index];
          const price = values.usePlatformTierRates
            ? tier.platformPrice
            : override
              ? { unitPrice: override.unitPrice, currency: override.currency || values.currency }
              : null;
          return (
            <div key={tier.id} className="flex justify-between text-sm">
              <span>
                {tier.name} <Text type="secondary">({tier.code})</Text>
              </span>
              <span>
                {price ? formatMoney(price.unitPrice, price.currency || values.currency) : "—"} / site
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepReview;
