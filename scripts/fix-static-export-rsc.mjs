/**
 * Next.js 16 static-export workaround (Windows only).
 *
 * `output: "export"` is supposed to emit flat RSC payload files such as
 * `__next.analyzer.__PAGE__.txt`, but on Windows the exporter builds the name
 * with `path.relative`, which introduces backslashes. That turns one file into
 * a nested folder (`__next.analyzer/__PAGE__.txt`), so the router's prefetch
 * requests 404.
 *
 * Upstream: https://github.com/vercel/next.js/issues/85374
 *
 * This script flattens those folders using dots. On Linux/macOS the export is
 * already correct, so the script is a no-op.
 */
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve(process.argv[2] ?? "out");

if (!fs.existsSync(outDir)) {
  console.log("[fix-rsc] no export directory found, skipping");
  process.exit(0);
}

let flattened = 0;

function collectFiles(dir, prefix = "") {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(dir, entry.name), relative));
    } else {
      files.push(relative);
    }
  }
  return files;
}

function flattenSegmentDirs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.name.startsWith("__next.")) {
      for (const relative of collectFiles(fullPath)) {
        const flatName = `${entry.name}.${relative.split("/").join(".")}`;
        const source = path.join(fullPath, relative);
        const target = path.join(dir, flatName);

        if (fs.existsSync(target)) {
          fs.rmSync(source, { force: true });
        } else {
          fs.renameSync(source, target);
        }
        flattened += 1;
      }
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      flattenSegmentDirs(fullPath);
    }
  }
}

flattenSegmentDirs(outDir);
console.log(
  flattened > 0
    ? `[fix-rsc] flattened ${flattened} Windows RSC payload file(s)`
    : "[fix-rsc] RSC payload paths already correct",
);
