import type { Metadata } from "next";
import CaptiveLoginPage from "@/features/captive-portal/components/CaptiveLoginPage";

export const metadata: Metadata = {
  title: "Login",
};

function searchParamsToQuery(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) query.append(key, item);
      }
    } else if (value) {
      query.set(key, value);
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function PortalAuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <CaptiveLoginPage initialSearch={searchParamsToQuery(params)} />;
}
