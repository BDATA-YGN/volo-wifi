const path = '/themes';

/** Omit id segment for list/create so we never request `/themes/undefined`. */
const withOptionalId = (id?: string) =>
  id != null && id !== '' && id !== 'undefined' ? `${path}/${id}` : path;

export const THEMES = {
  createOrUpdate: withOptionalId,
  delete: (id: string) => `${path}/delete/${id}`,
  listOrDetails: withOptionalId,
};
