/**
 * Applies pending changesets (version bumps + changelogs), then syncs the other files that record
 * the version. The Release workflow runs this to build the "Version Packages" PR.
 *
 * Usage: bun run version-packages (needs GITHUB_TOKEN for @changesets/changelog-github)
 */

import { $ } from "bun";

await $`changeset version`;

const { version } = await Bun.file("apps/server/package.json").json();

const specPath = "docs/public/openapi.json";
const spec = await Bun.file(specPath).json();
spec.info.version = version;
await Bun.write(specPath, JSON.stringify(spec, null, 2));

// bun.lock records every workspace's version; sync it now rather than in someone's next PR
await $`bun install --lockfile-only`;
