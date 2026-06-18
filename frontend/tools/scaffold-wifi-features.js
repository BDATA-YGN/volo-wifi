/**
 * Scaffold Next.js WiFi routes + feature modules from menu.json.
 * Skips existing files — does not overwrite implementations.
 *
 * Run (from repo root): node frontend/tools/scaffold-wifi-features.js
 * Run (from frontend/): node ./tools/scaffold-wifi-features.js
 */
const fs = require('fs');
const path = require('path');

const MENU_PATH = path.resolve(__dirname, '../../backend/src/prisma/json/menu.json');
const APP_WIFI_ROOT = path.resolve(__dirname, '../src/app/(dash)/wifi');
const FEATURES_WIFI_ROOT = path.resolve(__dirname, '../src/features/wifi');
const EXCLUDED_GROUPS = new Set(['system', 'development']);

const toPascal = (s) =>
  String(s ?? '')
    .split('-')
    .filter(Boolean)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join('');

const urlToClassBase = (url) => {
  const stripped = String(url ?? '')
    .replace(/^\/wifi\/?/, '')
    .replace(/\/$/, '');
  if (!stripped) return 'WifiOverview';
  return stripped
    .split('/')
    .filter(Boolean)
    .map(toPascal)
    .join('');
};

const urlToScreaming = (url) =>
  urlToClassBase(url)
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toUpperCase();

/** Folder under features/wifi/ and app/(dash)/wifi/ — mirrors route after /wifi/ */
const urlToFeaturePath = (url) => {
  const stripped = String(url ?? '')
    .replace(/^\/wifi\/?/, '')
    .replace(/\/$/, '');
  return stripped || 'overview';
};

/** Next.js app dir — `/wifi` maps to `wifi/page.tsx`, not `wifi/overview/`. */
const appRouteDir = (url) => {
  const stripped = String(url ?? '')
    .replace(/^\/wifi\/?/, '')
    .replace(/\/$/, '');
  if (!stripped) return APP_WIFI_ROOT;
  return path.join(APP_WIFI_ROOT, stripped);
};

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function hasCustomPage(featDir) {
  if (!fs.existsSync(featDir)) return false;
  return fs.readdirSync(featDir).some((f) => f.endsWith('Page.tsx'));
}

const menu = JSON.parse(fs.readFileSync(MENU_PATH, 'utf8'));
const groupTitleByKey = Object.fromEntries(
  (menu.menuGroups ?? []).map((g) => [g.key, g.title]),
);

const items = menu.menuItems.filter(
  (i) => String(i.url ?? '').startsWith('/wifi') && !EXCLUDED_GROUPS.has(i.groupKey),
);

const featureIndex = (b, apiConst) => `export { default } from "./${b}Page";
export { default as ${b}Page } from "./${b}Page";
export { ${apiConst} } from "./constant";
export * as ${b}Query from "./query";
export { use${b} } from "./use${b}";
export type { ${b}Record } from "./interface";
`;

const featurePage = (b, item, groupTitleKey) => `"use client";

import { WifiModulePage } from "@/features/wifi/shared";

export default function ${b}Page() {
  return (
    <WifiModulePage
      groupTitleKey="${groupTitleKey}"
      translationKey="${item.title}"
      path="${item.url}"
    />
  );
}
`;

const constantTs = (apiPath, apiConst) => `import { buildWifiApiRoutes } from "@/features/wifi/shared/utils";

/** Console API paths — mirrors backend \`${apiPath}\` */
export const ${apiConst} = buildWifiApiRoutes("${apiPath}");
`;

const interfaceTs = (b) => `/** Row shape — extend when API is implemented */
export type ${b}Record = Record<string, unknown>;
`;

const queryTs = (b, apiConst) => `"use server";

import { apiClient } from "@/lib/restapi/apiClient";
import { handleApiError } from "@/common/exceptions/handleApiError";
import type { CommonListResponse, CommonResponse, PaginationParams } from "@/common/interface/interface";
import { ${apiConst} } from "./constant";

export const list = async (params?: PaginationParams): Promise<CommonListResponse> => {
  try {
    const res = await apiClient.get(${apiConst}.listOrDetails(), { params });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const getById = async (id: string): Promise<CommonResponse> => {
  try {
    const res = await apiClient.get(${apiConst}.listOrDetails(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};
`;

