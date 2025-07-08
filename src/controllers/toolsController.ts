import { Request, Response } from 'express';
import { HttpRequestSchema, HttpResponse } from '../types/index.js';
import { botSettingsTools } from '../tools/botSettingsTools.js';
import { Logger } from '../utils/logger.js';
import { errorHandler } from '../middleware/errorHandler.js';
import Fuse from 'fuse.js';
import { BotSettingKey } from '../types/index.js';

// Import botSettingKeys from botSettingsTools (or define here if not exported)
import { botSettingKeys } from '../tools/botSettingsTools.js';

export class ToolsController {
  private logger: Logger;
  private fuse: Fuse<BotSettingKey>;

  constructor() {
    this.logger = new Logger({ service: 'ToolsController' });
    this.fuse = new Fuse(botSettingKeys, {
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
      keys: ['key', 'description', 'keywords']
    });
  }

  /**
   * Call a specific tool
   */
  callTool = errorHandler.wrapAsync(async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    const logger = this.logger.withContext({ requestId });

    // Validate request body
    const validatedRequest = HttpRequestSchema.parse(req.body);
    const { tool, args } = validatedRequest;

    logger.info('Tool call request', { tool, args });

    // Check if tool exists
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
      // Special handling for update-bot-settings: find best key
      if (tool === 'update-bot-settings' && args.key) {
        const fuseResults = this.fuse.search(args.key);
        const bestResult = fuseResults[0];
        if (bestResult && bestResult.score !== undefined && bestResult.score < 0.5 && bestResult.item?.key) {
          args.key = bestResult.item.key;
        }
      }
      // Execute the tool
      const result = await this.executeTool(tool, args);
      
      const response: HttpResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      logger.info('Tool execution successful', { tool, success: true });
      res.json(response);
    } catch (error) {
      logger.error('Tool execution failed', { tool, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error; // Let error handler middleware handle it
    }
  });

  /**
   * List available tools
   */
  listTools = errorHandler.wrapAsync(async (req: Request, res: Response): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;
    const logger = this.logger.withContext({ requestId });

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
    const { tool } = req.params;
    const requestId = req.headers['x-request-id'] as string;
    const logger = this.logger.withContext({ requestId });

    logger.info('Tool documentation request', { tool });

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
   * Check if tool is valid
   */
  private isValidTool(tool: string): boolean {
    const validTools = this.getAvailableTools();
    return validTools.includes(tool);
  }

  /**
   * Get list of available tools
   */
  private getAvailableTools(): string[] {
    return [
      'get-bot-settings',
      'update-bot-settings',
      'delete-bot-setting',
      'test-bot-api-connection',
      'smart-bot-settings',
    ];
  }

  /**
   * Execute a specific tool
   */
  private async executeTool(tool: string, args: Record<string, any>): Promise<any> {
    switch (tool) {
      case 'get-bot-settings':
        return await botSettingsTools.getBotSettings(args as { key?: string; value?: string });
      
      case 'update-bot-settings':
        return await botSettingsTools.updateBotSettings(args as { key: string; value: string });
      
      case 'delete-bot-setting':
        return await botSettingsTools.deleteBotSetting(args as { key: string });
      
      case 'test-bot-api-connection':
        return await botSettingsTools.testBotApiConnection();
      
      case 'smart-bot-settings':
        return await botSettingsTools.smartBotSettings(args as { text: string; value?: string });
      
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  /**
   * Get tool documentation
   */
  private getToolDocumentation(tool: string): any {
    const docs: Record<string, any> = {
      'get-bot-settings': {
        name: 'get-bot-settings',
        description: 'Get bot settings according to the provided parameters',
        parameters: {
          key: { type: 'string', required: false, description: 'Setting key to retrieve' },
          value: { type: 'string', required: false, description: 'Value filter for the setting' }
        },
        returns: {
          success: { type: 'boolean', description: 'Whether the operation was successful' },
          message: { type: 'string', description: 'Result message' },
          data: { type: 'object', description: 'Retrieved settings data' }
        }
      },
      'update-bot-settings': {
        name: 'update-bot-settings',
        description: 'Update bot settings using POST request to /bot/settings endpoint',
        parameters: {
          key: { type: 'string', required: true, description: 'The setting key to update' },
          value: { type: 'string', required: true, description: 'The new value for the setting' }
        },
        returns: {
          success: { type: 'boolean', description: 'Whether the operation was successful' },
          message: { type: 'string', description: 'Result message' },
          data: { type: 'object', description: 'Updated settings data' }
        }
      },
      'delete-bot-setting': {
        name: 'delete-bot-setting',
        description: 'Delete a specific bot setting using POST request to /bot/settings endpoint',
        parameters: {
          key: { type: 'string', required: true, description: 'The setting key to delete' }
        },
        returns: {
          success: { type: 'boolean', description: 'Whether the operation was successful' },
          message: { type: 'string', description: 'Result message' },
          data: { type: 'object', description: 'Deletion result data' }
        }
      },
      'test-bot-api-connection': {
        name: 'test-bot-api-connection',
        description: 'Test the connection to the bot API using POST request to /bot/settings endpoint',
        parameters: {},
        returns: {
          success: { type: 'boolean', description: 'Whether the connection test was successful' },
          message: { type: 'string', description: 'Result message' },
          data: { type: 'object', description: 'Connection test data' }
        }
      },
      'smart-bot-settings': {
        name: 'smart-bot-settings',
        description: 'Process natural language instructions to manage bot settings by resolving the exact key and executing the appropriate tool',
        parameters: {
          text: { type: 'string', required: true, description: 'Natural language instruction' },
          value: { type: 'string', required: false, description: 'Value for update operations' }
        },
        returns: {
          success: { type: 'boolean', description: 'Whether the operation was successful' },
          intent: { type: 'string', description: 'Detected intent (get/update/delete)' },
          key: { type: 'string', description: 'Resolved setting key' },
          value: { type: 'string', description: 'Extracted or provided value' },
          confidence: { type: 'number', description: 'Confidence score for the match' },
          message: { type: 'string', description: 'Result message' },
          possibleMatches: { type: 'array', description: 'Possible matches if confidence is low' }
        }
      }
    };

    return docs[tool] || null;
  }
}

// Export singleton instance
export const toolsController = new ToolsController(); 