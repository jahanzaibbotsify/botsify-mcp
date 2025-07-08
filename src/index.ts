import 'dotenv/config';
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {z} from "zod";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";

import {validateConfig, getServerConfig, isDevelopment} from './config/index.js';
import {defaultLogger, logError, logInfo} from './utils/logger.js';
import {botSettingKeys, botSettingsTools} from './tools/botSettingsTools.js';
import {toolsController} from './controllers/toolsController.js';
import {errorHandler} from './middleware/errorHandler.js';

/**
 * Main entry point for the Botsify MCP Server
 */
const server = new McpServer({
    name: "botsify-mcp-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

/**
 * Global request count map for rate limiting
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_POINTS = 100;
const RATE_LIMIT_DURATION = 60000; // 60 seconds in milliseconds

/**
 * Register MCP tools for the Botsify server
 */
const registerMcpTools = () => {
    // Get bot settings tool
    server.tool(
        "get-bot-settings",
        "Get bot settings according to the provided parameters.",
        {
            key: z.string().optional().describe("Setting key to retrieve"),
            value: z.string().optional().describe("Value filter for the setting")
        },
        async ({key, value}) => {
            try {
                const result = await botSettingsTools.getBotSettings({
                    key: key || undefined,
                    value: value || undefined
                } as { key?: string; value?: string });
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    }]
                };
            } catch (error) {
                logError('Error in get-bot-settings tool', error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
        }
    );

    /**
     * Update bot settings tool
     */
    server.tool(
        "update-bot-settings",
        `Update bot settings using POST request to /bot/settings endpoint.
  
        ✅ Allowed setting keys (${botSettingKeys.length} total):
          ${botSettingKeys.join(", ")}...
          (full list is validated internally)
        `,
        {
            key: z.string().describe("The setting key to update"),
            value: z.string().describe("The new value for the setting")
        },
        async ({key, value}) => {
            try {
                const result = await botSettingsTools.updateBotSettings({key, value});
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    }]
                };
            } catch (error) {
                logError('Error in update-bot-settings tool', error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
        }
    );

    /**
     * Delete bot setting tool
     */
    server.tool(
        "delete-bot-setting",
        "Delete a specific bot setting using POST request to /bot/settings endpoint",
        {
            key: z.string().describe("The setting key to delete")
        },
        async ({key}) => {
            try {
                const result = await botSettingsTools.deleteBotSetting({key});
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    }]
                };
            } catch (error) {
                logError('Error in delete-bot-setting tool', error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
        }
    );

    /**
     * Test bot API connection tool
     */
    server.tool(
        "test-bot-api-connection",
        "Test the connection to the bot API using POST request to /bot/settings endpoint",
        {},
        async () => {
            try {
                const result = await botSettingsTools.testBotApiConnection();
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    }]
                };
            } catch (error) {
                logError('Error in test-bot-api-connection tool', error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
        }
    );

    /**
     * Smart bot settings tool
     */
    server.tool(
        'smart-bot-settings',
        'Process natural language instructions to manage bot settings by resolving the exact key and executing the appropriate tool',
        {
            text: z.string().describe('Natural language instruction'),
            value: z.string().optional().describe('Value for update operations')
        },
        async ({text, value}) => {
            try {
                const result = await botSettingsTools.smartBotSettings({
                    text,
                    value: value || undefined
                } as { text: string; value?: string });
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (error) {
                logError('Error in smart-bot-settings tool', error instanceof Error ? error : new Error(String(error)));
                throw error;
            }
        }
    );
};

/**
 * Create and configure the HTTP server
 * @param port
 */
