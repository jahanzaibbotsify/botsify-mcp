import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest } from "../services/apiRequestService.js";
import {clearBotDataInstructions} from "../utils/toolDefinations.js";
import {formatTextResponse} from "../utils/formattedResponseHandler.js";

export function registerClearDataTools(server: McpServer) {
  /**
   * Tool to clear/delete all messages and user interactions up to today.
   * Requires confirmation by providing the exact text 'DELETE DATA'.
   */
  server.registerTool(
    "clearBotData",
    {
      description: clearBotDataInstructions,
      inputSchema: {
        confirmation: z.string().optional().describe("User must type the exact text: 'DELETE DATA' to confirm irreversible deletion."),
      },
    },
    async (args: { confirmation?: string|undefined }) => {
      const { confirmation } = args;

      if (confirmation !== "DELETE DATA") {
        return formatTextResponse("Are you sure you want to delete ALL messages and user interactions up to today? This action is IRREVERSIBLE.\n\nTo confirm, please type 'DELETE DATA' in the 'confirmation' field.");
      }

      try {
        const result = await apiRequest<any>("POST", "/v1/bot/delete-data", {
          data: {
            confirmation
          },
        });
        if (result.success) {
          return formatTextResponse("All messages and user interactions have been deleted up to today. This action cannot be undone.");
        } else {
          return formatTextResponse(`Failed to delete data: ${result.error}`);
        }
      } catch (error) {
        return formatTextResponse(`Error deleting chatbot data: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  );
}

