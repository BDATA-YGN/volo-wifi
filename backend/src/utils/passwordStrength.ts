/** Matches frontend `PASSWORD_STRENGTH_RULES` in `frontend/src/lib/passwordStrength.ts`. */

const RULES: ReadonlyArray<{ label: string; test: (password: string) => boolean }> = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  {
    label: 'Mixed case (a–z, A–Z)',
    test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p),
  },
  { label: 'At least one number', test: (p) => /\d/.test(p) },
  { label: 'At least one symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordMeetsStrengthRules(password: string): boolean {
  return RULES.every(({ test }) => test(password));
}

export function passwordStrengthErrorMessage(): string {
  return `Password must meet all strength requirements: ${RULES.map((r) => r.label).join('; ')}`;
}
