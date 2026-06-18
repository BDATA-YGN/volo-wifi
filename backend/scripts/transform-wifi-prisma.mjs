#!/usr/bin/env node
/**
 * Transforms volo.prisma models to BDATA-standard split files under models/wifi/.
 */
import fs from 'fs';
import path from 'path';

const SRC = process.argv[2];
const OUT_DIR = process.argv[3];
if (!SRC || !OUT_DIR) {
  console.error('Usage: node transform-wifi-prisma.mjs <source.prisma> <outDir>');
  process.exit(1);
}

const source = fs.readFileSync(SRC, 'utf8');

function camelToSnake(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function tableFromBlock(block) {
  const m = block.match(/@@map\("([^"]+)"\)/);
  return m ? m[1] : null;
}

function addFieldMaps(block) {
  const isEnum = block.trimStart().startsWith('enum ');
  if (isEnum) return block;

  const lines = block.split('\n');
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('///') || trimmed.startsWith('model ') || trimmed.startsWith('}') || trimmed.startsWith('@@')) {
      out.push(line);
      continue;
    }
    if (trimmed.startsWith('@')) {
      out.push(line);
      continue;
    }

    const fieldMatch = line.match(/^(\s+)(\w+)\s+(\S+)/);
    if (!fieldMatch) {
      out.push(line);
      continue;
    }
    const fieldName = fieldMatch[2];
    const typeToken = fieldMatch[3];

    const scalarTypes = new Set([
      'String', 'Int', 'BigInt', 'Boolean', 'DateTime', 'Decimal', 'Json', 'Bytes', 'Float',
    ]);
    const baseType = typeToken.replace(/\?$|\[\]$/g, '');
    const isScalarField = scalarTypes.has(typeToken) || scalarTypes.has(baseType);

    const isArrayRelation = typeToken.endsWith('[]');
    const isRelationField = line.includes('@relation(') && /^[A-Z]/.test(baseType) && !scalarTypes.has(baseType);
    const isReverseRelation =
      !line.includes('@relation(') &&
      (/^[A-Z][A-Za-z0-9]*\?$/.test(typeToken) || isArrayRelation) &&
      !scalarTypes.has(baseType);

    if (isArrayRelation || isRelationField || isReverseRelation) {
      out.push(line);
      continue;
    }

    if (!isScalarField && !/^[A-Z]/.test(baseType)) {
      out.push(line);
      continue;
    }

    if (line.includes('@map(')) {
      out.push(line);
      continue;
    }

    // array relation fields
    if (/\[\]$/.test(trimmed) && !trimmed.includes('@')) {
      out.push(line);
      continue;
    }

    const snake = camelToSnake(fieldName);
    const attrMatch = line.match(/(\s+@[\s\S]+)$/);
    if (attrMatch) {
      out.push(line.slice(0, attrMatch.index).trimEnd() + ` @map("${snake}")` + attrMatch[1]);
    } else {
      out.push(`${line.trimEnd()} @map("${snake}")`);
    }
  }
  return out.join('\n');
}

function constraintName(kind, table, fields) {
  const prefix = kind === 'unique' ? 'uq' : 'idx';
  const suffix = fields.map((f) => camelToSnake(f)).join('__');
  let name = `${prefix}_${table}__${suffix}`;
  if (name.length <= 63) return name;

  const abbr = fields
    .map((f) =>
      camelToSnake(f)
        .split('_')
        .map((w) => w.slice(0, 4))
        .join('')
    )
    .join('_');
  name = `${prefix}_${table}__${abbr}`;
  if (name.length <= 63) return name;
  return name.slice(0, 63);
}

function addIndexMaps(block) {
  const table = tableFromBlock(block);
  if (!table) return block;

  return block.replace(
    /@@(index|unique)\(\[([^\]]+)\]\)(?!\s*,\s*map:)/g,
    (full, kind, fieldsRaw) => {
      const fields = fieldsRaw.split(',').map((f) => f.trim());
      const mapName = constraintName(kind, table, fields);
      return `@@${kind}([${fieldsRaw}], map: "${mapName}")`;
    }
  );
}

function transformBlock(block) {
  let b = addFieldMaps(block);
  b = addIndexMaps(b);
  return b;
}

