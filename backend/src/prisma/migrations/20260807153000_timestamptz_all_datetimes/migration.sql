-- Convert all timestamp without time zone → timestamptz (UTC interpretation).
-- Prisma DateTime fields use @db.Timestamptz(3) (OTP expired/generated keep precision 6).
-- Safe: no row deletes; absolute instants preserved when naive values were UTC wall-clock.

BEGIN;

-- 1) Normalize FreeRADIUS Yangon wall-clock session times (+06:30) to UTC wall-clock
--    before timestamptz conversion. Match sessions ~6h20–6h40 ahead of credential activation.
UPDATE wf_radius_session AS rs
SET
  started_at = rs.started_at - INTERVAL '6 hours 30 minutes',
  last_interim_at = CASE
    WHEN rs.last_interim_at IS NULL THEN NULL
    ELSE rs.last_interim_at - INTERVAL '6 hours 30 minutes'
  END,
  stopped_at = CASE
    WHEN rs.stopped_at IS NULL THEN NULL
    ELSE rs.stopped_at - INTERVAL '6 hours 30 minutes'
  END
FROM wf_credential AS c
WHERE rs.credential_id = c.id
  AND c.activated_at IS NOT NULL
  AND rs.started_at BETWEEN c.activated_at + INTERVAL '6 hours 20 minutes'
                       AND c.activated_at + INTERVAL '6 hours 40 minutes';

UPDATE wf_radius_session_archive AS rs
SET
  started_at = rs.started_at - INTERVAL '6 hours 30 minutes',
  last_interim_at = CASE
    WHEN rs.last_interim_at IS NULL THEN NULL
    ELSE rs.last_interim_at - INTERVAL '6 hours 30 minutes'
  END,
  stopped_at = CASE
    WHEN rs.stopped_at IS NULL THEN NULL
    ELSE rs.stopped_at - INTERVAL '6 hours 30 minutes'
  END
FROM wf_credential AS c
WHERE rs.credential_id = c.id
  AND c.activated_at IS NOT NULL
  AND rs.started_at BETWEEN c.activated_at + INTERVAL '6 hours 20 minutes'
                       AND c.activated_at + INTERVAL '6 hours 40 minutes';

-- Broader pass: any remaining paired sessions still >6h ahead of activation
UPDATE wf_radius_session AS rs
SET
  started_at = rs.started_at - INTERVAL '6 hours 30 minutes',
  last_interim_at = CASE
    WHEN rs.last_interim_at IS NULL THEN NULL
    ELSE rs.last_interim_at - INTERVAL '6 hours 30 minutes'
  END,
  stopped_at = CASE
    WHEN rs.stopped_at IS NULL THEN NULL
    ELSE rs.stopped_at - INTERVAL '6 hours 30 minutes'
  END
FROM wf_credential AS c
WHERE rs.credential_id = c.id
  AND c.activated_at IS NOT NULL
  AND rs.started_at > c.activated_at + INTERVAL '6 hours';


-- 2) ALTER every naive timestamp column → timestamptz USING ... AT TIME ZONE 'UTC'

-- app_settings
ALTER TABLE "app_settings" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "app_settings" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- map_role_settings
ALTER TABLE "map_role_settings" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "map_role_settings" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "map_role_settings" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- rpt_daily_radius_usage_stat
ALTER TABLE "rpt_daily_radius_usage_stat" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_daily_radius_usage_stat" ALTER COLUMN "date" TYPE TIMESTAMP(3) WITH TIME ZONE USING "date" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_daily_radius_usage_stat" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_daily_radius_usage_stat" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- rpt_daily_sales_stat
ALTER TABLE "rpt_daily_sales_stat" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_daily_sales_stat" ALTER COLUMN "date" TYPE TIMESTAMP(3) WITH TIME ZONE USING "date" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_daily_sales_stat" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_daily_sales_stat" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- rpt_fin_attestation
ALTER TABLE "rpt_fin_attestation" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_attestation" ALTER COLUMN "signed_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "signed_at" AT TIME ZONE 'UTC';

-- rpt_fin_posting
ALTER TABLE "rpt_fin_posting" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_posting" ALTER COLUMN "posted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "posted_at" AT TIME ZONE 'UTC';

