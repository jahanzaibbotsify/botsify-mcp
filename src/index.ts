import 'dotenv/config';
import express from "express";
import cors from "cors";
import {randomUUID} from "node:crypto";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {isInitializeRequest} from "@modelcontextprotocol/sdk/types.js";
import {z} from "zod";
import {botSettingKeys, botSettingsTools} from "./tools/botSettingsTools.js";
import { toolsController } from "./controllers/toolsController.js";

const app = express();
app.use(cors());
app.use(express.json());

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

const server = new McpServer({
    name: "botsify-mcp-server",
    version: "1.0.0"
});

server.registerTool(
    "update-bot-settings",
    {
        description: `This tool allows clients to update the bot’s configuration settings dynamically by specifying a valid key and its corresponding value. To ensure proper functionality, the key must match one of the accepted bot setting keys. Valid keys include: ${botSettingKeys.join(", ")}.`,
        inputSchema: {
            key: z.string(),
            value: z.string(),
        }
    },
    async ({key, value}: { key: string; value: string }) => {
        const result = await botSettingsTools.updateBotSettings({key, value});
        return {
            content: [
                {
                    type: "text",
                    text: result.message + (result.data ? `\n${JSON.stringify(result.data)}` : ""),
                },
            ],
        };
    }
);

server.registerTool(
    "respond",
    {
        description: "Respond to user input with a helpful message (OpenAI-compatible).",
        inputSchema: {
            text: z.string(),
        }
    },
    async function (this: any, {text}: { text: string }) {
        const response = await this.createMessage({
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text,
                    },
                },
            ],
            maxTokens: 500,
        });
        return {
            content: [
                {
                    type: "text",
                    text: response.content.type === "text" ? response.content.text : "Unable to generate response",
                },
            ],
        };
    }
);

async function getOrCreateTransport(sessionId: string | undefined) {
    if (sessionId && transports[sessionId]) return transports[sessionId];
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
            transports[id] = transport;
            console.log("Session initialized:", id);
        }
    });
    transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
    };
    await server.connect(transport);
    return transport;
}

app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = await getOrCreateTransport(undefined);
    } else {
        res.status(400).json({
            jsonrpc: "2.0",
            error: {
                code: -32000,
                message: "Bad Request: No valid session ID provided"
            },
            id: null
        });
        return;
    }
    await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
    }
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};
app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);

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

// Parse command line arguments
const argv = process.argv.slice(2);
const useHttp = argv.includes("--http");
const portArgIndex = argv.findIndex(arg => arg === "--port");
let port = 3000;
if (portArgIndex !== -1) {
    const portValue = argv[portArgIndex + 1];
    if (typeof portValue === 'string') {
        const parsedPort = parseInt(portValue, 10);
        if (!isNaN(parsedPort)) port = parsedPort;
    }
}

if (useHttp) {
    app.listen(port, () => {
        console.log(`MCP server running on http://localhost:${port}/mcp`);
    });
} else {
    (async () => {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Bot API MCP Server running on stdio");
    })();
}
