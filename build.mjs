import { copyFile, mkdir, readdir, rmdir } from "fs/promises";
import path from "path";
import { build } from "esbuild";

await rmdir("dist", { recursive: true });

await mkdir("dist/assets", { recursive: true });

await Promise.all([
  build({
    entryPoints: ["src/background.js"],
    bundle: true,
    minify: false,
    sourcemap: true,
    outdir: "dist",
  }),

  ...["manifest.json", ...(await listDir("assets"))].map(copierFromTo("src", "dist")),
]);

async function listDir(dirname) {
  const files = await readdir(path.join("src", dirname));
  return files.map((file) => path.join(dirname, file));
}

function copierFromTo(from, to) {
  return (f) => copyFile(path.join(from, f), path.join(to, f));
}
