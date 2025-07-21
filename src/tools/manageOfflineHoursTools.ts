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
            description: `Retrieve your bot's offline (office) hours using your Botsify ChatBot API key.`,
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
            Set your bot's office (offline) hours easily. Just describe your schedule naturally—for example, say "set Sunday off" or "Friday half day"—and the tool will automatically generate the required payload and update your bot’s schedule.

             - Define one or more time slots per day using 'from_time' and 'to_time' (in hh:mm AM/PM format).
             - For multiple slots in a day, list the first slot with 'from_time' and 'to_time', and add others in the 'time_slots' array.
    
            Supports dynamic message variables in curly braces, such as: {first_name}, {last_name}, {timezone}, {gender}, {last_user_msg}, {last_page}, {user/last_user_button}, {user/last_user_message}, {user/last_user_message_time}, {user/created_at}, {user/referrer_domain}.
            `,
            inputSchema: {
                botsifyChatBotApiKey: z.string(),
                mon: z.boolean().describe("Set to true if the office is closed (offline) on Monday, or false if open."),
                tue: z.boolean().describe("Set to true if the office is closed (offline) on Tuesday, or false if open."),
                wed: z.boolean().describe("Set to true if the office is closed (offline) on Wednesday, or false if open."),
                thu: z.boolean().describe("Set to true if the office is closed (offline) on Thursday, or false if open."),
                fri: z.boolean().describe("Set to true if the office is closed (offline) on Friday, or false if open."),
                sat: z.boolean().describe("Set to true if the office is closed (offline) on Saturday, or false if open."),
                sun: z.boolean().describe("Set to true if the office is closed (offline) on Sunday, or false if open."),
                status: z.boolean().describe("Set to true to enable custom office hour rules. If false, office hours are disabled."),
                hide_bot: z.boolean().describe("If true, hides the bot icon during offline hours. If false, the icon remains visible."),
                from_time: z.string().describe("Start time of the office hours (e.g., '09:00 AM'). Use hh:mm AM/PM format."),
                to_time: z.string().describe("End time of the office hours (e.g., '06:00 PM'). Use hh:mm AM/PM format."),
                office_timings: z.number().describe("Number of office time slots defined for the day. For single slot, set to 1. For multiple, match the number of slots."),
                message: z.string().describe("The message shown to users when the bot is offline. You may use dynamic variables such as {first_name}, {last_name}, {timezone}, etc. to personalize the response."),
                story: z.string().optional().describe("Optional. The story or block to trigger when the bot is offline."),
                time_slots: z.array(
                    z.object({
                        from_time: z.string().describe("Start time for an additional office hour slot (in hh:mm AM/PM format)."),
                        to_time: z.string().describe("End time for an additional office hour slot (in hh:mm AM/PM format)."),
                    })
                ).optional().describe("Optional. An array of additional time slots for days with multiple working periods."),
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
