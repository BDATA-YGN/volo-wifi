-- Remap legacy CredentialStatus values, then rebuild the enum without NEW / ACTIVE / IN_USE.
-- Mapping: NEW → SOLD, ACTIVE → ACTIVATED, IN_USE → ACTIVATED.

UPDATE "wf_credential"
SET "status" = 'SOLD'
WHERE "status" = 'NEW';

UPDATE "wf_credential"
SET "status" = 'ACTIVATED'
WHERE "status" IN ('ACTIVE', 'IN_USE');

UPDATE "wf_credential_archive"
SET "status" = 'SOLD'
WHERE "status" = 'NEW';

UPDATE "wf_credential_archive"
SET "status" = 'ACTIVATED'
WHERE "status" IN ('ACTIVE', 'IN_USE');

CREATE TYPE "CredentialStatus_new" AS ENUM (
  'SOLD',
  'ACTIVATED',
  'CONSUMED',
  'PAUSED',
  'REVOKED',
  'EXPIRED'
);

ALTER TABLE "wf_credential" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "wf_credential"
  ALTER COLUMN "status" TYPE "CredentialStatus_new"
  USING ("status"::text::"CredentialStatus_new");

ALTER TABLE "wf_credential_archive"
  ALTER COLUMN "status" TYPE "CredentialStatus_new"
  USING ("status"::text::"CredentialStatus_new");

DROP TYPE "CredentialStatus";

ALTER TYPE "CredentialStatus_new" RENAME TO "CredentialStatus";

ALTER TABLE "wf_credential"
  ALTER COLUMN "status" SET DEFAULT 'SOLD'::"CredentialStatus";