-- rpt_fin_settlement
ALTER TABLE "rpt_fin_settlement" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_settlement" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_settlement" ALTER COLUMN "period_end" TYPE TIMESTAMP(3) WITH TIME ZONE USING "period_end" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_settlement" ALTER COLUMN "period_start" TYPE TIMESTAMP(3) WITH TIME ZONE USING "period_start" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_settlement" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- rpt_fin_settlement_line
ALTER TABLE "rpt_fin_settlement_line" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_settlement_line" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- rpt_fin_source_coverage
ALTER TABLE "rpt_fin_source_coverage" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_source_coverage" ALTER COLUMN "max_covered_paid_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "max_covered_paid_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_fin_source_coverage" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- rpt_monthly_sales_stat
ALTER TABLE "rpt_monthly_sales_stat" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_monthly_sales_stat" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_monthly_sales_stat" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- rpt_yearly_sales_stat
ALTER TABLE "rpt_yearly_sales_stat" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_yearly_sales_stat" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "rpt_yearly_sales_stat" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_admin
ALTER TABLE "tbl_admin" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_admin" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_admin" ALTER COLUMN "join_date" TYPE TIMESTAMP(3) WITH TIME ZONE USING "join_date" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_admin" ALTER COLUMN "last_login" TYPE TIMESTAMP(3) WITH TIME ZONE USING "last_login" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_admin" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_admin_token
ALTER TABLE "tbl_admin_token" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_admin_token" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_admin_token" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_audit_log
ALTER TABLE "tbl_audit_log" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_audit_log" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_audit_log" ALTER COLUMN "timestamp" TYPE TIMESTAMP(3) WITH TIME ZONE USING "timestamp" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_audit_log" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_conversation_participants
ALTER TABLE "tbl_conversation_participants" ALTER COLUMN "joined_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "joined_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_conversation_participants" ALTER COLUMN "last_read_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "last_read_at" AT TIME ZONE 'UTC';

-- tbl_conversations
ALTER TABLE "tbl_conversations" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_conversations" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_conversations" ALTER COLUMN "last_message_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "last_message_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_conversations" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_databases
ALTER TABLE "tbl_databases" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_databases" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_databases" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_file_log
ALTER TABLE "tbl_file_log" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_file_log" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_file_log" ALTER COLUMN "last_modified" TYPE TIMESTAMP(3) WITH TIME ZONE USING "last_modified" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_file_log" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_login_log
ALTER TABLE "tbl_login_log" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_login_log" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_login_log" ALTER COLUMN "login_date_time" TYPE TIMESTAMP(3) WITH TIME ZONE USING "login_date_time" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_login_log" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_menu_group
ALTER TABLE "tbl_menu_group" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_menu_group" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_menu_group" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_menu_item
ALTER TABLE "tbl_menu_item" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_menu_item" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_menu_item" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_messages
ALTER TABLE "tbl_messages" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_messages" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_messages" ALTER COLUMN "edited_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "edited_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_messages" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_mng_role_settings
ALTER TABLE "tbl_mng_role_settings" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_mng_role_settings" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_mng_role_settings" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_mng_roles
ALTER TABLE "tbl_mng_roles" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_mng_roles" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_mng_roles" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_notification
ALTER TABLE "tbl_notification" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_notification" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_notification_recipient
ALTER TABLE "tbl_notification_recipient" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_notification_recipient" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_notification_recipient" ALTER COLUMN "read_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "read_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_notification_recipient" ALTER COLUMN "sent_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "sent_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_notification_recipient" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_notification_template
ALTER TABLE "tbl_notification_template" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_notification_template" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_notification_template" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_otp
ALTER TABLE "tbl_otp" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_otp" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_otp" ALTER COLUMN "expired_time" TYPE TIMESTAMP(6) WITH TIME ZONE USING "expired_time" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_otp" ALTER COLUMN "generated_time" TYPE TIMESTAMP(6) WITH TIME ZONE USING "generated_time" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_otp" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_places
ALTER TABLE "tbl_places" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_places" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_places" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_printers
ALTER TABLE "tbl_printers" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_printers" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_printers" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_receipt_template
ALTER TABLE "tbl_receipt_template" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_receipt_template" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_receipt_template" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_register_logs
ALTER TABLE "tbl_register_logs" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_register_logs" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_register_logs" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_themes
ALTER TABLE "tbl_themes" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_themes" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_themes" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_translation
ALTER TABLE "tbl_translation" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_translation" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_translation" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- tbl_user_notification_setting
ALTER TABLE "tbl_user_notification_setting" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "tbl_user_notification_setting" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_audit_log
ALTER TABLE "wf_audit_log" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

