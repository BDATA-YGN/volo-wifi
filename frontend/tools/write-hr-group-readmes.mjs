/**
 * Writes README.md under backend and frontend features/hr/<groupKey>/
 * from backend/src/prisma/json/menu.json.
 *
 * Usage: node frontend/tools/write-hr-group-readmes.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const menuPath = path.join(repoRoot, "backend/src/prisma/json/menu.json");
const menu = JSON.parse(fs.readFileSync(menuPath, "utf8"));

const roots = [
  path.join(repoRoot, "backend/src/features/hr"),
  path.join(repoRoot, "frontend/src/features/hr"),
];

function readmeForGroup(group) {
  const items = menu.menuItems.filter((i) => i.groupKey === group.key);
  const lines = items
    .sort((a, b) => a.position - b.position)
    .map((i) => `- **${i.url}** — \`${i.title}\` (key: \`${i.key}\`)`);
  return `# HR — ${group.key}

Source: \`backend/src/prisma/json/menu.json\` (group id \`${group.id}\`).

## Menu items

${lines.join("\n") || "_No items._"}

## Backend

Add REST (or tRPC) handlers under this folder when you implement the domain, e.g. \`routes.ts\` + \`controller.ts\`, and register the route class in \`server.ts\`.

Suggested API prefix: \`/api/hr/${group.key}/...\` (optional convention).

## Frontend

Implement \`*Page.tsx\` (and hooks/query) here; keep \`app/(dash)/...\` as a thin re-export to that page.
`;
}

for (const root of roots) {
  fs.mkdirSync(root, { recursive: true });
  for (const group of menu.menuGroups) {
    const dir = path.join(root, group.key);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "README.md"), readmeForGroup(group), "utf8");
  }
}

console.log("Wrote group README.md under backend/src/features/hr/* and frontend/src/features/hr/*");
