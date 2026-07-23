import type { PrismaClient, RadiusAttrValueType, RadiusProfileAttrRequirement } from '@/generated/prisma/client';

type SeedAttr = {
  freeradiusName: string;
  displayName: string;
  op?: string;
  defaultValue?: string | null;
  valueType: RadiusAttrValueType;
  note?: string | null;
};

type ProfileAttrRef = {
  freeradiusName: string;
  requirement: RadiusProfileAttrRequirement;
};

type SeedProfile = {
  name: string;
  vendor: string;
  model: string | null;
  description: string;
  supportsCoA: boolean;
  coaPort: number;
  attributes: ProfileAttrRef[];
};

/** Shared IETF / WISPr reply attributes used by both MikroTik and Ruijie hotspots. */
const SHARED_ATTRIBUTES: SeedAttr[] = [
  {
    freeradiusName: 'Session-Timeout',
    displayName: 'Session Timeout',
    op: ':=',
    defaultValue: '{timeSeconds}',
    valueType: 'INTEGER',
    note: 'Max online time in seconds. Use {timeSeconds} from the service plan.',
  },
  {
    freeradiusName: 'Idle-Timeout',
    displayName: 'Idle Timeout',
    op: ':=',
    defaultValue: '600',
    valueType: 'INTEGER',
    note: 'Disconnect after idle seconds with no traffic.',
  },
  {
    freeradiusName: 'Acct-Interim-Interval',
    displayName: 'Accounting Interim Interval',
    op: ':=',
    defaultValue: '300',
    valueType: 'INTEGER',
    note: 'How often the NAS sends interim accounting updates (seconds).',
  },
  {
    freeradiusName: 'Reply-Message',
    displayName: 'Reply Message',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'Optional message returned on Access-Accept / Access-Reject.',
  },
  {
    freeradiusName: 'Filter-Id',
    displayName: 'Filter ID',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'Named filter / ACL on the NAS (vendor-specific meaning).',
  },
  {
    freeradiusName: 'Framed-Pool',
    displayName: 'Framed IP Pool',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'IP pool name for framed addresses.',
  },
  {
    freeradiusName: 'Framed-IP-Address',
    displayName: 'Framed IP Address',
    op: ':=',
    defaultValue: null,
    valueType: 'IPADDR',
    note: 'Static framed IP when not using a pool.',
  },
  {
    freeradiusName: 'Class',
    displayName: 'Class',
    op: '+=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'Opaque class echoed in accounting; useful for correlation.',
  },
  {
    freeradiusName: 'WISPr-Bandwidth-Max-Down',
    displayName: 'WISPr Max Download',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'Max download bandwidth in bits/sec (WISPr).',
  },
  {
    freeradiusName: 'WISPr-Bandwidth-Max-Up',
    displayName: 'WISPr Max Upload',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'Max upload bandwidth in bits/sec (WISPr).',
  },
  {
    freeradiusName: 'WISPr-Session-Terminate-Time',
    displayName: 'WISPr Session Terminate Time',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'Absolute session end time (WISPr string / date format).',
  },
];

