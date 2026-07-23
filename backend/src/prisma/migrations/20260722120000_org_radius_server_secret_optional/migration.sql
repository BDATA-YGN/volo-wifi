-- FreeRADIUS server rows: shared_secret is optional (NAS client secrets live on devices).
ALTER TABLE "wf_org_radius_profile"
  ALTER COLUMN "shared_secret" DROP NOT NULL;
