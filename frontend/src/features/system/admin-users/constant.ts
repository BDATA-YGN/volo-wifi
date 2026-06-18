export const ADMINS = {
  createOrUpdate: (id?: string) => `/admins/${id}`,
  delete: (id: string) => `/admins/delete/${id}`,
  listOrDetails: (id?: string) => `/admins/${id}`,
};
