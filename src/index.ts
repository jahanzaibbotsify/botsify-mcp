import 'dotenv/config';
import express from "express";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {z} from "zod";
import {botSettingKeys, botSettingsTools} from "./tools/botSettingsTools.js";
import {toolsController} from "./controllers/toolsController.js";
import {requestContextMiddleware, setValue} from "./utils/requestContext";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/registry.js";

const app = express();
app.use(express.json());
app.use(requestContextMiddleware)

/**
 * Create the MCP server instance and register your tools
 */
const server = new McpServer({
    name: "botsify-mcp-server",
    version: "1.0.0"
});

registerAllTools(server);

/**
 * --- Stateless MCP POST endpoint ---
 */
app.post("/mcp", async (req, res) => {
    /**
     * For every request, create fresh transport and connect it
     */
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
    });

    /**
     * Clean up after response closes
     */
    res.on("close", () => {
        transport.close();
    });
    await server.connect(transport);

    try {
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: "2.0",
                error: {
                    code: -32603,
                    message: "Internal server error"
                },
                id: req.body?.id ?? null
            });
        }
    }
});

/**
 * --- Stateless: GET/DELETE = not allowed ---
 */
app.get("/mcp", (req, res) => {
    res.status(405).json({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    });
});

app.delete("/mcp", (req, res) => {
    res.status(405).json({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    });
});

/**
 * --- MCP Server Info and Tools Endpoints ---
 */
app.get('/', (req, res) => {
    res.json({
        name: "botsify-mcp-server",
        version: "1.0.0",
        capabilities: {
            tools: [
                "update-bot-settings",
                "respond"
            ]
        }
    });
});
app.get("/tools", toolsController.listTools);
app.post("/tools/call", toolsController.callTool);
app.get("/tools/:tool/docs", toolsController.getToolDocs);

/**
 * Command line options and server launch
 */
const argv = process.argv.slice(2);
const useStdio = argv.includes("--stdio");

if (useStdio) {
    // Use stdio transport for MCP
    const transport = new StdioServerTransport();
    server.connect(transport);
    // No HTTP server needed in stdio mode
} else {
    const portArgIndex = argv.findIndex(arg => arg === "--port");
    let port = process.env.PORT;
    if (portArgIndex !== -1) {
        const portValue = argv[portArgIndex + 1];
        if (typeof portValue === 'string') {
            const parsedPort = parseInt(portValue, 10);
            if (!isNaN(parsedPort)) port = String(parsedPort);
        }
    }
    app.listen(port, () => {
        console.log(`MCP stateless server running on http://localhost:${port}/mcp`);
    });
}