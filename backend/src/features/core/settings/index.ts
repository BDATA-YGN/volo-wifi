import { Container, Inject, Service } from 'typedi';
import { convertToMilliSeconds } from '@/utils/datetime';
import type { PrismaClient } from '@/generated/prisma/client';

export enum SettingKey {
  OTP_SECRET = 'otp_secret',
  OTP_COOL_DOWN_DURATION = 'otp_cool_down_duration',
  OTP_EXPIRE_DURATION = 'otp_expire_duration',
  OTP_LIMIT_PER_TIME_FRAME = 'otp_limit_per_time_frame',
  OTP_TIME_FRAME_DURATION = 'otp_time_frame_duration',
  JWT_SECRET_KEY = 'jwt_secret_key',
  TOKEN_EXPIRE_DURATION = 'token_expire_duration',
  REFRESH_TOKEN_EXPIRE_DURATION = 'refresh_token_expire_duration',
  DEVICE_LIMIT = 'device_limit',
  DEV_MAX_LOGIN_ATTEMPTS = 'dev_max_login_attempts',
  DEV_LOGIN_LOCK_DURATION_MINUTES = 'dev_login_lock_duration_minutes',
  DEV_LOGIN_ATTEMPT_WINDOW_MINUTES = 'dev_login_attempt_window_minutes',
  INTERVAL_TIME = 'interval_time',
  /** Rich-text / HTML in `app_settings` (seed key includes `_md` suffix). */
  PRIVACY_POLICY = 'privacy_policy_md',
  TERMS_AND_CONDITIONS = 'terms_and_conditions_md',
  ABOUT_US = 'about_us_md',
  PREMIUM_PRICING = 'premium_pricing',
}

type SettingKeyType = {
  [SettingKey.OTP_SECRET]: string;
  [SettingKey.OTP_COOL_DOWN_DURATION]: number;
  [SettingKey.OTP_EXPIRE_DURATION]: number;
  [SettingKey.OTP_LIMIT_PER_TIME_FRAME]: number;
  [SettingKey.OTP_TIME_FRAME_DURATION]: number;
  [SettingKey.JWT_SECRET_KEY]: string;
  [SettingKey.TOKEN_EXPIRE_DURATION]: number;
  [SettingKey.REFRESH_TOKEN_EXPIRE_DURATION]: number;
  [SettingKey.DEVICE_LIMIT]: number;
  [SettingKey.DEV_MAX_LOGIN_ATTEMPTS]: number;
  [SettingKey.DEV_LOGIN_LOCK_DURATION_MINUTES]: number;
  [SettingKey.DEV_LOGIN_ATTEMPT_WINDOW_MINUTES]: number;
  [SettingKey.INTERVAL_TIME]: number;
  [SettingKey.PRIVACY_POLICY]: string;
  [SettingKey.TERMS_AND_CONDITIONS]: string;
  [SettingKey.ABOUT_US]: string;
  [SettingKey.PREMIUM_PRICING]: any;
};

@Service()
export class SettingService {
  constructor(
    @Inject('prismaClient')
    private readonly prisma: PrismaClient,
  ) {}

  public async get<T extends SettingKey>(settingKey: T): Promise<SettingKeyType[T]> {
    const record = await this.prisma.appSetting.findUnique({
      where: { key: settingKey },
    });

    if (!record) {
      throw new Error(`App setting with key: ${settingKey} not found.`);
    }

    return this.parseValue(settingKey, record.value) as SettingKeyType[T];
  }

  private parseValue<T extends SettingKey>(settingKey: T, value: string): SettingKeyType[T] {
    const timeStringSettingKeys = [
      SettingKey.OTP_COOL_DOWN_DURATION,
      SettingKey.OTP_EXPIRE_DURATION,
      SettingKey.OTP_TIME_FRAME_DURATION,
      SettingKey.OTP_LIMIT_PER_TIME_FRAME,
      SettingKey.TOKEN_EXPIRE_DURATION,
      SettingKey.REFRESH_TOKEN_EXPIRE_DURATION,
      SettingKey.INTERVAL_TIME,
    ];

    if (timeStringSettingKeys.includes(settingKey)) {
      return convertToMilliSeconds(value as string) as SettingKeyType[T];
    }

    const numberSettingKeys = [
      SettingKey.DEVICE_LIMIT,
      SettingKey.DEV_MAX_LOGIN_ATTEMPTS,
      SettingKey.DEV_LOGIN_LOCK_DURATION_MINUTES,
      SettingKey.DEV_LOGIN_ATTEMPT_WINDOW_MINUTES,
    ];
    if (numberSettingKeys.includes(settingKey)) {
      const n = Number(value);
      return (Number.isFinite(n) ? n : 0) as SettingKeyType[T];
    }

    if (settingKey === SettingKey.PREMIUM_PRICING) {
      try {
        return JSON.parse(value) as SettingKeyType[T];
      } catch {
        return value as SettingKeyType[T];
      }
    }

    return value as SettingKeyType[T];
  }
}
