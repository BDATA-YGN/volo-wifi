import type { Route } from '@/interfaces/express.interface';
import { AnalyticsLiveOpsRoute } from './analytics/live-ops/routes';
import { AnalyticsReconciliationCoverageRoute } from './analytics/reconciliation/coverage/routes';
import { AnalyticsReconciliationApprovalsRoute } from './analytics/reconciliation/approvals/routes';
import { AnalyticsReconciliationSettlementsRoute } from './analytics/reconciliation/settlements/routes';
import { AnalyticsNasInventoryRoute } from './analytics/nas-inventory/routes';
import { AnalyticsSiteInventoryRoute } from './analytics/site-inventory/routes';
import { AnalyticsVoucherRunsRoute } from './analytics/voucher-runs/routes';
import { AnalyticsSessionTrafficRoute } from './analytics/session-traffic/routes';
import { AnalyticsAccessTokensRoute } from './analytics/access-tokens/routes';
import { AnalyticsRevenueRoute } from './analytics/revenue/routes';
import { AnalyticsServicePlansRoute } from './analytics/service-plans/routes';
import { AnalyticsPartnersRoute } from './analytics/partners/routes';
import { AnalyticsSitesRoute } from './analytics/sites/routes';
import { AnalyticsTenantsRoute } from './analytics/tenants/routes';
import { CommercePartnersInsightsRoute } from './commerce/partners/insights/routes';
import { CommerceCommissionsPayoutsRoute } from './commerce/commissions/payouts/routes';
import { CommerceCommissionsRulesRoute } from './commerce/commissions/rules/routes';
import { CommerceTransactionsPaymentsRoute } from './commerce/transactions/payments/routes';
import { CommerceTransactionsOrdersRoute } from './commerce/transactions/orders/routes';
import { CommerceAccessTokensRoute } from './commerce/access-tokens/routes';
import { CommercePartnersWorkspaceRoute } from './commerce/partners/workspace/routes';
import { CommercePartnersRoute } from './commerce/partners/routes';
import { NetworkRadiusAuthEventsRoute } from './network/radius/auth-events/routes';
import { NetworkRadiusLiveSessionsRoute } from './network/radius/live-sessions/routes';
import { NetworkRadiusPlanPoliciesRoute } from './network/radius/plan-policies/routes';
import { NetworkRadiusAttributeCatalogRoute } from './network/radius/attribute-catalog/routes';
import { NetworkRadiusVendorProfilesRoute } from './network/radius/vendor-profiles/routes';
import { NetworkRadiusProfilesRoute } from './network/radius/profiles/routes';
import { NetworkNasDevicesRoute } from './network/nas-devices/routes';
import { BillingInvoicesRoute } from './billing/invoices/routes';
import { BillingSubscriptionChangelogRoute } from './billing/subscription/changelog/routes';
import { BillingSubscriptionSitesRoute } from './billing/subscription/sites/routes';
import { BillingSubscriptionRoute } from './billing/subscription/routes';
import { BillingTierRatesTenantRoute } from './billing/tier-rates/tenant/routes';
import { BillingTierRatesPlatformRoute } from './billing/tier-rates/platform/routes';
import { BillingCapacityTiersRoute } from './billing/capacity-tiers/routes';
import { BillingTenantRegistrationRoute } from './billing/tenant-registration/routes';
import { AccessVoucherRunsRoute } from './access/voucher-runs/routes';
import { SitesRoute } from './sites/routes';
import { CatalogRetailPricingRoute } from './catalog/retail-pricing/routes';
import { CatalogServicePlansRoute } from './catalog/service-plans/routes';
import { TenantActivityLogRoute } from './tenant/activity-log/routes';
import { TenantAccessControlRoute } from './tenant/access-control/routes';
import { TenantProfileRoute } from './tenant/profile/routes';
import { TenantsRoute } from './tenants/routes';
import { WifiOverviewRoute } from './overview/routes';

/** WiFi console APIs — instantiate after ServiceInitializer.registerPrismaServices(). */
export function createWifiRoutes(): Route[] {
  return [
    new AnalyticsLiveOpsRoute(),
    new AnalyticsReconciliationCoverageRoute(),
    new AnalyticsReconciliationApprovalsRoute(),
    new AnalyticsReconciliationSettlementsRoute(),
    new AnalyticsNasInventoryRoute(),
    new AnalyticsSiteInventoryRoute(),
    new AnalyticsVoucherRunsRoute(),
    new AnalyticsSessionTrafficRoute(),
    new AnalyticsAccessTokensRoute(),
    new AnalyticsRevenueRoute(),
    new AnalyticsServicePlansRoute(),
    new AnalyticsPartnersRoute(),
    new AnalyticsSitesRoute(),
    new AnalyticsTenantsRoute(),
    new CommercePartnersInsightsRoute(),
    new CommerceCommissionsPayoutsRoute(),
    new CommerceCommissionsRulesRoute(),
    new CommerceTransactionsPaymentsRoute(),
    new CommerceTransactionsOrdersRoute(),
    new CommerceAccessTokensRoute(),
    new CommercePartnersWorkspaceRoute(),
    new CommercePartnersRoute(),
    new NetworkRadiusAuthEventsRoute(),
    new NetworkRadiusLiveSessionsRoute(),
    new NetworkRadiusPlanPoliciesRoute(),
    new NetworkRadiusAttributeCatalogRoute(),
    new NetworkRadiusVendorProfilesRoute(),
    new NetworkRadiusProfilesRoute(),
    new NetworkNasDevicesRoute(),
    new BillingInvoicesRoute(),
    new BillingSubscriptionChangelogRoute(),
    new BillingSubscriptionSitesRoute(),
    new BillingSubscriptionRoute(),
    new BillingTierRatesTenantRoute(),
    new BillingTierRatesPlatformRoute(),
    new BillingCapacityTiersRoute(),
    new BillingTenantRegistrationRoute(),
    new AccessVoucherRunsRoute(),
    new SitesRoute(),
    new CatalogRetailPricingRoute(),
    new CatalogServicePlansRoute(),
    new TenantActivityLogRoute(),
    new TenantAccessControlRoute(),
    new TenantProfileRoute(),
    new TenantsRoute(),
    new WifiOverviewRoute(),
  ];
}
