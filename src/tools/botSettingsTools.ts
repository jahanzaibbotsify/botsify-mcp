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
export const botSettingKeys: {
    key: string;
    type: "string" | "number" | "bool" | "color" | "url";
    description: string;
    range?: string;
}[] = [
    { key: "website-chatbot-primary-color", type: "color", description: "Primary theme color for chatbot UI", range: "hex code (e.g. #3DB2D0)" },
    { key: "website-chatbot-secondary-color", type: "color", description: "Secondary theme color for chatbot UI", range: "hex code (e.g. #FF6868)" },
    { key: "website-chatbot-bot-image", type: "url", description: "Bot avatar image in url format" },
    { key: "website-chatbot-input-disabled", type: "bool", description: "Disable user input field (0 = enabled, 1 = disabled)" },
    { key: "website-chatbot-bot-welcoming-text", type: "string", description: "Custom welcome text for chatbot" },
    { key: "website-chatbot-popup", type: "bool", description: "Enable or disable chatbot popup (0 = disabled, 1 = enabled)" },
    { key: "website-chatbot-loginform", type: "bool", description: "Enable or disable chatbot login form" },
    { key: "stripe_account_id", type: "string", description: "Connected Stripe account ID" },
    { key: "access_token", type: "string", description: "Access token for chatbot API" },
    { key: "website-chatbot-preferred-language", type: "string", description: "Preferred chatbot language (e.g. english, spanish, french)" },
    { key: "website-chatbot-default-launcher", type: "bool", description: "Use default launcher button (0 = no, 1 = yes)" },
    { key: "website-chatbot-popup-message", type: "string", description: "Default chatbot popup message" },
    { key: "delete-conversation-confirm", type: "bool", description: "Enable delete conversation confirmation popup" },
    { key: "has_sound", type: "bool", description: "Play sound notifications (0 = off, 1 = on)" },
    { key: "human-help-form", type: "bool", description: "Show human help request form (0 = no, 1 = yes)" },
    { key: "website-chatbot-move-left", type: "bool", description: "Move chatbot UI to left side (0 = right, 1 = left)" },
    { key: "website-chatbot-icon-type", type: "string", description: "Type of chatbot icon", range: "default | custom" },
    { key: "translate_client", type: "string", description: "Translation client name or service key" },
    { key: "website-chatbot-menu-languages", type: "string", description: "Available languages in chatbot menu (comma separated)" },
    { key: "broadcast_labels", type: "string", description: "Labels for broadcasting messages" },
    { key: "website-chatbot-composer-buttons", type: "string", description: "Custom composer (input area) buttons" },
    { key: "wizard_page", type: "string", description: "Wizard page reference ID" },
    { key: "landing-bot-bg-image", type: "url", description: "Landing page chatbot background image" },
    { key: "language", type: "string", description: "Bot language setting" },
    { key: "icon-as-get-started", type: "bool", description: "Use icon as 'Get Started' button (0 = no, 1 = yes)" },
    { key: "top-close-chat", type: "bool", description: "Show close button at top (0 = no, 1 = yes)" },
    { key: "show-chat-human-help", type: "bool", description: "Show human help option inside chat" },
    { key: "landing-bot-bg-style", type: "string", description: "CSS style for landing bot background" },
    { key: "website-chatbot-popup-once", type: "bool", description: "Show chatbot popup only once per session" },
    { key: "whitelabel-type", type: "string", description: "Whitelabeling type for chatbot UI" },
    { key: "website-chatbot-speech-button", type: "bool", description: "Enable/disable chatbot speech button" },
    { key: "website-chatbot-attachment-button", type: "bool", description: "Enable/disable attachment upload button" },
    { key: "website-chatbot-calender-disabled", type: "bool", description: "Disable date picker/calendar" },
    { key: "website-chatbot-height", type: "number", description: "Chatbot window height", range: "10% - 150%" },
    { key: "chat-delete-completely", type: "bool", description: "Completely delete user chat data" },
    { key: "website-track-users", type: "bool", description: "Enable or disable user tracking" },
    { key: "mobile-hide-chatbot", type: "bool", description: "Hide chatbot on mobile devices" },
    { key: "mobile-no-chatbot-popup", type: "bool", description: "Disable chatbot popup on mobile" },
    { key: "mobile-chatbot-height", type: "number", description: "Height of mobile chatbot window", range: "10% - 100%" },
    { key: "inline-form-field-responses", type: "string", description: "Inline form field responses config" },
    { key: "excluded-urls", type: "string", description: "List of excluded URLs (comma separated)" },
    { key: "website-chatbot-get-started", type: "string", description: "Custom get started button text" },
    { key: "website-chatbot-btn-border-color", type: "color", description: "Chatbot button border color" },
    { key: "website-chatbot-btn-padding", type: "string", description: "Padding for chatbot button" },
    { key: "website-chatbot-btn-border-width", type: "string", description: "Border width for chatbot button" },
    { key: "website-chatbot-btn-bg-color", type: "color", description: "Background color for chatbot button" },
    { key: "website-chatbot-font-size", type: "string", description: "Font size for chatbot messages" },
    { key: "website-chatbot-btn-text-color", type: "color", description: "Text color for chatbot button" },
    { key: "website-chatbot-btn-qr-inline", type: "bool", description: "Enable inline QR code button" },
    { key: "website-chatbot-btn-style", type: "string", description: "Custom CSS style for buttons" },
    { key: "website-chatbot-font-family", type: "string", description: "Font family for chatbot messages" },
    { key: "website-chatbot-user-says-bg", type: "color", description: "Background color of user messages" },
    { key: "website-chatbot-bot-says-bg", type: "color", description: "Background color of bot messages" },
    { key: "website-chatbot-user-says-color", type: "color", description: "Text color of user messages" },
    { key: "website-chatbot-btn-mt", type: "string", description: "Margin top for chatbot button" },
    { key: "website-chatbot-home-message-color", type: "color", description: "Color of the welcome message" },
    { key: "login-form-logo", type: "url", description: "Logo image for login form" },
    { key: "get-started-title", type: "string", description: "Title text for get started screen" },
    { key: "website-chatbot-qr-usr-custom-bg", type: "color", description: "Custom QR user background color" },
    { key: "excluded-ips", type: "string", description: "IP addresses excluded from bot access" },
    { key: "website-chatbot-header-gradient", type: "string", description: "Gradient style for chatbot header" },
    { key: "website-chatbot-rounded-blocks", type: "bool", description: "Enable rounded chat bubbles" },
    { key: "website-chatbot-text-color", type: "color", description: "Default chatbot text color" },
    { key: "search-for-chinese-keywords", type: "bool", description: "Enable Chinese keyword search" },
    { key: "bot-activation-time", type: "number", description: "Time before bot activates", range: "minutes (e.g. 60)" },
    { key: "previous_story_attribute", type: "string", description: "Attribute storing previous story" },
    { key: "interactive_activation", type: "bool", description: "Enable or disable interactive activation" },
    { key: "customer-support-bot", type: "bool", description: "Enable customer support bot" },
    { key: "bot-daily-limit-users", type: "number", description: "Daily user limit for bot" },
    { key: "block-bot-user", type: "string", description: "Block a bot user by ID/email" },
    { key: "bot-preg-match", type: "string", description: "Regex pattern for bot processing" },
    { key: "form-submission-attributes", type: "string", description: "Attributes to capture in forms" },
    { key: "translation-source-language", type: "string", description: "Source language for translation" },
    { key: "admin-invitaion-email", type: "string", description: "Admin invitation email address" },
    { key: "user-company-name", type: "string", description: "Company name of user" },
    { key: "notification-to-all-agents", type: "bool", description: "Notify all agents (0 = no, 1 = yes)" },
    { key: "whatsapp_daily_limit", type: "number", description: "Daily WhatsApp messaging limit" },
    { key: "whatsapp_monthly_limit", type: "number", description: "Monthly WhatsApp messaging limit" },
    { key: "website-chatbot-bot-name", type: "string", description: "Display name of chatbot" },
    { key: "website-chatbot-home-message", type: "string", description: "Home message of chatbot" },
    { key: "website-chatbot-bot-email", type: "string", description: "Bot support email" },
    { key: "industory", type: "string", description: "Industry type (typo key, use industry)" },
    { key: "whatsapp-human-help", type: "bool", description: "Enable human help in WhatsApp bot" },
    { key: "website-chatbot-header-solid", type: "color", description: "Solid header background color" },
    { key: "industry", type: "string", description: "Industry type for chatbot" },
    { key: "live_chat_order", type: "number", description: "Order number for live chat handling" },
    { key: "wizard_id", type: "string", description: "Wizard ID reference" },
    { key: "page-message-sound", type: "url", description: "Page message notification sound file" },
    { key: "csat-settings-enabled", type: "bool", description: "Enable CSAT survey (0 = no, 1 = yes)" },
    { key: "trending_queries", type: "string", description: "List of trending queries" },
    { key: "website-chatbot-start-conversation-title", type: "string", description: "Title for start conversation" },
    { key: "website-chatbot-start-conversation-subtitle", type: "string", description: "Subtitle for start conversation" },
    { key: "publish-to-ai", type: "bool", description: "Publish chatbot data to AI engine" },
    { key: "open-ai-key", type: "string", description: "OpenAI API key" },
    { key: "scroll-bar-enabled", type: "bool", description: "Enable scroll bar in chat window" },
    { key: "delete-user-conversation-on-get-started", type: "bool", description: "Delete conversation when user clicks get started" },
    { key: "failure_through_sms", type: "bool", description: "Send SMS notification if failure happens" }
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
            description: `This tool allows clients to update the bot’s configuration settings dynamically by specifying a valid key and its corresponding value. 
            Each key has a defined type and may have a valid range. 
            - **string**: free text values. 
            - **number**: numeric values, check "range" if specified. 
            - **bool**: only 0 or 1 (false or true). 
            - **color**: hex color codes (e.g. #FF0000). 
            - **url**: must be a valid URL.
            
            Valid keys include: ${botSettingKeys.map(k => `${k.key} (${k.type}${k.range ? `, ${k.range}` : `, ${k.description}`})`).join(", ")}.`,
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