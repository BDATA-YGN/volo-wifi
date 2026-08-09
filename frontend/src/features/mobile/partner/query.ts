"use server";

import type { LoginInput } from "@/features/core/auth/types";
import type { LoggedUser } from "@/features/core/auth/types";
import { parseApiError, handleApiError } from "@/common/exceptions/handleApiError";
import { AUTH_API_ROUTES } from "@/features/core/auth/constant";
import { AUTH_COOKIE_NAMES } from "@/lib/auth/cookies";
import {
  partnerApiClient,
  partnerSessionBootstrapApiClient,
} from "@/lib/restapi/apiClient";
import { resolveServerActionClientIp } from "@/lib/restapi/server-actions";
import { COMMERCE_PARTNERS_WORKSPACE_API } from "@/features/wifi/commerce/partners/workspace/constant";
import { cookies } from "next/headers";

export type PartnerLoginResult =
  | { success: true }
  | { success: false; error: { message?: string } };

export type PartnerLoginPrep =
  | { status: "ready" }
  | { status: "already_logged_in" };

/** Console roles allowed on /partner — matches workspace RESELLER_ROLE_CODES. */
const PARTNER_CONSOLE_ROLES = new Set(["PARTNER", "RESELLER_MANAGER"]);

function isPartnerConsoleRole(roleName: string | null | undefined): boolean {
  if (typeof roleName !== "string") return false;
  return PARTNER_CONSOLE_ROLES.has(roleName.trim().toUpperCase());
}

async function clearPartnerCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAMES.partner.access);
  cookieStore.delete(AUTH_COOKIE_NAMES.partner.refresh);
}

function partnerAuthHeaders(cookieHeader?: string): Record<string, string> | undefined {
  if (!cookieHeader) return undefined;
  return { Cookie: cookieHeader };
}

async function partnerFetchLoggedUser(cookieHeader?: string): Promise<LoggedUser> {
  const res: any = await partnerApiClient.get(AUTH_API_ROUTES.userDetails, {
    headers: partnerAuthHeaders(cookieHeader),
  });
  return res.data.data as LoggedUser;
}

/**
 * True when this admin is a real partner portal user:
 * linked reseller (adminId) or scoped PARTNER org role → workspace mode "partner".
 */
async function hasPartnerWorkspaceLink(cookieHeader?: string): Promise<boolean> {
  try {
    const res: any = await partnerApiClient.get(COMMERCE_PARTNERS_WORKSPACE_API.listOrDetails(), {
      headers: partnerAuthHeaders(cookieHeader),
      params: { formOptions: true },
    });
    return res.data?.meta?.mode === "partner";
  } catch {
    return false;
  }
}

async function isAllowedPartnerLogin(
  user: LoggedUser,
  cookieHeader?: string
): Promise<boolean> {
  if (isPartnerConsoleRole(user.role?.roleName)) return true;
  return hasPartnerWorkspaceLink(cookieHeader);
}

/** Clear stale partner cookies and detect an existing valid partner session. */
export async function partnerPrepareLogin(): Promise<PartnerLoginPrep> {
  try {
    const user = await partnerFetchLoggedUser();
    if (await isAllowedPartnerLogin(user)) {
      return { status: "already_logged_in" };
    }
    await partnerLogout();
  } catch {
    try {
      await clearPartnerCookies();
    } catch {
      // ignore — cookies may already be empty
    }
  }
  return { status: "ready" };
}

/**
 * Console `/auth/login` + `/auth/me` with partner cookie names so /wifi
 * and /partner sessions can coexist in one browser.
 */