function extractBlocks(text) {
  const blocks = [];
  const re = /((?:\/\/[^\n]*\n)*)(enum \w+[\s\S]*?^}|model \w+[\s\S]*?^})/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    blocks.push({ comment: m[1], body: m[2], full: m[0] });
  }
  return blocks;
}

const blocks = extractBlocks(source);

const groups = {
  'enums.prisma': new Set([
    'UserStatus', 'StationStatus', 'DeviceType', 'CredentialType', 'CredentialStatus',
    'PlanQuotaType', 'PlanTimeUsageMode', 'UnitTime', 'SaleStatus', 'PaymentMethod',
    'RptFinSettlementStatus', 'RptFinAttestationKind', 'RptFinPostingKind',
    'RadiusAcctStatus', 'CommissionType', 'PayoutStatus', 'OrgLicenseStatus',
    'BillingCycle', 'InvoiceStatus', 'PricingSource', 'LicenseChangeType',
  ]),
  'org.prisma': new Set(['Org', 'WifiAuditLog']),
  'reseller-agent.prisma': new Set(['Reseller', 'ResellerPlanEntitlement', 'Agent']),
  'station.prisma': new Set(['WifiStation', 'StationDevice']),
  'plan.prisma': new Set(['Plan', 'PlanPriceBook', 'PlanPrice']),
  'credential.prisma': new Set(['Credential', 'CaptivePortalSession', 'CredentialArchive', 'VoucherBatch']),
  'sales.prisma': new Set(['SaleOrder', 'SaleItem', 'Payment', 'SaleOrderArchive', 'CommissionRule', 'CommissionPayout']),
  'licensing.prisma': new Set(['OrgLicense', 'OrgLicenseHistory', 'OrgInvoice', 'OrgInvoiceItem', 'OrgInvoicePayment']),
  'radius.prisma': new Set([
    'RadiusAttrPhase', 'RadiusAttrValueType', 'RadiusProfileAttrRequirement',
    'RadiusSession', 'RadiusSessionArchive', 'RadiusVendorProfile', 'RouterSupportedAttribute',
    'RadiusVendorProfileSupportedAttribute', 'PlanRadiusAttribute', 'Radpostauth',
  ]),
  'reporting.prisma': new Set([
    'DailySalesStat', 'MonthlySalesStat', 'YearlySalesStat', 'DailyRadiusUsageStat',
  ]),
  'finance-reporting.prisma': new Set([
    'RptFinSettlement', 'RptFinSettlementLine', 'RptFinAttestation', 'RptFinPosting', 'RptFinSourceCoverage',
  ]),
};

const nameRe = /^(enum|model) (\w+)/;
const fileContents = Object.fromEntries(Object.keys(groups).map((f) => [f, '']));

for (const block of blocks) {
  const nameMatch = block.body.match(nameRe);
  if (!nameMatch) continue;
  const name = nameMatch[2];
  let targetFile = null;
  for (const [file, names] of Object.entries(groups)) {
    if (names.has(name)) {
      targetFile = file;
      break;
    }
  }
  if (!targetFile) {
    console.warn('Unassigned block:', name);
    continue;
  }
  const transformed = transformBlock(block.body);
  fileContents[targetFile] += `\n${transformed}\n`;
}

const headers = {
  'enums.prisma': '// WiFi domain enums (portable Prisma enums; validate codes in app when adding providers).\n',
  'org.prisma': '// Multi-tenant organization root.\n',
  'reseller-agent.prisma': '// Reseller and agent hierarchy.\n',
  'station.prisma': '// WiFi stations and NAS devices.\n',
  'plan.prisma': '// Plans and price books.\n',
  'credential.prisma': '// Vouchers, credentials, captive portal sessions.\n',
  'sales.prisma': '// Sales orders, payments, commissions.\n',
  'licensing.prisma': '// Organization licensing and SaaS billing.\n',
  'radius.prisma': '// RADIUS sessions, vendor profiles, plan attributes.\n',
  'reporting.prisma': '// Pre-aggregated sales and usage stats.\n',
  'finance-reporting.prisma': '// Finance-grade settlement, attestation, sealed postings.\n',
};

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [file, content] of Object.entries(fileContents)) {
  const outPath = path.join(OUT_DIR, file);
  fs.writeFileSync(outPath, (headers[file] || '') + content.trim() + '\n');
  console.log('Wrote', outPath);
}
