/** Default platform capacity tiers and monthly license rates (dev / initial seed). */

export const stationSizesData = [
  {
    code: 'SMALL',
    name: 'Small Site',
    description: 'Low-capacity venue (e.g. café, small office)',
    sortOrder: 10,
  },
  {
    code: 'MEDIUM',
    name: 'Medium Site',
    description: 'Mid-capacity venue (e.g. restaurant, branch office)',
    sortOrder: 20,
  },
  {
    code: 'LARGE',
    name: 'Large Site',
    description: 'High-capacity venue (e.g. hotel, campus building)',
    sortOrder: 30,
  },
] as const;

/** Monthly platform rates keyed by StationSize.code */
export const stationLicensePricesData: Record<
  (typeof stationSizesData)[number]['code'],
  { unitPrice: string; currency: string }
> = {
  SMALL: { unitPrice: '50000.00', currency: 'MMK' },
  MEDIUM: { unitPrice: '100000.00', currency: 'MMK' },
  LARGE: { unitPrice: '200000.00', currency: 'MMK' },
};
