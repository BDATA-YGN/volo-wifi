export type RadiusProfileStation = {
  id: string;
  code: string;
  name: string;
};

export type RadiusProfileRecord = {
  id: string;
  orgId: string;
  name: string;
  sharedSecret?: string | null;
  hasSharedSecret: boolean;
  serverHost: string | null;
  nasType: string;
  nasPorts: number | null;
  community: string | null;
  note: string | null;
  isActive: boolean;
  sourceStationId: string | null;
  sourceStation: RadiusProfileStation | null;
  createdAt: string;
  updatedAt: string;
  _count: { devices: number };
};

export type RadiusProfileMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  activeCount?: number;
};

export type RadiusProfileFormValues = {
  name: string;
  sharedSecret?: string;
  serverHost?: string;
  nasType?: string;
  nasPorts?: number | null;
  community?: string;
  note?: string;
  isActive?: boolean;
};

export type NetworkRadiusProfileRecord = RadiusProfileRecord;
