'use client';

import React, { useState } from 'react';
import { Alert, Button, Spin, Typography } from 'antd';
import { ReloadOutlined, WarningOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import { revalidateAll } from '@/app/actions/revalidate';
import {
  failedInitialChecks,
  type HealthResponse,
  type ReadinessState,
} from '@/features/core/auth/systemReadiness';
import type { AppSettings } from '@/common/provider/AppSettingsContentProvider';

const { Text, Title } = Typography;

type SupportContacts = {
  email?: string;
  phone?: string;
  address?: string;
};

function parseSupportContacts(appSettings: AppSettings | null): SupportContacts | null {
  const raw = appSettings?.support_contacts;
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null) {
    return raw as SupportContacts;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as SupportContacts;
    } catch {
      return null;
    }
  }
  return null;
}

interface SignInReadinessPanelProps {
  state: ReadinessState;
  onRetry: () => Promise<boolean>;
  appSettings: AppSettings | null;
}

export default function SignInReadinessPanel({
  state,
  onRetry,
  appSettings,
}: SignInReadinessPanelProps) {
  const t = useTranslations('login_page');
  const support = parseSupportContacts(appSettings);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const ready = await onRetry();
      if (ready) {
        await revalidateAll();
        window.location.reload();
      }
    } finally {
      setRetrying(false);
    }
  };

  if (state.phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
        <Spin size="large" />
        <Text type="secondary">{t('readiness_checking')}</Text>
      </div>
    );
  }

  if (state.phase === 'ready') {
    return null;
  }

  const isUnreachable = state.phase === 'unreachable';
  const health: HealthResponse | null = state.phase === 'not_ready' ? state.health : null;
  const pending = health ? failedInitialChecks(health) : [];

  return (
    <div className="flex flex-col gap-4 py-2">
      <Alert
        type={isUnreachable ? 'error' : 'warning'}
        showIcon
        icon={isUnreachable ? <DisconnectOutlined /> : <WarningOutlined />}
        title={
          <Title level={5} className="!mb-0">
            {isUnreachable ? t('readiness_unreachable_title') : t('readiness_not_ready_title')}
          </Title>
        }
        description={
          <div className="flex flex-col gap-3 pt-1">
            <Text>
              {isUnreachable
                ? t('readiness_unreachable_body')
                : t('readiness_not_ready_body')}
            </Text>

            {isUnreachable && state.error ? (
              <Text type="secondary" className="text-xs font-mono break-all">
                {state.error}
              </Text>
            ) : null}

            {!isUnreachable && pending.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-sm m-0">
                {pending.map((check) => (
                  <li key={check.key}>
                    <Text>{check.label}</Text>
                    {check.detail ? (
                      <Text type="secondary" className="block text-xs">
                        {check.detail}
                      </Text>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="rounded-md border border-dashed px-3 py-2 text-sm">
              <Text strong className="block mb-1">
                {t('readiness_support_title')}
              </Text>
              <Text type="secondary" className="block">
                {t('readiness_support_body')}
              </Text>
              {support?.email ? (
                <Text className="block mt-1">
                  {t('readiness_support_email')}:{' '}
                  <a href={`mailto:${support.email}`}>{support.email}</a>
                </Text>
              ) : null}
              {support?.phone ? (
                <Text className="block">
                  {t('readiness_support_phone')}:{' '}
                  <a href={`tel:${support.phone.replace(/\s/g, '')}`}>{support.phone}</a>
                </Text>
              ) : null}
            </div>

            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => void handleRetry()}
              loading={retrying}
              block
            >
              {t('readiness_retry')}
            </Button>
          </div>
        }
      />
    </div>
  );
}
