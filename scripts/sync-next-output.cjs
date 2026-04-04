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

// Keep real output in app/.next and expose root .next as a link for Vercel detection.
const linkType = process.platform === "win32" ? "junction" : "dir";
fs.symlinkSync(sourceDir, targetDir, linkType);
console.log(`Linked ${targetDir} -> ${sourceDir}`);
