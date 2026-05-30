import path from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const skillsDir = path.join(pluginRoot, "skills");
const serverPath = path.join(pluginRoot, "src/server.mjs");

function addUnique(values, value) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

export const FeishuPlugin = async () => {
  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      addUnique(config.skills.paths, skillsDir);

      const existingServer = config.mcp?.feishu || {};
      config.mcp = config.mcp || {};
      config.mcp.feishu = {
        ...existingServer,
        type: "local",
        command: ["node", serverPath],
        enabled: existingServer.enabled ?? true
      };
    }
  };
};

export default FeishuPlugin;
