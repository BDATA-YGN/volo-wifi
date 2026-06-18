"use client";

import { Button, Spin } from "antd";
import type { MobileActorType } from "../types";
import { useMobileAuth } from "../useMobileAuth";

interface MobileProfileCardProps {
  actor: MobileActorType;
}

export function MobileProfileCard({ actor }: MobileProfileCardProps) {
  const { profile, loading, error, logout, loggingOut } = useMobileAuth(actor);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem 0" }}>
        <Spin />
      </div>
    );
  }

  if (error || !profile) {
    return <p style={{ color: "#dc2626" }}>Could not load profile.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div>
        <strong>{profile.admin.fullName}</strong>
        <div style={{ fontSize: "0.875rem", color: "#64748b" }}>@{profile.admin.username}</div>
      </div>
      {profile.customer ? (
        <div style={{ fontSize: "0.875rem" }}>
          <div>{profile.customer.fullName}</div>
          {profile.customer.township ? <div>{profile.customer.township}</div> : null}
        </div>
      ) : null}
      <Button danger loading={loggingOut} onClick={() => void logout()}>
        Sign out
      </Button>
    </div>
  );
}
