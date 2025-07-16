import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setValue } from "../utils/requestContext.js";
import { apiRequest } from "../services/apiRequestService.js";

function errorResponse(action: string, error: unknown) {
  return {
    content: [
      {
        type: "text",
        text: `Error ${action}: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    ],
  } as any;
}

export function registerClearDataTools(server: McpServer) {
  /**
   * Tool to clear/delete all messages and user interactions up to today.
   * Requires confirmation by providing the exact text 'DELETE DATA'.
   */
  server.registerTool(
    "clearBotData",
    {
      description:
        "Clear or delete all messages and user interactions up to today. This action is IRREVERSIBLE. Ask user to confirm by providing the exact text 'DELETE DATA' in the 'confirmation' field.",
      inputSchema: {
        botsifyChatBotApiKey: z.string(),
        confirmation: z.string().describe("Type 'DELETE DATA' to confirm irreversible deletion."),
      },
    },
    async (args: { botsifyChatBotApiKey: string; confirmation: string }) => {
      const { botsifyChatBotApiKey, confirmation } = args;
      setValue("botsifyChatBotApiKey", botsifyChatBotApiKey);

      if (confirmation !== "DELETE DATA") {
        return {
          content: [
            {
              type: "text",
              text:
                "Are you sure you want to delete ALL messages and user interactions up to today? This action is IRREVERSIBLE.\n\nTo confirm, please type 'DELETE DATA' in the 'confirmation' field.",
            },
          ],
        };
      }

      try {
        const result = await apiRequest<any>("POST", "/v1/bot/delete-data", {
          data: {
            confirmation
          },
        });
        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text:
                  "All messages and user interactions have been deleted up to today. This action cannot be undone.",
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to delete data: ${result.error}`,
              },
            ],
          };
        }
      } catch (error) {
        return errorResponse("deleting data", error);
      }
    }
  );
}
