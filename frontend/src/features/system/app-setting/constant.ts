export const APP_SETTING_ROUTES = {
  listOrDetails: (id?: string) => `/app-settings${id ? `/${id}` : ""}`,
  createOrUpdate: (id?: string) => `/app-settings${id ? `/${id}` : ""}`,
  delete: (id: string) => `/app-settings/delete/${id}`,
  getByKey: (key: string) => `/app-settings/key/${encodeURIComponent(key)}`,
  /** Public bootstrap for Next.js (no cookies). */
  publicAppShell: () => `/app-settings/public/app-shell`,
};
