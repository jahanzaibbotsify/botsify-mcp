import {z} from 'zod';
import {ValidationError} from '../types/index.js';
import {Logger} from '../utils/logger.js';
import {UpdateBotSettingsSchema} from '../types/index.js';
import {apiRequest} from "../services/apiRequestService.js";
import type {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {updateBotGeneralSettingInstructions} from "../utils/toolDefinations.js";
import {getValue} from "../utils/requestContext.js";
import {formatTextResponse} from "../utils/formattedResponseHandler.js";

/**
 * List of valid advance bot setting keys.
 */
export const botSettingKeys: string[] = [
    "website-chatbot-primary-color",
    "website-chatbot-secondary-color",
    "website-chatbot-bot-image",
    "website-chatbot-input-disabled",
    "website-chatbot-bot-welcoming-text",
    "website-chatbot-popup",
    "website-chatbot-loginform",
    "stripe_account_id",
    "access_token",
    "website-chatbot-preferred-language",
    "website-chatbot-default-launcher",
    "website-chatbot-popup-message",
    "delete-conversation-confirm",
    "has_sound",
    "human-help-form",
    "website-chatbot-move-left",
    "website-chatbot-icon-type",
    "translate_client",
    "website-chatbot-menu-languages",
    "broadcast_labels",
    "website-chatbot-composer-buttons",
    "wizard_page",
    "landing-bot-bg-image",
    "language",
    "icon-as-get-started",
    "top-close-chat",
    "show-chat-human-help",
    "landing-bot-bg-style",
    "website-chatbot-popup-once",
    "whitelabel-type",
    "website-chatbot-speech-button",
    "website-chatbot-attachment-button",
    "website-chatbot-calender-disabled",
    "website-chatbot-height",
    "chat-delete-completely",
    "website-track-users",
    "mobile-hide-chatbot",
    "mobile-no-chatbot-popup",
    "mobile-chatbot-height",
    "inline-form-field-responses",
    "excluded-urls",
    "website-chatbot-get-started",
    "website-chatbot-btn-border-color",
    "website-chatbot-btn-padding",
    "website-chatbot-btn-border-width",
    "website-chatbot-btn-bg-color",
    "website-chatbot-font-size",
    "website-chatbot-btn-text-color",
    "website-chatbot-btn-qr-inline",
    "website-chatbot-btn-style",
    "website-chatbot-font-family",
    "website-chatbot-user-says-bg",
    "website-chatbot-bot-says-bg",
    "website-chatbot-user-says-color",
    "website-chatbot-btn-mt",
    "website-chatbot-home-message-color",
    "login-form-logo",
    "get-started-title",
    "website-chatbot-qr-usr-custom-bg",
    "excluded-ips",
    "website-chatbot-header-gradient",
    "website-chatbot-rounded-blocks",
    "website-chatbot-text-color",
    "search-for-chinese-keywords",
    "bot-activation-time",
    "previous_story_attribute",
    "interactive_activation",
    "customer-support-bot",
    "bot-daily-limit-users",
    "block-bot-user",
    "bot-preg-match",
    "form-submission-attributes",
    "translation-source-language",
    "admin-invitaion-email",
    "user-company-name",
    "notification-to-all-agents",
    "whatsapp_daily_limit",
    "whatsapp_monthly_limit",
    "website-chatbot-bot-name",
    "website-chatbot-home-message",
    "website-chatbot-bot-email",
    "industory",
    "whatsapp-human-help",
    "website-chatbot-header-solid",
    "industry",
    "live_chat_order",
    "wizard_id",
    "page-message-sound",
    "csat-settings-enabled",
    "trending_queries",
    "website-chatbot-start-conversation-title",
    "website-chatbot-start-conversation-subtitle",
    "publish-to-ai",
    "open-ai-key",
    "scroll-bar-enabled",
    "delete-user-conversation-on-get-started",
    "failure_through_sms"
];

export class BotSettingsTools {
    private logger: Logger;

    constructor() {
        this.logger = new Logger({service: 'BotSettingsTools'});
    }

    /**
     * Update bot settings
     */
    async updateBotSettings(args: { key: string; value: string }): Promise<{
        success: boolean;
        message: string;
        data?: any
    }> {
        try {
            const validatedArgs = UpdateBotSettingsSchema.parse(args);
            this.logger.info('Updating bot settings', {key: validatedArgs.key});
            const result = await apiRequest('POST', '/bot/settings', {
                data: {
                    key: validatedArgs.key,
                    value: validatedArgs.value
                }
            })
            if (result.success) {
                return {
                    success: true,
                    message: 'Bot settings updated successfully',
                    data: result.data
                };
            } else {
                return {
                    success: false,
                    message: `Failed to update bot settings: ${result.error}`,
                    data: result
                };
            }
        } catch (error) {
            this.logger.error('Error in updateBotSettings', error);
            if (error instanceof z.ZodError) {
                throw new ValidationError('Invalid input parameters', {errors: error.errors});
            }
            throw error;
        }
    }
}

export const botSettingsTools = new BotSettingsTools();

export function registerBotSettingsTools(server: McpServer) {
    /**
     * Register the tool to update bot settings dynamically.
     * This tool allows clients to update bot branding and advanced settings
     */
    server.registerTool(
        "updateBotSettings",
        {
            description: `This tool allows clients to update the bot’s configuration settings dynamically by specifying a valid key and its corresponding value. To ensure proper functionality, the key must match one of the accepted bot setting keys. Valid keys include: ${botSettingKeys.join(", ")}.`,
            inputSchema: {
                key: z.string(),
                value: z.string()
            }
        },
        async ({key, value}: { key: string; value: string }) => {
            const result = await botSettingsTools.updateBotSettings({key, value});
            return formatTextResponse(result.message + (result.data ? `\n${JSON.stringify(result.data)}` : ""));
        }
    );

    /**
     * Register the tool to update general bot settings.
     */
    server.registerTool(
        "updateBotGeneralSettings",
        {
            description: updateBotGeneralSettingInstructions,
            inputSchema: {
                botStatus: z.boolean().optional().describe("Set true/false only if user explicitly requested status update."),
                email: z.string().optional().describe("Comma-separated valid email addresses, only if user requested update. Must match email regex."),
                inactiveUrl: z.string().optional().describe("Valid HTTPS webhook URL, only if user requested update."),
                translation: z.boolean().optional().describe("Enable/disable translation, only if user requested update.")
            }
        },
        async (args) => {
            const { botStatus, email, inactiveUrl, translation } = args;

            const updatePayload: Record<string, any> = {};

            if (Object.prototype.hasOwnProperty.call(args, "botStatus")) {
                updatePayload.botStatus = botStatus ? 1 : 0;
            }
            if (Object.prototype.hasOwnProperty.call(args, "email") && email && email.trim() !== "") {
                updatePayload.email = email;
            }
            if (Object.prototype.hasOwnProperty.call(args, "inactiveUrl") && inactiveUrl && inactiveUrl.trim() !== "") {
                updatePayload.inactiveUrl = inactiveUrl;
            }
            if (Object.prototype.hasOwnProperty.call(args, "translation")) {
                updatePayload.translation = translation ? 1 : 0;
            }

            const result = await apiRequest('POST', '/v1/bot/settings/update', {
                data: updatePayload
            });

            if (result.success) {
                return formatTextResponse(`General bot settings updated successfully. Fields updated: ${Object.keys(updatePayload).join(', ')}`);
            } else {
                return formatTextResponse(`Failed to update general bot settings: ${result.error}`);
            }
        }
    );

    /**
     * Register the tool to retrieve the Botsify ChatBot API key.
     */
    server.registerTool(
        "getBotsifyChatBotApiKey",
        {
            description: `Retrieves the currently configured Botsify ChatBot API key from the request context. This API key is required to authenticate and authorize communication between your application and the Botsify ChatBot platform. Handle this key securely and never expose it in client-side or public channels.`,
        },
        async () => {
            return formatTextResponse(`Your Botsify ChatBot API Key is ${getValue('botsifyChatBotApiKey')}`);
        }
    );
}