import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {apiRequest} from "../services/apiRequestService.js";
import {formatTextResponse} from "../utils/formattedResponseHandler.js";
import {createChatBotMenuInstructions} from "../utils/toolDefinations.js";

export function registerPersistentMenuTools(server: McpServer) {
    /**
     * Get the persistent menu for the bot
     */
    server.registerTool(
        "getChatBotMenu",
        {
            description: `Get the chatbot menu.. Output should be label and response if type is url then label and url`,
        },
        async () => {
            try {
                const result = await apiRequest<any>('GET', `/v1/bot/persistent-menu`);
                if (result.success) {
                    return formatTextResponse(result.data ? `Persistent menu retrieved successfully:\n${JSON.stringify(result.data, null, 2)}` : "No persistent menu data found.");
                } else {
                    return formatTextResponse(`Failed to get persistent menu: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error retrieving menu: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Set the persistent menu for the bot
     */
    server.registerTool(
        "setChatBotMenu",
        {
            description: createChatBotMenuInstructions,
            inputSchema: {
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
        async (args: { buttons: any[], input_field: boolean }) => {
            const {buttons, input_field} = args;
            try {
                const payload = {
                    buttons,
                    input_field
                };
                const result = await apiRequest<any>('POST', `/v1/bot/persistent-menu`, {data: payload});
                if (result.success) {
                    return formatTextResponse(result.data ? `Persistent menu set successfully:\n${JSON.stringify(result.data, null, 2)}` : "Persistent menu set successfully.");
                } else {
                    return formatTextResponse(`Failed to set persistent menu: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error setting menu: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );
}