export async function partnerSignIn(input: LoginInput): Promise<PartnerLoginResult> {
  try {
    const clientIp = input.clientIp ?? (await resolveServerActionClientIp());
    const loginRes: any = await partnerSessionBootstrapApiClient.post(
      AUTH_API_ROUTES.login(input.username, input.password),
      {
        username: input.username,
        password: input.password,
        ...(clientIp ? { clientIp } : {}),
      }
    );

    // Same server-action: freshly set cookies may not be readable via cookies().get yet.
    const cookieHeader =
      typeof loginRes?.__syncedCookieHeader === "string" ? loginRes.__syncedCookieHeader : "";

    if (!cookieHeader) {
      await clearPartnerCookies();
      return {
        success: false,
        error: { message: "Login succeeded but partner session cookies were not set." },
      };
    }

    const user = await partnerFetchLoggedUser(cookieHeader);
    if (!(await isAllowedPartnerLogin(user, cookieHeader))) {
      try {
        await partnerApiClient.post(AUTH_API_ROUTES.logout, null, {
          headers: partnerAuthHeaders(cookieHeader),
        });
      } catch {
        // ignore
      }
      await clearPartnerCookies();
      return {
        success: false,
        error: {
          message:
            "This account is not a partner login. Use a partner portal username from Partner Directory.",
        },
      };
    }

    return { success: true };
  } catch (error) {
    const parsed = parseApiError(error);
    return { success: false, error: { message: parsed.message ?? "Login failed" } };
  }
}

export async function partnerLogout(): Promise<void> {
  try {
    await partnerApiClient.post(AUTH_API_ROUTES.logout);
  } catch {
    // still clear local cookies
  } finally {
    await clearPartnerCookies();
  }
}

export type PartnerProfile = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  phoneNumber: string | null;
  roleName: string | null;
  profileImage: string | null;
  lastLogin: string | null;
  createdAt: string | null;
  partner: {
    code: string;
    name: string;
    status: string;
    phone: string | null;
    email: string | null;
    orgName: string;
    orgCode: string;
    stationCount: number;
    planCount: number;
    canSellTokens: boolean;
    credentialsActive: number;
    credentialsSold: number;
  } | null;
};

export type PartnerActionResult =
  | { success: true }
  | { success: false; error: { message?: string } };

export async function partnerFetchProfile(): Promise<PartnerProfile> {
  try {
    const user = await partnerFetchLoggedUser();
    const extra = user as LoggedUser & {
      phoneNumber?: string | null;
      lastLogin?: string | null;
    };

    let partner: PartnerProfile["partner"] = null;
    try {
      const dashRes: any = await partnerApiClient.get(
        COMMERCE_PARTNERS_WORKSPACE_API.listOrDetails(),
      );
      const dash = dashRes.data?.data;
      if (dash?.reseller && dash?.org) {
        partner = {
          code: dash.reseller.code,
          name: dash.reseller.name,
          status: dash.reseller.status,
          phone: dash.reseller.phone ?? null,
          email: dash.reseller.email ?? null,
          orgName: dash.org.name,
          orgCode: dash.org.code,
          stationCount: Number(dash.stats?.stationCount ?? 0),
          planCount: Number(dash.stats?.planCount ?? 0),
          canSellTokens: Boolean(dash.readiness?.canSellTokens),
          credentialsActive: Number(dash.stats?.credentialsActive ?? 0),
          credentialsSold: Number(dash.stats?.credentialsSold ?? 0),
        };
      }
    } catch {
      // Profile still works without workspace enrichment
    }

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email ?? null,
      phoneNumber: extra.phoneNumber ?? null,
      roleName: user.role?.roleName ?? null,
      profileImage: user.profileImage ?? null,
      lastLogin: extra.lastLogin ?? null,
      createdAt: user.createdAt ?? null,
      partner,
    };
  } catch (error) {
    throw handleApiError(error);
  }
}

export async function partnerChangePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<PartnerActionResult> {
  try {
    await partnerApiClient.post(AUTH_API_ROUTES.changePassword, input);
    return { success: true };
  } catch (error) {
    const parsed = parseApiError(error);
    return {
      success: false,
      error: { message: parsed.message ?? "Failed to update password" },
    };
  }
}
