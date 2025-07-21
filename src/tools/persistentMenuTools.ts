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

export function registerPersistentMenuTools(server: McpServer) {
    /**
     * Get the persistent menu for the bot
     */
    server.registerTool(
        "getChatBotMenu",
        {
            description: `Get the chatbot menu for the bot using your Botsify ChatBot API key. Output should be label and response if type is url then label and url`,
            inputSchema: {
                botsifyChatBotApiKey: z.string(),
            }
        },
        async (args: { botsifyChatBotApiKey: string }) => {
            const { botsifyChatBotApiKey } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                const result = await apiRequest<any>('GET', `/v1/bot/persistent-menu`);
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Persistent menu retrieved successfully:\n${JSON.stringify(result.data, null, 2)}` : "No persistent menu data found.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to get persistent menu: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('retrieving persistent menu', error);
            }
        }
    );

    /**
     * Set the persistent menu for the bot
     */
    server.registerTool(
        "setChatBotMenu",
        {
            description: `Set the chatbot menu for the bot using your Botsify ChatBot API key.\n\nThe payload should include a 'buttons' array and an 'input_field' boolean.\n\nWhen a button's type is 'postback', the 'response' field can use dynamic variables in curly braces. Allowed variables: {first_name}, {last_name}, {timezone}, {gender}, {last_user_msg}, {last_page}, {os}, {user/last_user_button}, {user/last_user_message}, {user/last_user_message_time}, {user/created_at}, {user/referrer_domain}.`,
            inputSchema: {
                botsifyChatBotApiKey: z.string(),
                buttons: z.array(z.object({
                    type: z.enum(["postback", "web_url"]),
                    api: z.number().default(1),
                    title: z.string(),
                    response: z.string().describe("when type is web_url, response field value should be a valid URL. When type is postback, it can use dynamic variables in curly braces: {first_name}, {last_name}"),
                    error: z.boolean().default(false)
                })),
                input_field: z.boolean().describe("true to disable the input field, false to enable it."),
            }
        },
        async (args: { botsifyChatBotApiKey: string, buttons: any[], input_field: boolean }) => {
            const { botsifyChatBotApiKey, buttons, input_field } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                const payload = {
                    buttons,
                    input_field
                };
                const result = await apiRequest<any>('POST', `/v1/bot/persistent-menu`, { data: payload });
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Persistent menu set successfully:\n${JSON.stringify(result.data, null, 2)}` : "Persistent menu set successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to set persistent menu: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('setting persistent menu', error);
            }
        }
    );
}
