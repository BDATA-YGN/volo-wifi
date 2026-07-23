"use client";

import { useEffect } from "react";
import type { FormInstance } from "antd/es/form";

/**
 * Ant Design Form keeps store state on a shared `form` instance.
 * Remounting with `key` / `initialValues` alone does not clear previous row values.
 * Call this whenever a drawer opens or the edited record changes.
 */
export function useDrawerFormSync<Values extends object>(
  form: FormInstance<Values>,
  open: boolean,
  values: Values,
  /** Extra identity for the row (e.g. editing?.id). Prefer a stable primitive. */
  recordKey: string | number | null | undefined
): void {
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue(values as never);
    // values is rebuilt each render; recordKey + open gate the reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed by recordKey
  }, [open, recordKey, form]);
}
