export type RadiusAttrValueType = "STRING" | "INTEGER" | "IPADDR" | "DATE";

export type CatalogAttributeRecord = {
  id: string;
  freeradiusName: string;
  displayName: string;
  op: string;
  defaultValue: string | null;
  valueType: RadiusAttrValueType;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { vendorProfileLinks: number };
};

export type AttributeCatalogMeta = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  valueTypeCounts?: Partial<Record<RadiusAttrValueType, number>>;
  vendorProfileLinks?: number;
};

export type AttributeFormValues = {
  freeradiusName: string;
  displayName: string;
  op: string;
  defaultValue?: string;
  valueType: RadiusAttrValueType;
  note?: string;
};
