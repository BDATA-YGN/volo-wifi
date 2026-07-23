"use client";

import { redirect } from "next/navigation";

/** Legacy path — FreeRADIUS Servers moved to /wifi/network/radius/servers */
export default function LegacyRadiusProfilesRedirectPage() {
  redirect("/wifi/network/radius/servers");
}
