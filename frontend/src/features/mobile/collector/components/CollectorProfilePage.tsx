"use client";

import Link from "next/link";
import { useState } from "react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  AtSign,
  ChevronRight,
  FileText,
  Headphones,
  ListChecks,
  LogOut,
  MapPin,
  Palette,
  Shield,
  UserRound,
} from "lucide-react";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import MobileThemeToggle from "@/features/mobile/shared/components/MobileThemeToggle";
import * as MobileAuth from "@/features/mobile/shared/query";
import { useMobileAuth } from "@/features/mobile/shared/useMobileAuth";
import { resolveStorageFileUrl } from "@/utils/storageUrl";
import ChangePasswordDrawer from "./ChangePasswordDrawer";
import styles from "./profile.module.css";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export default function CollectorProfilePage() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { logout, loggingOut } = useMobileAuth("collector");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: mobileQueryKey("collector", ["profile"]),
    queryFn: () => MobileAuth.mobileFetchCollectorProfile(),
  });

  const admin = data?.admin;
  const avatarUrl = resolveStorageFileUrl(admin?.profileImage);

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin size="large" />
        <span>Loading profile…</span>
      </div>
    );
  }

  if (error || !admin) {
    return (
      <div className={styles.errorWrap}>
        Could not load your profile.
        <button type="button" className={styles.retryBtn} onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.profilePage}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.avatarWrap}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={styles.avatar} />
          ) : (
            <span className={styles.avatarFallback} aria-hidden>
              {initialsFromName(admin.fullName)}
            </span>
          )}
        </div>
        <h2 className={styles.heroName}>{admin.fullName}</h2>
        <p className={styles.heroUsername}>@{admin.username}</p>
        <span className={styles.roleBadge}>
          <Shield size={12} aria-hidden />
          {admin.roleName ?? "COLLECTOR"}
        </span>
      </section>

      {/* <section className={styles.section} aria-label="Account details">
        <div className={styles.sectionHeader}>Account</div>

        <div className={styles.infoRow}>
          <span className={styles.infoIcon} aria-hidden>
            <UserRound size={20} />
          </span>
          <div className={styles.infoBody}>
            <span className={styles.infoLabel}>Username</span>
            <span className={styles.infoValue}>{admin.username}</span>
          </div>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoIcon} aria-hidden>
            <AtSign size={20} />
          </span>
          <div className={styles.infoBody}>
            <span className={styles.infoLabel}>Full name</span>
            <span className={styles.infoValue}>{admin.fullName}</span>
          </div>
        </div>
      </section> */}

      <section className={styles.section} aria-label="Appearance">
        <div className={styles.sectionHeader}>Appearance</div>
        <div className={styles.appearanceRow}>
          <span className={styles.appearanceIcon} aria-hidden>
            <Palette size={20} />
          </span>
          <div className={styles.appearanceBody}>
            <span className={styles.appearanceTitle}>Color mode</span>
            <span className={styles.appearanceDesc}>Light or dark across the collector app</span>
            <MobileThemeToggle className={styles.themeToggle} />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-label="Work tools">
        <div className={styles.sectionHeader}>Work tools</div>

        <Link href={MOBILE_ROUTES.collector.assignments} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <ListChecks size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Invoice assignments</span>
            <span className={styles.actionDesc}>Invoices assigned for collection</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </Link>

        <Link href={MOBILE_ROUTES.collector.support} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <Headphones size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Customer support</span>
            <span className={styles.actionDesc}>Tickets, replies, field help</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </Link>

        <Link href={MOBILE_ROUTES.collector.map} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <MapPin size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Map</span>
            <span className={styles.actionDesc}>Assigned kit locations</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </Link>

        <Link href={MOBILE_ROUTES.collector.content} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <FileText size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Guides & policies</span>
            <span className={styles.actionDesc}>Collector notices and rules</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </Link>
      </section>

      <section className={styles.section} aria-label="Security">
        <div className={styles.sectionHeader}>Security</div>
        <button
          type="button"
          className={styles.actionRow}
          onClick={() => setPasswordOpen(true)}
        >
          <span className={styles.actionIcon} aria-hidden>
            <Shield size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Change password</span>
            <span className={styles.actionDesc}>Update your sign-in password</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </button>
      </section>

      <button
        type="button"
        className={styles.signOutBtn}
        disabled={loggingOut}
        onClick={() => void logout()}
      >
        <LogOut size={20} aria-hidden />
        {loggingOut ? "Signing out…" : "Sign out"}
      </button>

      <ChangePasswordDrawer open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
