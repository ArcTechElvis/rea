#!/usr/bin/env node
/**
 * Enforce the `max-lines` budget as a ratchet instead of a warning.
 *
 * `.oxlintrc.json` sets `max-lines` to `warn` with a 500-line budget, and 375
 * non-test source files exceed it. A warning nobody reads is not enforcement,
 * so files kept growing: the largest is 3,407 effective lines.
 *
 * A ratchet converts one unenforced rule into a deterministic check without
 * asking anyone to rewrite 375 files at once:
 *
 *   - every file already over the budget is recorded in the baseline;
 *   - a file may not exceed its recorded allowance;
 *   - a file that is not in the baseline may not exceed the budget at all;
 *   - removing or shrinking entries is always allowed, and the baseline is
 *     rewritten on `--update` so it can only ever shrink.
 *
 * Effective lines follow the oxlint rule: blank lines and comment-only lines
 * do not count.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET = 500;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baselinePath = resolve(
  root,
  "scripts",
  "verify",
  "max-lines-baseline.json",
);

/** Source files this check owns: implementation, not tests or fixtures. */
const TRACKED = /^src\/.*\.ts$/u;
const EXEMPT = /\.(?:test|spec|fixture|d)\.ts$/u;

/** Lines oxlint counts: not blank, not a comment body. */
const effectiveLines = (source) => {
  let count = 0;
  let inBlockComment = false;
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      continue;
    }
    if (line === "") continue;
    if (line.startsWith("//")) continue;
    if (line.startsWith("/*")) {
      if (!line.includes("*/")) inBlockComment = true;
      continue;
    }
    count += 1;
  }
  return count;
};

const trackedFiles = () => {
  const listed = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "src"],
    { cwd: root, encoding: "utf8" },
  );
  return listed
    .split("\n")
    .map((line) => line.trim())
    .filter((path) => path !== "" && TRACKED.test(path) && !EXEMPT.test(path));
};

const measure = () => {
  const sizes = new Map();
  for (const path of trackedFiles()) {
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) continue;
    sizes.set(path, effectiveLines(readFileSync(absolute, "utf8")));
  }
  return sizes;
};

const readBaseline = () => {
  if (!existsSync(baselinePath)) return {};
  const parsed = JSON.parse(readFileSync(baselinePath, "utf8"));
  const entries = parsed.files ?? parsed;
  if (typeof entries !== "object" || entries === null)
    throw new Error(
      `${relative(root, baselinePath)} must record an object of path to allowance.`,
    );
  return entries;
};

const overBudget = (sizes) =>
  [...sizes]
    .filter(([, lines]) => lines > BUDGET)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

const main = (args) => {
  const sizes = measure();
  const over = overBudget(sizes);

  if (args.includes("--update")) {
    const allowed = Object.fromEntries(
      over.map(([path, lines]) => [path, lines]),
    );
    const previous = readBaseline();
    const grown = Object.entries(allowed).filter(
      ([path, lines]) => previous[path] !== undefined && lines > previous[path],
    );
    if (grown.length > 0) {
      for (const [path, lines] of grown)
        console.error(
          `${path}: ${lines} lines exceeds the recorded allowance of ${previous[path]}. Split the file; the baseline may only shrink.`,
        );
      return 1;
    }
    writeFileSync(
      baselinePath,
      `${JSON.stringify(
        {
          budget: BUDGET,
          note: "Files already over the max-lines budget. May only shrink. Regenerate with --update after a split.",
          files: allowed,
        },
        null,
        2,
      )}\n`,
    );
    console.log(
      `Recorded ${over.length} files over the ${BUDGET}-line budget.`,
    );
    return 0;
  }

  const baseline = readBaseline();
  const failures = [];
  for (const [path, lines] of over) {
    const allowed = baseline[path];
    if (allowed === undefined)
      failures.push(
        `${path}: ${lines} lines exceeds the ${BUDGET}-line budget and is not in the baseline. Split it, or add it deliberately with --update.`,
      );
    else if (lines > allowed)
      failures.push(
        `${path}: ${lines} lines exceeds its recorded allowance of ${allowed}.`,
      );
  }

  const stale = Object.keys(baseline).filter(
    (path) => sizes.get(path) !== undefined && sizes.get(path) <= BUDGET,
  );

  if (failures.length > 0) {
    for (const failure of failures) console.error(failure);
    console.error(`\n${failures.length} file(s) exceed the max-lines budget.`);
    return 1;
  }

  const scriptPath = relative(root, fileURLToPath(import.meta.url))
    .split(sep)
    .join("/");
  console.log(
    `max-lines ratchet: ${over.length} file(s) over ${BUDGET} lines, all within their recorded allowance.`,
  );
  if (stale.length > 0)
    console.log(
      `${stale.length} baseline entr${stale.length === 1 ? "y is" : "ies are"} now within budget; run \`node ${scriptPath} --update\` to drop ${stale.length === 1 ? "it" : "them"}.`,
    );
  return 0;
};

process.exitCode = main(process.argv.slice(2));
