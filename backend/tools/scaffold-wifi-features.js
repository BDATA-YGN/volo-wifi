/**
 * Scaffold WiFi feature API stubs from menu.json (WiFi menus only).
 * Skips existing files — does not overwrite implementations.
 * Run: node ./tools/scaffold-wifi-features.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../src/features/wifi');
const MENU_PATH = path.resolve(__dirname, '../src/prisma/json/menu.json');
const ROUTES_INDEX = path.join(ROOT, 'routes.index.ts');

const toPascal = (s) => {
  if (!s) return '';
  return String(s)
    .split('-')
    .filter(Boolean)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join('');
};

/** Class name from menu URL, e.g. /wifi/billing/capacity-tiers → BillingCapacityTiers */
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

/** Folder under features/wifi/, mirrors route after /wifi/ */
const urlToFeaturePath = (url) => {
  const stripped = String(url ?? '')
    .replace(/^\/wifi\/?/, '')
    .replace(/\/$/, '');
  return stripped || 'overview';
};

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return true;
}

const controller = (b, p, t) => `import { asyncController } from '@/utils/async-controller';
import { responseError } from '@/utils/api-response';

/** ${t} @route ${p} */
export class ${b}Controller {
  public listOrDetails = [
    asyncController(async (_req, res) => {
      responseError(res, 501, { code: 'NOT_IMPLEMENTED', message: '${b} listOrDetails not implemented.' });
    }),
  ];
  public createOrUpdate = [
    asyncController(async (_req, res) => {
      responseError(res, 501, { code: 'NOT_IMPLEMENTED', message: '${b} createOrUpdate not implemented.' });
    }),
  ];
  public remove = [
    asyncController(async (_req, res) => {
      responseError(res, 501, { code: 'NOT_IMPLEMENTED', message: '${b} remove not implemented.' });
    }),
  ];
}
`;

const routes = (b, p) => `import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { ${b}Controller } from './controller';

export class ${b}Route implements Route {
  public path = '${p}';
  public router = Router();
  private controller = new ${b}Controller();

  constructor() {
    this.router.get(\`\${this.path}/:id?\`, AuthMiddleware, this.controller.listOrDetails);
    this.router.post(\`\${this.path}/:id?\`, AuthMiddleware, this.controller.createOrUpdate);
    this.router.delete(\`\${this.path}/delete/:id\`, AuthMiddleware, this.controller.remove);
  }
}
`;

const schema = (b) => `import Joi from 'joi';

export const ${b}CreateSchema = Joi.object({}).unknown(false);
export const ${b}UpdateSchema = Joi.object({}).unknown(false);
`;

const constants = (p) => `/** Console API base path — mirrors menu route */
export const API_PATH = '${p}';
`;

const menu = JSON.parse(fs.readFileSync(MENU_PATH, 'utf8'));
const items = menu.menuItems.filter((i) => String(i.url ?? '').startsWith('/wifi'));

let created = 0;

for (const item of items) {
  const b = urlToClassBase(item.url);
  const rel = urlToFeaturePath(item.url);
  const dir = path.join(ROOT, rel);

  if (writeIfMissing(path.join(dir, 'controller.ts'), controller(b, item.url, item.title))) created++;
  if (writeIfMissing(path.join(dir, 'routes.ts'), routes(b, item.url))) created++;
  if (writeIfMissing(path.join(dir, 'schema.ts'), schema(b))) created++;
  if (writeIfMissing(path.join(dir, 'constants.ts'), constants(item.url))) created++;
}

// Merge routes.index.ts — add imports / registrations only for new modules
let indexContent = fs.existsSync(ROUTES_INDEX) ? fs.readFileSync(ROUTES_INDEX, 'utf8') : '';
if (!indexContent) {
  indexContent =
    "import type { Route } from '@/interfaces/express.interface';\n\n/** WiFi console APIs — instantiate after ServiceInitializer.registerPrismaServices(). */\nexport function createWifiRoutes(): Route[] {\n  return [\n  ];\n};\n";
}

for (const item of items) {
  const b = urlToClassBase(item.url);
  const rel = urlToFeaturePath(item.url);
  const importPath = `./${rel}/routes`;
  const importLine = `import { ${b}Route } from '${importPath}';`;
  const routeLine = `    new ${b}Route(),`;

  if (!indexContent.includes(importLine)) {
    const importAnchor = "import type { Route } from '@/interfaces/express.interface';";
    if (indexContent.includes(importAnchor)) {
      indexContent = indexContent.replace(importAnchor, `${importAnchor}\n${importLine}`);
    } else {
      indexContent = `${importLine}\n${indexContent}`;
    }
    created++;
  }

  if (!indexContent.includes(routeLine)) {
    indexContent = indexContent.replace(
      /export function createWifiRoutes\(\): Route\[] \{\n  return \[\n/,
      `export function createWifiRoutes(): Route[] {\n  return [\n${routeLine}\n`,
    );
    created++;
  }
}

fs.writeFileSync(ROUTES_INDEX, indexContent);

console.log(`wifi backend scaffold: ${items.length} menu resources checked, ${created} file(s) created/merged.`);
