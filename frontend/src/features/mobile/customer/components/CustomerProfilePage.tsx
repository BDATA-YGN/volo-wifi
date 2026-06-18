"use client";

import Link from "next/link";
import { useState } from "react";
import { Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import {
  AtSign,
  Building2,
  ChevronRight,
  FileText,
  Headphones,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Receipt,
  Satellite,
  Shield,
  UserRound,
  Wallet,
} from "lucide-react";
import { mobileQueryKey } from "@/lib/auth/mobile-query-key";
import { MOBILE_ROUTES } from "@/features/mobile/shared/constants";
import MobileThemeToggle from "@/features/mobile/shared/components/MobileThemeToggle";
import * as MobileAuth from "@/features/mobile/shared/query";
import { useMobileAuth } from "@/features/mobile/shared/useMobileAuth";
import type { MobileCustomerContact } from "@/features/mobile/shared/types";
import { resolveStorageFileUrl } from "@/utils/storageUrl";
import ChangePasswordDrawer from "@/features/mobile/collector/components/ChangePasswordDrawer";
import styles from "./profile.module.css";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function contactKindLabel(kind: string): string {
  switch (kind) {
    case "phone":
      return "Phone";
    case "email":
      return "Email";
    case "viber":
      return "Viber";
    case "telegram":
      return "Telegram";
    default:
      return kind.replace(/_/g, " ");
  }
}

function contactHref(kind: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (kind === "phone") return `tel:${trimmed.replace(/\s/g, "")}`;
  if (kind === "email") return `mailto:${trimmed}`;
  return null;
}

function ContactKindIcon({ kind }: { kind: string }) {
  const size = 20;
  switch (kind) {
    case "email":
      return <Mail size={size} aria-hidden />;
    case "viber":
    case "telegram":
      return <MessageCircle size={size} aria-hidden />;
    default:
      return <Phone size={size} aria-hidden />;
  }
}

function ContactRow({ contact }: { contact: MobileCustomerContact }) {
  const href = contactHref(contact.kind, contact.value);
  const valueClass = href
    ? `${styles.contactValue} ${styles.contactValueLink}`
    : styles.contactValue;

  return (
    <div className={styles.contactRow}>
      <span className={styles.contactIcon} aria-hidden>
        <ContactKindIcon kind={contact.kind} />
      </span>
      <div className={styles.contactBody}>
        <div className={styles.contactTop}>
          <span className={styles.contactKind}>{contactKindLabel(contact.kind)}</span>
          {contact.isPrimary ? <span className={styles.contactPrimary}>Primary</span> : null}
        </div>
        {contact.label ? <div className={styles.contactLabel}>{contact.label}</div> : null}
        {href ? (
          <a href={href} className={valueClass}>
            {contact.value}
          </a>
        ) : (
          <span className={valueClass}>{contact.value}</span>
        )}
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const { logout, loggingOut } = useMobileAuth("customer");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: mobileQueryKey("customer", ["profile"]),
    queryFn: () => MobileAuth.mobileFetchCustomerProfile(),
  });

  const admin = data?.admin;
  const customer = data?.customer;
  const contacts = data?.contacts ?? [];
  const avatarUrl = resolveStorageFileUrl(admin?.profileImage);
  const displayName = customer?.fullName?.trim() || admin?.fullName?.trim() || "Customer";

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
              {initialsFromName(displayName)}
            </span>
          )}
        </div>
        <h2 className={styles.heroName}>{displayName}</h2>
        <p className={styles.heroUsername}>@{admin.username}</p>
        <span className={styles.roleBadge}>
          <Satellite size={12} aria-hidden />
          {customer?.organization?.trim() || "StarLink Customer"}
        </span>
      </section>

      {/* <section className={styles.section} aria-label="Sign-in account">
        <div className={styles.sectionHeader}>Sign-in account</div>

        <div className={styles.infoRow}>
          <span className={styles.infoIcon} aria-hidden>
            <UserRound size={20} />
          </span>
          <div className={styles.infoBody}>
            <span className={styles.infoLabel}>Username</span>
            <span className={`${styles.infoValue} ${styles.infoValueTruncate}`}>
              {admin.username}
            </span>
          </div>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.infoIcon} aria-hidden>
            <AtSign size={20} />
          </span>
          <div className={styles.infoBody}>
            <span className={styles.infoLabel}>Account name</span>
            <span className={`${styles.infoValue} ${styles.infoValueTruncate}`}>
              {admin.fullName}
            </span>
          </div>
        </div>
      </section> */}

      {customer ? (
        <section className={styles.section} aria-label="Service account">
          <div className={styles.sectionHeader}>Service account</div>

          {customer.organization ? (
            <div className={styles.infoRow}>
              <span className={styles.infoIcon} aria-hidden>
                <Building2 size={20} />
              </span>
              <div className={styles.infoBody}>
                <span className={styles.infoLabel}>Organization</span>
                <span className={`${styles.infoValue} ${styles.infoValueTruncate}`}>
                  {customer.organization}
                </span>
              </div>
            </div>
          ) : null}

          {customer.township ? (
            <div className={styles.infoRow}>
              <span className={styles.infoIcon} aria-hidden>
                <MapPin size={20} />
              </span>
              <div className={styles.infoBody}>
                <span className={styles.infoLabel}>Township</span>
                <span className={styles.infoValue}>{customer.township}</span>
              </div>
            </div>
          ) : null}

          {customer.addressLine1 ? (
            <div className={styles.infoRow}>
              <span className={styles.infoIcon} aria-hidden>
                <MapPin size={20} />
              </span>
              <div className={styles.infoBody}>
                <span className={styles.infoLabel}>Address</span>
                <span className={`${styles.infoValue} ${styles.infoValueMultiline}`}>
                  {customer.addressLine1}
                </span>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={styles.section} aria-label="Contacts">
        <div className={styles.sectionHeader}>Contacts</div>
        {contacts.length > 0 ? (
          contacts.map((contact) => <ContactRow key={contact.id} contact={contact} />)
        ) : (
          <p className={styles.emptyContacts}>No contacts on file yet.</p>
        )}
      </section>

      <section className={styles.section} aria-label="Appearance">
        <div className={styles.sectionHeader}>Appearance</div>
        <div className={styles.appearanceRow}>
          <span className={styles.appearanceIcon} aria-hidden>
            <Palette size={20} />
          </span>
          <div className={styles.appearanceBody}>
            <span className={styles.appearanceTitle}>Color mode</span>
            <span className={styles.appearanceDesc}>Light or dark across the customer app</span>
            <MobileThemeToggle className={styles.themeToggle} />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-label="Shortcuts">
        <div className={styles.sectionHeader}>Shortcuts</div>

        <Link href={MOBILE_ROUTES.customer.licenses} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <Satellite size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>My licenses</span>
            <span className={styles.actionDesc}>Active StarLink kits and plans</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </Link>

        <Link href={MOBILE_ROUTES.customer.invoices} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <Receipt size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Invoices</span>
            <span className={styles.actionDesc}>Unpaid and paid billing history</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </Link>

        <Link href={MOBILE_ROUTES.customer.payments} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <Wallet size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Payment history</span>
            <span className={styles.actionDesc}>Confirmed and pending payments</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </Link>

        <Link href={MOBILE_ROUTES.customer.support} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <Headphones size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Support tickets</span>
            <span className={styles.actionDesc}>Open tickets, track status, and get help</span>
          </span>
          <ChevronRight className={styles.actionChevron} size={20} aria-hidden />
        </Link>

        <Link href={MOBILE_ROUTES.customer.content} className={styles.actionRow}>
          <span className={styles.actionIcon} aria-hidden>
            <FileText size={20} />
          </span>
          <span className={styles.actionBody}>
            <span className={styles.actionTitle}>Guides & notices</span>
            <span className={styles.actionDesc}>Policies and service updates</span>
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

      <ChangePasswordDrawer
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        actor="customer"
      />
    </div>
  );
}
