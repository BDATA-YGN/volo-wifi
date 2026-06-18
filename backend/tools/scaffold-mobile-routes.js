/**
 * Scaffold mobile API routes (customer + staff) under features/mobile/v1/.
 * Run: node tools/scaffold-mobile-routes.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../src/features/mobile');

const stubController = (className, routeTag, methods) => `import { asyncController } from '@/utils/async-controller';
import { responseError } from '@/utils/api-response';

/** ${routeTag} */
export class ${className} {
${methods
  .map(
    (m) => `  public ${m} = [
    asyncController(async (_req, res) => {
      responseError(res, 501, {
        code: 'NOT_IMPLEMENTED',
        message: '${className}.${m} not implemented.',
      });
    }),
  ];`,
  )
  .join('\n\n')}
}
`;

const routesFile = (className, routeClassName, basePath, routes, authMiddleware) => {
  const lines = routes
    .map((r) => {
      const mw = r.public ? '' : `, ${authMiddleware}`;
      return `    this.router.${r.method}(\`\${this.path}${r.path}\`${mw}, this.controller.${r.handler});`;
    })
    .join('\n');
  return `import { Router } from 'express';
import { Route } from '@/interfaces/express.interface';
import { ${authMiddleware} } from '@/features/mobile/shared/middleware';
import { ${className} } from './controller';

export class ${routeClassName} implements Route {
  public path = '${basePath}';
  public router = Router();
  private controller = new ${className}();

  constructor() {
${lines}
  }
}
`;
};

const constantsFile = (apiPath) => `/** Mobile API base path */
export const API_PATH = '${apiPath}';
`;

const schemaFile = () => `import Joi from 'joi';

/** Extend per endpoint when implementing */
export const emptyBodySchema = Joi.object({}).unknown(false);
`;