-- wf_captive_portal_session
ALTER TABLE "wf_captive_portal_session" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_captive_portal_session" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_commission_payout
ALTER TABLE "wf_commission_payout" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_commission_payout" ALTER COLUMN "paid_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "paid_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_commission_payout" ALTER COLUMN "period_from" TYPE TIMESTAMP(3) WITH TIME ZONE USING "period_from" AT TIME ZONE 'UTC';
ALTER TABLE "wf_commission_payout" ALTER COLUMN "period_to" TYPE TIMESTAMP(3) WITH TIME ZONE USING "period_to" AT TIME ZONE 'UTC';
ALTER TABLE "wf_commission_payout" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_commission_rule
ALTER TABLE "wf_commission_rule" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_commission_rule" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_commission_rule" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_credential
ALTER TABLE "wf_credential" ALTER COLUMN "activated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "activated_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential" ALTER COLUMN "expires_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "expires_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential" ALTER COLUMN "revoked_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "revoked_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential" ALTER COLUMN "single_session_reseller_unlock_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "single_session_reseller_unlock_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential" ALTER COLUMN "sold_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "sold_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_credential_archive
ALTER TABLE "wf_credential_archive" ALTER COLUMN "activated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "activated_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential_archive" ALTER COLUMN "archived_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "archived_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential_archive" ALTER COLUMN "expires_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "expires_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential_archive" ALTER COLUMN "revoked_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "revoked_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential_archive" ALTER COLUMN "sold_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "sold_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential_archive" ALTER COLUMN "source_created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "source_created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_credential_archive" ALTER COLUMN "source_updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "source_updated_at" AT TIME ZONE 'UTC';

-- wf_org
ALTER TABLE "wf_org" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_org_invoice
ALTER TABLE "wf_org_invoice" ALTER COLUMN "billing_period_from" TYPE TIMESTAMP(3) WITH TIME ZONE USING "billing_period_from" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_invoice" ALTER COLUMN "billing_period_to" TYPE TIMESTAMP(3) WITH TIME ZONE USING "billing_period_to" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_invoice" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_invoice" ALTER COLUMN "due_date" TYPE TIMESTAMP(3) WITH TIME ZONE USING "due_date" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_invoice" ALTER COLUMN "issued_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "issued_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_invoice" ALTER COLUMN "paid_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "paid_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_invoice" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_org_invoice_item
ALTER TABLE "wf_org_invoice_item" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

-- wf_org_invoice_payment
ALTER TABLE "wf_org_invoice_payment" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_invoice_payment" ALTER COLUMN "payment_date" TYPE TIMESTAMP(3) WITH TIME ZONE USING "payment_date" AT TIME ZONE 'UTC';

-- wf_org_license
ALTER TABLE "wf_org_license" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_license" ALTER COLUMN "effective_from" TYPE TIMESTAMP(3) WITH TIME ZONE USING "effective_from" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_license" ALTER COLUMN "expires_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "expires_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_license" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_org_license_history
ALTER TABLE "wf_org_license_history" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_license_history" ALTER COLUMN "effective_from" TYPE TIMESTAMP(3) WITH TIME ZONE USING "effective_from" AT TIME ZONE 'UTC';

-- wf_org_license_station_size_price
ALTER TABLE "wf_org_license_station_size_price" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_license_station_size_price" ALTER COLUMN "effective_from" TYPE TIMESTAMP(3) WITH TIME ZONE USING "effective_from" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_license_station_size_price" ALTER COLUMN "effective_to" TYPE TIMESTAMP(3) WITH TIME ZONE USING "effective_to" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_license_station_size_price" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_org_member
ALTER TABLE "wf_org_member" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_member" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_member" ALTER COLUMN "joined_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "joined_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_member" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_org_member_role
ALTER TABLE "wf_org_member_role" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_member_role" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_member_role" ALTER COLUMN "effective_from" TYPE TIMESTAMP(3) WITH TIME ZONE USING "effective_from" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_member_role" ALTER COLUMN "effective_to" TYPE TIMESTAMP(3) WITH TIME ZONE USING "effective_to" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_member_role" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_org_member_station
ALTER TABLE "wf_org_member_station" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

