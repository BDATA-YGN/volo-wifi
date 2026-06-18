cd backend
yarn restore:menu
yarn restore:role-settings
yarn restore:translation-themes
yarn seed

yarn backup:role-settings
yarn backup:menu 
yarn backup:translation-themes


# From repo root:
cd backend
npx prisma generate
npx ts-node -r tsconfig-paths/register tools/sms-migrate-from-csv.ts --dryRun true

# To actually write into DB:
cd backend
npx ts-node -r tsconfig-paths/register tools/sms-migrate-from-csv.ts --dryRun false

# If your CSVs are in a different folder:
cd backend
npx ts-node -r tsconfig-paths/register tools/sms-migrate-from-csv.ts --docsDir /absolute/path/to/docs --dryRun false