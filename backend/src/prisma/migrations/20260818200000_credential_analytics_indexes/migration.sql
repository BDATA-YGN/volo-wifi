-- Lifecycle timestamp indexes for access-token analytics (COUNT / GROUP BY by day).
CREATE INDEX IF NOT EXISTS "idx_wf_credential__org_id__sold_at"
  ON "wf_credential" ("org_id", "sold_at");

CREATE INDEX IF NOT EXISTS "idx_wf_credential__org_id__activated_at"
  ON "wf_credential" ("org_id", "activated_at");

CREATE INDEX IF NOT EXISTS "idx_wf_credential__org_id__expires_at"
  ON "wf_credential" ("org_id", "expires_at");

CREATE INDEX IF NOT EXISTS "idx_wf_credential__org_id__revoked_at"
  ON "wf_credential" ("org_id", "revoked_at");
