export interface AdminAttributes {
  id?: string;
  fullName: string;
  username: string;
  email?: string;
  password: string;
  roleId: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface AdminResponse {
  message?: string;
  data: AdminAttributes[];
  meta?: Record<string, unknown>;
}

/** Row shape returned from the admin list API (password omitted in practice). */
export type AdminUserRecord = AdminAttributes & {
  phoneNumber?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isBlocked?: boolean;
};

/** Values collected in the create / edit drawer form. */
export interface AdminUserFormValues {
  fullName?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  roleId?: number;
  isActive?: boolean;
  isVerified?: boolean;
  isBlocked?: boolean;
  password?: string;
  confirmPassword?: string;
}
