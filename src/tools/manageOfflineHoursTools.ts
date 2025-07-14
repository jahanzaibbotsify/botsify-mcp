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

export function registerManageOfflineHoursTools(server: McpServer) {
    /**
     * Get bot offline hours
     */
    server.registerTool(
        "getOfflineHours",
        {
            description: `Get the bot's offline | office hours using your Botsify ChatBot API key.`,
            inputSchema: {
                botsifyChatBotApiKey: z.string(),
            }
        },
        async (args: { botsifyChatBotApiKey: string }) => {
            const { botsifyChatBotApiKey } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                const result = await apiRequest<any>('GET', `/v1/bot/get-office-hours`);
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Offline hours retrieved successfully:\n${JSON.stringify(result.data, null, 2)}` : "No offline hours data found.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to get offline hours: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('retrieving offline hours', error);
            }
        }
    );


    /**
     * Set bot offline/office hours
     */
    server.registerTool(
        "setOfflineHours",
        {
            description: `     
            Set the bot's offline/office hours. You can define one or more office hours time slots for each day.
            
            - If you have only one time slot for the day, use the 'from_time' and
                'to_time' fields (in hh:mm AM/PM format).
            - If you have multiple time slots, use 
                'from_time' and 
                'to_time' for the **first time slot**, and provide additional slots using the
                'time_slots' array (each with its own
                'from_time' and
                'to_time').
            
            Supports dynamic message variables in curly braces: {first_name}, {last_name}, {timezone}, {gender}, {last_user_msg}, {last_page}, {user/last_user_button}, {user/last_user_message}, {user/last_user_message_time}, {user/created_at}, {user/referrer_domain}.
            `,
            inputSchema: {
                botsifyChatBotApiKey: z.string(),
                mon: z.union([z.boolean(), z.number()]),
                tue: z.union([z.boolean(), z.number()]),
                wed: z.union([z.boolean(), z.number()]),
                thu: z.union([z.boolean(), z.number()]),
                fri: z.union([z.boolean(), z.number()]),
                sat: z.union([z.boolean(), z.number()]),
                sun: z.union([z.boolean(), z.number()]),
                status: z.boolean(),
                hide_bot: z.boolean(),
                from_time: z.string().describe('Start time of the office hours in hh:mm AM/PM format'),
                to_time: z.string().describe("End time of the office hours in hh:mm AM/PM format"),
                office_timings: z.number(),
                message: z.string(),
                story: z.string().optional(),
                time_slots: z.array(z.object({
                    from_time: z.string().describe("Start time of the time slot in hh:mm AM/PM format"),
                    to_time: z.string().describe("End time of the time slot in hh:mm AM/PM format"),
                })).optional(),
            }
        },
        async (args: any) => {
            const { botsifyChatBotApiKey, ...data } = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                const result = await apiRequest<any>('POST', `/v1/bot/set-office-hours`, { data });
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Offline hours set successfully:\n${JSON.stringify(result.data, null, 2)}` : "Offline hours set successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to set offline hours: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('setting offline hours', error);
            }
        }
    );
}
