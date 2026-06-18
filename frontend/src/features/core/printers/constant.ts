export const PRINTERS = {
    createOrUpdate: (id?: string) => `/printers/${id}`,
    delete: (id: string) => `/printers/delete/${id}`,
    listOrDetails: (id?: string) => `/printers/${id}`,
  }