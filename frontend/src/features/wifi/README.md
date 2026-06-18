# Volo WiFi — frontend features

Scaffolded from `backend/src/prisma/json/menu.json` via `frontend/tools/scaffold-wifi-features.js`.

Each module folder mirrors the menu route after `/wifi/`:

- `{Module}Page.tsx` — screen shell (placeholder or full implementation)
- `constant.ts` — API path helpers (`buildWifiApiRoutes`)
- `query.ts` / `use{Module}.ts` — data layer stubs
- `components/` — UI pieces

Shared: `shared/WifiModulePage.tsx`, `shared/utils.ts`, `shared/hooks/`.

Re-run scaffold safely: `node frontend/tools/scaffold-wifi-features.js`
