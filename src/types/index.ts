import {z} from 'zod';

// Configuration interfaces
export interface BotApiConfig {
    baseUrl: string;
    authKey?: string;
    apikey?: string;
    timeout?: number;
}

export interface ServerConfig {
    port: number;
    useHttp: boolean;
    logLevel: string;
    environment: string;
}

// API Response interfaces
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    status?: number;
    statusText?: string;
    error?: string;
}


export interface HttpResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

// Logging types
export interface LogContext {
    requestId?: string;
    userId?: string;
    tool?: string;

    [key: string]: any;
}

export const UpdateBotSettingsSchema = z.object({
    key: z.string().min(1),
    value: z.string().min(1),
});

export const HttpRequestSchema = z.object({
    tool: z.string().min(1),
    args: z.record(z.any()),
});

// Error types
export class MCPError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public context?: Record<string, any>
    ) {
        super(message);
        this.name = 'MCPError';
    }
}

export class ValidationError extends MCPError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', 400, context);
        this.name = 'ValidationError';
    }
}

export class ApiError extends MCPError {
    constructor(message: string, statusCode: number = 500, context?: Record<string, any>) {
        super(message, 'API_ERROR', statusCode, context);
        this.name = 'ApiError';
    }
} 