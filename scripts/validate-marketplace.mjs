import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKETPLACE_PATH = ".agents/plugins/marketplace.json";
const CANONICAL_REPO_URL = "https://github.com/yfge/codex-plugins.git";

const INSTALLATION_POLICIES = new Set([
  "NOT_AVAILABLE",
  "AVAILABLE",
  "INSTALLED_BY_DEFAULT"
]);
const AUTHENTICATION_POLICIES = new Set(["ON_INSTALL", "ON_USE"]);

const REQUIRED_MANIFEST_FIELDS = [
  "name",
  "version",
  "description",
  "repository",
  "license"
];
const REQUIRED_INTERFACE_FIELDS = [
  "displayName",
  "shortDescription",
  "longDescription",
  "developerName",
  "category"
];
const MANIFEST_PATH_FIELDS = ["skills", "mcpServers", "apps", "hooks"];

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertObject(value, label) {
  if (!isObject(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty string array`);
  }

  for (const [index, item] of value.entries()) {
    assertString(item, `${label}[${index}]`);
  }
}

function validateRelativePluginPath(pluginName, value, label) {
  assertString(value, label);

  if (!value.startsWith("./")) {
    throw new Error(`${label} must start with ./`);
  }

  const withoutPrefix = value.slice(2);
  if (!withoutPrefix) {
    throw new Error(`${label} must not be empty`);
  }

  const parts = withoutPrefix.split("/");
  for (const [index, part] of parts.entries()) {
    const isTrailingSlash = part === "" && index === parts.length - 1;
    if (isTrailingSlash) {
      continue;
    }

    if (part === "" || part === "." || part === "..") {
      throw new Error(`${label} must stay inside ${pluginName}`);
    }
  }

  return withoutPrefix.endsWith("/") ? withoutPrefix.slice(0, -1) : withoutPrefix;
}

async function readJson(filePath, label) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`${label} is missing at ${filePath}: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function validateMarketplaceEntry(entry) {
  assertObject(entry, "plugin entry");
  assertString(entry.name, "plugin entry name");
  assertString(entry.category, `${entry.name}: category`);
  assertObject(entry.source, `${entry.name}: source`);
  assertObject(entry.policy, `${entry.name}: policy`);

  if (entry.source.source !== "git-subdir") {
    throw new Error(`${entry.name}: source.source must be git-subdir`);
  }

  if (entry.source.url !== CANONICAL_REPO_URL) {
    throw new Error(`${entry.name}: source.url must be ${CANONICAL_REPO_URL}`);
  }

  assertString(entry.source.path, `${entry.name}: source.path`);
  if (!entry.source.path.startsWith("./plugins/")) {
    throw new Error(`${entry.name}: source.path must start with ./plugins/`);
  }

  if (entry.source.path !== `./plugins/${entry.name}`) {
    throw new Error(
      `${entry.name}: source.path must be ./plugins/${entry.name}`
    );
  }

  validateRelativePluginPath(entry.name, entry.source.path, `${entry.name}: source.path`);
  assertString(entry.source.ref, `${entry.name}: source.ref`);

  if (!INSTALLATION_POLICIES.has(entry.policy.installation)) {
    throw new Error(
      `${entry.name}: policy.installation must be one of ${[
        ...INSTALLATION_POLICIES
      ].join(", ")}`
    );
  }

  if (!AUTHENTICATION_POLICIES.has(entry.policy.authentication)) {
    throw new Error(
      `${entry.name}: policy.authentication must be one of ${[
        ...AUTHENTICATION_POLICIES
      ].join(", ")}`
    );
  }
}

function validateManifestPathValue(pluginName, pluginRoot, value, label) {
  const relative = validateRelativePluginPath(pluginName, value, label);
  const absolute = path.resolve(pluginRoot, relative);

  if (!absolute.startsWith(`${pluginRoot}${path.sep}`) && absolute !== pluginRoot) {
    throw new Error(`${label} must stay inside ${pluginName}`);
  }

  return absolute;
}

async function validateManifestPaths(pluginName, pluginRoot, manifest) {
  for (const field of MANIFEST_PATH_FIELDS) {
    const value = manifest[field];
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        const absolute = validateManifestPathValue(
          pluginName,
          pluginRoot,
          item,
          `${pluginName}: ${field}[${index}]`
        );
        if (!(await pathExists(absolute))) {
          throw new Error(`${pluginName}: ${field}[${index}] does not exist`);
        }
      }
      continue;
    }

    if (typeof value !== "string") {
      throw new Error(`${pluginName}: ${field} must be a string or string array`);
    }

    const absolute = validateManifestPathValue(
      pluginName,
      pluginRoot,
      value,
      `${pluginName}: ${field}`
    );
    if (!(await pathExists(absolute))) {
      throw new Error(`${pluginName}: ${field} does not exist`);
    }
  }
}

async function validatePluginManifest(rootDir, entry) {
  const pluginRoot = path.resolve(rootDir, entry.source.path.slice(2));
  const manifestPath = path.join(pluginRoot, ".codex-plugin/plugin.json");

  if (!(await pathExists(pluginRoot))) {
    throw new Error(`${entry.name}: plugin directory does not exist`);
  }

  const manifest = await readJson(manifestPath, `${entry.name}: plugin manifest`);
  assertObject(manifest, `${entry.name}: plugin manifest`);

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    assertString(manifest[field], `${entry.name}: manifest.${field}`);
  }

  if (manifest.name !== entry.name) {
    throw new Error(
      `${entry.name}: manifest.name must match marketplace entry name`
    );
  }

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
    throw new Error(`${entry.name}: manifest.version must be valid semver`);
  }

  assertObject(manifest.author, `${entry.name}: manifest.author`);
  assertString(manifest.author.name, `${entry.name}: manifest.author.name`);
  assertStringArray(manifest.keywords, `${entry.name}: manifest.keywords`);

  assertObject(manifest.interface, `${entry.name}: manifest.interface`);
  for (const field of REQUIRED_INTERFACE_FIELDS) {
    assertString(
      manifest.interface[field],
      `${entry.name}: manifest.interface.${field}`
    );
  }
  assertStringArray(
    manifest.interface.capabilities,
    `${entry.name}: manifest.interface.capabilities`
  );

  await validateManifestPaths(entry.name, pluginRoot, manifest);
}

export async function validateMarketplace(rootDir = process.cwd()) {
  const marketplacePath = path.join(rootDir, MARKETPLACE_PATH);
  const marketplace = await readJson(marketplacePath, "marketplace");

  assertObject(marketplace, "marketplace");
  assertString(marketplace.name, "marketplace.name");
  assertObject(marketplace.interface, "marketplace.interface");
  assertString(marketplace.interface.displayName, "marketplace.interface.displayName");

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    throw new Error("marketplace.plugins must be a non-empty array");
  }

  const pluginNames = [];
  const seen = new Set();
  for (const entry of marketplace.plugins) {
    validateMarketplaceEntry(entry);
    if (seen.has(entry.name)) {
      throw new Error(`${entry.name}: duplicate plugin entry`);
    }
    seen.add(entry.name);

    await validatePluginManifest(rootDir, entry);
    pluginNames.push(entry.name);
  }

  return {
    pluginCount: pluginNames.length,
    pluginNames
  };
}

async function main() {
  try {
    const result = await validateMarketplace(process.cwd());
    const noun = result.pluginCount === 1 ? "plugin" : "plugins";
    console.log(
      `Marketplace validation passed: ${result.pluginCount} ${noun} checked.`
    );
  } catch (error) {
    console.error(`Marketplace validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  await main();
}
