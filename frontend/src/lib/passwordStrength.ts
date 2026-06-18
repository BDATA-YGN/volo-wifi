/** Shared password strength (profile security, admin users, etc.). */

export const PASSWORD_STRENGTH_RULES: ReadonlyArray<{
  label: string;
  test: (password: string) => boolean;
}> = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  {
    label: "Mixed case (a–z, A–Z)",
    test: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p),
  },
  { label: "At least one number", test: (p) => /\d/.test(p) },
  { label: "At least one symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordStrengthChecklist(password: string): Array<{
  ok: boolean;
  label: string;
}> {
  return PASSWORD_STRENGTH_RULES.map(({ label, test }) => ({
    ok: test(password),
    label,
  }));
}

export function passwordMeetsStrengthRules(password: string): boolean {
  return PASSWORD_STRENGTH_RULES.every(({ test }) => test(password));
}

/** Returns a strength label/color suitable for AntD Progress. */
export function scorePassword(password: string): {
  score: number;
  label: string;
  color: string;
  percent: number;
} {
  if (!password) {
    return { score: 0, label: "—", color: "#d9d9d9", percent: 0 };
  }
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["#ff4d4f", "#ff7a45", "#faad14", "#1677ff", "#52c41a", "#13c2c2"];
  const clamped = Math.min(score, labels.length - 1);
  return {
    score: clamped,
    label: labels[clamped],
    color: colors[clamped],
    percent: Math.min(100, (clamped / 5) * 100),
  };
}
