export const TENANT_REGISTRATION_API = {
  prerequisites: '/wifi/billing/tenant-registration/prerequisites',
  register: '/wifi/billing/tenant-registration/register',
} as const;

export const TIMEZONE_OPTIONS = [
  { label: 'Asia/Yangon (MMT)', value: 'Asia/Yangon' },
  { label: 'Asia/Bangkok (ICT)', value: 'Asia/Bangkok' },
  { label: 'Asia/Singapore (SGT)', value: 'Asia/Singapore' },
  { label: 'UTC', value: 'UTC' },
];

export const CURRENCY_OPTIONS = [
  { label: 'Myanmar Kyat (MMK)', value: 'MMK' },
  { label: 'US Dollar (USD)', value: 'USD' },
  { label: 'Thai Baht (THB)', value: 'THB' },
  { label: 'Singapore Dollar (SGD)', value: 'SGD' },
];

export const WIZARD_STEPS = [
  { key: 'organization', title: 'Organization', description: 'Tenant identity' },
  { key: 'subscription', title: 'Subscription', description: 'License envelope' },
  { key: 'owner', title: 'Owner account', description: 'Primary admin' },
  { key: 'review', title: 'Review', description: 'Confirm & register' },
] as const;

export const ONBOARDING_LIFECYCLE = [
  { step: 1, title: 'Tenant Registration', active: true },
  { step: 2, title: 'Access Control', active: false },
  { step: 3, title: 'Sites & Catalog', active: false },
  { step: 4, title: 'Partners', active: false },
  { step: 5, title: 'Commerce', active: false },
] as const;
