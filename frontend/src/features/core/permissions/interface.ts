export interface MapRoleSettingsAttributes {
    id?: string;
    roleId: number;
    settingKey: string;
    enable: boolean;
    visibility: boolean;
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }
  
  export interface MngRoleSettingsAttributes {
    id?: string;
    settingKey: string;
    description?: string;
    parentId?: string | null;
    level?: string | null;
    kind?: "menuGroup" | "menu" | "button" | "feature";
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }
  
  export interface MngRolesAttributes {
    id?: string;
    roleId: number;
    roleName: string;
    description?: string;
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
  }
  