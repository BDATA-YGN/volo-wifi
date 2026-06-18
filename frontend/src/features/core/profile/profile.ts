export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  permissions: string[];
  roleName?: string;
  joinDate?: string | Date;
  lastLogin?: string | Date;
  lastIp?: string;
  isOnline?: boolean;
  isVerified?: boolean;
  isSuper?: boolean;
  employmentType?: string;
  reporterCode?: string;
}

export interface PasswordUpdate {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

/** Field weights used by the profile completion progress bar. */
export const PROFILE_FIELD_WEIGHTS: Array<{ key: keyof UserProfile; weight: number }> = [
  { key: "avatar", weight: 20 },
  { key: "fullName", weight: 25 },
  { key: "email", weight: 25 },
  { key: "phoneNumber", weight: 15 },
  { key: "username", weight: 15 },
];

export function computeProfileCompletion(profile: UserProfile): number {
  const total = PROFILE_FIELD_WEIGHTS.reduce((sum, f) => sum + f.weight, 0);
  const filled = PROFILE_FIELD_WEIGHTS.reduce((sum, f) => {
    const value = profile[f.key];
    return sum + (value && String(value).trim().length > 0 ? f.weight : 0);
  }, 0);
  return Math.round((filled / total) * 100);
}

export {
  PASSWORD_STRENGTH_RULES,
  getPasswordStrengthChecklist,
  passwordMeetsStrengthRules,
  scorePassword,
} from "@/lib/passwordStrength";
