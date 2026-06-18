export type AttrRequirement = "OPTIONAL" | "MUST";

export type CatalogAttribute = {
  id: string;
  freeradiusName: string;
  displayName: string;
  op: string;
  defaultValue: string | null;
  valueType: string;
  note: string | null;
};

export type SupportedAttributeRow = {
  id: string;
  requirement: AttrRequirement;
  createdAt: string;
  attribute: CatalogAttribute;
};

export type VendorProfileRecord = {
  id: string;
  name: string;
  vendor: string;
  model: string | null;
  description: string | null;
  supportsCoA: boolean;
  coaPort: number | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    supportedAttributeRows: number;
    wifiStations: number;
    planAttributes: number;
  };
  supportedAttributeRows?: SupportedAttributeRow[];
};

export type VendorProfilesMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  vendorCounts?: Record<string, number>;
  totalAttributeLinks?: number;
};

export type SupportedAttributeInput = {
  attributeId: string;
  requirement: AttrRequirement;
};

export type VendorProfileFormValues = {
  name: string;
  vendor: string;
  model?: string;
  description?: string;
  supportsCoA: boolean;
  coaPort?: number | null;
  supportedAttributes: SupportedAttributeInput[];
};
