"use client";

import { useEffect, useRef } from "react";

interface NasRedirectFormProps {
  action: string;
  method: "GET" | "POST";
  fields: Record<string, string>;
}

/** Auto-submit gateway login (required by some Ruijie ePortal deployments). */
export default function NasRedirectForm({ action, method, fields }: NasRedirectFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.submit();
  }, [action, method, fields]);

  return (
    <form ref={formRef} action={action} method={method} style={{ display: "none" }} aria-hidden>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} readOnly />
      ))}
    </form>
  );
}
