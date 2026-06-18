/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/commerce/transactions/orders';

export const SALE_STATUSES = ['DRAFT', 'PAID', 'VOID', 'REFUNDED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];
