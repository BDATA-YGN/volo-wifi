import dayjs, { Dayjs } from 'dayjs';
import type { APIErrorResponse } from '@/common/exceptions/handleApiError';

// /login response
export interface LoginResponse {
    message: string;
    data: {
      maxAge: Dayjs;
    };
    response: any;
  }
  
  // /login POST
  export interface LoginInput {
    username: string;
    password: string;
    /** Browser client IP resolved by Next.js server action (preferred by API). */
    clientIp?: string | null;
  }

  /** Server action return — avoids throwing across the RSC boundary (metadata would be lost). */
  export type LoginActionResult =
    | { success: true; data: LoginResponse }
    | { success: false; error: APIErrorResponse };
  
  export interface LoggedUser {
    id: string;
    fullName: string;
    username: string;
    email: string;
    password: string;
    roleId: number;
    emailAccountId?: string;
    createdBy: string;
    updatedBy?: any;
    createdAt: string;
    profileImage?: string;
    updatedAt?: any;
    deletedAt?: any;
    role: Role;
    emailAccount?: {
      id: string;
      email: string;
      isActive: boolean;
      lastSync?: string;
      syncEnabled: boolean;
    };
    mapRoleSettings: MapRoleSetting[];
  }
  
  export interface MapRoleSetting {
    roleId: number;
    settingKey: string;
    enable: boolean;
    visibility: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: any;
    __v: number;
    id: string;
  }
  
  export interface Role {
    id: number;
    roleId: number;
    roleName: string;
    description: string;
    createdAt: string;
    updatedAt?: any;
    deletedAt?: any;
  }
  
  //log out
  export interface LogoutResponse {
    logout: {
      success: boolean;
    };
  }
  