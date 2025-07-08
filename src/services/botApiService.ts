import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { BotApiConfig, ApiResponse, ApiError } from '../types/index.js';
import { getBotApiConfig } from '../config/index.js';
import { Logger } from '../utils/logger.js';

export class BotApiService {
  private client: AxiosInstance;
  private config: BotApiConfig;
  private logger: Logger;

  constructor() {
    this.config = getBotApiConfig();
    this.logger = new Logger({ service: 'BotApiService' });
    
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 60000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.authKey && { Authorization: `Bearer ${this.config.authKey}` }),
      },
    });

    // Add a request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.url}`, {
          method: config.method,
          data: config.data,
        });
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Add a response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`Received response from ${response.config.url}`, {
          status: response.status,
          statusText: response.statusText,
        });
        return response;
      },
      (error) => {
        this.logger.error('Response interceptor error', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make a POST request to the Bot API
   */
  async makeRequest<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const requestData = { ...data, apikey: this.config.apikey };
      
      this.logger.info(`Making API request to ${endpoint}`, {
        endpoint,
        hasData: !!data,
      });

      const response: AxiosResponse<T> = await this.client.post(endpoint, requestData);

      return {
        success: true,
        data: response.data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  /**
   * Handle API errors and return standardized error response
   */
  private handleError(error: AxiosError): ApiResponse {
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unknown error occurred',
      status: 500,
      statusText: 'Internal Server Error',
    };

    if (error.response) {
      // Server responded with error status
      errorResponse.status = error.response.status;
      errorResponse.statusText = error.response.statusText;
      errorResponse.data = error.response.data;
      errorResponse.error = this.getErrorMessage(error.response.status, error.response.data);
      
      this.logger.error('API request failed with server error', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      // Request was made but no response received
      errorResponse.status = 0;
      errorResponse.statusText = 'No Response';
      errorResponse.error = 'No response received from server';
      
      this.logger.error('API request failed - no response received', {
        request: error.request,
      });
    } else {
      // Error in request setup
      errorResponse.error = error.message || 'Request setup failed';
      
      this.logger.error('API request setup failed', {
        message: error.message,
      });
    }

    return errorResponse;
  }

  /**
   * Get user-friendly error message based on status code and response data
   */
  private getErrorMessage(status: number, data?: any): string {
    switch (status) {
      case 400:
        return 'Bad request - invalid parameters provided';
      case 401:
        return 'Unauthorized - invalid API credentials';
      case 403:
        return 'Forbidden - insufficient permissions';
      case 404:
        return 'Resource not found';
      case 429:
        return 'Rate limit exceeded - please try again later';
      case 500:
        return 'Internal server error - please try again later';
      case 502:
        return 'Bad gateway - service temporarily unavailable';
      case 503:
        return 'Service unavailable - please try again later';
      default:
        return data?.message || data?.error || `HTTP ${status} error`;
    }
  }

  /**
   * Update bot settings
   */
  async updateBotSettings(key: string, value: string): Promise<ApiResponse> {
    return this.makeRequest('/bot/settings', { key, value });
  }
}

// Export singleton instance
export const botApiService = new BotApiService(); 