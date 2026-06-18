"use client";

import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { useRequest } from "ahooks";
import { PARTNER_ROUTES } from "../constants";
import * as PartnerAuth from "../query";
import styles from "./partner.module.css";

export default function PartnerProfilePage() {
  const router = useRouter();

  const { data: profile, loading } = useRequest(() => PartnerAuth.partnerFetchProfile());

  const { runAsync: logout, loading: loggingOut } = useRequest(
    async () => {
      await PartnerAuth.partnerLogout();
      router.replace(PARTNER_ROUTES.login);
    },
    { manual: true },
  );

  if (loading && !profile) {
    return (
      <div className={styles.loadingWrap}>
        <Spin />
        <span>Loading profile…</span>
      </div>
    );
  }

  return (
    <div className={styles.partnerPage}>
      <div className={styles.profileCard}>
        <p className={styles.profileName}>{profile?.fullName ?? "Partner"}</p>
        <p className={styles.profileMeta}>@{profile?.username}</p>
        {profile?.email ? <p className={styles.profileMeta}>{profile.email}</p> : null}
        {profile?.roleName ? (
          <p className={styles.profileMeta}>Role: {profile.roleName}</p>
        ) : null}

        <button
          type="button"
          className={styles.logoutBtn}
          onClick={() => logout()}
          disabled={loggingOut}
        >
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