-- wf_org_radius_profile
ALTER TABLE "wf_org_radius_profile" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_radius_profile" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_org_radius_profile" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_payment
ALTER TABLE "wf_payment" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_payment" ALTER COLUMN "paid_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "paid_at" AT TIME ZONE 'UTC';

-- wf_plan
ALTER TABLE "wf_plan" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_plan" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_plan" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_plan_price
ALTER TABLE "wf_plan_price" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_plan_price" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_plan_price" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_plan_price_book
ALTER TABLE "wf_plan_price_book" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_plan_price_book" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_plan_price_book" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_plan_price_book_reseller
ALTER TABLE "wf_plan_price_book_reseller" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

-- wf_plan_price_book_station
ALTER TABLE "wf_plan_price_book_station" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

-- wf_plan_radius_attribute
ALTER TABLE "wf_plan_radius_attribute" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_plan_radius_attribute" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_plan_radius_attribute" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_radius_session
ALTER TABLE "wf_radius_session" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_session" ALTER COLUMN "last_interim_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "last_interim_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_session" ALTER COLUMN "started_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "started_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_session" ALTER COLUMN "stopped_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "stopped_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_session" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_radius_session_archive
ALTER TABLE "wf_radius_session_archive" ALTER COLUMN "archived_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "archived_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_session_archive" ALTER COLUMN "last_interim_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "last_interim_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_session_archive" ALTER COLUMN "started_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "started_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_session_archive" ALTER COLUMN "stopped_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "stopped_at" AT TIME ZONE 'UTC';

-- wf_radius_vendor_profile
ALTER TABLE "wf_radius_vendor_profile" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_vendor_profile" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_radius_vendor_profile" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_radius_vendor_profile_supported_attr
ALTER TABLE "wf_radius_vendor_profile_supported_attr" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

-- wf_reseller
ALTER TABLE "wf_reseller" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_reseller" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_reseller" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_reseller_plan_entitlement
ALTER TABLE "wf_reseller_plan_entitlement" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_reseller_plan_entitlement" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_reseller_station
ALTER TABLE "wf_reseller_station" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_reseller_station" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_reseller_station" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_router_supported_attribute
ALTER TABLE "wf_router_supported_attribute" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_router_supported_attribute" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_sale_item
ALTER TABLE "wf_sale_item" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';

-- wf_sale_order
ALTER TABLE "wf_sale_order" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_sale_order" ALTER COLUMN "sold_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "sold_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_sale_order" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_sale_order_archive
ALTER TABLE "wf_sale_order_archive" ALTER COLUMN "archived_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "archived_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_sale_order_archive" ALTER COLUMN "sold_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "sold_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_sale_order_archive" ALTER COLUMN "source_created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "source_created_at" AT TIME ZONE 'UTC';

-- wf_station
ALTER TABLE "wf_station" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_station_device
ALTER TABLE "wf_station_device" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station_device" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station_device" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_station_license_price
ALTER TABLE "wf_station_license_price" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station_license_price" ALTER COLUMN "effective_from" TYPE TIMESTAMP(3) WITH TIME ZONE USING "effective_from" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station_license_price" ALTER COLUMN "effective_to" TYPE TIMESTAMP(3) WITH TIME ZONE USING "effective_to" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station_license_price" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_station_plan_offer
ALTER TABLE "wf_station_plan_offer" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station_plan_offer" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_station_size
ALTER TABLE "wf_station_size" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_station_size" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

-- wf_voucher_batch
ALTER TABLE "wf_voucher_batch" ALTER COLUMN "created_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "created_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_voucher_batch" ALTER COLUMN "deleted_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "deleted_at" AT TIME ZONE 'UTC';
ALTER TABLE "wf_voucher_batch" ALTER COLUMN "updated_at" TYPE TIMESTAMP(3) WITH TIME ZONE USING "updated_at" AT TIME ZONE 'UTC';

COMMIT;
