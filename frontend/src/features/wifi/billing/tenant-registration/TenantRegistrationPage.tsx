"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/common/exceptions/handleApiError";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Grid,
  Row,
  Space,
  Spin,
  Steps,
  Typography,
  theme,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

import { WIZARD_STEPS } from "./constant";
import { getRegistrationPrerequisites, registerTenant } from "./query";
import type {
  RegistrationPrerequisites,
  TenantRegistrationFormValues,
  TenantRegistrationResult,
} from "./types";
import { slugifyOrgCode } from "./utils";
import PrerequisitesAlert from "./components/PrerequisitesAlert";
import OnboardingContextPanel from "./components/OnboardingContextPanel";
import StepOrganization from "./components/StepOrganization";
import StepSubscription from "./components/StepSubscription";
import StepOwner from "./components/StepOwner";
import StepReview from "./components/StepReview";
import RegistrationSuccess from "./components/RegistrationSuccess";

const { Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const STEP_FIELDS: (keyof TenantRegistrationFormValues)[][] = [
  ["orgName", "orgCode", "timezone", "currency"],
  ["stationLimit", "effectiveFrom"],
  ["ownerFullName", "ownerUsername", "ownerPassword", "ownerConfirmPassword"],
  [],
];

const TenantRegistrationPage: React.FC = () => {
  const [form] = Form.useForm<TenantRegistrationFormValues>();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const screens = useBreakpoint();

  const [currentStep, setCurrentStep] = useState(0);
  const [prerequisites, setPrerequisites] = useState<RegistrationPrerequisites | null>(null);
  const [prereqLoading, setPrereqLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TenantRegistrationResult | null>(null);
  const codeTouchedRef = useRef(false);

  const currency = Form.useWatch("currency", form) || "MMK";
  const usePlatformTierRates = Form.useWatch("usePlatformTierRates", form);

  const loadPrerequisites = useCallback(async () => {
    setPrereqLoading(true);
    try {
      const data = await getRegistrationPrerequisites();
      setPrerequisites(data);
      const overrides = data.tiers.map((tier) => ({
        stationSizeId: tier.id,
        unitPrice: tier.platformPrice ? Number(tier.platformPrice.unitPrice) : 0,
        currency: tier.platformPrice?.currency || "MMK",
      }));
      form.setFieldsValue({ tierRateOverrides: overrides });
    } catch {
      message.error("Failed to load platform prerequisites");
    } finally {
      setPrereqLoading(false);
    }
  }, [form, message]);

  useEffect(() => {
    void loadPrerequisites();
  }, [loadPrerequisites]);

  useEffect(() => {
    if (usePlatformTierRates === false && prerequisites?.tiers.length) {
      const overrides = prerequisites.tiers.map((tier) => ({
        stationSizeId: tier.id,
        unitPrice: tier.platformPrice ? Number(tier.platformPrice.unitPrice) : 0,
        currency: tier.platformPrice?.currency || currency,
      }));
      form.setFieldsValue({ tierRateOverrides: overrides });
    }
  }, [usePlatformTierRates, prerequisites, currency, form]);

  const goNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields.length) {
      try {
        await form.validateFields(fields);
      } catch {
        return;
      }
      if (currentStep === 1 && usePlatformTierRates === false) {
        try {
          await form.validateFields(["tierRateOverrides"]);
        } catch {
          return;
        }
      }
    }
    setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const raw = form.getFieldsValue(true) as TenantRegistrationFormValues & {
      effectiveFrom: Dayjs;
      expiresAt?: Dayjs | null;
    };

    setSubmitting(true);
    try {
      const payload: TenantRegistrationFormValues = {
        ...raw,
        effectiveFrom: raw.effectiveFrom.toISOString(),
        expiresAt: raw.expiresAt ? raw.expiresAt.toISOString() : null,
        tierRateOverrides: raw.usePlatformTierRates
          ? []
          : (raw.tierRateOverrides ?? []).map((row, index) => ({
              stationSizeId: tiers[index]?.id ?? row.stationSizeId,
              unitPrice: Number(row.unitPrice),
              currency: row.currency || currency,
            })),
      };
      const data = await registerTenant(payload);
      setResult(data);
      message.success("Tenant registered successfully");
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    codeTouchedRef.current = false;
    setResult(null);
    setCurrentStep(0);
    form.resetFields();
    form.setFieldsValue({
      timezone: "Asia/Yangon",
      currency: "MMK",
      billingCycle: "MONTHLY",
      stationLimit: 5,
      effectiveFrom: dayjs(),
      usePlatformTierRates: true,
    });
    void loadPrerequisites();
  };

  const canProceed = prerequisites?.ready === true;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const tiers = prerequisites?.tiers ?? [];

  if (result) {
    return <RegistrationSuccess result={result} onRegisterAnother={resetWizard} />;
  }

  return (
    <Spin spinning={prereqLoading} indicator={<LoadingOutlined />}>
      <div className="mb-6">
        <Title level={4} style={{ marginBottom: 4 }}>
          Tenant Registration
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 720 }}>
          Onboard a new WiFi tenant with organization profile, active subscription, and primary owner
          account — Step 1 of the platform lifecycle.
        </Paragraph>
      </div>

      <PrerequisitesAlert prerequisites={prerequisites} loading={prereqLoading} />

      <Row gutter={[24, 24]}>
        <Col xs={24} xl={17}>
          <Card
            styles={{ body: { padding: screens.md ? 28 : 20 } }}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            <Steps
              current={currentStep}
              size={screens.md ? "default" : "small"}
              orientation={screens.md ? "horizontal" : "vertical"}
              className="mb-8"
              items={WIZARD_STEPS.map((step) => ({
                title: step.title,
                content: screens.lg ? step.description : undefined,
              }))}
            />

            <Form
              form={form}
              layout="vertical"
              requiredMark="optional"
              initialValues={{
                timezone: "Asia/Yangon",
                currency: "MMK",
                billingCycle: "MONTHLY",
                stationLimit: 5,
                effectiveFrom: dayjs(),
                usePlatformTierRates: true,
              }}
              onValuesChange={(changed) => {
                if ("orgCode" in changed) codeTouchedRef.current = true;
                if ("orgName" in changed && !codeTouchedRef.current && changed.orgName) {
                  form.setFieldValue("orgCode", slugifyOrgCode(String(changed.orgName)));
                }
              }}
            >
              <div style={{ display: currentStep === 0 ? "block" : "none" }}>
                <StepOrganization />
              </div>
              <div style={{ display: currentStep === 1 ? "block" : "none" }}>
                <StepSubscription tiers={tiers} currency={currency} />
              </div>
              <div style={{ display: currentStep === 2 ? "block" : "none" }}>
                <StepOwner />
              </div>
              <div style={{ display: currentStep === 3 ? "block" : "none" }}>
                <StepReview form={form} tiers={tiers} />
              </div>
            </Form>

            <div
              className="flex flex-wrap justify-between gap-3 mt-8 pt-6"
              style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}
            >
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={goBack}
                disabled={currentStep === 0 || submitting}
              >
                Back
              </Button>
              <Space>
                {!isLastStep ? (
                  <Button
                    type="primary"
                    icon={<ArrowRightOutlined />}
                    onClick={() => void goNext()}
                    disabled={!canProceed}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={submitting}
                    onClick={() => void handleSubmit()}
                    disabled={!canProceed}
                  >
                    Register tenant
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={7}>
          <OnboardingContextPanel />
        </Col>
      </Row>
    </Spin>
  );
};

export default TenantRegistrationPage;
