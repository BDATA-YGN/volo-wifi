import { AdminAttributes } from "@/features/system/admin-users/types";

export interface Admins extends AdminAttributes {};

export enum SearchColumns {
    FULLNAME = "fullname",
    USERNAME = "username",
    EMAIL = "email",
  }