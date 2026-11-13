const run = async (args: string[]) => {
  const child = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "ignore" });
  const output = (await child.stdout.text()).trim();
  return { code: await child.exited, output };
};
if (process.env.CI !== "true") {
  const repository = await run(["rev-parse", "--show-toplevel"]);
  if (repository.code === 0 && repository.output === import.meta.dir.replace(/\/tools$/, "")) {
    const current = await run(["config", "--get", "core.hooksPath"]);
    if (current.output && current.output !== ".githooks") {
      console.log(
        "Existing Git hooks preserved. Add `bun run check:staged` to your pre-commit hook.",
      );
    } else {
      const installed = await run(["config", "--local", "core.hooksPath", ".githooks"]);
      if (installed.code !== 0)
        throw new Error("Could not enable Git hooks. Run bun run hooks:install.");
    }
  }
}
