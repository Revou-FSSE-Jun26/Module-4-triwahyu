// Fails when the server at BASE_URL is not serving the build currently on disk (.next/BUILD_ID).
// A stale `next start` process serves HTML that points at deleted chunks and makes E2E fail with ChunkLoadError.
// Usage: node scripts/verify-build.mjs http://127.0.0.1:3000   (only meaningful for a local `next start`)
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const onDisk = readFileSync(new URL("../.next/BUILD_ID", import.meta.url), "utf8").trim();

const html = await (await fetch(`${base}/login`)).text();
// The App Router embeds the build id in the RSC payload as \"b\":\"<id>\".
const served = html.match(/\\"b\\":\\"([A-Za-z0-9_-]+)\\"/)?.[1];

if (!served) {
  console.error(`Could not find a build id in the HTML served by ${base}/login`);
  process.exit(2);
}
if (served !== onDisk) {
  console.error(
    `STALE SERVER: ${base} serves build ${served} but .next/BUILD_ID is ${onDisk}. Restart \`next start\`.`,
  );
  process.exit(1);
}
console.log(`OK: ${base} serves the current build (${onDisk}).`);
