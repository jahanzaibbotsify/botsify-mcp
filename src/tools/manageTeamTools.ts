import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {z} from "zod";
import {apiRequest} from "../services/apiRequestService.js";
import {formatTextResponse} from "../utils/formattedResponseHandler.js";
import {
    createTeamMemberInstructions,
    deleteTeamMemberInstructions,
    updateTeamMemberInstructions
} from "../utils/toolDefinations.js";

export function registerManageTeamTools(server: McpServer) {
    /**
     * Get team members
     */
    server.registerTool(
        "getTeamMembers",
        {
            description: `Fetch team members for the current bot, displaying only name, email, and role. perPage parameter is optional.`,
            inputSchema: {
                perPage: z.number().optional()
            }
        },
        async (args: { perPage?: number | undefined }) => {
            const {perPage} = args;

            try {
                const result = await apiRequest('GET', '/v1/bot/manage-team', {
                    params: {
                        ...(perPage ? {per_page: perPage} : {}),
                        client: true
                    },
                });

                if (result.success) {
                    return formatTextResponse(result.data ? `Team members retrieved successfully:\n${JSON.stringify(result.data, null, 2)}` : "No team members found.");
                } else {
                    return formatTextResponse(`Failed to get team members: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error retrieving team members: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Lookup a team member by memberId or email
     * @param memberId
     * @param email
     */
    async function lookupTeamMember(memberId?: string, email?: string): Promise<any | null> {
        if (!memberId && !email) return null;
        const memberResponse = await apiRequest<any>('GET', `/v1/bot/team/${memberId || email}`);
        return memberResponse?.data?.member || null;
    }

    /**
     * Response helpers
     */
    function missingIdResponse() {
        return formatTextResponse("Please provide either a memberId or an email to identify the team member.")
    }

    /**
     * Response when no team member is found
     * @param memberId
     * @param email
     */
    function notFoundResponse(memberId?: string, email?: string) {
        return formatTextResponse(`No team member found with ${memberId ? `memberId: ${memberId}` : `email: ${email}`}`)
    }

    /**
     * Confirmation response for actions
     * @param member
     * @param actionText
     */
    function confirmationResponse(member: any, actionText: string) {
        return formatTextResponse(`Found member:\n${JSON.stringify(member, null, 2)}\n\n${actionText}`)
    }

    /**
     * Change bot access for a team member
     */
    server.registerTool(
        "toggleBotAccessForTeamMember",
        {
            description: `Finds a team member by team member ID or email, then asks for your confirmation before changing their bot access. Ask user for confirm to proceed with changing access.`,
            inputSchema: {
                memberId: z.string().optional(),
                email: z.string().optional(),
                confirm: z.boolean().default(false)
            }
        },
        async (args: {
            memberId?: string | undefined;
            email?: string | undefined;
            confirm?: boolean | undefined
        }) => {
            const {memberId, email, confirm} = args;

            try {
                if (!memberId && !email) return missingIdResponse();
                const member = await lookupTeamMember(memberId, email);
                if (!member || !member.id) return notFoundResponse(memberId, email);
                if (!confirm) {
                    return confirmationResponse(member, 'Do you want to change bot access for this user? Please respond with "confirm: true" to proceed.');
                }
                const result = await apiRequest<any>('GET', `/v1/bot/team/${member.id}/change-access`);
                if (result.success) {
                    return formatTextResponse(result.data ? `Bot access changed successfully:\n${JSON.stringify(result.data, null, 2)}` : "Bot access change action completed, but no data returned.");
                } else {
                    return formatTextResponse(`Failed to change bot access: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Resend invitation to a team member
     */
    server.registerTool(
        "resendInvitationToTeamMember",
        {
            description: `Finds a team member by member ID or email, then asks for your confirmation before resending their invitation. You must confirm to proceed with resending the invitation.`,
            inputSchema: {
                memberId: z.string().optional(),
                email: z.string().optional(),
                confirm: z.boolean().default(false)
            }
        },
        async (args: {
            memberId?: string | undefined;
            email?: string | undefined;
            confirm?: boolean | undefined
        }) => {
            const {memberId, email, confirm} = args;
            try {
                if (!memberId && !email) return missingIdResponse();
                const member = await lookupTeamMember(memberId, email);
                if (!member || !member.id) return notFoundResponse(memberId, email);
                if (!confirm) {
                    return confirmationResponse(member, 'Do you want to resend the invitation to this team member? Please respond with "confirm: true" to proceed.');
                }
                const result = await apiRequest<any>('POST', `/v1/bot/team/resend-invitation/${member.id}`);
                if (result.success) {
                    return formatTextResponse(result.data ? `Invitation resent successfully:\n${JSON.stringify(result.data, null, 2)}` : "Invitation resend action completed, but no data returned.");
                } else {
                    return formatTextResponse(`Failed to resend invitation: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Toggle bot notification for a team member
     */
    server.registerTool(
        "toggleBotNotificationForTeamMember",
        {
            description: `Finds a team member by member ID or email, then asks for your confirmation before toggling their bot email notification. You must confirm to proceed with toggling notification.`,
            inputSchema: {
                memberId: z.string().optional(),
                email: z.string().optional(),
                notify: z.boolean(),
                confirm: z.boolean().default(false)
            }
        },
        async (args: {
            memberId?: string | undefined;
            email?: string | undefined;
            notify: boolean;
            confirm?: boolean | undefined
        }) => {
            const {memberId, email, notify, confirm} = args;
            try {
                if (!memberId && !email) return missingIdResponse();
                const member = await lookupTeamMember(memberId, email);
                if (!member || !member.id) return notFoundResponse(memberId, email);
                if (!confirm) {
                    return confirmationResponse(member, `Do you want to ${notify ? 'enable' : 'disable'} email notifications for this team member? Please respond with \"confirm: true\" to proceed.`);
                }
                const result = await apiRequest<any>('POST', `/v1/bot/team/email-notification/${notify ? 1 : 0}/${member.id}`);
                if (result.success) {
                    return formatTextResponse(result.data ? `Notification toggled successfully:\n${JSON.stringify(result.data, null, 2)}` : "Notification toggle action completed, but no data returned.");
                } else {
                    return formatTextResponse(`Failed to toggle notification: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Get a team member by memberId or email
     */
    server.registerTool(
        "getTeamMember",
        {
            description: `Get a team member by member ID or email. Returns the member's details if found.`,
            inputSchema: {
                memberId: z.string().optional(),
                email: z.string().optional()
            }
        },
        async (args: { memberId?: string | undefined; email?: string | undefined; }) => {
            const {memberId, email} = args;
            try {
                if (!memberId && !email) return missingIdResponse();
                const member = await lookupTeamMember(memberId, email);
                if (!member || !member.id) return notFoundResponse(memberId, email);
                return formatTextResponse(`Team member found:\n${JSON.stringify(member, null, 2)}`);
            } catch (error) {
                return formatTextResponse(`Error retrieving team member: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Create a new team member
     */
    server.registerTool(
        "createTeamMember",
        {
            description: createTeamMemberInstructions,
            inputSchema: {
                name: z.string().describe("The new team member's full name. Must be provided by the team member."),
                email: z.string().email().describe("The new team member's email address. Must be provided by the team member."),
                agent: z.enum(["0", "1", "2"]).describe('0: editor, 1: admin, 2: Live Chat Agent. Role to assign to the new team member. Must be one of: "editor", "admin", or "live chat agent".')
            }
        },
        async (args: { name: string; email: string; agent: "0" | "1" | "2"; }) => {
            const {name, email, agent} = args;
            try {
                const result = await apiRequest<any>('POST', `/v1/bot/team`, {
                    data: {
                        name,
                        email,
                        agent: Number(agent),
                    },
                });
                if (result.success) {
                    return formatTextResponse(result.data ? `Team member created successfully:\n${JSON.stringify(result.data, null, 2)}` : "Team member created successfully.");
                } else {
                    return formatTextResponse(`Failed to create team member: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error creating team member: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Update a team member's name and agent by memberId or email
     */
    server.registerTool(
        "updateTeamMember",
        {
            description: updateTeamMemberInstructions,
            inputSchema: {
                memberId: z.string().optional(),
                email: z.string().optional(),
                name: z.string(),
                agent: z.enum(["0", "1", "2"]).describe("0: editor, 1: admin, 2: Live Chat Agent"),
                confirm: z.boolean().default(false),
            }
        },
        async (args: {
            memberId?: string | undefined;
            email?: string | undefined;
            name: string;
            agent: "0" | "1" | "2";
            confirm?: boolean
        }) => {
            const {memberId, email, name, agent, confirm} = args;
            try {
                if (!memberId && !email) return missingIdResponse();
                const member = await lookupTeamMember(memberId, email);
                if (!member || !member.id) return notFoundResponse(memberId, email);
                if (!confirm) {
                    return confirmationResponse(member, `Do you want to update this team member's name and agent? Please respond with \"confirm: true\" to proceed.`);
                }
                const data: any = {name, agent: Number(agent)};
                const result = await apiRequest<any>('PUT', `/v1/bot/team/${member.id}`, {data});
                if (result.success) {
                    return formatTextResponse(result.data ? `Team member updated successfully:\n${JSON.stringify(result.data, null, 2)}` : "Team member updated successfully.");
                } else {
                    return formatTextResponse(`Failed to update team member: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error updating team member: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );

    /**
     * Delete a team member by memberId or email, with confirmation
     */
    server.registerTool(
        "deleteTeamMember",
        {
            description: deleteTeamMemberInstructions,
            inputSchema: {
                memberId: z.string().optional().describe("Member ID of the team member to delete (optional if email is provided)."),
                email: z.string().optional().describe("Email of the team member to delete (optional if memberId is provided)."),
                confirm: z.boolean().default(false)
                    .refine(val => val, {
                        message: 'You must explicitly confirm with the member before proceeding with deletion.',
                    })
                    .describe('Explicit confirmation from the team member is required. Only set to true if the user confirms deletion.'),
            }
        },
        async (args: {
            memberId?: string | undefined;
            email?: string | undefined;
            confirm?: boolean
        }) => {
            const {memberId, email, confirm} = args;
            try {
                if (!memberId && !email) return missingIdResponse();
                const member = await lookupTeamMember(memberId, email);
                if (!member || !member.id) return notFoundResponse(memberId, email);
                if (!confirm) {
                    return confirmationResponse(member, `Do you want to delete this team member? Please respond with \"confirm: true\" to proceed.`);
                }
                const result = await apiRequest<any>('DELETE', `/v1/bot/team/${member.id}`);
                if (result.success) {
                    return formatTextResponse(result.data ? `Team member deleted successfully:\n${JSON.stringify(result.data, null, 2)}` : "Team member deleted successfully.");
                } else {
                    return formatTextResponse(`Failed to delete team member: ${result.error}`);
                }
            } catch (error) {
                return formatTextResponse(`Error deleting team member: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    );
}