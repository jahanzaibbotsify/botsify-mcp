import { registerBotSettingsTools } from "./botSettingsTools.js";
import { registerManageTeamTools } from "./manageTeamTools.js";
import { registerManageOfflineHoursTools } from "./manageOfflineHoursTools.js";
import { registerClearDataTools } from "./clearDataTools.js";
import { registerPersistentMenuTools } from "./persistentMenuTools.js";
import { registerPageMessagesTools } from "./pageMessagesTools.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAllTools(server: McpServer) {
  registerBotSettingsTools(server);
  registerManageTeamTools(server);
  registerManageOfflineHoursTools(server);
  registerClearDataTools(server);
  registerPersistentMenuTools(server);
  registerPageMessagesTools(server);
}