/** MikroTik Vendor-Specific Attributes (dictionary.mikrotik). */
const MIKROTIK_ATTRIBUTES: SeedAttr[] = [
  {
    freeradiusName: 'Mikrotik-Rate-Limit',
    displayName: 'MikroTik Rate Limit',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'rx/tx rate, e.g. 1M/1M or 512k/512k 0/0 0/0 0/0 8.',
  },
  {
    freeradiusName: 'Mikrotik-Recv-Limit',
    displayName: 'MikroTik Download Quota',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'Download byte quota (low 32 bits). Pair with Gigawords for large quotas.',
  },
  {
    freeradiusName: 'Mikrotik-Xmit-Limit',
    displayName: 'MikroTik Upload Quota',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'Upload byte quota (low 32 bits).',
  },
  {
    freeradiusName: 'Mikrotik-Total-Limit',
    displayName: 'MikroTik Total Quota',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'Combined up+down byte quota (low 32 bits).',
  },
  {
    freeradiusName: 'Mikrotik-Recv-Limit-Gigawords',
    displayName: 'MikroTik Download Quota (Gigawords)',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'High 32 bits of download byte quota.',
  },
  {
    freeradiusName: 'Mikrotik-Xmit-Limit-Gigawords',
    displayName: 'MikroTik Upload Quota (Gigawords)',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'High 32 bits of upload byte quota.',
  },
  {
    freeradiusName: 'Mikrotik-Total-Limit-Gigawords',
    displayName: 'MikroTik Total Quota (Gigawords)',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'High 32 bits of total byte quota.',
  },
  {
    freeradiusName: 'Mikrotik-Group',
    displayName: 'MikroTik User Group',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'Hotspot user profile / group name on RouterOS.',
  },
  {
    freeradiusName: 'Mikrotik-Address-List',
    displayName: 'MikroTik Address List',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'Add client to a firewall address-list while online.',
  },
  {
    freeradiusName: 'Mikrotik-Advertise-URL',
    displayName: 'MikroTik Advertise URL',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'Optional hotspot advertise / redirect URL.',
  },
];

/**
 * Ruijie EG / gateway hotspot — primarily IETF + WISPr.
 * Include a few commonly documented Ruijie VSAs when FreeRADIUS dictionary.ruijie is loaded.
 */
const RUIJIE_ATTRIBUTES: SeedAttr[] = [
  {
    freeradiusName: 'Ruijie-User-Privilege',
    displayName: 'Ruijie User Privilege',
    op: ':=',
    defaultValue: null,
    valueType: 'INTEGER',
    note: 'Ruijie VSA privilege level (requires dictionary.ruijie).',
  },
  {
    freeradiusName: 'Ruijie-User-Group',
    displayName: 'Ruijie User Group',
    op: ':=',
    defaultValue: null,
    valueType: 'STRING',
    note: 'Ruijie user group / policy name when supported by the NAS firmware.',
  },
];

const ALL_ATTRIBUTES: SeedAttr[] = [
  ...SHARED_ATTRIBUTES,
  ...MIKROTIK_ATTRIBUTES,
  ...RUIJIE_ATTRIBUTES,
];

const SHARED_PROFILE_ATTRS: ProfileAttrRef[] = [
  { freeradiusName: 'Session-Timeout', requirement: 'MUST' },
  { freeradiusName: 'Idle-Timeout', requirement: 'OPTIONAL' },
  { freeradiusName: 'Acct-Interim-Interval', requirement: 'MUST' },
  { freeradiusName: 'Reply-Message', requirement: 'OPTIONAL' },
  { freeradiusName: 'Filter-Id', requirement: 'OPTIONAL' },
  { freeradiusName: 'Framed-Pool', requirement: 'OPTIONAL' },
  { freeradiusName: 'Framed-IP-Address', requirement: 'OPTIONAL' },
  { freeradiusName: 'Class', requirement: 'OPTIONAL' },
  { freeradiusName: 'WISPr-Bandwidth-Max-Down', requirement: 'OPTIONAL' },
  { freeradiusName: 'WISPr-Bandwidth-Max-Up', requirement: 'OPTIONAL' },
  { freeradiusName: 'WISPr-Session-Terminate-Time', requirement: 'OPTIONAL' },
];

