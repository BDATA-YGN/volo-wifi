-- Backfill org_id on tenant-scoped child tables, then enforce NOT NULL + FK.

-- wf_org_member_role
ALTER TABLE wf_org_member_role ADD COLUMN IF NOT EXISTS org_id TEXT;
UPDATE wf_org_member_role r
SET org_id = m.org_id
FROM wf_org_member m
WHERE r.org_member_id = m.id AND r.org_id IS NULL;
ALTER TABLE wf_org_member_role ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE wf_org_member_role
  ADD CONSTRAINT wf_org_member_role_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_wf_org_member_role__org_id__role_code__is_active
  ON wf_org_member_role (org_id, role_code, is_active);
CREATE INDEX IF NOT EXISTS idx_wf_org_member_role__org_id__org_member_id
  ON wf_org_member_role (org_id, org_member_id);

-- wf_org_member_station
ALTER TABLE wf_org_member_station ADD COLUMN IF NOT EXISTS org_id TEXT;
UPDATE wf_org_member_station s
SET org_id = m.org_id
FROM wf_org_member m
WHERE s.org_member_id = m.id AND s.org_id IS NULL;
ALTER TABLE wf_org_member_station ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE wf_org_member_station
  ADD CONSTRAINT wf_org_member_station_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_wf_org_member_station__org_id__station_id
  ON wf_org_member_station (org_id, station_id);
CREATE INDEX IF NOT EXISTS idx_wf_org_member_station__org_id__org_member_id
  ON wf_org_member_station (org_id, org_member_id);

-- wf_reseller_plan_entitlement
ALTER TABLE wf_reseller_plan_entitlement ADD COLUMN IF NOT EXISTS org_id TEXT;
UPDATE wf_reseller_plan_entitlement e
SET org_id = r.org_id
FROM wf_reseller r
WHERE e.reseller_id = r.id AND e.org_id IS NULL;
ALTER TABLE wf_reseller_plan_entitlement ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE wf_reseller_plan_entitlement
  ADD CONSTRAINT wf_reseller_plan_entitlement_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_wf_reseller_plan_entitlement__org_id__reseller_id
  ON wf_reseller_plan_entitlement (org_id, reseller_id);
CREATE INDEX IF NOT EXISTS idx_wf_reseller_plan_entitlement__org_id__plan_id
  ON wf_reseller_plan_entitlement (org_id, plan_id);

-- rpt_fin_settlement_line
ALTER TABLE rpt_fin_settlement_line ADD COLUMN IF NOT EXISTS org_id TEXT;
UPDATE rpt_fin_settlement_line l
SET org_id = s.org_id
FROM rpt_fin_settlement s
WHERE l.settlement_id = s.id AND l.org_id IS NULL;
ALTER TABLE rpt_fin_settlement_line ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE rpt_fin_settlement_line
  ADD CONSTRAINT rpt_fin_settlement_line_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_rpt_fin_settlement_line__org_id__settlement_id
  ON rpt_fin_settlement_line (org_id, settlement_id);

-- rpt_fin_attestation
ALTER TABLE rpt_fin_attestation ADD COLUMN IF NOT EXISTS org_id TEXT;
UPDATE rpt_fin_attestation a
SET org_id = s.org_id
FROM rpt_fin_settlement s
WHERE a.settlement_id = s.id AND a.org_id IS NULL;
ALTER TABLE rpt_fin_attestation ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE rpt_fin_attestation
  ADD CONSTRAINT rpt_fin_attestation_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_rpt_fin_attestation__org_id__settlement_id
  ON rpt_fin_attestation (org_id, settlement_id);

-- rpt_fin_posting
ALTER TABLE rpt_fin_posting ADD COLUMN IF NOT EXISTS org_id TEXT;
UPDATE rpt_fin_posting p
SET org_id = s.org_id
FROM rpt_fin_settlement s
WHERE p.settlement_id = s.id AND p.org_id IS NULL;
ALTER TABLE rpt_fin_posting ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE rpt_fin_posting
  ADD CONSTRAINT rpt_fin_posting_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_rpt_fin_posting__org_id__posted_at
  ON rpt_fin_posting (org_id, posted_at);
