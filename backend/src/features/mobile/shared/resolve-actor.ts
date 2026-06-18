import { CustomException } from '@/utils/exception';
import type { SmsMobileActor } from './types/mobile-request';
import { SMS_MOBILE_COLLECTOR_ROLE, SMS_MOBILE_CUSTOMER_ROLE } from './constants';

function resolveActorType(roleName: string | null | undefined): SmsMobileActor['type'] | null {
  const name = String(roleName ?? '').toUpperCase();
  if (name === SMS_MOBILE_CUSTOMER_ROLE) return 'customer';
  if (name === SMS_MOBILE_COLLECTOR_ROLE) return 'collector';
  return null;
}

export async function loadSmsActorForAdmin(
  _adminId: string,
  roleName: string | null | undefined,
): Promise<SmsMobileActor> {
  const type = resolveActorType(roleName);
  if (!type) {
    throw new CustomException(403, 'FORBIDDEN', 'This account is not enabled for the mobile app.');
  }

  return { type, roleName: String(roleName ?? '') };
}
