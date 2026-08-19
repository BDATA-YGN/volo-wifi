-- Token Diagnose menu, role grants, and i18n label.

INSERT INTO tbl_menu_item ("key", title, icon, url, position, group_id, level, created_at, updated_at)
SELECT
  '/wifi/commerce/token-diagnose',
  'menus.wifi.commerce.token-diagnose',
  'search',
  '/wifi/commerce/token-diagnose',
  4,
  g.id,
  'app',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM tbl_menu_group g
WHERE g.key = 'commerce'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_menu_item m WHERE m.key = '/wifi/commerce/token-diagnose'
  );

UPDATE tbl_menu_item SET position = 5, updated_at = CURRENT_TIMESTAMP
WHERE key = '/wifi/commerce/transactions/orders';
UPDATE tbl_menu_item SET position = 6, updated_at = CURRENT_TIMESTAMP
WHERE key = '/wifi/commerce/transactions/payments';
UPDATE tbl_menu_item SET position = 7, updated_at = CURRENT_TIMESTAMP
WHERE key = '/wifi/commerce/commissions/rules';
UPDATE tbl_menu_item SET position = 8, updated_at = CURRENT_TIMESTAMP
WHERE key = '/wifi/commerce/commissions/payouts';
UPDATE tbl_menu_item SET position = 9, updated_at = CURRENT_TIMESTAMP
WHERE key = '/wifi/commerce/partners/insights';

INSERT INTO tbl_mng_role_settings (id, setting_key, description, parent_id, level, kind, created_at)
SELECT
  'a1c8e4f2-9b70-4d3e-8f61-2c5d7a90b4e1',
  '/wifi/commerce/token-diagnose',
  'menus.wifi.commerce.token-diagnose',
  'commerce',
  'app',
  s.kind,
  CURRENT_TIMESTAMP
FROM tbl_mng_role_settings s
WHERE s.setting_key = '/wifi/commerce/access-tokens'
  AND NOT EXISTS (
    SELECT 1 FROM tbl_mng_role_settings WHERE setting_key = '/wifi/commerce/token-diagnose'
  )
LIMIT 1;

INSERT INTO map_role_settings (id, role_id, setting_key, enable, visibility, created_at)
SELECT gen_random_uuid(), r.role_id, s.id, true, true, CURRENT_TIMESTAMP
FROM tbl_mng_role_settings s
CROSS JOIN (VALUES (1), (3), (5), (6), (7)) AS r(role_id)
WHERE s.setting_key = '/wifi/commerce/token-diagnose'
  AND NOT EXISTS (
    SELECT 1
    FROM map_role_settings m
    WHERE m.role_id = r.role_id
      AND m.setting_key = s.id
  );

INSERT INTO map_role_settings (id, role_id, setting_key, enable, visibility, created_at)
SELECT gen_random_uuid(), 5, s.id, true, true, CURRENT_TIMESTAMP
FROM tbl_mng_role_settings s
WHERE s.setting_key = 'commerce'
  AND NOT EXISTS (
    SELECT 1
    FROM map_role_settings m
    WHERE m.role_id = 5
      AND m.setting_key = s.id
  );

UPDATE tbl_translation
SET
  messages = jsonb_set(
    messages,
    '{menu,menus,wifi,commerce,token-diagnose}',
    '"Token Diagnose"',
    true
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE locale IN ('en', 'my')
  AND deleted_at IS NULL;
