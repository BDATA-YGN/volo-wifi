-- Lookup indexes for voucher uniqueness: never reissue a code that still
-- exists in archive (or as a leftover RADIUS User-Name).
CREATE INDEX IF NOT EXISTS "idx_wf_credential_arc__token"
  ON "wf_credential_archive" ("token");

CREATE INDEX IF NOT EXISTS "idx_wf_credential_arc__username"
  ON "wf_credential_archive" ("username");
