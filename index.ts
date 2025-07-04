import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import express from "express";
import Fuse from 'fuse.js';

// Create server instance
const server = new McpServer({
    name: "bot-api",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

// Configuration interface
interface BotApiConfig {
    baseUrl: string;
    authKey?: string;
    apikey?: string;
    timeout?: number;
}

// Default configuration
const defaultConfig: BotApiConfig = {
    baseUrl: process.env.BOTSIFY_API_BASE_URL ?? 'https://dev.botsify.com/api',
    authKey: process.env.BOTSIFY_API_KEY ?? 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI1NCIsImp0aSI6ImI3NmVjOTVjMDNkMGE1YjJhNWVjNzVmZjIwNzNjMTc3NmQ2MDc5ODdkNGViMGM5NDQzOWM1YWMzM2U1M2UyZmM5OGUxOTI0ZTM2MWQ5YjE4IiwiaWF0IjoxNzQ0MDI0ODgwLjA5MzQ2OSwibmJmIjoxNzQ0MDI0ODgwLjA5MzQ3MiwiZXhwIjoxNzc1NTYwODc5Ljk4ODk1OSwic3ViIjoiMTEzMDc5Iiwic2NvcGVzIjpbXX0.irBQydX2lyKLD5jj67nV_mK7tCTGT-Rpp4Z7DZeea2CrjbXd2DeJCG1UHz-BUnbqs2iN4fL25eGo-BIrUZi2nBVneZfq1k0GpxJQCLRn2xGmdXTyGp0lrBzDrWjmAsgqxuGPrUQu6RH0AtFVCdirQ3xXGsa4o65m0hd4cqKkN6SdLWV_TaoKmQY_EAQuPuhAHWb_s4wXnzyq7EoGQn_qnH_AG6P0H52PKoiIqcWPBwvZtppnnmDjpKMpSXSVxyANgqNX2SMfllt6I5oOdecMZyVMeq62wvVVyoQvW2oRLd7sbnebh6QYu5DSthvhPwiGtECeFxA9petM7l6DkoAohzZ6Hx89Hq6bjcp5Nm4BVPB8oZbNVOwYzn4vmDXPXQJ9iPy4lHot9NIjUe5_43vZTidTd247eYYtx3_7Pu1QDkeRZXUHhtHrCoXILwJLCmiH8YadYWw7g7f6jl5GwIAJs1dZGSNAGsFaKzYgTPbS0d3DUCGJLIfl2HaVqI0HjP55NaUJf3Y71HJsxUGw6DZhva28sqp5ceUy8uUJzjv9pRoPc8Bq9gtvRPieAlVxtQIq_aaY59E2Yt9dy5fItfXbV2gDKtIHmy_hMC0CSA6z6aPTHXXmGZWIqX4DVN-3r4lVLYpKRwzOBdAUzuRen3hPHoyjNmgqHng6tRaCzeMynao',
    apikey: process.env.BOTSIFY_BOT_ID ?? 'AapuDtIrIg8jSgX41afmu0vbqAOD10zSKwtRA1JO',
    timeout: 60000,
};

// API Response interface
interface ApiResponse {
    success: boolean;
    data?: any;
    status?: number;
    statusText?: string;
    error?: string;
}

// Helper function to make API requests
async function makeApiRequest(
    endpoint: string,
    data?: any,
): Promise<ApiResponse> {
    const config: BotApiConfig = defaultConfig;
    const requestData = { ...data, apikey: config.apikey };

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (config.authKey) {
            headers['Authorization'] = `Bearer ${config.authKey}`;
        }

        const response = await axios({
            method: 'POST',
            url: `${config.baseUrl}${endpoint}`,
            data: requestData,
            headers,
            timeout: config.timeout,
        });

        return {
            success: true,
            data: response.data,
            status: response.status,
            statusText: response.statusText,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
        };
    }
}

// Tool result interface
interface ToolResult {
    success: boolean;
    message: string;
}

const botSettingKeys = [
    {
        key: 'website-chatbot-primary-color',
        description: 'Primary color of the chatbot',
        keywords: ['primary color', 'chatbot color', 'main color']
    },
    {
        key: 'website-chatbot-secondary-color',
        description: 'Secondary color of the chatbot',
        keywords: ['secondary color', 'alternate color']
    },
    {
        key: 'website-chatbot-bot-image',
        description: 'Image for the chatbot',
        keywords: ['bot image', 'chatbot avatar']
    },
    {
        key: 'website-chatbot-input-disabled',
        description: 'Disable chatbot input field',
        keywords: ['input disabled', 'disable input', 'chat input']
    },
    {
        key: 'website-chatbot-bot-welcoming-text',
        description: 'Welcoming text for the chatbot',
        keywords: ['welcome text', 'greeting message', 'chatbot welcome']
    },
    {
        key: 'website-chatbot-popup',
        description: 'Chatbot popup visibility',
        keywords: ['popup', 'chatbot popup', 'pop-up']
    },
    {
        key: 'website-chatbot-loginform',
        description: 'Login form for the chatbot',
        keywords: ['login form', 'sign-in form']
    },
    {
        key: 'stripe_account_id',
        description: 'Stripe account ID for payments',
        keywords: ['stripe id', 'payment account']
    },
    {
        key: 'access_token',
        description: 'Access token for API authentication',
        keywords: ['access token', 'api token', 'authentication']
    },
    {
        key: 'website-chatbot-preferred-language',
        description: 'Preferred language for the chatbot',
        keywords: ['language', 'chatbot language', 'preferred language']
    },
    {
        key: 'website-chatbot-default-launcher',
        description: 'Default launcher for the chatbot',
        keywords: ['launcher', 'chatbot launcher', 'default launcher']
    },
    {
        key: 'website-chatbot-popup-message',
        description: 'Message displayed in chatbot popup',
        keywords: ['popup message', 'chatbot popup text']
    },
    {
        key: 'delete-conversation-confirm',
        description: 'Confirmation for deleting conversations',
        keywords: ['delete conversation', 'conversation confirm']
    },
    {
        key: 'has_sound',
        description: 'Enable or disable sound for the chatbot',
        keywords: ['sound', 'audio', 'chatbot sound']
    },
    {
        key: 'website-chatbot-bot-image-url',
        description: 'URL for the chatbot image',
        keywords: ['bot image url', 'chatbot image link']
    },
    {
        key: 'human-help-form',
        description: 'Form for requesting human help',
        keywords: ['human help', 'support form']
    },
    {
        key: 'website-chatbot-move-left',
        description: 'Move chatbot to the left side',
        keywords: ['move left', 'chatbot position']
    },
    {
        key: 'website-chatbot-icon-type',
        description: 'Type of icon used for the chatbot',
        keywords: ['icon type', 'chatbot icon']
    },
    {
        key: 'translate_client',
        description: 'Client translation settings',
        keywords: ['translate', 'client translation']
    },
    {
        key: 'website-chatbot-menu-languages',
        description: 'Languages available in the chatbot menu',
        keywords: ['menu languages', 'chatbot languages']
    },
    {
        key: 'broadcast_labels',
        description: 'Labels for broadcast messages',
        keywords: ['broadcast labels', 'message labels']
    },
    {
        key: 'website-chatbot-composer-buttons',
        description: 'Buttons in the chatbot composer',
        keywords: ['composer buttons', 'chatbot buttons']
    },
    {
        key: 'wizard_page',
        description: 'Wizard page settings',
        keywords: ['wizard page', 'setup page']
    },
    {
        key: 'landing-bot-bg-image',
        description: 'Background image for landing bot',
        keywords: ['landing background', 'bot background']
    },
    {
        key: 'language',
        description: 'General language setting',
        keywords: ['language', 'site language']
    },
    {
        key: 'icon-as-get-started',
        description: 'Use icon as get started button',
        keywords: ['get started icon', 'start button']
    },
    {
        key: 'top-close-chat',
        description: 'Close chat button at the top',
        keywords: ['close chat', 'top close button']
    },
    {
        key: 'show-chat-human-help',
        description: 'Show human help option in chat',
        keywords: ['human help', 'chat support']
    },
    {
        key: 'landing-bot-bg-style',
        description: 'Background style for landing bot',
        keywords: ['landing style', 'background style']
    },
    {
        key: 'website-chatbot-popup-once',
        description: 'Show chatbot popup only once',
        keywords: ['popup once', 'single popup']
    },
    {
        key: 'whitelabel-type',
        description: 'Whitelabel type for branding',
        keywords: ['whitelabel', 'branding type']
    },
    {
        key: 'website-chatbot-speech-button',
        description: 'Speech button for chatbot',
        keywords: ['speech button', 'voice input']
    },
    {
        key: 'website-chatbot-attachment-button',
        description: 'Attachment button for chatbot',
        keywords: ['attachment button', 'file upload']
    },
    {
        key: 'website-chatbot-calender-disabled',
        description: 'Disable calendar in chatbot',
        keywords: ['calendar disabled', 'disable calendar']
    },
    {
        key: 'website-chatbot-height',
        description: 'Height of the chatbot window',
        keywords: ['chatbot height', 'window height']
    },
    {
        key: 'chat-delete-completely',
        description: 'Completely delete chat data',
        keywords: ['delete chat', 'clear chat']
    },
    {
        key: 'website-track-users',
        description: 'Track users on the website',
        keywords: ['track users', 'user tracking']
    },
    {
        key: 'mobile-hide-chatbot',
        description: 'Hide chatbot on mobile devices',
        keywords: ['hide chatbot', 'mobile hide']
    },
    {
        key: 'mobile-no-chatbot-popup',
        description: 'Disable chatbot popup on mobile',
        keywords: ['no popup mobile', 'mobile popup']
    },
    {
        key: 'mobile-chatbot-height',
        description: 'Height of chatbot on mobile',
        keywords: ['mobile height', 'chatbot mobile height']
    },
    {
        key: 'inline-form-field-responses',
        description: 'Responses for inline form fields',
        keywords: ['form responses', 'inline form']
    },
    {
        key: 'excluded-urls',
        description: 'URLs excluded from chatbot',
        keywords: ['excluded urls', 'block urls']
    },
    {
        key: 'website-chatbot-get-started',
        description: 'Get started settings for chatbot',
        keywords: ['get started', 'chatbot start']
    },
    {
        key: 'website-chatbot-btn-border-color',
        description: 'Border color for chatbot buttons',
        keywords: ['button border color', 'btn border']
    },
    {
        key: 'website-chatbot-btn-padding',
        description: 'Padding for chatbot buttons',
        keywords: ['button padding', 'btn padding']
    },
    {
        key: 'website-chatbot-btn-border-width',
        description: 'Border width for chatbot buttons',
        keywords: ['button border width', 'btn border width']
    },
    {
        key: 'website-chatbot-btn-bg-color',
        description: 'Background color for chatbot buttons',
        keywords: ['button background', 'btn bg color']
    },
    {
        key: 'website-chatbot-font-size',
        description: 'Font size for chatbot text',
        keywords: ['font size', 'chatbot text size']
    },
    {
        key: 'website-chatbot-btn-text-color',
        description: 'Text color for chatbot buttons',
        keywords: ['button text color', 'btn text color']
    },
    {
        key: 'website-chatbot-btn-qr-inline',
        description: 'Inline QR code for chatbot buttons',
        keywords: ['qr code', 'button qr']
    },
    {
        key: 'website-chatbot-btn-style',
        description: 'Style for chatbot buttons',
        keywords: ['button style', 'btn style']
    },
    {
        key: 'website-chatbot-font-family',
        description: 'Font family for chatbot text',
        keywords: ['font family', 'chatbot font']
    },
    {
        key: 'website-chatbot-user-says-bg',
        description: 'Background for user messages',
        keywords: ['user message background', 'user says bg']
    },
    {
        key: 'website-chatbot-bot-says-bg',
        description: 'Background for bot messages',
        keywords: ['bot message background', 'bot says bg']
    },
    {
        key: 'website-chatbot-user-says-color',
        description: 'Text color for user messages',
        keywords: ['user message color', 'user says color']
    },
    {
        key: 'website-chatbot-btn-mt',
        description: 'Margin top for chatbot buttons',
        keywords: ['button margin', 'btn margin top']
    },
    {
        key: 'website-chatbot-home-message-color',
        description: 'Color for chatbot home message',
        keywords: ['home message color', 'welcome color']
    },
    {
        key: 'login-form-logo',
        description: 'Logo for login form',
        keywords: ['login logo', 'form logo']
    },
    {
        key: 'get-started-title',
        description: 'Title for get started section',
        keywords: ['get started title', 'start title']
    },
    {
        key: 'website-chatbot-qr-usr-custom-bg',
        description: 'Custom background for QR code',
        keywords: ['qr background', 'custom qr bg']
    },
    {
        key: 'excluded-ips',
        description: 'IP addresses excluded from chatbot',
        keywords: ['excluded ips', 'block ips']
    },
    {
        key: 'website-chatbot-header-gradient',
        description: 'Gradient for chatbot header',
        keywords: ['header gradient', 'chatbot header']
    },
    {
        key: 'website-chatbot-rounded-blocks',
        description: 'Rounded blocks for chatbot UI',
        keywords: ['rounded blocks', 'chatbot ui']
    },
    {
        key: 'website-chatbot-text-color',
        description: 'Text color for chatbot',
        keywords: ['text color', 'chatbot text']
    },
    {
        key: 'search-for-chinese-keywords',
        description: 'Search settings for Chinese keywords',
        keywords: ['chinese search', 'keyword search']
    },
    {
        key: 'bot-activation-time',
        description: 'Activation time for the bot',
        keywords: ['activation time', 'bot start time']
    },
    {
        key: 'previous_story_attribute',
        description: 'Previous story attributes for bot',
        keywords: ['story attribute', 'previous story']
    },
    {
        key: 'interactive_activation',
        description: 'Interactive activation settings',
        keywords: ['interactive activation', 'bot activation']
    },
    {
        key: 'customer-support-bot',
        description: 'Customer support bot settings',
        keywords: ['customer support', 'support bot']
    },
    {
        key: 'bot-daily-limit-users',
        description: 'Daily user limit for the bot',
        keywords: ['daily limit', 'user limit']
    },
    {
        key: 'block-bot-user',
        description: 'Block specific bot users',
        keywords: ['block user', 'bot user block']
    },
    {
        key: 'bot-preg-match',
        description: 'Pattern matching for bot',
        keywords: ['pattern match', 'bot regex']
    },
    {
        key: 'form-submission-attributes',
        description: 'Attributes for form submissions',
        keywords: ['form attributes', 'submission attributes']
    },
    {
        key: 'translation-source-language',
        description: 'Source language for translations',
        keywords: ['source language', 'translation language']
    },
    {
        key: 'admin-invitaion-email',
        description: 'Admin invitation email settings',
        keywords: ['admin email', 'invitation email']
    },
    {
        key: 'user-company-name',
        description: 'Company name for users',
        keywords: ['company name', 'user company']
    },
    {
        key: 'notification-to-all-agents',
        description: 'Notifications sent to all agents',
        keywords: ['agent notifications', 'all agents']
    },
    {
        key: 'whatsapp_daily_limit',
        description: 'Daily message limit for WhatsApp',
        keywords: ['whatsapp limit', 'daily limit']
    },
    {
        key: 'whatsapp_monthly_limit',
        description: 'Monthly message limit for WhatsApp',
        keywords: ['whatsapp monthly', 'monthly limit']
    },
    {
        key: 'website-chatbot-bot-name',
        description: 'Name of the chatbot',
        keywords: ['bot name', 'chatbot name']
    },
    {
        key: 'website-chatbot-home-message',
        description: 'Home message for the chatbot',
        keywords: ['home message', 'welcome message']
    },
    {
        key: 'website-chatbot-bot-email',
        description: 'Email address for the chatbot',
        keywords: ['bot email', 'chatbot email']
    },
    {
        key: 'industory',
        description: 'Industry setting (likely a typo for industry)',
        keywords: ['industry', 'business type']
    },
    {
        key: 'whatsapp-human-help',
        description: 'Human help option for WhatsApp',
        keywords: ['whatsapp help', 'human support']
    },
    {
        key: 'website-chatbot-header-solid',
        description: 'Solid header for chatbot',
        keywords: ['header solid', 'chatbot header']
    },
    {
        key: 'industry',
        description: 'Industry setting for the bot',
        keywords: ['industry', 'business sector']
    },
    {
        key: 'live_chat_order',
        description: 'Order of live chat messages',
        keywords: ['live chat order', 'chat order']
    },
    {
        key: 'wizard_id',
        description: 'ID for the setup wizard',
        keywords: ['wizard id', 'setup id']
    },
    {
        key: 'page-message-sound',
        description: 'Sound for page messages',
        keywords: ['message sound', 'page sound']
    },
    {
        key: 'csat-settings-enabled',
        description: 'Enable CSAT settings',
        keywords: ['csat', 'customer satisfaction']
    },
    {
        key: 'trending_queries',
        description: 'Trending queries for the bot',
        keywords: ['trending queries', 'popular queries']
    },
    {
        key: 'website-chatbot-start-conversation-title',
        description: 'Title for starting a conversation',
        keywords: ['conversation title', 'start title']
    },
    {
        key: 'website-chatbot-start-conversation-subtitle',
        description: 'Subtitle for starting a conversation',
        keywords: ['conversation subtitle', 'start subtitle']
    },
    {
        key: 'publish-to-ai',
        description: 'Publish settings to AI',
        keywords: ['publish ai', 'ai settings']
    },
    {
        key: 'open-ai-key',
        description: 'API key for Open AI integration',
        keywords: ['open ai key', 'ai key']
    },
    {
        key: 'scroll-bar-enabled',
        description: 'Enable scrollbar in chatbot',
        keywords: ['scrollbar', 'chatbot scrollbar']
    },
    {
        key: 'delete-user-conversation-on-get-started',
        description: 'Delete user conversation on get started',
        keywords: ['delete conversation', 'clear on start']
    },
    {
        key: 'failure_through_sms',
        description: 'SMS failure notifications',
        keywords: ['sms failure', 'failure notification']
    }
];

// Intent detection keywords
const intentKeywords = {
    get: ['what is', 'get', 'show me', 'display', 'see', 'status', 'current value'],
    update: ['change', 'set', 'update', 'make', 'turn on', 'turn off', 'enable', 'disable'],
    delete: ['delete', 'remove', 'clear', 'unset']
};

// Fuse.js configuration
const fuse = new Fuse(botSettingKeys, {
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
    keys: ['key', 'description', 'keywords'] // Search across key, description, and keywords
});

// Interface for smart-bot-settings response
interface SmartBotSettingsResult {
    success: boolean;
    intent: string | null;
    key: string | null;
    value: string | null;
    message: string;
    possibleMatches?: string[];
}

// Tool implementations
const tools = {
    'get-bot-settings': async (args: { key?: string; value?: string }): Promise<ToolResult> => {
        const { key, value } = args;
        const requestData = { key, value: value || null };
        const result = await makeApiRequest('/bot/settings', requestData);

        if (result.success) {
            return {
                success: true,
                message: `Bot Settings Retrieved Successfully`,
            };
        } else {
            return {
                success: false,
                message: `Failed to Retrieve Bot Settings`,
            };
        }
    },

    'update-bot-settings': async (args: { key: string; value: string }): Promise<ToolResult> => {
        const { key, value } = args;

        if (!key || !value) {
            return {
                success: false,
                message: 'Missing required parameters: key and value are required for updating bot settings'
            };
        }

        const requestData = { key, value };
        const result = await makeApiRequest('/bot/settings', requestData);

        if (result.success) {
            return {
                success: true,
                message: `Bot Settings Updated Successfully`,
            };
        } else {
            return {
                success: false,
                message: `Failed to Update Bot Settings`,
            };
        }
    },

    'delete-bot-setting': async (args: { key: string }): Promise<ToolResult> => {
        const { key } = args;

        if (!key) {
            return {
                success: false,
                message: 'Missing required parameter: key is required for deleting bot settings'
            };
        }

        const requestData = { key, value: null }; // Setting value to null to delete
        const result = await makeApiRequest('/bot/settings', requestData);

        if (result.success) {
            return {
                success: true,
                message: `Bot Setting Deleted Successfully`
            };
        } else {
            return {
                success: false,
                message: `Failed to Delete Bot Setting`
            };
        }
    },

    'test-bot-api-connection': async (args: {}): Promise<ToolResult> => {
        const requestData = { test: true }; // Simple test request
        const result = await makeApiRequest('/bot/settings', requestData);

        if (result.success) {
            return {
                success: true,
                message: `Bot API Connection Test Successful`,
            };
        } else {
            return {
                success: false,
                message: `Bot API Connection Test Failed`,
            };
        }
    },

    'smart-bot-settings': async (args: { text: string; value?: string }): Promise<SmartBotSettingsResult & { confidence: number; possibleMatches?: string[] }> => {
        const { text, value: explicitValue } = args;

        function normalize(str: string) {
            return str.toLowerCase().replace(/[^\w\s]/gi, '').trim();
        }
        const normalizedText = normalize(text);

        let intent: 'get' | 'update' | 'delete' | null = null;
        const verbMap: Record<string, 'get' | 'update' | 'delete'> = {
            'get': 'get', 'show': 'get', 'display': 'get', 'see': 'get', 'status': 'get',
            'set': 'update', 'change': 'update', 'update': 'update', 'make': 'update', 'turn on': 'update', 'turn off': 'update', 'enable': 'update', 'disable': 'update',
            'delete': 'delete', 'remove': 'delete', 'clear': 'delete', 'unset': 'delete'
        };
        for (const [verb, detectedIntent] of Object.entries(verbMap)) {
            if (normalizedText.includes(verb)) {
                intent = detectedIntent;
                break;
            }
        }
        if (!intent) {
            return {
                success: false,
                intent: null,
                key: null,
                value: null,
                confidence: 0,
                message: 'Unable to determine user intent.'
            };
        }

        let extractedValue: string | null = explicitValue ?? null;
        if (intent === 'update' && !extractedValue) {
            const toMatch = normalizedText.match(/ to ([\w\s-]+)/);
            if (toMatch && toMatch[1]) extractedValue = toMatch[1].trim();
            const eqMatch = normalizedText.match(/= ([\w\s-]+)/);
            if (eqMatch && eqMatch[1]) extractedValue = eqMatch[1].trim();
            const asMatch = normalizedText.match(/ as ([\w\s-]+)/);
            if (asMatch && asMatch[1]) extractedValue = asMatch[1].trim();
        }

        const fuseResults = fuse.search(text);
        const inputWords = new Set(normalizedText.split(/\s+/));

        const overlapScores = botSettingKeys.map(entry => {
            const keywords = [entry.key, entry.description, ...(entry.keywords || [])]
                .map(normalize).join(' ').split(/\s+/);
            const overlap = keywords.filter(word => inputWords.has(word)).length;
            return overlap / keywords.length;
        });

        let bestIdx = -1;
        let bestScore = -Infinity;
        let confidence = 0;
        for (let i = 0; i < fuseResults.length; i++) {
            const idx = botSettingKeys.findIndex(e => e.key === fuseResults[i].item.key);
            const fuseScore = 1 - (fuseResults[i].score ?? 1);
            const overlap = overlapScores[idx] ?? 0;
            const hybrid = (fuseScore + overlap) / 2;
            if (hybrid > bestScore) {
                bestScore = hybrid;
                bestIdx = idx;
                confidence = hybrid;
            }
        }

        if (bestIdx === -1 || confidence < 0.5) {
            const possibleMatches = fuseResults.slice(0, 3).map(r => r.item.key);
            return {
                success: false,
                intent,
                key: null,
                value: extractedValue,
                confidence,
                possibleMatches,
                message: 'Low confidence in key match.'
            };
        }

        return {
            success: true,
            intent,
            key: botSettingKeys[bestIdx].key,
            value: extractedValue,
            confidence,
            message: 'Key and value resolved successfully.'
        };
    }
};

// Register all tools with the MCP server
server.tool(
    "get-bot-settings",
    "Get bot settings according to the provided value.",
    {
        value: z.string().optional().describe("value set to specific tool")
    },
    async ({ value }) => {
        const key = 'get-bot-settings';
        const result = await tools[key]({ key, value });
        return {
            content: [{
                type: "text",
                text: JSON.stringify(result),
            }]
        };
    }
);

server.tool(
    "update-bot-settings",
    "Update bot settings using POST request to /bot/settings endpoint",
    {
        key: z.string().describe("The setting key to update"),
        value: z.string().describe("The new value for the setting")
    },
    async ({ key, value }) => {
        const result = await tools['update-bot-settings']({ key, value });
        return {
            content: [{
                type: "text",
                text: JSON.stringify(result),
            }]
        };
    }
);

server.tool(
    "delete-bot-setting",
    "Delete a specific bot setting using POST request to /bot/settings endpoint",
    {
        key: z.string().describe("The setting key to delete")
    },
    async ({ key }) => {
        const result = await tools['delete-bot-setting']({ key });
        return {
            content: [{
                type: "text",
                text: JSON.stringify(result),
            }]
        };
    }
);

server.tool(
    "test-bot-api-connection",
    "Test the connection to the bot API using POST request to /bot/settings endpoint",
    {},
    async () => {
        const result = await tools['test-bot-api-connection']({});
        return {
            content: [{
                type: "text",
                text: JSON.stringify(result),
            }]
        };
    }
);

server.tool(
    'smart-bot-settings',
    'Process natural language instructions to manage bot settings by resolving the exact key and executing the appropriate tool',
    {
        text: z.string().describe('Natural language instruction'),
        value: z.string().optional().describe('Value for update operations')
    },
    async ({ text, value }) => {
        const result = await tools['smart-bot-settings']({ text, value });
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(result)
            }]
        };
    }
);

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
    const httpIndex = args.findIndex(arg => arg === '--http');
    const helpIndex = args.findIndex(arg => arg === '--help' || arg === '-h');

    // Show help
    if (helpIndex !== -1) {
        console.log(`
Bot API MCP Server

Usage:
  bot-api                    # Run on stdio (default)
  bot-api --http             # Run on HTTP (port 3000)
  bot-api --http --port 8080 # Run on HTTP with custom port
  bot-api -p 8080 --http     # Same as above (short form)

Options:
  --http          Run server on HTTP instead of stdio
  --port, -p      Specify port number (default: 3000)
  --help, -h      Show this help message

Examples:
  bot-api                           # stdio mode
  bot-api --http                    # HTTP on port 3000
  bot-api --http --port 8080        # HTTP on port 8080
  bot-api --http -p 9000            # HTTP on port 9000
`);
        process.exit(0);
    }

    // Determine mode and port
    const useHttp = httpIndex !== -1;
    const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1]) : 3000;

    if (useHttp) {
        // HTTP mode - Create a simple HTTP API server
        console.error(`Bot API MCP Server starting on HTTP port ${port}`);
        console.error(`Access the server at: http://localhost:${port}`);
        console.error(`Health check: http://localhost:${port}/health`);

        const app = express();
        app.use(express.json());

        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                server: 'Bot API MCP Server',
                version: '1.0.0',
                timestamp: new Date().toISOString()
            });
        });

        // Serve basic info page
        app.get('/', (req, res) => {
            res.send(`
        <html>
          <head><title>Bot API MCP Server</title></head>
          <body>
            <h1>Bot API MCP Server</h1>
            <p>Server is running on port ${port}</p>
            <p>Available endpoints:</p>
            <ul>
              <li><a href="/health">/health</a> - Health check</li>
              <li>POST /api/tools/call - Call MCP tools</li>
              <li>GET /api/tools/list - List available tools</li>
            </ul>
            <p>Tools available: update-bot-settings, get-bot-settings, delete-bot-setting, test-bot-api-connection, smart-bot-settings</p>
          </body>
        </html>
      `);
        });

        // Serve tools endpoint
        app.post('/api/tools/call', (req: express.Request, res: express.Response) => {
            const { tool, args } = req.body;
            if (!tool || !args) {
                res.status(400).json({ error: 'Missing tool or arguments' });
                return;
            }
            if (!(tool in tools)) {
                res.status(400).json({ error: 'Unknown tool' });
                return;
            }
            Promise.resolve(tools[tool as keyof typeof tools](args))
                .then(result => { res.json(result); })
                .catch(error => { res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' }); });
        });

        // Serve tools list endpoint
        app.get('/api/tools/list', (req, res) => {
            res.json(Object.keys(tools));
        });

        app.listen(port, () => {
            console.error(`Bot API MCP Server started on port ${port}`);
        });
    } else {
        // Stdio mode - Use the existing server
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Bot API MCP Server running on stdio");
    }
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});