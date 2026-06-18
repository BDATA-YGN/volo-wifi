export const serializeAdminBrief = (row: Record<string, unknown> | null | undefined) => {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    phoneNumber: row.phoneNumber ?? null,
    profileImage: row.profileImage ?? null,
  };
};
