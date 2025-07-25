import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {Request, Response} from "express";

class MCPClientController {
    private mcp: Client;
    private transport: StreamableHTTPClientTransport | null;
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
        const {server_url, headers} = req.body as { server_url: string, headers?: object };

        if (!server_url) {
            return res.status(400).json({error: "Missing server_url parameter"});
        }

        try {
            const url = new URL(server_url);
            this.transport = new StreamableHTTPClientTransport(url, {
                requestInit: {
                    // @ts-ignore
                    headers: headers || {}
                }
            });
            // @ts-ignore
            await this.mcp.connect(this.transport);
            this.setUpTransport();

            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool: any) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
            }));

            console.log("Connected to server with tools:", this.tools.map(({name}) => name));
            return res.json({message: "Connected successfully", tools: this.tools});
        } catch (error) {

            console.log("Failed to connect to MCP server: ", error);
            // @ts-ignore
            return res.status(500).json({error: error?.message || "Failed to connect to MCP server"});
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
            this.transport.onclose = async () => {
                console.log("SSE transport closed.");
                await this.cleanup();
            };

            this.transport.onerror = async (error) => {
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