const PROFILES: SeedProfile[] = [
  {
    name: 'MikroTik Hotspot',
    vendor: 'MikroTik',
    model: 'RouterOS Hotspot',
    description:
      'Default MikroTik hotspot RADIUS capability set — session time, interim accounting, rate-limit and byte quotas.',
    supportsCoA: true,
    coaPort: 3799,
    attributes: [
      ...SHARED_PROFILE_ATTRS,
      { freeradiusName: 'Mikrotik-Rate-Limit', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Recv-Limit', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Xmit-Limit', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Total-Limit', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Recv-Limit-Gigawords', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Xmit-Limit-Gigawords', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Total-Limit-Gigawords', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Group', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Address-List', requirement: 'OPTIONAL' },
      { freeradiusName: 'Mikrotik-Advertise-URL', requirement: 'OPTIONAL' },
    ],
  },
  {
    name: 'Ruijie EG Gateway',
    vendor: 'Ruijie',
    model: 'EG Series',
    description:
      'Default Ruijie EG / gateway hotspot RADIUS set — IETF session controls, WISPr bandwidth, optional Ruijie VSAs.',
    supportsCoA: true,
    coaPort: 3799,
    attributes: [
      ...SHARED_PROFILE_ATTRS,
      { freeradiusName: 'Ruijie-User-Privilege', requirement: 'OPTIONAL' },
      { freeradiusName: 'Ruijie-User-Group', requirement: 'OPTIONAL' },
    ],
  },
];

export type SeedRadiusMikrotikRuijieResult = {
  orgId: string;
  orgCode: string;
  attributesUpserted: number;
  profilesUpserted: number;
  linksUpserted: number;
};

export async function seedRadiusMikrotikRuijieForOrg(
  prisma: PrismaClient,
  orgId: string,
  orgCode: string
): Promise<SeedRadiusMikrotikRuijieResult> {
  let attributesUpserted = 0;
  let profilesUpserted = 0;
  let linksUpserted = 0;

  const attrByName = new Map<string, string>();

  for (const attr of ALL_ATTRIBUTES) {
    const row = await prisma.routerSupportedAttribute.upsert({
      where: {
        orgId_freeradiusName: {
          orgId,
          freeradiusName: attr.freeradiusName,
        },
      },
      create: {
        orgId,
        freeradiusName: attr.freeradiusName,
        displayName: attr.displayName,
        op: attr.op ?? ':=',
        defaultValue: attr.defaultValue ?? null,
        valueType: attr.valueType,
        note: attr.note ?? null,
      },
      update: {
        displayName: attr.displayName,
        op: attr.op ?? ':=',
        defaultValue: attr.defaultValue ?? null,
        valueType: attr.valueType,
        note: attr.note ?? null,
      },
      select: { id: true, freeradiusName: true },
    });
    attrByName.set(row.freeradiusName, row.id);
    attributesUpserted += 1;
  }

  for (const profile of PROFILES) {
    const existing = await prisma.radiusVendorProfile.findFirst({
      where: {
        orgId,
        deletedAt: null,
        vendor: profile.vendor,
        name: profile.name,
      },
      select: { id: true },
    });

    const profileRow = existing
      ? await prisma.radiusVendorProfile.update({
          where: { id: existing.id },
          data: {
            model: profile.model,
            description: profile.description,
            supportsCoA: profile.supportsCoA,
            coaPort: profile.coaPort,
          },
          select: { id: true },
        })
      : await prisma.radiusVendorProfile.create({
          data: {
            orgId,
            name: profile.name,
            vendor: profile.vendor,
            model: profile.model,
            description: profile.description,
            supportsCoA: profile.supportsCoA,
            coaPort: profile.coaPort,
          },
          select: { id: true },
        });

    profilesUpserted += 1;

    for (const link of profile.attributes) {
      const attributeId = attrByName.get(link.freeradiusName);
      if (!attributeId) continue;

      await prisma.radiusVendorProfileSupportedAttribute.upsert({
        where: {
          vendorProfileId_attributeId: {
            vendorProfileId: profileRow.id,
            attributeId,
          },
        },
        create: {
          orgId,
          vendorProfileId: profileRow.id,
          attributeId,
          requirement: link.requirement,
        },
        update: {
          requirement: link.requirement,
        },
      });
      linksUpserted += 1;
    }
  }

  return {
    orgId,
    orgCode,
    attributesUpserted,
    profilesUpserted,
    linksUpserted,
  };
}
