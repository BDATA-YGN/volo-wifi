-- Org-scope RADIUS vendor profiles, attribute catalog, and profile-attribute links.

-- wf_radius_vendor_profile
ALTER TABLE wf_radius_vendor_profile ADD COLUMN IF NOT EXISTS org_id TEXT;

UPDATE wf_radius_vendor_profile p
SET org_id = s.org_id
FROM wf_station s
WHERE s.radius_vendor_profile_id = p.id AND p.org_id IS NULL;

UPDATE wf_radius_vendor_profile p
SET org_id = a.org_id
FROM wf_plan_radius_attribute a
WHERE a.vendor_profile_id = p.id AND p.org_id IS NULL;

UPDATE wf_radius_vendor_profile
SET org_id = (SELECT id FROM wf_org WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1)
WHERE org_id IS NULL;

ALTER TABLE wf_radius_vendor_profile ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE wf_radius_vendor_profile
  ADD CONSTRAINT wf_radius_vendor_profile_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_wf_radius_vendor_profile__org_id__deleted_at
  ON wf_radius_vendor_profile (org_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_wf_radius_vendor_profile__org_id__vendor
  ON wf_radius_vendor_profile (org_id, vendor);

-- wf_router_supported_attribute
ALTER TABLE wf_router_supported_attribute ADD COLUMN IF NOT EXISTS org_id TEXT;

UPDATE wf_router_supported_attribute a
SET org_id = p.org_id
FROM wf_radius_vendor_profile_supported_attr j
JOIN wf_radius_vendor_profile p ON j.vendor_profile_id = p.id
WHERE j.attribute_id = a.id AND a.org_id IS NULL;

UPDATE wf_router_supported_attribute
SET org_id = (SELECT id FROM wf_org WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1)
WHERE org_id IS NULL;

ALTER TABLE wf_router_supported_attribute ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE wf_router_supported_attribute
  ADD CONSTRAINT wf_router_supported_attribute_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE wf_router_supported_attribute
  DROP CONSTRAINT IF EXISTS uq_wf_router_supported_attribute__freeradius_name;
DROP INDEX IF EXISTS uq_wf_router_supported_attribute__freeradius_name;
DROP INDEX IF EXISTS idx_wf_router_supported_attribute__freeradius_name;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wf_router_supported_attribute__org_id__freeradius_name
  ON wf_router_supported_attribute (org_id, freeradius_name);
CREATE INDEX IF NOT EXISTS idx_wf_router_supported_attribute__org_id__freeradius_name
  ON wf_router_supported_attribute (org_id, freeradius_name);

-- wf_radius_vendor_profile_supported_attr
ALTER TABLE wf_radius_vendor_profile_supported_attr ADD COLUMN IF NOT EXISTS org_id TEXT;

UPDATE wf_radius_vendor_profile_supported_attr j
SET org_id = p.org_id
FROM wf_radius_vendor_profile p
WHERE j.vendor_profile_id = p.id AND j.org_id IS NULL;

ALTER TABLE wf_radius_vendor_profile_supported_attr ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE wf_radius_vendor_profile_supported_attr
  ADD CONSTRAINT wf_radius_vendor_profile_supported_attr_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES wf_org(id) ON DELETE RESTRICT ON UPDATE NO ACTION;
CREATE INDEX IF NOT EXISTS idx_wf_rvp_sup_attr__org_id__vendor_profile_id
  ON wf_radius_vendor_profile_supported_attr (org_id, vendor_profile_id);
CREATE INDEX IF NOT EXISTS idx_wf_rvp_sup_attr__org_id__attribute_id
  ON wf_radius_vendor_profile_supported_attr (org_id, attribute_id);
