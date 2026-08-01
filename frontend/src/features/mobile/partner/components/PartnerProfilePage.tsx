"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Spin } from "antd";
import { useRequest } from "ahooks";
import {
  AtSign,
  Building2,
  ChevronRight,
  Download,
  KeyRound,
  LogOut,
  Mail,
  Palette,
  Phone,
  Share,
  Shield,
  Store,
} from "lucide-react";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import { formatStatusLabel } from "@/features/wifi/commerce/partners/utils";
import MobileThemeToggle from "@/features/mobile/shared/components/MobileThemeToggle";
import { useMobilePwaInstall } from "@/features/mobile/shared/pwa/useMobilePwaInstall";
import { resolveStorageFileUrl } from "@/utils/storageUrl";
import { PARTNER_ROUTES } from "../constants";
import * as PartnerAuth from "../query";
import PartnerChangePasswordDrawer from "./PartnerChangePasswordDrawer";
import styles from "./partner.module.css";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export default function PartnerProfilePage() {
  return (
    <App>
      <PartnerProfilePageInner />
    </App>
  );
}

function PartnerProfilePageInner() {
  const router = useRouter();
  const pwa = useMobilePwaInstall("partner");
  const [passwordOpen, setPasswordOpen] = useState(false);

  const { data: profile, loading, error, refresh } = useRequest(() =>
    PartnerAuth.partnerFetchProfile(),
  );

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

  if (error || !profile) {
    return (
      <div className={styles.partnerPage}>
        <div className={styles.errorBanner} role="alert">
          Could not load your profile.
        </div>
        <button type="button" className={styles.fab} onClick={() => refresh()}>
          Try again
        </button>
      </div>
    );
  }

  const avatarUrl = resolveStorageFileUrl(profile.profileImage);
  const partner = profile.partner;
  const contactPhone = profile.phoneNumber || partner?.phone || null;
  const contactEmail = profile.email || partner?.email || null;

  return (
    <div className={styles.partnerPage}>
      <section className={styles.profileHero}>
        <div className={styles.profileHeroGlow} aria-hidden />
        <div className={styles.profileAvatarWrap}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={styles.profileAvatar} />
          ) : (
            <span className={styles.profileAvatarFallback} aria-hidden>
              {initialsFromName(profile.fullName)}
            </span>
          )}
        </div>
        <h2 className={styles.profileHeroName}>{profile.fullName}</h2>
        <p className={styles.profileHeroUsername}>@{profile.username}</p>
        <span className={styles.profileRoleBadge}>
          <Shield size={12} aria-hidden />
          {profile.roleName ?? "PARTNER"}
        </span>
      </section>

      {partner ? (
        <section className={styles.profileSection} aria-label="Partner business">
          <div className={styles.profileSectionHeader}>Partner</div>
          <div className={styles.profileInfoRow}>
            <span className={styles.profileInfoIcon} aria-hidden>
              <Store size={20} />
            </span>
            <div className={styles.profileInfoBody}>
              <span className={styles.profileInfoLabel}>Business</span>
              <span className={styles.profileInfoValue}>{partner.name}</span>
            </div>
          </div>
          <div className={styles.profileInfoRow}>
            <span className={styles.profileInfoIcon} aria-hidden>
              <KeyRound size={20} />
            </span>
            <div className={styles.profileInfoBody}>
              <span className={styles.profileInfoLabel}>Partner code</span>
              <span className={styles.profileInfoValue}>{partner.code}</span>
            </div>
          </div>
          <div className={styles.profileInfoRow}>
            <span className={styles.profileInfoIcon} aria-hidden>
              <Building2 size={20} />
            </span>
            <div className={styles.profileInfoBody}>
              <span className={styles.profileInfoLabel}>Organization</span>
              <span className={styles.profileInfoValue}>
                {partner.orgName}
                {partner.orgCode ? ` · ${partner.orgCode}` : ""}
              </span>
            </div>
          </div>
          <div className={styles.profileInfoRow}>
            <span className={styles.profileInfoIcon} aria-hidden>
              <Shield size={20} />
            </span>
            <div className={styles.profileInfoBody}>
              <span className={styles.profileInfoLabel}>Status</span>
              <span className={styles.profileInfoValue}>
                {formatStatusLabel(partner.status)}
                {partner.canSellTokens ? " · Ready to sell" : " · Setup incomplete"}
              </span>
            </div>
          </div>
          <div className={styles.profileStatsRow}>
            <div className={styles.profileStat}>
              <span className={styles.profileStatValue}>{partner.stationCount}</span>
              <span className={styles.profileStatLabel}>Sites</span>
            </div>
            <div className={styles.profileStat}>
              <span className={styles.profileStatValue}>{partner.planCount}</span>
              <span className={styles.profileStatLabel}>Plans</span>
            </div>
            <div className={styles.profileStat}>
              <span className={styles.profileStatValue}>{partner.credentialsNew}</span>
              <span className={styles.profileStatLabel}>New stock</span>
            </div>
            <div className={styles.profileStat}>
              <span className={styles.profileStatValue}>{partner.credentialsActive}</span>
              <span className={styles.profileStatLabel}>Active</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.profileSection} aria-label="Account details">
        <div className={styles.profileSectionHeader}>Account</div>
        <div className={styles.profileInfoRow}>
          <span className={styles.profileInfoIcon} aria-hidden>
            <AtSign size={20} />
          </span>
          <div className={styles.profileInfoBody}>
            <span className={styles.profileInfoLabel}>Username</span>
            <span className={styles.profileInfoValue}>@{profile.username}</span>
          </div>
        </div>
        {contactEmail ? (
          <div className={styles.profileInfoRow}>
            <span className={styles.profileInfoIcon} aria-hidden>
              <Mail size={20} />
            </span>
            <div className={styles.profileInfoBody}>
              <span className={styles.profileInfoLabel}>Email</span>
              <span className={styles.profileInfoValue}>{contactEmail}</span>
            </div>
          </div>
        ) : null}
        {contactPhone ? (
          <div className={styles.profileInfoRow}>
            <span className={styles.profileInfoIcon} aria-hidden>
              <Phone size={20} />
            </span>
            <div className={styles.profileInfoBody}>
              <span className={styles.profileInfoLabel}>Phone</span>
              <span className={styles.profileInfoValue}>{contactPhone}</span>
            </div>
          </div>
        ) : null}
        {profile.lastLogin ? (
          <div className={styles.profileInfoRow}>
            <span className={styles.profileInfoIcon} aria-hidden>
              <Shield size={20} />
            </span>
            <div className={styles.profileInfoBody}>
              <span className={styles.profileInfoLabel}>Last sign-in</span>
              <span className={styles.profileInfoValue}>
                {formatWifiDateTime(profile.lastLogin)}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      <section className={styles.profileSection} aria-label="Appearance">
        <div className={styles.profileSectionHeader}>Appearance</div>
        <div className={styles.profileAppearanceRow}>
          <span className={styles.profileInfoIcon} aria-hidden>
            <Palette size={20} />
          </span>
          <div className={styles.profileAppearanceBody}>
            <span className={styles.profileActionTitle}>Color mode</span>
            <span className={styles.profileActionDesc}>Light or dark across the partner app</span>
            <MobileThemeToggle className={styles.profileThemeToggle} />
          </div>
        </div>
      </section>

      <section className={styles.profileSection} aria-label="Security">
        <div className={styles.profileSectionHeader}>Security</div>
        <button
          type="button"
          className={styles.profileActionRow}
          onClick={() => setPasswordOpen(true)}
        >
          <span className={styles.profileActionIcon} aria-hidden>
            <Shield size={20} />
          </span>
          <span className={styles.profileActionBody}>
            <span className={styles.profileActionTitle}>Change password</span>
            <span className={styles.profileActionDesc}>
              Verify current password, then set a new one
            </span>
          </span>
          <ChevronRight className={styles.profileActionChevron} size={20} aria-hidden />
        </button>
      </section>

      <section className={styles.profileSection} aria-label="App install">
        <div className={styles.profileSectionHeader}>App</div>
        {!pwa.installed ? (
          <div className={styles.pwaInstallCard} style={{ margin: "0.75rem" }}>
            <div className={styles.pwaInstallHead}>
              <Download size={18} aria-hidden />
              <strong>{pwa.config.installTitle}</strong>
            </div>
            <p className={styles.profileMeta}>{pwa.config.installDescription}</p>
            {pwa.showIosGuide ? (
              <p className={styles.pwaInstallHint}>
                <Share size={14} aria-hidden /> Tap Share, then &quot;Add to Home Screen&quot;
              </p>
            ) : null}
            {pwa.showBrowserHint ? (
              <p className={styles.pwaInstallHint}>
                Browser menu → Install app / Add to Home screen
              </p>
            ) : null}
            {pwa.showAndroidInstall ? (
              <button
                type="button"
                className={styles.pwaInstallBtn}
                disabled={pwa.installing}
                onClick={() => void pwa.install()}
              >
                {pwa.installing ? "Installing…" : "Install app"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className={styles.profileInfoRow}>
            <span className={styles.profileInfoIcon} aria-hidden>
              <Download size={20} />
            </span>
            <div className={styles.profileInfoBody}>
              <span className={styles.profileInfoLabel}>Install status</span>
              <span className={styles.profileInfoValue}>Running as installed app</span>
            </div>
          </div>
        )}
      </section>

      <button
        type="button"
        className={styles.profileSignOutBtn}
        onClick={() => void logout()}
        disabled={loggingOut}
      >
        <LogOut size={20} aria-hidden />
        {loggingOut ? "Signing out…" : "Sign out"}
      </button>

      <PartnerChangePasswordDrawer
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
