import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKETPLACE_PATHS = {
  codex: ".agents/plugins/marketplace.json",
  claude: ".claude-plugin/marketplace.json",
  cursor: ".cursor-plugin/marketplace.json"
};

const RUNTIMES = Object.keys(MARKETPLACE_PATHS);
const SOURCE_TYPES = new Set(["git-subdir", "url"]);
const INSTALLATION_POLICIES = new Set([
  "NOT_AVAILABLE",
  "AVAILABLE",
  "INSTALLED_BY_DEFAULT"
]);
const AUTHENTICATION_POLICIES = new Set(["ON_INSTALL", "ON_USE"]);
const FIRST_PARTY_MANIFESTS = [
  { runtime: "codex", path: ".codex-plugin/plugin.json" },
  { runtime: "claude", path: ".claude-plugin/plugin.json" },
  { runtime: "cursor", path: ".cursor-plugin/plugin.json" }
];

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
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }
}

function normalizeRelativePath(value, label, { requireDotSlash = false } = {}) {
  assertString(value, label);

  if (requireDotSlash && !value.startsWith("./")) {
    throw new Error(`${label} must start with ./`);
  }

  if (value.startsWith("/") || value.startsWith("~")) {
    throw new Error(`${label} must be a relative path`);
  }

  const withoutPrefix = value.startsWith("./") ? value.slice(2) : value;
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
      throw new Error(`${label} must stay inside the source repository`);
    }
  }

  return withoutPrefix.endsWith("/") ? withoutPrefix.slice(0, -1) : withoutPrefix;
}

function validateRelativeSourcePath(value, label) {
  return normalizeRelativePath(value, label, { requireDotSlash: true });
}

function validateManifestPathField(value, label) {
  return normalizeRelativePath(value, label, { requireDotSlash: true });
}

function validateGitUrl(value, label) {
  assertString(value, label);

  const isHttpsGitHubUrl =
    /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?$/.test(value);
  const isSshGitHubUrl =
    /^git@github\.com:[^/\s]+\/[^/\s]+(?:\.git)?$/.test(value);

  if (!isHttpsGitHubUrl && !isSshGitHubUrl) {
    throw new Error(
      `${label} must be a GitHub HTTPS URL or SSH URL for a public repository`
    );
  }
}

function isFirstPartyRepositoryUrl(value) {
  return (
    /^https:\/\/github\.com\/yfge\/codex-plugins(?:\.git)?$/.test(value) ||
    /^git@github\.com:yfge\/codex-plugins(?:\.git)?$/.test(value)
  );
}

function validateSourceSelector(source, pluginName) {
  const hasRef = typeof source.ref === "string" && source.ref.trim() !== "";
  const hasSha = typeof source.sha === "string" && source.sha.trim() !== "";

  if (!hasRef && !hasSha) {
    throw new Error(`${pluginName}: source.ref or source.sha is required`);
  }
}

function validateSourceDescriptor(source, pluginName) {
  assertObject(source, `${pluginName}: source`);

  if (!SOURCE_TYPES.has(source.source)) {
    throw new Error(`${pluginName}: source.source must be git-subdir or url`);
  }

  validateGitUrl(source.url, `${pluginName}: source.url`);
  validateSourceSelector(source, pluginName);

  if (source.source === "git-subdir") {
    validateRelativeSourcePath(source.path, `${pluginName}: source.path`);
  }

  if (source.source === "url" && source.path !== undefined) {
    throw new Error(
      `${pluginName}: source.path must be omitted when source.source is url`
    );
  }
}

function validatePluginSource(source, pluginName, runtime) {
  if (typeof source === "string") {
    normalizeRelativePath(source, `${pluginName}: ${runtime} source`);
    return;
  }

  validateSourceDescriptor(source, pluginName);
}

