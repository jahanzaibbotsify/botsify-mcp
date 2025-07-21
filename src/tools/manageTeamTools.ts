import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {setValue} from "../utils/requestContext.js";
import {apiRequest} from "../services/apiRequestService.js";

export function registerManageTeamTools(server: McpServer) {
    /**
     * Get team members
     */
    server.registerTool(
        "getTeamMembers",
        {
            description: `Fetch team members for the current bot, displaying only name, email, and role. perPage parameter is optional.`,
            inputSchema: {
                perPage: z.number().optional(),
                botsifyChatBotApiKey: z.string(),
            }
        },
        async (args: { perPage?: number | undefined, botsifyChatBotApiKey: string }) => {
            const {perPage, botsifyChatBotApiKey} = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);

            try {
                const result = await apiRequest('GET', '/v1/bot/manage-team', {
                    params: {
                        ...(perPage ? {per_page: perPage} : {}),
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

    /**
     * Lookup a team member by userId or email
     * @param userId
     * @param email
     */
    async function lookupTeamMember(userId?: string, email?: string): Promise<any | null> {
        const memberId = userId || email;
        if (!memberId) return null;
        const memberResponse = await apiRequest<any>('GET', `/v1/bot/team/${memberId}`);
        return memberResponse?.data?.member || null;
    }

    /**
     * Response helpers
     */
    function missingIdResponse() {
        return {
            content: [
                {type: "text", text: "Please provide either a userId or an email to identify the team member."},
            ],
        } as any;
    }

    /**
     * Response when no team member is found
     * @param userId
     * @param email
     */
    function notFoundResponse(userId?: string, email?: string) {
        return {
            content: [
                {type: "text", text: `No team member found with ${userId ? `userId: ${userId}` : `email: ${email}`}`},
            ],
        } as any;
    }

    /**
     * Response for errors
     * @param action
     * @param error
     */
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

    /**
     * Confirmation response for actions
     * @param member
     * @param actionText
     */
    function confirmationResponse(member: any, actionText: string) {
        return {
            content: [
                {
                    type: "text",
                    text: `Found member:\n${JSON.stringify(member, null, 2)}\n\n${actionText}`,
                },
            ],
        } as any;
    }

    /**
     * Change bot access for a team member
     */
    server.registerTool(
        "toggleBotAccessForTeamMember",
        {
            description: `Finds a team member by user ID or email, then asks for your confirmation before changing their bot access. Ask user for confirm to proceed with changing access.`,
            inputSchema: {
                userId: z.string().optional(),
                email: z.string().optional(),
                botsifyChatBotApiKey: z.string(),
                confirm: z.boolean().default(false)
            }
        },
        async (args: {
            userId?: string | undefined;
            email?: string | undefined;
            botsifyChatBotApiKey: string;
            confirm?: boolean | undefined
        }) => {
            const {userId, email, botsifyChatBotApiKey, confirm} = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);

            try {
                if (!userId && !email) return missingIdResponse();
                const member = await lookupTeamMember(userId, email);
                if (!member || !member.id) return notFoundResponse(userId, email);
                if (!confirm) {
                    return confirmationResponse(member, 'Do you want to change bot access for this user? Please respond with "confirm: true" to proceed.');
                }
                const result = await apiRequest<any>('GET', `/v1/bot/team/${member.id}/change-access`);
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Bot access changed successfully:\n${JSON.stringify(result.data, null, 2)}` : "Bot access change action completed, but no data returned.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to change bot access: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('processing request', error);
            }
        }
    );

    /**
     * Resend invitation to a team member
     */
    server.registerTool(
        "resendInvitationToTeamMember",
        {
            description: `Finds a team member by user ID or email, then asks for your confirmation before resending their invitation. You must confirm to proceed with resending the invitation.`,
            inputSchema: {
                userId: z.string().optional(),
                email: z.string().optional(),
                botsifyChatBotApiKey: z.string(),
                confirm: z.boolean().default(false)
            }
        },
        async (args: {
            userId?: string | undefined;
            email?: string | undefined;
            botsifyChatBotApiKey: string;
            confirm?: boolean | undefined
        }) => {
            const {userId, email, botsifyChatBotApiKey, confirm} = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                if (!userId && !email) return missingIdResponse();
                const member = await lookupTeamMember(userId, email);
                if (!member || !member.id) return notFoundResponse(userId, email);
                if (!confirm) {
                    return confirmationResponse(member, 'Do you want to resend the invitation to this user? Please respond with "confirm: true" to proceed.');
                }
                const result = await apiRequest<any>('POST', `/v1/bot/team/resend-invitation/${member.id}`);
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Invitation resent successfully:\n${JSON.stringify(result.data, null, 2)}` : "Invitation resend action completed, but no data returned.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to resend invitation: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('processing request', error);
            }
        }
    );

    /**
     * Toggle bot notification for a team member
     */
    server.registerTool(
        "toggleBotNotificationForTeamMember",
        {
            description: `Finds a team member by user ID or email, then asks for your confirmation before toggling their bot email notification. You must confirm to proceed with toggling notification.`,
            inputSchema: {
                userId: z.string().optional(),
                email: z.string().optional(),
                notify: z.boolean(),
                botsifyChatBotApiKey: z.string(),
                confirm: z.boolean().default(false)
            }
        },
        async (args: {
            userId?: string | undefined;
            email?: string | undefined;
            notify: boolean;
            botsifyChatBotApiKey: string;
            confirm?: boolean | undefined
        }) => {
            const {userId, email, notify, botsifyChatBotApiKey, confirm} = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                if (!userId && !email) return missingIdResponse();
                const member = await lookupTeamMember(userId, email);
                if (!member || !member.id) return notFoundResponse(userId, email);
                if (!confirm) {
                    return confirmationResponse(member, `Do you want to ${notify ? 'enable' : 'disable'} email notifications for this user? Please respond with \"confirm: true\" to proceed.`);
                }
                const result = await apiRequest<any>('POST', `/v1/bot/team/email-notification/${notify ? 1 : 0}/${member.id}`);
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Notification toggled successfully:\n${JSON.stringify(result.data, null, 2)}` : "Notification toggle action completed, but no data returned.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to toggle notification: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('processing request', error);
            }
        }
    );

    /**
     * Get a team member by userId or email
     */
    server.registerTool(
        "getTeamMember",
        {
            description: `Get a team member by user ID or email. Returns the member's details if found.`,
            inputSchema: {
                userId: z.string().optional(),
                email: z.string().optional(),
                botsifyChatBotApiKey: z.string(),
            }
        },
        async (args: { userId?: string | undefined; email?: string | undefined; botsifyChatBotApiKey: string }) => {
            const {userId, email, botsifyChatBotApiKey} = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                if (!userId && !email) return missingIdResponse();
                const member = await lookupTeamMember(userId, email);
                if (!member || !member.id) return notFoundResponse(userId, email);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Team member found:\n${JSON.stringify(member, null, 2)}`,
                        },
                    ],
                };
            } catch (error) {
                return errorResponse('retrieving team member', error);
            }
        }
    );

    /**
     * Create a new team member
     */
    server.registerTool(
        "createTeamMember",
        {
            description: `
            Create a new team member by providing their name, email, and role (must be either "editor", "admin", or "live chat agent"), along with your Botsify ChatBot API key.
            You must explicitly specify the team member's name, email, and role. These fields cannot be left blank or generated automatically.
            `,
            inputSchema: {
                name: z.string().describe("The new team member's full name. Must be provided by the user."),
                email: z.string().email().describe("The new team member's email address. Must be provided by the user."),
                agent: z.enum(["0", "1", "2"]).describe('0: editor, 1: admin, 2: Live Chat Agent. Role to assign to the new team member. Must be one of: "editor", "admin", or "live chat agent".'),
                botsifyChatBotApiKey: z.string().describe("Your Botsify ChatBot API key."),
            }
        },
        async (args: { name: string; email: string; agent: "0" | "1" | "2"; botsifyChatBotApiKey: string }) => {
            const {name, email, agent, botsifyChatBotApiKey} = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                const result = await apiRequest<any>('POST', `/v1/bot/team`, {
                    data: {
                        name,
                        email,
                        agent: Number(agent),
                    },
                });
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Team member created successfully:\n${JSON.stringify(result.data, null, 2)}` : "Team member created successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to create team member: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('creating team member', error);
            }
        }
    );

    /**
     * Update a team member's name and agent by userId or email
     */
    server.registerTool(
        "updateTeamMember",
        {
            description: `Update a team member's name and agent by user ID or email. Only the name and agent fields will be updated. Asks for confirmation before updating the member.`,
            inputSchema: {
                userId: z.string().optional(),
                email: z.string().optional(),
                name: z.string(),
                agent: z.enum(["0", "1", "2"]).describe("0: editor, 1: admin, 2: Live Chat Agent"),
                botsifyChatBotApiKey: z.string(),
                confirm: z.boolean().default(false),
            }
        },
        async (args: {
            userId?: string | undefined;
            email?: string | undefined;
            name: string;
            agent: "0" | "1" | "2";
            botsifyChatBotApiKey: string;
            confirm?: boolean
        }) => {
            const {userId, email, name, agent, botsifyChatBotApiKey, confirm} = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                if (!userId && !email) return missingIdResponse();
                const member = await lookupTeamMember(userId, email);
                if (!member || !member.id) return notFoundResponse(userId, email);
                if (!confirm) {
                    return confirmationResponse(member, `Do you want to update this team member's name and agent? Please respond with \"confirm: true\" to proceed.`);
                }
                const data: any = {name, agent: Number(agent)};
                const result = await apiRequest<any>('PUT', `/v1/bot/team/${member.id}`, {data});
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Team member updated successfully:\n${JSON.stringify(result.data, null, 2)}` : "Team member updated successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to update team member: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('updating team member', error);
            }
        }
    );

    /**
     * Delete a team member by userId or email, with confirmation
     */
    server.registerTool(
        "deleteTeamMember",
        {
            description: `
           " Delete a team member by user ID or email. 
            You must explicitly request confirmation from the user before deletion: ask the user if they really want to delete
            the team member, and only continue if the user confirms. 
            **Never set the "confirm" field automatically; it must be provided by the user with a true value.** 
            This action cannot be undone."
            `,
            inputSchema: {
                userId: z.string().optional().describe("User ID of the team member to delete (optional if email is provided)."),
                email: z.string().optional().describe("Email of the team member to delete (optional if userId is provided)."),
                botsifyChatBotApiKey: z.string().describe("Your Botsify ChatBot API key."),
                confirm: z.boolean()
                    .refine(val => val === true, {
                        message: 'You must explicitly confirm with the user before proceeding with deletion.',
                    })
                    .describe('Explicit confirmation from the user is required. Only set to true if the user confirms deletion.'),
            }
        },
        async (args: {
            userId?: string | undefined;
            email?: string | undefined;
            botsifyChatBotApiKey: string;
            confirm?: boolean
        }) => {
            const {userId, email, botsifyChatBotApiKey, confirm} = args;
            setValue('botsifyChatBotApiKey', botsifyChatBotApiKey);
            try {
                if (!userId && !email) return missingIdResponse();
                const member = await lookupTeamMember(userId, email);
                if (!member || !member.id) return notFoundResponse(userId, email);
                if (!confirm) {
                    return confirmationResponse(member, `Do you want to delete this team member? Please respond with \"confirm: true\" to proceed.`);
                }
                const result = await apiRequest<any>('DELETE', `/v1/bot/team/${member.id}`);
                if (result.success) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: result.data ? `Team member deleted successfully:\n${JSON.stringify(result.data, null, 2)}` : "Team member deleted successfully.",
                            },
                        ],
                    };
                } else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: `Failed to delete team member: ${result.error}`,
                            },
                        ],
                    };
                }
            } catch (error) {
                return errorResponse('deleting team member', error);
            }
        }
    );
}