const toClassName = (segment) =>
  segment
    .split(/[-/]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

const writeIfMissing = (filePath, content) => {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
};

const modules = {
  customer: [
    {
      dir: 'auth',
      path: '/v1/mobile/customer/auth',
      auth: 'public',
      handlers: ['login', 'portalLogin', 'register', 'forgotPassword', 'refreshToken', 'logout', 'me'],
      routes: [
        { method: 'post', path: '/login', handler: 'login', public: true },
        { method: 'post', path: '/portal-login', handler: 'portalLogin', public: true },
        { method: 'post', path: '/register', handler: 'register', public: true },
        { method: 'post', path: '/forgot-password', handler: 'forgotPassword', public: true },
        { method: 'post', path: '/refresh-token', handler: 'refreshToken', public: true },
        { method: 'post', path: '/logout', handler: 'logout' },
        { method: 'get', path: '/me', handler: 'me' },
      ],
    },
    {
      dir: 'isp/home',
      path: '/v1/mobile/customer/isp/home',
      handlers: ['dashboard', 'notifications'],
      routes: [
        { method: 'get', path: '/dashboard', handler: 'dashboard' },
        { method: 'get', path: '/notifications', handler: 'notifications' },
      ],
    },
    {
      dir: 'isp/services',
      path: '/v1/mobile/customer/isp/services',
      handlers: ['list', 'detail', 'usage', 'createChangeRequest'],
      routes: [
        { method: 'get', path: '/', handler: 'list' },
        { method: 'get', path: '/:serviceId', handler: 'detail' },
        { method: 'get', path: '/:serviceId/usage', handler: 'usage' },
        { method: 'post', path: '/:serviceId/change-requests', handler: 'createChangeRequest' },
      ],
    },
    {
      dir: 'isp/billing',
      path: '/v1/mobile/customer/isp/billing',
      handlers: ['listInvoices', 'invoiceDetail', 'payInvoice', 'listPayments', 'createPromiseToPay'],
      routes: [
        { method: 'get', path: '/invoices', handler: 'listInvoices' },
        { method: 'get', path: '/invoices/:invoiceId', handler: 'invoiceDetail' },
        { method: 'post', path: '/invoices/:invoiceId/pay', handler: 'payInvoice' },
        { method: 'get', path: '/payments', handler: 'listPayments' },
        { method: 'post', path: '/promises-to-pay', handler: 'createPromiseToPay' },
      ],
    },
    {
      dir: 'isp/care',
      path: '/v1/mobile/customer/isp/care',
      handlers: [
        'supportHome',
        'formOptions',
        'listCases',
        'createCase',
        'caseDetail',
        'listMessages',
        'createMessage',
        'uploadAttachment',
        'listAppointments',
        'submitRating',
      ],
      routes: [
        { method: 'get', path: '/support-home', handler: 'supportHome' },
        { method: 'get', path: '/form-options', handler: 'formOptions' },
        { method: 'get', path: '/cases', handler: 'listCases' },
        { method: 'post', path: '/cases', handler: 'createCase' },
        { method: 'get', path: '/cases/:caseId', handler: 'caseDetail' },
        { method: 'get', path: '/cases/:caseId/messages', handler: 'listMessages' },
        { method: 'post', path: '/cases/:caseId/messages', handler: 'createMessage' },
        { method: 'post', path: '/cases/:caseId/attachments', handler: 'uploadAttachment' },
        { method: 'get', path: '/cases/:caseId/appointments', handler: 'listAppointments' },
        { method: 'post', path: '/cases/:caseId/rating', handler: 'submitRating' },
      ],
    },
    {
      dir: 'isp/plan',
      path: '/v1/mobile/customer/isp/plan',
      handlers: ['status', 'usage', 'buyRenew'],
      routes: [
        { method: 'get', path: '/status', handler: 'status' },
        { method: 'get', path: '/usage', handler: 'usage' },
        { method: 'post', path: '/buy-renew', handler: 'buyRenew' },
      ],
    },
    {
      dir: 'isp/account',
      path: '/v1/mobile/customer/isp/account',
      handlers: ['getProfile', 'updateProfile', 'branchInfo'],
      routes: [
        { method: 'get', path: '/profile', handler: 'getProfile' },
        { method: 'patch', path: '/profile', handler: 'updateProfile' },
        { method: 'get', path: '/branch-info', handler: 'branchInfo' },
      ],
    },
  ],
  staff: [
    {
      dir: 'auth',
      path: '/v1/mobile/staff/auth',
      auth: 'staff',
      handlers: ['login', 'logout', 'me', 'listBranches', 'selectBranch'],
      routes: [
        { method: 'post', path: '/login', handler: 'login', public: true },
        { method: 'post', path: '/logout', handler: 'logout' },
        { method: 'get', path: '/me', handler: 'me' },
        { method: 'get', path: '/branches', handler: 'listBranches' },
        { method: 'post', path: '/select-branch', handler: 'selectBranch' },
      ],
    },
    {
      dir: 'isp/home',
      path: '/v1/mobile/staff/isp/home',
      handlers: ['dashboard', 'notifications', 'quickActions'],
      routes: [
        { method: 'get', path: '/dashboard', handler: 'dashboard' },
        { method: 'get', path: '/notifications', handler: 'notifications' },
        { method: 'get', path: '/quick-actions', handler: 'quickActions' },
      ],
    },
    {
      dir: 'isp/care',
      path: '/v1/mobile/staff/isp/care',
      handlers: [
        'listAssigned',
        'teamQueue',
        'formOptions',
        'createCase',
        'caseDetail',
        'listMessages',
        'createMessage',
        'scheduleVisit',
        'dispatchWorkOrder',
        'updateStatus',
        'resolveCase',
      ],
      routes: [
        { method: 'get', path: '/assigned', handler: 'listAssigned' },
        { method: 'get', path: '/team-queue', handler: 'teamQueue' },
        { method: 'get', path: '/form-options', handler: 'formOptions' },
        { method: 'post', path: '/cases', handler: 'createCase' },
        { method: 'get', path: '/cases/:caseId', handler: 'caseDetail' },
        { method: 'get', path: '/cases/:caseId/messages', handler: 'listMessages' },
        { method: 'post', path: '/cases/:caseId/messages', handler: 'createMessage' },
        { method: 'post', path: '/cases/:caseId/appointments', handler: 'scheduleVisit' },
        { method: 'post', path: '/cases/:caseId/work-orders', handler: 'dispatchWorkOrder' },
        { method: 'patch', path: '/cases/:caseId/status', handler: 'updateStatus' },
        { method: 'post', path: '/cases/:caseId/resolve', handler: 'resolveCase' },
      ],
    },
    {
      dir: 'isp/customers',
      path: '/v1/mobile/staff/isp/customers',
      handlers: ['search', 'detail'],
      routes: [
        { method: 'get', path: '/search', handler: 'search' },
        { method: 'get', path: '/:customerId', handler: 'detail' },
      ],
    },
    {
      dir: 'isp/sales',
      path: '/v1/mobile/staff/isp/sales',
      handlers: ['registerService', 'sellPortalUser', 'extendPortalUser'],
      routes: [
        { method: 'post', path: '/services', handler: 'registerService' },
        { method: 'post', path: '/portal-users/sell', handler: 'sellPortalUser' },
        { method: 'post', path: '/portal-users/:portalUserId/extend', handler: 'extendPortalUser' },
      ],
    },
    {
      dir: 'isp/wallet',
      path: '/v1/mobile/staff/isp/wallet',
      handlers: ['balance', 'ledger', 'depositTopup'],
      routes: [
        { method: 'get', path: '/balance', handler: 'balance' },
        { method: 'get', path: '/ledger', handler: 'ledger' },
        { method: 'post', path: '/deposit-topup', handler: 'depositTopup' },
      ],
    },
    {
      dir: 'isp/field',
      path: '/v1/mobile/staff/isp/field',
      handlers: [
        'listWorkOrders',
        'workOrderDetail',
        'startVisit',
        'completeVisit',
        'registerOnt',
        'createOpticalReading',
      ],
      routes: [
        { method: 'get', path: '/work-orders', handler: 'listWorkOrders' },
        { method: 'get', path: '/work-orders/:workOrderId', handler: 'workOrderDetail' },
        { method: 'post', path: '/work-orders/:workOrderId/visits/start', handler: 'startVisit' },
        {
          method: 'post',
          path: '/work-orders/:workOrderId/visits/:visitId/complete',
          handler: 'completeVisit',
        },
        { method: 'post', path: '/onts/register', handler: 'registerOnt' },
        { method: 'post', path: '/optical-readings', handler: 'createOpticalReading' },
      ],
    },
    {
      dir: 'isp/network',
      path: '/v1/mobile/staff/isp/network',
      handlers: ['ontStatus'],
      routes: [{ method: 'get', path: '/onts/:ontId/status', handler: 'ontStatus' }],
    },
    {
      dir: 'isp/collections',
      path: '/v1/mobile/staff/isp/collections',
      handlers: ['listDunningCases', 'listPromisesToPay'],
      routes: [
        { method: 'get', path: '/dunning-cases', handler: 'listDunningCases' },
        { method: 'get', path: '/promises-to-pay', handler: 'listPromisesToPay' },
      ],
    },
    {
      dir: 'isp/profile',
      path: '/v1/mobile/staff/isp/profile',
      handlers: ['me', 'activity'],
      routes: [
        { method: 'get', path: '/me', handler: 'me' },
        { method: 'get', path: '/activity', handler: 'activity' },
      ],
    },
  ],
};

let created = 0;
let skipped = 0;

for (const [client, items] of Object.entries(modules)) {
  const authMw = client === 'customer' ? 'MobileCustomerAuthMiddleware' : 'MobileStaffAuthMiddleware';
  const routeExports = [];

  for (const mod of items) {
    const baseDir = path.join(ROOT, 'v1', client, mod.dir);
    const segments = mod.dir.split('/');
    const nameBase = segments.map(toClassName).join('');
    const className = `${toClassName(client)}${nameBase}Controller`;
    const routeClassName = `${toClassName(client)}${nameBase}Route`;
    const routeTag = `@route ${mod.path} (${client} mobile)`;

    const ctrlPath = path.join(baseDir, 'controller.ts');
    const routesPath = path.join(baseDir, 'routes.ts');
    const constantsPath = path.join(baseDir, 'constants.ts');
    const schemaPath = path.join(baseDir, 'schema.ts');

    if (writeIfMissing(ctrlPath, stubController(className, routeTag, mod.handlers))) created++;
    else skipped++;

    const effectiveAuth = mod.auth === 'public' ? 'MobileCustomerAuthMiddleware' : authMw;
    // Public routes: customer auth uses customer middleware only on protected; login routes have public: true
    const middlewareForRoutes = client === 'customer' && mod.dir === 'auth' ? 'MobileCustomerAuthMiddleware' : authMw;

    if (
      writeIfMissing(
        routesPath,
        routesFile(className, routeClassName, mod.path, mod.routes, middlewareForRoutes),
      )
    )
      created++;
    else skipped++;

    if (writeIfMissing(constantsPath, constantsFile(mod.path))) created++;
    else skipped++;

    if (writeIfMissing(schemaPath, schemaFile())) created++;
    else skipped++;

    routeExports.push({ routeClassName, importPath: `./${mod.dir.replace(/\\/g, '/')}/routes` });
  }

  const indexContent = routeExports
    .map((e) => `import { ${e.routeClassName} } from '${e.importPath}';`)
    .concat(
      '',
      `export const ${client}MobileRoutes = [`,
      ...routeExports.map((e) => `  new ${e.routeClassName}(),`),
      '];',
    )
    .join('\n');

  const indexPath = path.join(ROOT, 'v1', client, 'routes.index.ts');
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log(`Wrote ${indexPath}`);
}

const v1Index = `import type { Route } from '@/interfaces/express.interface';
import { customerMobileRoutes } from './customer/routes.index';
import { staffMobileRoutes } from './staff/routes.index';

export const mobileV1Routes: Route[] = [...customerMobileRoutes, ...staffMobileRoutes];
`;

fs.writeFileSync(path.join(ROOT, 'v1', 'routes.index.ts'), v1Index, 'utf8');

const sharedMiddleware = `/**
 * Mobile auth middleware — replace with customer/staff JWT validation when implementing.
 * Staff: reuses Admin session until dedicated mobile tokens exist.
 * Customer: TODO IspCustomer / IspCaptivePortalUser tokens.
 */
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export const MobileStaffAuthMiddleware = AuthMiddleware;
export const MobileCustomerAuthMiddleware = AuthMiddleware;
`;

writeIfMissing(path.join(ROOT, 'shared/middleware/index.ts'), sharedMiddleware);

const readme = `# Mobile API (v1)

Base URL on **apiApp**: \`/api/v1/mobile/...\`

## Layout

\`\`\`
mobile/
  shared/middleware/     # MobileCustomerAuthMiddleware, MobileStaffAuthMiddleware
  v1/
    customer/            # Customer Mobile App
    staff/               # Staff Mobile App
    routes.index.ts
\`\`\`

## Customer routes

| Module | Path |
|--------|------|
| Auth | \`/v1/mobile/customer/auth\` |
| Home | \`/v1/mobile/customer/isp/home\` |
| Services | \`/v1/mobile/customer/isp/services\` |
| Billing | \`/v1/mobile/customer/isp/billing\` |
| Care | \`/v1/mobile/customer/isp/care\` |
| Plan (portal) | \`/v1/mobile/customer/isp/plan\` |
| Account | \`/v1/mobile/customer/isp/account\` |

## Staff routes

| Module | Path |
|--------|------|
| Auth | \`/v1/mobile/staff/auth\` |
| Home | \`/v1/mobile/staff/isp/home\` |
| Care | \`/v1/mobile/staff/isp/care\` |
| Customers | \`/v1/mobile/staff/isp/customers\` |
| Sales | \`/v1/mobile/staff/isp/sales\` |
| Wallet | \`/v1/mobile/staff/isp/wallet\` |
| Field | \`/v1/mobile/staff/isp/field\` |
| Network | \`/v1/mobile/staff/isp/network\` |
| Collections | \`/v1/mobile/staff/isp/collections\` |
| Profile | \`/v1/mobile/staff/isp/profile\` |

Controllers return \`501 NOT_IMPLEMENTED\` until business logic is added.
Implement shared rules in \`features/isp/shared/services/\`.
`;

writeIfMissing(path.join(ROOT, 'README.md'), readme);

console.log(`Done. Created: ${created}, Skipped (exists): ${skipped}`);
