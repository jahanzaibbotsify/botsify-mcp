import { z } from 'zod';
import Fuse from 'fuse.js';
import { 
  ToolResult, 
  SmartBotSettingsResult, 
  BotSettingKey, 
  IntentType,
  ValidationError 
} from '../types/index.js';
import { botApiService } from '../services/botApiService.js';
import { Logger } from '../utils/logger.js';
import { 
  BotSettingKeySchema, 
  UpdateBotSettingsSchema, 
  DeleteBotSettingSchema, 
  SmartBotSettingsSchema 
} from '../types/index.js';

// Bot setting keys (from user)
export const botSettingKeys: BotSettingKey[] = [
  { key: 'website-chatbot-primary-color', description: 'Primary color of the website chatbot', keywords: ['main color', 'primary', 'theme color', 'chatbot color'] },
  { key: 'website-chatbot-secondary-color', description: 'Secondary color of the website chatbot', keywords: ['secondary', 'accent color', 'alternate color', 'chatbot color'] },
  { key: 'website-chatbot-bot-image', description: 'Image/avatar for the chatbot', keywords: ['bot image', 'avatar', 'chatbot picture', 'icon'] },
  { key: 'website-chatbot-input-disabled', description: 'Disable the chatbot input field', keywords: ['disable input', 'input off', 'no typing', 'input field'] },
  { key: 'website-chatbot-bot-welcoming-text', description: 'Welcoming text shown by the chatbot', keywords: ['welcome message', 'greeting', 'hello', 'intro text'] },
  { key: 'website-chatbot-popup', description: 'Enable or disable chatbot popup', keywords: ['popup', 'show popup', 'open chatbot', 'pop-up'] },
  { key: 'website-chatbot-loginform', description: 'Show login form in chatbot', keywords: ['login', 'sign in', 'authentication', 'login form'] },
  { key: 'stripe_account_id', description: 'Stripe account ID for payments', keywords: ['stripe', 'payment', 'account id', 'stripe id'] },
  { key: 'access_token', description: 'Access token for API authentication', keywords: ['api token', 'access', 'authentication', 'token'] },
  { key: 'website-chatbot-preferred-language', description: 'Preferred language for the chatbot', keywords: ['language', 'locale', 'default language', 'chatbot language'] },
  { key: 'website-chatbot-default-launcher', description: 'Default launcher for the chatbot', keywords: ['launcher', 'default button', 'open button', 'start button'] },
  { key: 'website-chatbot-popup-message', description: 'Message shown in chatbot popup', keywords: ['popup message', 'popup text', 'notification', 'chatbot popup'] },
  { key: 'delete-conversation-confirm', description: 'Confirmation for deleting conversation', keywords: ['delete conversation', 'confirm delete', 'remove chat', 'clear conversation'] },
  { key: 'has_sound', description: 'Enable or disable sound notifications', keywords: ['sound', 'audio', 'mute', 'notification sound'] },
  { key: 'website-chatbot-bot-image-url', description: 'URL for the chatbot image', keywords: ['image url', 'bot image', 'avatar url', 'picture link'] },
  { key: 'human-help-form', description: '', keywords: [] },
  { key: 'website-chatbot-move-left', description: '', keywords: [] },
  { key: 'website-chatbot-icon-type', description: '', keywords: [] },
  { key: 'translate_client', description: '', keywords: [] },
  { key: 'website-chatbot-menu-languages', description: '', keywords: [] },
  { key: 'broadcast_labels', description: '', keywords: [] },
  { key: 'website-chatbot-composer-buttons', description: '', keywords: [] },
  { key: 'wizard_page', description: '', keywords: [] },
  { key: 'landing-bot-bg-image', description: '', keywords: [] },
  { key: 'language', description: '', keywords: [] },
  { key: 'icon-as-get-started', description: '', keywords: [] },
  { key: 'top-close-chat', description: '', keywords: [] },
  { key: 'show-chat-human-help', description: '', keywords: [] },
  { key: 'landing-bot-bg-style', description: '', keywords: [] },
  { key: 'website-chatbot-popup-once', description: '', keywords: [] },
  { key: 'whitelabel-type', description: '', keywords: [] },
  { key: 'website-chatbot-speech-button', description: '', keywords: [] },
  { key: 'website-chatbot-attachment-button', description: '', keywords: [] },
  { key: 'website-chatbot-calender-disabled', description: '', keywords: [] },
  { key: 'website-chatbot-height', description: '', keywords: [] },
  { key: 'chat-delete-completely', description: '', keywords: [] },
  { key: 'website-track-users', description: '', keywords: [] },
  { key: 'mobile-hide-chatbot', description: '', keywords: [] },
  { key: 'mobile-no-chatbot-popup', description: '', keywords: [] },
  { key: 'mobile-chatbot-height', description: '', keywords: [] },
  { key: 'inline-form-field-responses', description: '', keywords: [] },
  { key: 'excluded-urls', description: '', keywords: [] },
  { key: 'website-chatbot-get-started', description: '', keywords: [] },
  { key: 'website-chatbot-btn-border-color', description: '', keywords: [] },
  { key: 'website-chatbot-btn-padding', description: '', keywords: [] },
  { key: 'website-chatbot-btn-border-width', description: '', keywords: [] },
  { key: 'website-chatbot-btn-bg-color', description: '', keywords: [] },
  { key: 'website-chatbot-font-size', description: '', keywords: [] },
  { key: 'website-chatbot-btn-text-color', description: '', keywords: [] },
  { key: 'website-chatbot-btn-qr-inline', description: '', keywords: [] },
  { key: 'website-chatbot-btn-style', description: '', keywords: [] },
  { key: 'website-chatbot-font-family', description: '', keywords: [] },
  { key: 'website-chatbot-user-says-bg', description: '', keywords: [] },
  { key: 'website-chatbot-bot-says-bg', description: '', keywords: [] },
  { key: 'website-chatbot-user-says-color', description: '', keywords: [] },
  { key: 'website-chatbot-btn-mt', description: '', keywords: [] },
  { key: 'website-chatbot-home-message-color', description: '', keywords: [] },
  { key: 'login-form-logo', description: '', keywords: [] },
  { key: 'get-started-title', description: '', keywords: [] },
  { key: 'website-chatbot-qr-usr-custom-bg', description: '', keywords: [] },
  { key: 'excluded-ips', description: '', keywords: [] },
  { key: 'website-chatbot-header-gradient', description: '', keywords: [] },
  { key: 'website-chatbot-rounded-blocks', description: '', keywords: [] },
  { key: 'website-chatbot-text-color', description: '', keywords: [] },
  { key: 'search-for-chinese-keywords', description: '', keywords: [] },
  { key: 'bot-activation-time', description: '', keywords: [] },
  { key: 'previous_story_attribute', description: '', keywords: [] },
  { key: 'interactive_activation', description: '', keywords: [] },
  { key: 'customer-support-bot', description: '', keywords: [] },
  { key: 'bot-daily-limit-users', description: '', keywords: [] },
  { key: 'block-bot-user', description: '', keywords: [] },
  { key: 'bot-preg-match', description: '', keywords: [] },
  { key: 'form-submission-attributes', description: '', keywords: [] },
  { key: 'translation-source-language', description: '', keywords: [] },
  { key: 'admin-invitaion-email', description: '', keywords: [] },
  { key: 'user-company-name', description: '', keywords: [] },
  { key: 'notification-to-all-agents', description: '', keywords: [] },
  { key: 'whatsapp_daily_limit', description: '', keywords: [] },
  { key: 'whatsapp_monthly_limit', description: '', keywords: [] },
  { key: 'website-chatbot-bot-name', description: '', keywords: [] },
  { key: 'website-chatbot-home-message', description: '', keywords: [] },
  { key: 'website-chatbot-bot-email', description: '', keywords: [] },
  { key: 'industory', description: '', keywords: [] },
  { key: 'whatsapp-human-help', description: '', keywords: [] },
  { key: 'website-chatbot-header-solid', description: '', keywords: [] },
  { key: 'industry', description: '', keywords: [] },
  { key: 'live_chat_order', description: '', keywords: [] },
  { key: 'wizard_id', description: '', keywords: [] },
  { key: 'page-message-sound', description: '', keywords: [] },
  { key: 'csat-settings-enabled', description: '', keywords: [] },
  { key: 'trending_queries', description: '', keywords: [] },
  { key: 'website-chatbot-start-conversation-title', description: '', keywords: [] },
  { key: 'website-chatbot-start-conversation-subtitle', description: '', keywords: [] },
  { key: 'publish-to-ai', description: '', keywords: [] },
  { key: 'open-ai-key', description: '', keywords: [] },
  { key: 'scroll-bar-enabled', description: '', keywords: [] },
  { key: 'delete-user-conversation-on-get-started', description: '', keywords: [] },
  { key: 'failure_through_sms', description: '', keywords: [] },
];