function validateCursorSource(source, pluginName) {
  assertString(source, `${pluginName}: cursor source`);

  if (/^https:\/\//.test(source) || /^git@github\.com:/.test(source)) {
    validateGitUrl(source, `${pluginName}: cursor source`);
    return;
  }

  normalizeRelativePath(source, `${pluginName}: cursor source`);
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

function validateCodexMarketplaceEntry(entry) {
  assertObject(entry, "plugin entry");
  assertString(entry.name, "plugin entry name");
  assertString(entry.category, `${entry.name}: category`);
  assertObject(entry.source, `${entry.name}: source`);
  assertObject(entry.policy, `${entry.name}: policy`);
  validateSourceDescriptor(entry.source, entry.name);

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

function validateAgentMarketplaceEntry(entry, runtime) {
  assertObject(entry, `${runtime} plugin entry`);
  assertString(entry.name, `${runtime} plugin entry name`);
  assertString(entry.description, `${entry.name}: ${runtime} description`);

  if (runtime === "cursor") {
    validateCursorSource(entry.source, entry.name);
    return;
  }

  validatePluginSource(entry.source, entry.name, runtime);
}

function validateManifestPathFields(manifest, pluginName, runtime) {
  for (const field of ["skills", "mcpServers", "hooks", "apps"]) {
    if (manifest[field] !== undefined && typeof manifest[field] === "string") {
      validateManifestPathField(
        manifest[field],
        `${pluginName}: ${runtime} manifest ${field}`
      );
    }
  }
}

function validatePluginManifest(manifest, pluginName, runtime) {
  assertObject(manifest, `${pluginName}: ${runtime} manifest`);
  assertString(manifest.name, `${pluginName}: ${runtime} manifest name`);

  if (manifest.name !== pluginName) {
    throw new Error(
      `${pluginName}: ${runtime} manifest name must match marketplace entry`
    );
  }

  assertString(manifest.version, `${pluginName}: ${runtime} manifest version`);
  assertString(
    manifest.description,
    `${pluginName}: ${runtime} manifest description`
  );
  assertObject(manifest.author, `${pluginName}: ${runtime} manifest author`);

  if (runtime === "cursor") {
    assertString(
      manifest.displayName,
      `${pluginName}: cursor manifest displayName`
    );
  }

  if (manifest.keywords !== undefined) {
    assertStringArray(
      manifest.keywords,
      `${pluginName}: ${runtime} manifest keywords`
    );
  }

  validateManifestPathFields(manifest, pluginName, runtime);
}

function assertNoDuplicatePluginNames(pluginNames, runtime) {
  const seen = new Set();
  for (const pluginName of pluginNames) {
    if (seen.has(pluginName)) {
      throw new Error(`${runtime}: ${pluginName}: duplicate plugin entry`);
    }
    seen.add(pluginName);
  }
}

function assertSamePluginNames(catalogs) {
  const codexNames = [...catalogs.codex.pluginNames].sort();

  for (const runtime of ["claude", "cursor"]) {
    const runtimeNames = [...catalogs[runtime].pluginNames].sort();
    if (JSON.stringify(runtimeNames) !== JSON.stringify(codexNames)) {
      throw new Error(
        `${runtime} marketplace plugin ids must match codex marketplace plugin ids`
      );
    }
  }
}

async function validateMarketplaceCatalog(rootDir, runtime) {
  const marketplacePath = path.join(rootDir, MARKETPLACE_PATHS[runtime]);
  const marketplace = await readJson(marketplacePath, `${runtime} marketplace`);

  assertObject(marketplace, `${runtime} marketplace`);
  assertString(marketplace.name, `${runtime} marketplace.name`);

  if (runtime === "codex") {
    assertObject(marketplace.interface, "marketplace.interface");
    assertString(
      marketplace.interface.displayName,
      "marketplace.interface.displayName"
    );
  } else {
    assertObject(marketplace.owner, `${runtime} marketplace.owner`);
  }

  if (!Array.isArray(marketplace.plugins)) {
    throw new Error(`${runtime} marketplace.plugins must be an array`);
  }

  const pluginNames = [];
  for (const entry of marketplace.plugins) {
    if (runtime === "codex") {
      validateCodexMarketplaceEntry(entry);
    } else {
      validateAgentMarketplaceEntry(entry, runtime);
    }

    pluginNames.push(entry.name);
  }

  assertNoDuplicatePluginNames(pluginNames, runtime);

  return {
    pluginCount: pluginNames.length,
    pluginNames,
    plugins: marketplace.plugins
  };
}

function findFirstPartyPlugins(codexPlugins) {
  const plugins = [];

  for (const entry of codexPlugins) {
    if (
      entry.source?.source === "git-subdir" &&
      isFirstPartyRepositoryUrl(entry.source.url)
    ) {
      plugins.push({
        name: entry.name,
        path: validateRelativeSourcePath(entry.source.path, `${entry.name}: source.path`)
      });
    }
  }

  return plugins;
}

async function validateFirstPartyPlugin(rootDir, plugin) {
  const pluginRoot = path.join(rootDir, plugin.path);

  for (const manifestInfo of FIRST_PARTY_MANIFESTS) {
    const manifestPath = path.join(pluginRoot, manifestInfo.path);
    const manifest = await readJson(
      manifestPath,
      `${plugin.name}: ${manifestInfo.runtime} manifest`
    );
    validatePluginManifest(manifest, plugin.name, manifestInfo.runtime);
  }

  const opencodeWrapperPath = path.join(
    pluginRoot,
    ".opencode/plugins",
    `${plugin.name}.js`
  );
  if (!(await pathExists(opencodeWrapperPath))) {
    throw new Error(
      `${plugin.name}: OpenCode wrapper is missing at ${opencodeWrapperPath}`
    );
  }
}

export async function validateMarketplace(rootDir = process.cwd()) {
  const catalogs = {};
  for (const runtime of RUNTIMES) {
    catalogs[runtime] = await validateMarketplaceCatalog(rootDir, runtime);
  }

  assertSamePluginNames(catalogs);

  const firstPartyPlugins = findFirstPartyPlugins(catalogs.codex.plugins);
  for (const plugin of firstPartyPlugins) {
    await validateFirstPartyPlugin(rootDir, plugin);
  }

  return {
    pluginCount: catalogs.codex.pluginNames.length,
    pluginNames: catalogs.codex.pluginNames,
    runtimes: Object.fromEntries(
      RUNTIMES.map((runtime) => [
        runtime,
        {
          pluginCount: catalogs[runtime].pluginCount,
          pluginNames: catalogs[runtime].pluginNames
        }
      ])
    ),
    firstPartyPluginNames: firstPartyPlugins.map((plugin) => plugin.name)
  };
}

async function main() {
  try {
    const result = await validateMarketplace(process.cwd());
    const noun = result.pluginCount === 1 ? "plugin" : "plugins";
    console.log(
      `Marketplace validation passed: ${result.pluginCount} ${noun} checked across ${RUNTIMES.length} runtimes.`
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