const createHttpServer = (port: number) => {
    const app = express();

    // Security middleware
    app.use(helmet());
    app.use(cors());
    app.use(compression());
    app.use(express.json({limit: '10mb'}));
    app.use(express.urlencoded({extended: true, limit: '10mb'}));

    /**
     * Middleware to add a unique request ID to each request
     */
    app.use((req, res, next) => {
        req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        next();
    });

    /**
     * Rate limiting middleware
     */
    app.use((req, res, next) => {
        const ip = req.ip || 'unknown';
        const now = Date.now();
        const userRequests = requestCounts.get(ip);

        if (!userRequests || now > userRequests.resetTime) {
            requestCounts.set(ip, {count: 1, resetTime: now + RATE_LIMIT_DURATION});
            next();
        } else if (userRequests.count >= RATE_LIMIT_POINTS) {
            res.status(429).json({
                success: false,
                error: 'Rate Limit Exceeded',
                message: 'Too many requests, please try again later',
                retryAfter: Math.round((userRequests.resetTime - now) / 1000),
                timestamp: new Date().toISOString(),
            });
        } else {
            userRequests.count++;
            next();
        }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            server: 'Botsify MCP Server',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
        });
    });

    // Root endpoint with documentation
    app.get('/', (req, res) => {
        res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Botsify MCP Server</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { font-weight: bold; color: #007cba; }
            .url { font-family: monospace; background: #e9e9e9; padding: 2px 5px; border-radius: 3px; }
            .description { color: #666; margin-top: 5px; }
          </style>
        </head>
        <body>
          <h1>🤖 Botsify MCP Server</h1>
          <p>Model Context Protocol server for Botsify API integration</p>
          
          <h2>📊 Status</h2>
          <div class="endpoint">
            <div class="method">GET</div>
            <div class="url">/health</div>
            <div class="description">Health check endpoint</div>
          </div>

          <h2>🛠️ API Endpoints</h2>
          <div class="endpoint">
            <div class="method">POST</div>
            <div class="url">/api/tools/call</div>
            <div class="description">Call a specific MCP tool</div>
          </div>
          
          <div class="endpoint">
            <div class="method">GET</div>
            <div class="url">/api/tools/list</div>
            <div class="description">List all available tools</div>
          </div>
          
          <div class="endpoint">
            <div class="method">GET</div>
            <div class="url">/api/tools/docs/:tool</div>
            <div class="description">Get documentation for a specific tool</div>
          </div>

          <h2>🔧 Available Tools</h2>
          <ul>
            <li><strong>get-bot-settings</strong> - Retrieve bot settings</li>
            <li><strong>update-bot-settings</strong> - Update bot settings</li>
            <li><strong>delete-bot-setting</strong> - Delete a bot setting</li>
            <li><strong>test-bot-api-connection</strong> - Test API connection</li>
            <li><strong>smart-bot-settings</strong> - Natural language bot settings management</li>
          </ul>

          <h2>📝 Example Usage</h2>
          <pre>
          <code>curl -X POST http://localhost:${port}/api/tools/call \\
              -H "Content-Type: application/json" \\
              -d '{
                "tool": "get-bot-settings",
                "args": { "key": "website-chatbot-primary-color" }
              }'
              </code>
              </pre>

          <p><em>Server running on port ${port}</em></p>
        </body>
      </html>
    `);
    });

    // API routes
    app.post('/api/tools/call', toolsController.callTool);
    app.get('/api/tools/list', toolsController.listTools);
    app.get('/api/tools/docs/:tool', toolsController.getToolDocs);

    // 404 handler
    app.use(errorHandler.handleNotFound);

    // Error handling middleware (must be last)
    app.use(errorHandler.handleError);

    return app;
};

// Parse command line arguments
const parseArgs = () => {
    const args = process.argv.slice(2);
    const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
    const httpIndex = args.findIndex(arg => arg === '--http');
    const helpIndex = args.findIndex(arg => arg === '--help' || arg === '-h');

    // Show help
    if (helpIndex !== -1) {
        console.error(`
🤖 Botsify MCP Server

Usage:
  npm start                    # Run on stdio (default)
  npm start -- --http         # Run on HTTP (port 3000)
  npm start -- --http --port 8080 # Run on HTTP with custom port
  npm start -- -p 8080 --http     # Same as above (short form)

Options:
  --http          Run server on HTTP instead of stdio
  --port, -p      Specify port number (default: 3000)
  --help, -h      Show this help message

Examples:
  npm start                           # stdio mode
  npm start -- --http                # HTTP on port 3000
  npm start -- --http --port 8080    # HTTP on port 8080
  npm start -- --http -p 9000        # HTTP on port 9000

Environment Variables:
  BOTSIFY_API_BASE_URL    Base URL for Botsify API
  BOTSIFY_API_KEY         API key for authentication
  BOTSIFY_BOT_ID          Bot ID for API requests
  PORT                    HTTP server port (default: 3000)
  LOG_LEVEL               Logging level (default: info)
  NODE_ENV                Environment (development/production/test)
`);
        process.exit(0);
    }

    return {
        useHttp: httpIndex !== -1,
        port: portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1] || '3000') : 3000,
    };
};

// Add this flag to prevent multiple shutdowns
let shuttingDown = false;

// Graceful shutdown handler
const setupGracefulShutdown = (server?: any) => {
    const shutdown = (signal: string) => {
        if (shuttingDown) return; // Prevent multiple shutdowns
        shuttingDown = true;
        logInfo(`Received ${signal}, shutting down gracefully...`);
        if (server) {
            server.close(() => {
                logInfo('HTTP server closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

// Main function
async function main() {
    try {
        // Validate configuration
        validateConfig();

        // Parse command line arguments
        const {useHttp, port} = parseArgs();

        // Register MCP tools
        registerMcpTools();

        if (useHttp) {
            // HTTP mode
            logInfo(`Starting Botsify MCP Server in HTTP mode on port ${port}`);

            const app = createHttpServer(port);
            const httpServer = app.listen(port, () => {
                logInfo(`🚀 Botsify MCP Server started on HTTP port ${port}`);
                logInfo(`📊 Health check: http://localhost:${port}/health`);
                logInfo(`📚 API docs: http://localhost:${port}/`);
            });

            setupGracefulShutdown(httpServer);
        } else {
            // Stdio mode
            logInfo('Starting Botsify MCP Server in stdio mode');

            const transport = new StdioServerTransport();
            await server.connect(transport);

            logInfo('✅ Botsify MCP Server running on stdio');
            setupGracefulShutdown();
        }
    } catch (error) {
        logError('Fatal error in main()', error instanceof Error ? error : new Error(String(error)));
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logError('Uncaught Exception', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection', new Error(`Promise: ${promise}, Reason: ${reason}`));
    process.exit(1);
});

// Start the server
main().catch((error) => {
    logError('Failed to start server', error);
    process.exit(1);
}); 