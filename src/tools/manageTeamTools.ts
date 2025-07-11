import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {setValue} from "../utils/requestContext";
import {apiRequest} from "../services/apiRequestService";

export function registerManageTeamTools(server: McpServer) {
    /**
     * Get team members
     */
    server.registerTool(
        "getTeamMembers",
        {
            description: `Get the list of team members for the current bot. You can optionally specify the number of members per page using the perPage parameter.`,
            inputSchema: {
                perPage: z.number().optional(),
                botsifyChatBotApiKey: z.string(),
            }
        },
        async (args: { perPage?: number | undefined, botsifyChatBotApiKey: string }) => {
            const { perPage, botsifyChatBotApiKey } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            
            try {
                const result = await apiRequest('GET', '/v1/bot/manage-team', {
                    params: {
                        ...(perPage ? { per_page: perPage } : {}),
                        client: true
                    },
                });
                
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Team members retrieved successfully:\n${JSON.stringify(result.data, null, 2)}` : "No team members found.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to get team members: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error retrieving team members: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                };
            }
        }
    );
}