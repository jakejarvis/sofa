/**
 * Tags and publishes a GitHub release for the current server version unless that tag already
 * exists, then dispatches the Docker workflow for it. The Release workflow runs this on every push
 * to main; it's a no-op until a "Version Packages" PR merges and changes the version.
 *
 * Release notes are merged from the CHANGELOG.md of every package in the fixed version group, so a
 * changeset counts no matter which of those packages it names.
 *
 * Usage: bun run release [--dry-run]
 */

import path from "node:path";

import { $ } from "bun";

import changesetConfig from "../.changeset/config.json" with { type: "json" };

const CHANGE_TYPES = ["Major Changes", "Minor Changes", "Patch Changes"];
// The whole group moves in lockstep, so its dependency bumps are noise: "- Updated dependencies
// [abc1234]:" then "  - @sofa/api@1.2.3" lines (the default changelog generator leaves out the first
// line when only the fixed group caused the bump)
const DEPENDENCY_ENTRY = /^- (?:Updated dependencies|@sofa\/[\w-]+@\d)/;

const dryRun = process.argv.includes("--dry-run");

const { version } = await Bun.file("apps/server/package.json").json();
const tag = `v${version}`;

const packageDirs = new Map<string, string>();
for await (const file of new Bun.Glob("{apps,packages}/*/package.json").scan()) {
  const { name } = await Bun.file(file).json();
  packageDirs.set(name, path.dirname(file));
}

// "### Minor Changes" → its entries, deduplicated across changelogs (a changeset naming several
// packages in the group writes the same entry to each of them)
const entriesByType = new Map<string, Set<string>>();
for (const name of changesetConfig.fixed[0]) {
  const changelog = Bun.file(`${packageDirs.get(name)}/CHANGELOG.md`);
  if (!(await changelog.exists())) continue;

  const lines = (await changelog.text()).split("\n");
  const start = lines.indexOf(`## ${version}`);
  if (start === -1) continue;
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));

  let entries: Set<string> | undefined;
  let entry: string[] = [];
  const flush = () => {
    const text = entry.join("\n").trimEnd();
    if (text && !DEPENDENCY_ENTRY.test(text)) entries?.add(text);
    entry = [];
  };
  for (const line of lines.slice(start + 1, end === -1 ? undefined : end)) {
    if (line.startsWith("### ")) {
      flush();
      const type = line.slice(4).trim();
      entries = entriesByType.get(type) ?? new Set();
      entriesByType.set(type, entries);
    } else if (line.startsWith("- ")) {
      flush();
      entry.push(line);
    } else if (entry.length > 0) {
      entry.push(line);
    }
  }
  flush();
}

const notes = CHANGE_TYPES.filter((type) => entriesByType.get(type)?.size)
  .map((type) => `### ${type}\n\n${[...(entriesByType.get(type) ?? [])].join("\n")}`)
  .join("\n\n");

if (dryRun) {
  console.log(`${tag}\n\n${notes || "(no changelog entries; GitHub would generate notes)"}`);
  process.exit(0);
}

// --exit-code: 0 when the tag exists, 2 when it doesn't
const remoteTag = await $`git ls-remote --exit-code --tags origin refs/tags/${tag}`
  .nothrow()
  .quiet();
if (remoteTag.exitCode === 0) {
  console.log(`${tag} has already been released.`);
  process.exit(0);
}
if (remoteTag.exitCode !== 2) {
  throw new Error(`git ls-remote failed: ${remoteTag.stderr.toString()}`);
}

const target = (await $`git rev-parse HEAD`.text()).trim();
const args = ["release", "create", tag, "--title", tag, "--target", target];
if (version.includes("-")) args.push("--prerelease");
args.push(...(notes ? ["--notes", notes] : ["--generate-notes"]));
await $`gh ${args}`;
console.log(`Released ${tag}.`);

// Tags created with the workflow's GITHUB_TOKEN don't trigger other workflows, so start the
// Docker build for this tag explicitly.
await $`gh workflow run docker.yml --ref ${tag}`;
