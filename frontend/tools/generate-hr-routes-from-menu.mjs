/**
 * Reads backend menu.json and creates missing app/(dash)/<url>/page.tsx stubs
 * that render SectionPlaceholder. Skips paths that already have page.tsx.
 *
 * Usage (from repo root):
 *   node frontend/tools/generate-hr-routes-from-menu.mjs
 *   node frontend/tools/generate-hr-routes-from-menu.mjs --repair-stubs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const menuPath = path.join(repoRoot, "backend/src/prisma/json/menu.json");
const dashRoot = path.join(repoRoot, "frontend/src/app/(dash)");

const repairStubs = process.argv.includes("--repair-stubs");
const menu = JSON.parse(fs.readFileSync(menuPath, "utf8"));
const { menuItems } = menu;

function pageSourceFixed({ groupKey, translationKey, path }) {
  return `import { SectionPlaceholder } from "@/app/(dash)/_components/SectionPlaceholder";

export default function Page() {
  return (
    <SectionPlaceholder
      groupKey="${groupKey}"
      translationKey="${translationKey}"
      path="${path}"
    />
  );
}
`;
}

let created = 0;
let skipped = 0;

for (const item of menuItems) {
  const url = item.url;
  if (!url || !url.startsWith("/")) continue;
  const rel = url.replace(/^\//, "");
  const dir = path.join(dashRoot, rel);
  const pageFile = path.join(dir, "page.tsx");
  if (fs.existsSync(pageFile)) {
    const existing = fs.readFileSync(pageFile, "utf8");
    const isBrokenStub =
      existing.includes("SectionPlaceholder") && existing.includes('path="undefined"');
    if (repairStubs && isBrokenStub) {
      // rewrite below
    } else {
      skipped += 1;
      continue;
    }
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    pageFile,
    pageSourceFixed({
      groupKey: item.groupKey || "unknown",
      translationKey: item.title || item.key,
      path: item.url,
    }),
    "utf8"
  );
  created += 1;
}

console.log(`HR route stubs: created ${created}, skipped (already exists) ${skipped}`);
