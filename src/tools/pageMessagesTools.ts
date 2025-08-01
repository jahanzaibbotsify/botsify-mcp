import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {apiRequest} from "../services/apiRequestService.js";
import {formatTextResponse} from "../utils/formattedResponseHandler";
import {createPageMessageInstructions, updatePageMessageInstructions} from "../utils/toolDefinations";

export function registerPageMessagesTools(server: McpServer) {
    /**
     * Tool to create a page message
     */
    server.registerTool(
        "createPageMessage",
        {
            description: createPageMessageInstructions,
            inputSchema: {
                url: z.string().describe("Comma-separated list of URLs"),
                message: z.string().describe("Text message to display"),
                show_message_after: z.enum(["scroll", "delay"]),
                timeout: z.number().describe("If scroll, how much scroll before showing the message; if delay, how much delay (in ms)"),
            }
        },
        async (args: { url: string; message: string; show_message_after: "scroll" | "delay"; timeout: number; }) => {
            const {url, message, show_message_after, timeout} = args;
            try {
                const payload = {url, html: message, show_message_after, timeout, type: 'message'};
                const result = await apiRequest<any>('POST', '/v1/page-message/store', {data: payload});
                if (result.success) {
                    return formatTextResponse(result.data ? `Page message created successfully:\n${JSON.stringify(result.data, null, 2)}` : "Page message created successfully.");
                } else {
                    return formatTextResponse(`Failed to create page message: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error create page messsage: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Tool to update a page message (with confirmation)
     */
    server.registerTool(
        "updatePageMessage",
        {
            description: updatePageMessageInstructions,
            inputSchema: {
                id: z.string().describe("Page message ID"),
                url: z.string().describe("Comma-separated list of URLs"),
                message: z.string().describe("Text message to display"),
                show_message_after: z.enum(["scroll", "delay"]),
                timeout: z.number().describe("If scroll, how much scroll before showing the message; if delay, how much delay (in seconds or percent)"),
                confirm: z.boolean().default(false),
            }
        },
        async (args: {
            id: string;
            url: string;
            message: string;
            show_message_after: "scroll" | "delay";
            timeout: number;
            confirm?: boolean;
        }) => {
            const {id, url, message, show_message_after, timeout, confirm} = args;
            if (!confirm) {
                return formatTextResponse(`Are you sure you want to update page message with ID '${id}'? Please respond with 'confirm: true' to proceed.`);
            }
            try {
                const payload = {url, html: message, show_message_after, timeout, type: 'message'};
                const result = await apiRequest<any>('POST', `/v1/page-message/update/${id}`, {data: payload});
                if (result.success) {
                    return formatTextResponse(result.data ? `Page message updated successfully:\n${JSON.stringify(result.data, null, 2)}` : "Page message updated successfully.");
                } else {
                    return formatTextResponse(`Failed to update page message: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error update page message: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Tool to delete a page message (with confirmation)
     */
    server.registerTool(
        "deletePageMessage",
        {
            description: `Delete a page message by ID. Asks for confirmation before deleting.\n\n- id: Page message ID`,
            inputSchema: {
                id: z.string().min(1).describe("Page message ID"),
                confirm: z.boolean().default(false)
            }
        },
        async (args: { id: string; confirm?: boolean }) => {
            const {id, confirm} = args;
            if (!confirm) {
                return formatTextResponse(`Are you sure you want to delete page message with ID '${id}'? Please respond with 'confirm: true' to proceed.`);
            }
            try {
                const result = await apiRequest<any>('DELETE', `/v1/page-message/${id}/delete`);
                if (result.success) {
                    return formatTextResponse(result.data ? `Page message deleted successfully:\n${JSON.stringify(result.data, null, 2)}` : "Page message deleted successfully.");
                } else {
                    return formatTextResponse(`Failed to delete page message: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error deleting page message: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        },
        async () => {
            try {
                const result = await apiRequest<any>('GET', '/v1/settings/page-messaging');
                if (result.success) {
                    return formatTextResponse(result.data ? `All page messages:\n${JSON.stringify(result.data, null, 2)}` : "No page messages found.");
                } else {
                    return formatTextResponse(`Failed to get page messages: ${result.error}`)
                }
            } catch (error) {
                return formatTextResponse(`Error getting all page messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );
}
