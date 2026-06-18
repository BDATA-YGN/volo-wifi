export const RECEIPTS = {
  createOrUpdate: (id?: string) => `/receipts/${id}`,
  delete: (id: string) => `/receipts/delete/${id}`,
  listOrDetails: (id?: string) => `/receipts/${id}`,
  testPrint: () => `/testPrint`,
};
