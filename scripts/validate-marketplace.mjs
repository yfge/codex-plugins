import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MARKETPLACE_PATH = ".agents/plugins/marketplace.json";

const SOURCE_TYPES = new Set(["git-subdir", "url"]);
const INSTALLATION_POLICIES = new Set([
  "NOT_AVAILABLE",
  "AVAILABLE",
  "INSTALLED_BY_DEFAULT"
]);
const AUTHENTICATION_POLICIES = new Set(["ON_INSTALL", "ON_USE"]);

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

function validateRelativeSourcePath(value, label) {
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
      throw new Error(`${label} must stay inside the source repository`);
    }
  }

  return withoutPrefix.endsWith("/") ? withoutPrefix.slice(0, -1) : withoutPrefix;
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

function validateSourceSelector(source, pluginName) {
  const hasRef = typeof source.ref === "string" && source.ref.trim() !== "";
  const hasSha = typeof source.sha === "string" && source.sha.trim() !== "";

  if (!hasRef && !hasSha) {
    throw new Error(`${pluginName}: source.ref or source.sha is required`);
  }
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

function validateMarketplaceEntry(entry) {
  assertObject(entry, "plugin entry");
  assertString(entry.name, "plugin entry name");
  assertString(entry.category, `${entry.name}: category`);
  assertObject(entry.source, `${entry.name}: source`);
  assertObject(entry.policy, `${entry.name}: policy`);

  if (!SOURCE_TYPES.has(entry.source.source)) {
    throw new Error(`${entry.name}: source.source must be git-subdir or url`);
  }

  validateGitUrl(entry.source.url, `${entry.name}: source.url`);
  validateSourceSelector(entry.source, entry.name);

  if (entry.source.source === "git-subdir") {
    validateRelativeSourcePath(entry.source.path, `${entry.name}: source.path`);
  }

  if (entry.source.source === "url" && entry.source.path !== undefined) {
    throw new Error(
      `${entry.name}: source.path must be omitted when source.source is url`
    );
  }

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

export async function validateMarketplace(rootDir = process.cwd()) {
  const marketplacePath = path.join(rootDir, MARKETPLACE_PATH);
  const marketplace = await readJson(marketplacePath, "marketplace");

  assertObject(marketplace, "marketplace");
  assertString(marketplace.name, "marketplace.name");
  assertObject(marketplace.interface, "marketplace.interface");
  assertString(marketplace.interface.displayName, "marketplace.interface.displayName");

  if (!Array.isArray(marketplace.plugins)) {
    throw new Error("marketplace.plugins must be an array");
  }

  const pluginNames = [];
  const seen = new Set();
  for (const entry of marketplace.plugins) {
    validateMarketplaceEntry(entry);
    if (seen.has(entry.name)) {
      throw new Error(`${entry.name}: duplicate plugin entry`);
    }
    seen.add(entry.name);

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
