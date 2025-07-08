import {Request, Response} from 'express';
import {HttpRequestSchema, HttpResponse} from '../types/index.js';
import {botSettingsTools} from '../tools/botSettingsTools.js';
import {Logger} from '../utils/logger.js';
import {errorHandler} from '../middleware/errorHandler.js';

export class ToolsController {
    private logger: Logger;

    constructor() {
        this.logger = new Logger({service: 'ToolsController'});
    }

    /**
     * Call a specific tool
     */
    callTool = errorHandler.wrapAsync(async (req: Request, res: Response): Promise<void> => {
        const requestId = req.headers['x-request-id'] as string;
        const logger = this.logger.withContext({requestId});

        // Validate request body
        const validatedRequest = HttpRequestSchema.parse(req.body);
        const {tool, args} = validatedRequest;

        logger.info('Tool call request', {tool, args});

        // Check if a tool exists
        if (!this.isValidTool(tool)) {
            res.status(400).json({
                success: false,
                error: 'Invalid Tool',
                message: `Tool '${tool}' not found`,
                availableTools: this.getAvailableTools(),
                timestamp: new Date().toISOString(),
            });
            return;
        }

        try {
            // Execute the tool
            const result = await this.executeTool(tool, args);

            const response: HttpResponse = {
                success: true,
                data: result,
                timestamp: new Date().toISOString(),
            };

            logger.info('Tool execution successful', {tool, success: true});
            res.json(response);
        } catch (error) {
            logger.error('Tool execution failed', {
                tool,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error; // Let error handler middleware handle it
        }
    });

    /**
     * List available tools
     */
    listTools = errorHandler.wrapAsync(async (req: Request, res: Response): Promise<void> => {
        const requestId = req.headers['x-request-id'] as string;
        const logger = this.logger.withContext({requestId});

        logger.info('Tools list request');

        const tools = this.getAvailableTools();

        const response: HttpResponse = {
            success: true,
            data: {
                tools,
                count: tools.length,
                description: 'Available MCP tools for bot settings management',
            },
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    });

    /**
     * Get tool documentation
     */
    getToolDocs = errorHandler.wrapAsync(async (req: Request, res: Response): Promise<void> => {
        const {tool} = req.params;
        const requestId = req.headers['x-request-id'] as string;
        const logger = this.logger.withContext({requestId});

        logger.info('Tool documentation request', {tool});

        const docs = this.getToolDocumentation(tool || '');

        if (!docs) {
            res.status(404).json({
                success: false,
                error: 'Tool Not Found',
                message: `Documentation for tool '${tool}' not found`,
                timestamp: new Date().toISOString(),
            });
            return;
        }

        const response: HttpResponse = {
            success: true,
            data: docs,
            timestamp: new Date().toISOString(),
        };

        res.json(response);
    });

    /**
     * Check if a tool is valid
     */
    private isValidTool(tool: string): boolean {
        const validTools = this.getAvailableTools();
        return validTools.includes(tool);
    }

    /**
     * Get the list of available tools
     */
    private getAvailableTools(): string[] {
        return [
            'update-bot-settings',
        ];
    }

    /**
     * Execute a specific tool
     */
    private async executeTool(tool: string, args: Record<string, any>): Promise<any> {
        switch (tool) {
            case 'update-bot-settings':
                return await botSettingsTools.updateBotSettings(args as { key: string; value: string });
            default:
                throw new Error(`Unknown tool: ${tool}`);
        }
    }

    /**
     * Get tool documentation
     */
    private getToolDocumentation(tool: string): any {
        const docs: Record<string, any> = {
            'update-bot-settings': {
                name: 'update-bot-settings',
                description: 'Update bot settings using POST request to /bot/settings endpoint',
                parameters: {
                    key: {type: 'string', required: true, description: 'The setting key to update'},
                    value: {type: 'string', required: true, description: 'The new value for the setting'}
                },
                returns: {
                    success: {type: 'boolean', description: 'Whether the operation was successful'},
                    message: {type: 'string', description: 'Result message'},
                    data: {type: 'object', description: 'Updated settings data'}
                }
            }
        };

        return docs[tool] || null;
    }
}

// Export singleton instance
export const toolsController = new ToolsController(); 