/** Console API base path — mirrors menu route */
export const API_PATH = '/wifi/catalog/retail-pricing';

export const PRICE_BOOK_SCOPES = ['DEFAULT', 'RESELLER', 'STATION'] as const;
export type PriceBookScope = (typeof PRICE_BOOK_SCOPES)[number];
