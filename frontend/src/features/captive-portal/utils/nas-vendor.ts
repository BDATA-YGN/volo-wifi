/** Pending NAS handoff after Volo API login (cleared after router redirect). */
export type NasVendor =
  | "mikrotik"
  | "ruijie-wifidog"
  | "ruijie-wispr"
  | "ruijie-eportal"
  | "unknown";

export interface RouterLoginAction {
  vendor: NasVendor;
  /** Browser navigation (GET). */
  redirectUrl?: string;
  /** Auto-submit HTML form (POST or GET) when vendors require it. */
  form?: {
    action: string;
    method: "GET" | "POST";
    fields: Record<string, string>;
  };
}

export interface BuildRouterLoginOptions {
  /** Plain password for NAS handoff (USER_PASSWORD mode). Empty for voucher tokens. */
  nasPassword?: string;
}
