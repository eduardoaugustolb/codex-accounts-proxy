import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const git = Bun.spawn(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], {
  stdout: "pipe",
  stderr: "inherit",
});
const paths = (await git.stdout.text()).split("\0").filter(Boolean);
if ((await git.exited) !== 0) process.exit(1);
let failed = false;
for (const path of paths) {
  if (
    !/\.(?:[cm]?[jt]sx?|jsonc?|css|astro)$/.test(path) ||
    /^(?:marketplace\/plugin\/bin|src\/themes|website\/(?:dist|\.astro))\//.test(path)
  )
    continue;
  // Check the actual index blob, not unstaged edits. Never rewrite or restage user files.
  const show = Bun.spawn(["git", "show", `:${path}`], { stdout: "pipe", stderr: "inherit" });
  const content = await show.stdout.text();
  if ((await show.exited) !== 0) {
    failed = true;
    continue;
  }
  const check = Bun.spawn(
    [
      join(root, "node_modules", ".bin", "biome"),
      "check",
      "--write",
      `--stdin-file-path=${join(root, path)}`,
      `--config-path=${root}`,
      "--no-errors-on-unmatched",
    ],
    { stdin: "pipe", stdout: "pipe", stderr: "inherit" },
  );
  check.stdin.write(content);
  check.stdin.end();
  const formatted = await check.stdout.text();
  if ((await check.exited) !== 0 || formatted !== content) {
    failed = true;
    console.error(`Staged file needs formatting or lint fixes: ${path}`);
  }
}
if (failed)
  console.error(
    "Staged format/lint checks failed. Run bun run format and bun run lint:fix, review, then stage the intended changes again.",
  );
process.exitCode = failed ? 1 : 0;
