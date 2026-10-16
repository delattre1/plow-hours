#!/usr/bin/env node
// Runs the image's checks without Docker: the CI typecheck and the full `node --test`
// suite, against a local copy of the /opt/plow layout assembled from the pinned base
// source the same way the Dockerfile assembles it.
//
//   node scripts/test-local.mjs                  # typecheck + every tests/*.test.ts
//   node scripts/test-local.mjs tests/hours.test.ts
//   OURS_BASE_SRC=../plow-openclaw-agent node scripts/test-local.mjs
//   node scripts/test-local.mjs --keep           # keep the assembled root for inspection
//   node scripts/test-local.mjs --no-typecheck   # tests only, while iterating
//
// Requires Node >= 24.16 (CI uses 26), `npm ci`, and git. The base source comes from
// OURS_BASE_SRC (a clone of plow-pbc/plow-openclaw-agent) or is cloned once into
// .cache/. What this does not cover: the base image's OS packages, agentsview, the
// Agent Index client, and the offline gateway probe. Those still need `docker build`.
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const keep = args.includes("--keep");
const typecheck = !args.includes("--no-typecheck");
const selected = args.filter(arg => !arg.startsWith("--"));

export function pinnedBase(dockerfile) {
  const from = dockerfile.split("\n").find(line => line.startsWith("FROM "));
  const match = from?.match(/plow-cloud-agents:base-([0-9a-f]{40})@sha256:[0-9a-f]{64}\s*$/);
  if (!match) throw new Error("The Dockerfile must pin the base as plow-cloud-agents:base-<sha>@sha256:<digest>");
  return match[1];
}

// ENV lines as Docker reads them: KEY=value or KEY="value with spaces".
export function dockerEnv(dockerfile) {
  const env = {};
  for (const line of dockerfile.split("\n").filter(line => line.startsWith("ENV "))) {
    for (const [, key, quoted, bare] of line.slice(4).matchAll(/([A-Z_][A-Z0-9_]*)=(?:"((?:[^"\\]|\\.)*)"|(\S*))/g)) {
      env[key] = quoted ?? bare;
    }
  }
  return env;
}

function git(cwd, ...argv) {
  return execFileSync("git", argv, { cwd, stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 30 });
}

function baseSource(sha) {
  const source = process.env.OURS_BASE_SRC ? resolve(process.env.OURS_BASE_SRC) : join(repo, ".cache", "plow-openclaw-agent");
  if (!existsSync(join(source, ".git"))) {
    if (process.env.OURS_BASE_SRC) throw new Error(`OURS_BASE_SRC is not a git clone: ${source}`);
    execFileSync("git", ["clone", "--quiet", "--filter=blob:none", "--no-checkout",
      "https://github.com/plow-pbc/plow-openclaw-agent.git", source], { stdio: "inherit" });
  }
  try { git(source, "cat-file", "-e", `${sha}^{commit}`); }
  catch { git(source, "fetch", "--quiet", "origin", sha); }
  return source;
}

function run(label, command, argv, env) {
  console.log(`\n== ${label}`);
  const result = spawnSync(command, argv, { stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`${label} failed (exit ${result.status ?? result.signal})`);
}

const dockerfile = await readFile(join(repo, "Dockerfile"), "utf8");
const sha = pinnedBase(dockerfile);
const source = baseSource(sha);
const root = await mkdtemp(join(tmpdir(), "ours-local-"));
const plow = join(root, "opt/plow");
try {
  console.log(`base ${sha} from ${source}\nroot ${root}`);
  await mkdir(plow, { recursive: true });
  for (const path of ["var/lib/plow", "etc/plow/openclaw", "root"]) await mkdir(join(root, path), { recursive: true });

  // The base image: COPY boot plugin prompt skills build.ts package*.json tsconfig.json.
  const archive = git(source, "archive", sha, "boot", "plugin", "prompt", "skills", "build.ts",
    "package.json", "package-lock.json", "tsconfig.json");
  execFileSync("tar", ["-x", "-C", plow], { input: archive });
  // npm ci there and the runtime at /app: both come from this repository's install,
  // which pins the same openclaw, typescript and @types versions as the base.
  await symlink(join(repo, "node_modules"), join(plow, "node_modules"));
  await symlink(join(repo, "node_modules", "openclaw"), join(root, "app"));

  const env = {
    ...Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/^(AGENT_|BOSS_ID$|PLOW_|OPENCLAW_|HERMES_)/.test(key))),
    ...dockerEnv(git(source, "show", `${sha}:Dockerfile`).toString()),
    ...dockerEnv(dockerfile),
    HOME: join(root, "root"),
    OURS_LOCAL_ROOT: root,
  };
  const preload = ["--import", join(repo, "scripts", "local-root.mjs")];
  run("base build.ts", process.execPath, [...preload, join(plow, "build.ts")], env);

  // This repository's Dockerfile, in order.
  await cp(join(repo, "plugin"), join(plow, "hours-source/plugin"), { recursive: true });
  for (const name of ["install.mjs", "probe.mjs", "backup.mjs"]) await cp(join(repo, name), join(plow, "hours-source", name));
  await cp(join(repo, "addon"), join(root, "opt/ours/plugin"), { recursive: true });
  await cp(join(repo, "boot/ours-config.ts"), join(plow, "boot/ours-config.ts"));
  run("install.mjs", process.execPath, [...preload, join(plow, "hours-source/install.mjs")], env);
  await cp(join(repo, "AGENTS.md"), join(plow, "hours-source/AGENTS.md"));
  await cp(join(repo, "AGENTS.md"), join(plow, "prompt/AGENTS.md"));
  await cp(join(repo, "skill"), join(plow, "skills/contractor-hours"), { recursive: true });
  await cp(join(repo, "boot/preboot.ts"), join(plow, "boot/ours-preboot.ts"));

  // CI: tsc against the base tsconfig, then every test with the runtime linked in.
  if (typecheck) run("typecheck", process.execPath, [join(repo, "node_modules/typescript/bin/tsc"), "--noEmit", "-p", join(plow, "tsconfig.json")], env);
  await cp(join(repo, "tests"), join(plow, "tests"), { recursive: true });
  await mkdir(join(plow, "plugin/node_modules"), { recursive: true });
  await symlink(join(root, "app"), join(plow, "plugin/node_modules/openclaw"));
  const tests = selected.length
    ? selected.map(path => join(plow, "tests", path.replace(/^tests\//, "")))
    : (await readdir(join(plow, "tests"))).filter(name => name.endsWith(".test.ts")).sort().map(name => join(plow, "tests", name));
  run(`node --test (${tests.length} files)`, process.execPath,
    [...preload, "--test", "--test-timeout=180000", ...tests],
    { ...env, NODE_OPTIONS: `--import=${join(repo, "scripts", "local-root.mjs")}` });
} finally {
  if (keep) console.log(`kept ${root}`);
  else await rm(root, { recursive: true, force: true });
}
