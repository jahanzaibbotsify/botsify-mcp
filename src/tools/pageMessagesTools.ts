import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setValue } from "../utils/requestContext.js";
import { apiRequest } from "../services/apiRequestService.js";

function errorResponse(action: string, error: unknown) {
    return {
        content: [
            {
                type: "text",
                text: `Error ${action}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
        ],
    } as any;
}

export function registerPageMessagesTools(server: McpServer) {
    /**
     * Tool to create a page message
     */
    server.registerTool(
        "createPageMessage",
        {
            description: `Create a page message for one or more URLs. Supports text or story messages, with display options for scroll or delay.\n\n- url: Comma-separated list of URLs\n- html: Text message\n- show_message_after: 'scroll' or 'delay'\n- story: Story ID\n- timeout: If scroll, how much scroll before showing the message; if delay, how much delay (in ms)\n- type: 'message' or 'story'\n- botsifyChatBotApiKey: Your Botsify ChatBot API Key`,
            inputSchema: {
                url: z.string().describe("Comma-separated list of URLs"),
                html: z.string().optional().describe("Text message to display"),
                show_message_after: z.enum(["scroll", "delay"]),
                story: z.string().optional().describe("Story ID"),
                timeout: z.number().describe("If scroll, how much scroll before showing the message; if delay, how much delay (in ms)"),
                type: z.enum(["message", "story"]),
                botsifyChatBotApiKey: z.string(),
            }
        },
        async (args: { url: string; html?: string|undefined; show_message_after: "scroll" | "delay"; story?: string|undefined; timeout: number; type: "message" | "story"; botsifyChatBotApiKey: string }) => {
            const { url, html, show_message_after, story, timeout, type, botsifyChatBotApiKey } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                const payload = { url, html, show_message_after, story, timeout, type };
                console.log(payload)
                const result = await apiRequest<any>('POST', '/v1/page-message/store', { data: payload });
                console.log(result)
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Page message created successfully:\n${JSON.stringify(result.data, null, 2)}` : "Page message created successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to create page message: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('creating page message', error);
            }
        }
    );

    /**
     * Tool to update a page message (with confirmation)
     */
    server.registerTool(
        "updatePageMessage",
        {
            description: `Update a page message by ID. Asks for confirmation before updating.\n\n- id: Page message ID\n- url: Comma-separated list of URLs\n- html: Text message\n- show_message_after: 'scroll' or 'delay'\n- story: Story ID\n- timeout: If scroll, how much scroll before showing the message; if delay, how much delay (in ms)\n- type: 'message' or 'story'\n- botsifyChatBotApiKey: Your Botsify ChatBot API Key\n- confirm: Set to true to confirm update`,
            inputSchema: {
                id: z.string().describe("Page message ID"),
                url: z.string().describe("Comma-separated list of URLs"),
                html: z.string().optional().describe("Text message to display"),
                show_message_after: z.enum(["scroll", "delay"]),
                story: z.string().optional().describe("Story ID"),
                timeout: z.number().describe("If scroll, how much scroll before showing the message; if delay, how much delay (in ms)"),
                type: z.enum(["message", "story"]),
                botsifyChatBotApiKey: z.string(),
                confirm: z.boolean().default(false),
            }
        },
        async (args: { id: string; url: string; html?: string|undefined; show_message_after: "scroll" | "delay"; story?: string|undefined; timeout: number; type: "message" | "story"; botsifyChatBotApiKey: string; confirm?: boolean }) => {
            const { id, url, html, show_message_after, story, timeout, type, botsifyChatBotApiKey, confirm } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            if (!confirm) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Are you sure you want to update page message with ID '${id}'? Please respond with 'confirm: true' to proceed.`,
                        },
                    ],
                };
            }
            try {
                const payload = { url, html, show_message_after, story, timeout, type };
                const result = await apiRequest<any>('POST', `/v1/page-message/update/${id}`, { data: payload });
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Page message updated successfully:\n${JSON.stringify(result.data, null, 2)}` : "Page message updated successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to update page message: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('updating page message', error);
            }
        }
    );

    /**
     * Tool to delete a page message (with confirmation)
     */
    server.registerTool(
        "deletePageMessage",
        {
            description: `Delete a page message by ID. Asks for confirmation before deleting.\n\n- id: Page message ID\n- botsifyChatBotApiKey: Your Botsify ChatBot API Key\n- confirm: Set to true to confirm deletion`,
            inputSchema: {
                id: z.string().min(1).describe("Page message ID"),
                botsifyChatBotApiKey: z.string(),
                confirm: z.boolean().default(false),
            }
        },
        async (args: { id: string; botsifyChatBotApiKey: string; confirm?: boolean }) => {
            const { id, botsifyChatBotApiKey, confirm } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            if (!confirm) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Are you sure you want to delete page message with ID '${id}'? Please respond with 'confirm: true' to proceed.`,
                        },
                    ],
                };
            }
            try {
                const result = await apiRequest<any>('DELETE', `/v1/page-message/${id}/delete`);
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Page message deleted successfully:\n${JSON.stringify(result.data, null, 2)}` : "Page message deleted successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to delete page message: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('deleting page message', error);
            }
        }
    );

    /**
     * Tool to get all page messages
     */
    server.registerTool(
        "getAllPageMessages",
        {
            description: `Get all page messages. Requires your Botsify ChatBot API Key.`,
            inputSchema: {
                botsifyChatBotApiKey: z.string(),
            }
        },
        async (args: { botsifyChatBotApiKey: string }) => {
            const { botsifyChatBotApiKey } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                const result = await apiRequest<any>('GET', '/v1/settings/page-messaging');
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `All page messages:\n${JSON.stringify(result.data, null, 2)}` : "No page messages found.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to get page messages: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('getting all page messages', error);
            }
        }
    );
}
