import {z} from 'zod';
import {ValidationError} from '../types/index.js';
import {botApiService} from '../services/botApiService.js';
import {Logger} from '../utils/logger.js';
import {UpdateBotSettingsSchema} from '../types/index.js';

// Bot setting keys (from user)
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
    "website-chatbot-bot-image-url",
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
            const result = await botApiService.updateBotSettings(validatedArgs.key, validatedArgs.value);
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

    /**
     * Extracts the key from the instruction using a language model.
     */
    getKeyFromLLM = async (server: any, instruction: string) => {
        this.logger.info('Extracting key from instruction using LLM');
        const prompt = `
          You are an assistant that helps map user requests to specific bot setting keys.
          
          Valid setting keys:
          ${botSettingKeys.map(k => `- ${k}`).join("\n")}
          
          A user said: "${instruction}"
          
          From the keys above, which exact key is the one the user wants to update? 
          Return EXACTLY the matching key as it appears above, or "NONE" if none apply.
          `;
        const resp = await server.createMessage({
            messages: [
                {
                    role: "system",
                    content: {type: "text", text: "Always answer with an exact key from the provided list or NONE."}
                },
                {role: "user", content: {type: "text", text: prompt}}
            ],
            maxTokens: 10
        });
        this.logger.info(resp.content.text.trim());
        return resp.content.text.trim();
    }

    /**
     * Extracts the value from the instruction.
     */
    extractValue = (instruction: string) => {
        const match = instruction.match(/to ['"]?(.+?)['"]?(?:\.|$)/i);
        if (match && match[1]) return match[1].trim();
        const match2 = instruction.match(/(?:as|is) ['"]?(.+?)['"]?(?:\.|$)/i);
        if (match2 && match2[1]) return match2[1].trim();
        return instruction.split(" ").slice(-1)[0];
    }
}

export const botSettingsTools = new BotSettingsTools(); 