const useTs = (b) => `"use client";

import { useRequest } from "ahooks";
import type { CommonListResponse } from "@/common/interface/interface";
import { useWifiListState } from "@/features/wifi/shared/hooks";
import type { WifiListParams } from "@/features/wifi/shared/types";
import * as ${b}Query from "./query";
import type { ${b}Record } from "./interface";

export function use${b}(initialParams: Partial<WifiListParams> = {}) {
  const { params, setParams, setPage, setSearch, patchParams } = useWifiListState(initialParams);
  const { data, loading, error, refresh } = useRequest(
    () => ${b}Query.list(params),
    { refreshDeps: [params.page, params.limit, params.search] },
  );

  const list = (data as CommonListResponse | undefined)?.data as ${b}Record[] | undefined;

  return {
    list: list ?? [],
    meta: (data as CommonListResponse | undefined)?.meta,
    loading,
    error,
    params,
    setParams,
    setPage,
    setSearch,
    patchParams,
    refresh,
  };
}
`;

const appPage = (b, featImport) => `"use client";

import ${b}Page from "@/features/wifi/${featImport}";

export default function ${b}RoutePage() {
  return <${b}Page />;
}
`;

let created = 0;
let skippedImpl = 0;

for (const item of items) {
  const b = urlToClassBase(item.url);
  const rel = urlToFeaturePath(item.url);
  const featDir = path.join(FEATURES_WIFI_ROOT, rel);
  const featImport = rel;
  const apiConst = `${urlToScreaming(item.url)}_API`;
  const groupTitleKey = groupTitleByKey[item.groupKey] ?? `menu-group.wifi.${item.groupKey}`;
  const routeDir = appRouteDir(item.url);

  if (hasCustomPage(featDir)) {
    skippedImpl += 1;
    if (writeIfMissing(path.join(routeDir, 'page.tsx'), appPage(b, featImport))) created++;
    continue;
  }

  if (writeIfMissing(path.join(featDir, `${b}Page.tsx`), featurePage(b, item, groupTitleKey))) created++;
  if (writeIfMissing(path.join(featDir, 'index.ts'), featureIndex(b, apiConst))) created++;
  if (writeIfMissing(path.join(featDir, 'constant.ts'), constantTs(item.url, apiConst))) created++;
  if (writeIfMissing(path.join(featDir, 'interface.ts'), interfaceTs(b))) created++;
  if (writeIfMissing(path.join(featDir, 'query.ts'), queryTs(b, apiConst))) created++;
  if (writeIfMissing(path.join(featDir, `use${b}.ts`), useTs(b))) created++;
  if (writeIfMissing(path.join(routeDir, 'page.tsx'), appPage(b, featImport))) created++;

  const componentsDir = path.join(featDir, 'components');
  if (writeIfMissing(path.join(componentsDir, '.gitkeep'), '')) created++;
}

writeIfMissing(
  path.join(APP_WIFI_ROOT, 'layout.tsx'),
  `export default function WifiRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
`,
);

const readmePath = path.join(FEATURES_WIFI_ROOT, 'README.md');
writeIfMissing(
  readmePath,
  `# Volo WiFi — frontend features

Scaffolded from \`backend/src/prisma/json/menu.json\` via \`frontend/tools/scaffold-wifi-features.js\`.

Each module folder mirrors the menu route after \`/wifi/\`:

- \`{Module}Page.tsx\` — screen shell (placeholder or full implementation)
- \`constant.ts\` — API path helpers (\`buildWifiApiRoutes\`)
- \`query.ts\` / \`use{Module}.ts\` — data layer stubs
- \`components/\` — UI pieces

Shared: \`shared/WifiModulePage.tsx\`, \`shared/utils.ts\`, \`shared/hooks/\`.

Re-run scaffold safely: \`node frontend/tools/scaffold-wifi-features.js\`
`,
);

console.log(
  `WiFi frontend scaffold: ${items.length} menu resources checked, ${created} file(s) created, ${skippedImpl} custom implementation(s) preserved.`,
);
