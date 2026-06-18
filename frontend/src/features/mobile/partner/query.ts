"use server";

import type { LoginInput } from "@/features/core/auth/types";
import { login, logout, fetchLoggedUser } from "@/features/core/auth/query";
import { parseApiError } from "@/common/exceptions/handleApiError";

export type PartnerLoginResult =
  | { success: true }
  | { success: false; error: { message?: string } };

export type PartnerLoginPrep =
  | { status: "ready" }
  | { status: "already_logged_in" };

function isPartnerRole(roleName: string | null | undefined): boolean {
  return typeof roleName === "string" && roleName.trim().toUpperCase() === "PARTNER";
}

/** Clear stale console cookies and detect an existing valid partner session. */
export async function partnerPrepareLogin(): Promise<PartnerLoginPrep> {
  try {
    const user = await fetchLoggedUser();
    if (isPartnerRole(user.role?.roleName)) {
      return { status: "already_logged_in" };
    }
    await logout();
  } catch {
    try {
      await logout();
    } catch {
      // ignore — cookies may already be empty
    }
  }
  return { status: "ready" };
}

/**
 * Console `/auth/login` + `/auth/me` in one server action so fresh Set-Cookie
 * values are read from the Next cookie store (avoids a second round-trip with
 * stale browser cookies).
 */
export async function partnerSignIn(input: LoginInput): Promise<PartnerLoginResult> {
  try {
    const result = await login(input);
    if (!result.success) {
      return { success: false, error: { message: result.error?.message ?? "Login failed" } };
    }

    const user = await fetchLoggedUser();
    if (!isPartnerRole(user.role?.roleName)) {
      await logout();
      return {
        success: false,
        error: { message: "This account is not a partner login." },
      };
    }

    return { success: true };
  } catch (error) {
    const parsed = parseApiError(error);
    return { success: false, error: { message: parsed.message ?? "Login failed" } };
  }
}

export async function partnerLogout(): Promise<void> {
  await logout();
}

export async function partnerFetchProfile() {
  const user = await fetchLoggedUser();
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    roleName: user.role?.roleName ?? null,
    profileImage: user.profileImage ?? null,
  };
}
