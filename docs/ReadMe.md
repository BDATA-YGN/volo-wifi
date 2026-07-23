cd backend
yarn restore:menu
yarn restore:role-settings
yarn restore:translation-themes
yarn seed

yarn backup:role-settings
yarn backup:menu 
yarn backup:translation-themes

# SMS CSV migrate lives in the volo-sms repo (SMS billing was removed from volo-wifi):
#   cd ../volo-sms/backend
#   yarn data:sms:migrate
#   yarn data:sms:migrate:apply

# WiFi legacy DB migrate (volo-api-console → volo-wifi): see docs/wifi-data-migration.md
# Retail pricing redesign / consolidate: see docs/retail-pricing-redesign.md
#   yarn data:retail-pricing:backup -- --org=AA
#   yarn data:retail-pricing:consolidate -- --org=AA
#   yarn data:retail-pricing:consolidate -- --org=AA --apply --i-understand
#   cd backend
#   # set OLD_DATABASE_URL in .env
#   yarn data:wifi:migrate:dry -- --phase=1 --org=AA
#   yarn data:wifi:migrate -- --apply --i-understand --phase=1 --org=AA
#   # verify, then phase 2, then phase 3
#   yarn data:wifi:migrate -- --apply --i-understand --phase=2 --org=AA
#   yarn data:wifi:migrate -- --apply --i-understand --phase=3 --org=AA
#   # reset NEW org data to re-migrate:
#   yarn data:wifi:migrate:reset -- --org=AA --i-understand
#   # weekly catch-up:
#   yarn data:wifi:migrate -- --apply --i-understand --phase=2 --since=2026-07-22 --org=AA


#   yarn data:wifi:migrate:reset -- --org=AA --i-understand