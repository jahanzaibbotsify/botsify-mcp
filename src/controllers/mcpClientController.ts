import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {SSEClientTransport} from "@modelcontextprotocol/sdk/client/sse.js";

import {Request, Response} from "express";

class MCPClientController {
    private mcp: Client;
    private transport: StreamableHTTPClientTransport | SSEClientTransport | null;
    private tools: any[];

    constructor() {
        this.mcp = new Client({name: "mcp-client", version: "1.0.0"});
        this.transport = null;
        this.tools = [];

        /**
         * Bind methods to the instance to ensure 'this' context is correct
         */
        this.connectToServer = this.connectToServer.bind(this);
        this.cleanup = this.cleanup.bind(this);
    }

    /**
     * Connect to a Model Context Protocol (MCP) server.
     * @param req
     * @param res
     */
    async connectToServer(req: Request, res: Response) {
        if (!req.body) {
            return res.status(400).json({error: "Missing request body"});
        }
        const {server_url, headers} = req.body as { server_url: string, headers?: Record<string, string> };

        if (!server_url) {
            return res.status(400).json({error: "Missing server_url parameter"});
        }

        try {
            const url = new URL(server_url);
            if (server_url.includes('/sse')) {
                this.transport = new SSEClientTransport(url, {
                    requestInit: {
                        headers: (headers || {}) as HeadersInit
                    }
                });
            } else {
                this.transport = new StreamableHTTPClientTransport(url, {
                    requestInit: {
                        headers: (headers || {}) as HeadersInit
                    }
                });
            }
            await this.mcp.connect(this.transport as unknown as any);

            this.setUpTransport();

            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool: any) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
            }));

            return res.json({message: "Connected successfully", tools: this.tools});
        } catch (error) {
            console.log("Failed to connect to MCP server: ", error);
            const message = error instanceof Error ? error.message : "Failed to connect to MCP server";
            return res.status(500).json({error: message});
        }
    }

    /**
     * Set up the transport for the MCP client.
     */
    setUpTransport() {
        try {
            if (this.transport === null) {
                return;
            }
            const transportWithHandlers = this.transport as unknown as {
                onclose?: (() => void) | null;
                onerror?: ((error: unknown) => void) | null;
            };

            transportWithHandlers.onclose = async () => {
                console.log("SSE transport closed.");
                await this.cleanup();
            };

            transportWithHandlers.onerror = async (error) => {
                console.log("SSE transport error: ", error);
                await this.cleanup();
            };
        } catch (error) {
            console.error("Error setting up transport:", error);
        }
    }

    /**
     * Clean up the MCP client and transport.
     */
    async cleanup() {
        try {
            await this.mcp.close();
        } catch (e) {
            console.error("Error during MCP cleanup:", e);
        }
    }
}

export default new MCPClientController();