// Intent detection keywords
const intentKeywords: Record<IntentType, string[]> = {
  get: ['what is', 'get', 'show me', 'display', 'see', 'status', 'current value'],
  update: ['change', 'set', 'update', 'make', 'turn on', 'turn off', 'enable', 'disable'],
  delete: ['delete', 'remove', 'clear', 'unset']
};

// Fuse.js configuration for fuzzy search
const fuse = new Fuse(botSettingKeys, {
  includeScore: true,
  threshold: 0.3,
  ignoreLocation: true,
  keys: ['key', 'description', 'keywords']
});

export class BotSettingsTools {
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ service: 'BotSettingsTools' });
  }

  /**
   * Get bot settings
   */
  async getBotSettings(args: { key?: string; value?: string }): Promise<ToolResult> {
    try {
      // Validate input
      const validatedArgs = BotSettingKeySchema.parse(args);
      
      this.logger.info('Getting bot settings', { args: validatedArgs });
      
      const result = await botApiService.getBotSettings(validatedArgs.key, validatedArgs.value);

      if (result.success) {
        return {
          success: true,
          message: 'Bot settings retrieved successfully',
          data: result.data
        };
      } else {
        return {
          success: false,
          message: `Failed to retrieve bot settings: ${result.error}`,
          data: result
        };
      }
    } catch (error) {
      this.logger.error('Error in getBotSettings', error);
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid input parameters', { errors: error.errors });
      }
      throw error;
    }
  }

  /**
   * Update bot settings
   */
  async updateBotSettings(args: { key: string; value: string }): Promise<ToolResult> {
    try {
      // Validate input
      const validatedArgs = UpdateBotSettingsSchema.parse(args);
      
      this.logger.info('Updating bot settings', { key: validatedArgs.key });
      
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
        throw new ValidationError('Invalid input parameters', { errors: error.errors });
      }
      throw error;
    }
  }

  /**
   * Delete bot setting
   */
  async deleteBotSetting(args: { key: string }): Promise<ToolResult> {
    try {
      // Validate input
      const validatedArgs = DeleteBotSettingSchema.parse(args);
      
      this.logger.info('Deleting bot setting', { key: validatedArgs.key });
      
      const result = await botApiService.deleteBotSetting(validatedArgs.key);

      if (result.success) {
        return {
          success: true,
          message: 'Bot setting deleted successfully',
          data: result.data
        };
      } else {
        return {
          success: false,
          message: `Failed to delete bot setting: ${result.error}`,
          data: result
        };
      }
    } catch (error) {
      this.logger.error('Error in deleteBotSetting', error);
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid input parameters', { errors: error.errors });
      }
      throw error;
    }
  }

  /**
   * Test bot API connection
   */
  async testBotApiConnection(): Promise<ToolResult> {
    try {
      this.logger.info('Testing bot API connection');
      
      const result = await botApiService.testConnection();

      if (result.success) {
        return {
          success: true,
          message: 'Bot API connection test successful',
          data: result.data
        };
      } else {
        return {
          success: false,
          message: `Bot API connection test failed: ${result.error}`,
          data: result
        };
      }
    } catch (error) {
      this.logger.error('Error in testBotApiConnection', error);
      throw error;
    }
  }

  /**
   * Smart bot settings - process natural language instructions
   */
  async smartBotSettings(args: { text: string; value?: string }): Promise<SmartBotSettingsResult> {
    try {
      // Validate input
      const validatedArgs = SmartBotSettingsSchema.parse(args);
      
      this.logger.info('Processing smart bot settings', { text: validatedArgs.text });
      
      const { text, value: explicitValue } = validatedArgs;

      // Normalize text for processing
      const normalizedText = this.normalizeText(text);

      // Detect intent
      const intent = this.detectIntent(normalizedText);
      if (!intent) {
        return {
          success: false,
          intent: null,
          key: null,
          value: null,
          confidence: 0,
          message: 'Unable to determine user intent'
        };
      }

      // Extract value if not explicitly provided
      let extractedValue: string | null = explicitValue ?? null;
      if (intent === 'update' && !extractedValue) {
        extractedValue = this.extractValue(normalizedText);
      }

      // Find matching setting key
      const { key, confidence, possibleMatches } = this.findSettingKey(text, normalizedText);

      if (!key || confidence < 0.5) {
        return {
          success: false,
          intent,
          key: null,
          value: extractedValue,
          confidence,
          possibleMatches: possibleMatches || [],
          message: 'Low confidence in key match'
        };
      }

      return {
        success: true,
        intent,
        key,
        value: extractedValue,
        confidence,
        message: 'Key and value resolved successfully'
      };
    } catch (error) {
      this.logger.error('Error in smartBotSettings', error);
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid input parameters', { errors: error.errors });
      }
      throw error;
    }
  }

  /**
   * Normalize text for processing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\-_]/g, ' ')
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detect intent from text
   */
  private detectIntent(normalizedText: string): IntentType | null {
    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      for (const keyword of keywords) {
        if (normalizedText.includes(keyword)) {
          return intent as IntentType;
        }
      }
    }
    return null;
  }

  /**
   * Extract value from text
   */
  private extractValue(normalizedText: string): string | null {
    const patterns = [
      / to ([\w\s-]+)/,
      /= ([\w\s-]+)/,
      / as ([\w\s-]+)/
    ];

    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Find setting key using improved fuzzy search
   */
  private findSettingKey(text: string, normalizedText: string): { 
    key: string | null; 
    confidence: number; 
    possibleMatches?: string[] 
  } {
    const fuseResults = fuse.search(text);
    const inputWords = new Set(normalizedText.split(/\s+/));

    // Calculate overlap scores with improved normalization
    const overlapScores = botSettingKeys.map(entry => {
      const keywords = [entry.key, entry.description, ...(entry.keywords || [])]
        .map(this.normalizeText)
        .join(' ')
        .split(/\s+/);
      const overlap = keywords.filter(word => inputWords.has(word)).length;
      return overlap / keywords.length;
    });

    let bestIdx = -1;
    let bestScore = -Infinity;
    let confidence = 0;

    for (let i = 0; i < fuseResults.length; i++) {
      const result = fuseResults[i];
      if (!result || !result.item) continue;
      const idx = botSettingKeys.findIndex(e => e.key === result.item.key);
      const fuseScore = 1 - (result.score ?? 1);
      const overlap = overlapScores[idx] ?? 0;
      // Give extra boost if any input word is a substring of the key
      const keyWords = this.normalizeText(result.item.key).split(/\s+/);
      const partialMatch = Array.from(inputWords).some(word => keyWords.some(k => k.includes(word)));
      const hybrid = partialMatch ? (fuseScore + overlap + 0.2) / 2 : (fuseScore + overlap) / 2;
      if (hybrid > bestScore) {
        bestScore = hybrid;
        bestIdx = idx;
        confidence = hybrid;
      }
    }

    // Debug: log top 3 matches and their scores
    if (fuseResults.length > 0) {
      const topMatches = fuseResults.slice(0, 3).map((r, i) => {
        const idx = botSettingKeys.findIndex(e => e.key === r.item.key);
        return {
          key: r.item.key,
          fuseScore: 1 - (r.score ?? 1),
          overlap: overlapScores[idx] ?? 0,
          hybrid: ((1 - (r.score ?? 1)) + (overlapScores[idx] ?? 0)) / 2
        };
      });
      this.logger.info('Top fuzzy matches', { input: text, topMatches });
    }

    if (bestIdx === -1) {
      const possibleMatches = fuseResults.slice(0, 3).map(r => r.item?.key).filter(Boolean) as string[];
      return { key: null, confidence: 0, possibleMatches };
    }

    // Lowered confidence threshold to 0.3
    return { 
      key: botSettingKeys[bestIdx]?.key || '', 
      confidence 
    };
  }

  /**
   * Get all available setting keys
   */
  getAvailableSettings(): BotSettingKey[] {
    return [...botSettingKeys];
  }
}

// Export singleton instance
export const botSettingsTools = new BotSettingsTools(); 