import { copyFile, mkdir, readdir, readFile, rmdir } from "fs/promises";
import path from "path";
import { build } from "esbuild";

const manifest = JSON.parse(await readFile("chrome/manifest.json", "utf-8"));

await rmdir("dist", { recursive: true });
await mkdir("dist", { recursive: true });

await Promise.all([
  build({
    entryPoints: ["chrome/background.ts"],
    bundle: true,
    minify: false,
    sourcemap: "inline",
    outdir: "dist",
    target: `chrome${manifest.minimum_chrome_version}`,
  }),

  copyFile("chrome/manifest.json", "dist/manifest.json"),

  copyDir("chrome/assets", "dist/assets"),
]);

async function copyDir(from, to) {
  const files = await readdir(from);
  await mkdir(to, { recursive: true });
  await Promise.all(files.map((f) => copyFile(path.join(from, f), path.join(to, f))));
}
