const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "app", ".next");
const targetDir = path.join(rootDir, ".next");

if (!fs.existsSync(sourceDir)) {
  console.error(`Expected Next.js output not found at ${sourceDir}`);
  process.exit(1);
}

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}

fs.cpSync(sourceDir, targetDir, { recursive: true });
console.log(`Synced ${sourceDir} -> ${targetDir}`);
