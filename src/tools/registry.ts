import { registerBotSettingsTools } from "./botSettingsTools.js";
import { registerManageTeamTools } from "./manageTeamTools.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAllTools(server: McpServer) {
  registerBotSettingsTools(server);
  registerManageTeamTools(server);
}