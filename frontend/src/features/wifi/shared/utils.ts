/** Build console API paths that mirror backend WiFi route stubs. */
export function buildWifiApiRoutes(basePath: string) {
  const base = basePath.replace(/\/$/, "");
  return {
    listOrDetails: (id?: string) => (id ? `${base}/${id}` : base),
    createOrUpdate: (id?: string) => (id ? `${base}/${id}` : base),
    delete: (id: string) => `${base}/delete/${id}`,
    action: (id: string) => `${base}/${id}/action`,
  };
}
