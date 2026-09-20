#!/usr/bin/env node
/**
 * Centralized, config-driven build asset copier for workspace packages.
 *
 * `tsc` only emits compiled `.ts` sources, so non-code assets (Handlebars
 * templates, JSON seed data, images, etc.) must be copied into `dist`
 * separately. This script copies one or more configured directories, each
 * optionally filtered by file extension and/or a regex pattern.
 *
 * Config resolution order (first match wins):
 *
 * 1. CLI single mapping (see mode 3 below).
 * 2. Explicit `--config <path>` file.
 * 3. `copy-assets.config.json` in the invoking package.
 * 4. A `copyAssets` field in the invoking package's `package.json`.
 *
 * Config file / `copyAssets` field shape (array, or `{ "assets": [...] }`):
 *
 *      { "assets": [
 *          { "src": "src/infrastructure/templates",
 *            "dest": "dist/infrastructure/templates",
 *            "ext": [".hbs"] },
 *          { "src": "src/shared/seeds/json-store/data",
 *            "dest": "dist/shared/seeds/json-store/data",
 *            "match": "\\.json$" }
 *      ] }
 *
 * 3. CLI single mapping:
 *
 *      node ../../../scripts/copy-assets.mjs <srcDir> <destDir> [--ext=.hbs,.png] [--match=<regex>]
 *
 * Paths are resolved relative to the invoking package (process.cwd(), which npm
 * sets to the package directory for lifecycle scripts). Directories are always
 * walked; a file is copied only if it passes every configured filter. With no
 * filter, all files are copied.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import { isAbsolute, relative, resolve, sep } from 'path';

const args = process.argv.slice(2);
const positionals = args.filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [key, value = ''] = a.replace(/^--/, '').split('=');
      return [key, value];
    }),
);

const cwd = process.cwd();

function normalizeExts(ext) {
  if (!ext) return null;
  const list = Array.isArray(ext) ? ext : String(ext).split(',');
  const cleaned = list.map((e) => e.trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

function toEntries(source, label) {
  const entries = Array.isArray(source) ? source : source.assets;
  if (!Array.isArray(entries)) {
    console.error(`copy-assets: ${label} must be an array or { "assets": [...] }`);
    process.exit(1);
  }
  return entries;
}

/** Resolve the list of `{ src, dest, ext?, match? }` entries to copy. */
function resolveEntries() {
  if (positionals.length >= 2) {
    const [src, dest] = positionals;
    return [{ src, dest, ext: flags.ext, match: flags.match }];
  }

  // Explicit --config, or a standalone copy-assets.config.json in the package.
  const explicit = flags.config ? resolve(cwd, flags.config) : null;
  const defaultConfig = resolve(cwd, 'copy-assets.config.json');
  const configPath = explicit ?? (existsSync(defaultConfig) ? defaultConfig : null);
  if (configPath) {
    if (!existsSync(configPath)) {
      console.error(`copy-assets: config not found at ${configPath}`);
      process.exit(1);
    }
    return toEntries(JSON.parse(readFileSync(configPath, 'utf-8')), 'config');
  }

  // Fall back to a `copyAssets` field in the package's package.json.
  const pkgPath = resolve(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (pkg.copyAssets != null) {
      return toEntries(pkg.copyAssets, 'package.json "copyAssets"');
    }
  }

  console.error(
    'copy-assets: provide <srcDir> <destDir>, a config file, or a "copyAssets" field in package.json',
  );
  process.exit(1);
}

function buildFilter(srcAbs, entry) {
  const exts = normalizeExts(entry.ext);
  const matcher = entry.match ? new RegExp(entry.match) : null;
  return (source) => {
    if (statSync(source).isDirectory()) {
      return true;
    }
    if (exts && !exts.some((ext) => source.endsWith(ext))) {
      return false;
    }
    if (matcher) {
      const rel = relative(srcAbs, source).split(sep).join('/');
      if (!matcher.test(rel)) {
        return false;
      }
    }
    return true;
  };
}

for (const entry of resolveEntries()) {
  if (!entry || !entry.src || !entry.dest) {
    console.error('copy-assets: each entry requires "src" and "dest"');
    process.exit(1);
  }
  const srcAbs = isAbsolute(entry.src) ? entry.src : resolve(cwd, entry.src);
  const destAbs = isAbsolute(entry.dest) ? entry.dest : resolve(cwd, entry.dest);
  if (!existsSync(srcAbs)) {
    continue;
  }
  mkdirSync(destAbs, { recursive: true });
  cpSync(srcAbs, destAbs, { recursive: true, filter: buildFilter(srcAbs, entry) });
}
