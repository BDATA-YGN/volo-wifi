"use client";

import { useMemo, useState } from "react";
import { App } from "antd";
import { useAuthStore } from "@/features/core/auth/store";
import { useLoginUser } from "@/features/core/auth/useAuth";
import * as MainUseCase from "@/features/system/admin-users/useAdmin";
import { PasswordUpdate, UserProfile } from "./profile";

export interface ProfileActions {
  profile: UserProfile;
  savingProfile: boolean;
  savingPassword: boolean;
  uploadingAvatar: boolean;
  saveProfile: (values: Partial<UserProfile>) => Promise<void>;
  savePassword: (values: PasswordUpdate) => Promise<void>;
  updateAvatar: (url: string) => Promise<void>;
}

/** Shared profile state + mutations used by the hero, account and security panels. */
export function useProfileActions(): ProfileActions {
  const { message } = App.useApp();
  const { authData, setAuthData } = useAuthStore();
  const { fetchMe } = useLoginUser();
  const { updateAdmin } = MainUseCase.useAdmin();

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const profile = useMemo<UserProfile>(
    () => ({
      id: authData?.id ?? "",
      username: authData?.username ?? "",
      fullName: authData?.fullName ?? "",
      email: authData?.email ?? "",
      phoneNumber: (authData as any)?.phoneNumber ?? "",
      avatar: authData?.profileImage ?? undefined,
      permissions: authData?.role?.roleName ? [authData.role.roleName] : [],
      roleName: authData?.role?.roleName,
      joinDate: (authData as any)?.joinDate,
      lastLogin: (authData as any)?.lastLogin,
      lastIp: (authData as any)?.lastIp,
      isOnline: (authData as any)?.isOnline,
      isVerified: (authData as any)?.isVerified,
      isSuper: (authData as any)?.isSuper,
      employmentType: (authData as any)?.employmentType,
      reporterCode: (authData as any)?.reporterCode,
    }),
    [authData]
  );

  const saveProfile = async (values: Partial<UserProfile>) => {
    if (!profile.id) return;
    setSavingProfile(true);
    try {
      await updateAdmin({
        id: profile.id,
        payload: {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber,
        },
      });
      await fetchMe();
      message.success("Profile updated");
    } catch (e: any) {
      message.error(e?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (values: PasswordUpdate) => {
    if (!profile.id) return;
    setSavingPassword(true);
    try {
      await updateAdmin({
        id: profile.id,
        payload: { password: values.newPassword },
      });
      await fetchMe();
      message.success("Password updated");
    } catch (e: any) {
      message.error(e?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const updateAvatar = async (url: string) => {
    if (!profile.id) return;
    setUploadingAvatar(true);
    try {
      await updateAdmin({ id: profile.id, payload: { profileImage: url } });
      if (authData) {
        setAuthData({ ...authData, profileImage: url } as any);
      }
      message.success("Profile image updated");
    } catch (e: any) {
      message.error(e?.message || "Failed to update image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return {
    profile,
    savingProfile,
    savingPassword,
    uploadingAvatar,
    saveProfile,
    savePassword,
    updateAvatar,
  };
}
