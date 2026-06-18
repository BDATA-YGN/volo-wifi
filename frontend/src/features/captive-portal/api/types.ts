export type CredentialLoginType = "VOUCHER_TOKEN" | "USER_PASSWORD";

export interface NasParams {
  mac?: string;
  ip?: string;
  username?: string;
  "link-login"?: string;
  "link-orig"?: string;
  "link-login-only"?: string;
  error?: string;
  "chap-id"?: string;
  "chap-challenge"?: string;
  [key: string]: string | undefined;
}

export interface CaptiveLoginPayload {
  type: CredentialLoginType;
  token?: string;
  username?: string;
  password?: string;
  nasParams?: NasParams;
}

export interface CaptiveApiSuccess<T> {
  message: string;
  data: T;
}

export interface CaptiveApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CaptiveDashboardData {
  user: {
    displayName: string;
    id: string;
  };
  connectionStatus: {
    connected: boolean;
    sessionTime: string;
    sessionTimeSec: number;
    ipAddress: string | null;
    description: string;
  };
  plan: {
    name: string;
    type: string;
    status: string;
    timeUsageMode: string;
    totalTime: string | null;
    remainingTime: string | null;
    totalTimeSec: number | null;
    remainingTimeSec: number | null;
    expiresAt: string | null;
  };
  balance: {
    remainingPercent: number;
    usedSec: number;
    totalSec: number | null;
    usedDisplay: string;
    totalDisplay: string | null;
  };
  usage: {
    todayUsageGb: number;
    totalUsageGb: number;
    todayDisplay: string;
    totalDisplay: string;
  };
  connectionDetails: {
    ipAddress: string | null;
    packageType: string;
    status: string;
  };
  sessions: CaptiveSessionRow[];
}

export interface CaptiveSessionRow {
  id: string;
  startedAt: string;
  stoppedAt: string | null;
  durationSec: number;
  durationDisplay: string;
  totalBytes: number;
  totalGb: number;
  ipAddress: string | null;
  status: string;
}

export interface CaptivePlanOption {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  timeAmount?: number;
  timeUnit?: string;
  dataMb?: number;
  validityDays?: number;
  summary: string;
}
