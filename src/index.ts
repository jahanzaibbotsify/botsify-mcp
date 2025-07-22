import 'dotenv/config.js';
import express from "express";
import cors from "cors";
import {randomUUID} from "node:crypto";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {isInitializeRequest} from "@modelcontextprotocol/sdk/types.js";
import {toolsController} from "./controllers/toolsController.js";
import {registerAllTools} from "./tools/registry.js";
import {requestContextMiddleware} from "./utils/requestContext.js";
import {botSettingKeys} from "./tools/botSettingsTools";

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestContextMiddleware)

/**
 * Session store with metadata
 */
interface SessionRecord {
    sessionId: string;
    createdAt: number;
    updatedAt: number;
    deleteRequested: boolean;
    transport: StreamableHTTPServerTransport;
}

const sessions: { [sessionId: string]: SessionRecord } = {};

/**
 * Cleanup function to remove old sessions
 */
function cleanupOldSessions() {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    for (const sessionId in sessions) {
        const session = sessions[sessionId];
        if (session && session.updatedAt < now - tenMinutes) {
            delete sessions[sessionId];
        }
    }
}

setInterval(cleanupOldSessions, 60 * 1000); // Run every minute

/**
 * Create MCP server
 */
const server = new McpServer({
    name: "botsify-mcp-server",
    version: "1.0.0"
}, {
    capabilities: {
        tools: {}
    },
    instructions: `
    # Botsify MCP Server: Operations & API Tooling Guide
    
    Welcome to the Botsify Master Control Program (MCP) server. This interface provides secure, granular access to a suite of administrative functions for the management of Botsify chatbot assets, configurations, and team resources. Each API Tool serves specific intents. Where required, all user input constraints, confirmation steps, and authentication fields are strictly enforced. Instructions below must be adhered to exactly by any LLM agent or operator.
    
    ---
    
    ## Tool Catalog & Usage Policies
    
    **General Enforcement Principles:**
    - Always request and confirm all required user information before invoking any tool.
    - Never infer, autofill, or propagate unspecified field values.
    - Confirm destructive actions with explicit user permission.
    
    ---
    
    ### 1. Tools Overview
    Invoke available tools to perform mission-critical actions on the Botsify platform, including configuration updates, access management, and message delivery.
    
    ---
    
    ### 2. \`updateBotSettings\`
    - **Purpose:** Dynamically update configuration keys/values for a chatbot.
    - **Input:** Only accepted setting keys may be used; disregard unknown or empty keys.
    - **Policy:** Valid key list: \`${botSettingKeys.join(", ")}\`.
    
    ---
    
    ### 3. \`updateBotGeneralSettings\`
    - **Purpose:** Update selected general bot settings only.
    - **Input Constraints:**
      - Only update fields the user explicitly requests.
      - Omit any optional or empty fields not specified by the user.
    - **Fields:**
        - \`botStatus\` (boolean): Activate/deactivate if requested.
        - \`email\` (string): Comma-separated emails if specified by the user.
        - \`inactiveUrl\` (string): Webhook URL, only if provided by the user.
        - \`translation\` (boolean): Enable/disable translation if requested.
        - \`botsifyChatBotApiKey\` (string, required): Always required for authentication.
    - **DO NOT:** Populate defaults, empty strings, or unset false/undefined values.
    
    ---
    
    ### 4. \`getBotsifyChatBotApiKey\`
    - **Purpose:** Retrieve the Botsify ChatBot API key for authentication.
    
    ---
    
    ### 5. \`getTeamMembers\`
    - **Purpose:** Fetch team member roster for the chatbot workspace.
    
    ---
    
    ### 6. \`toggleBotAccessForTeamMember\`
    - **Purpose:** Enable or disable bot access for a designated team member.
    
    ---
    
    ### 7. \`resendInvitationToTeamMember\`
    - **Purpose:** Resend onboarding invitation to a specified team member.
    
    ---
    
    ### 8. \`toggleBotNotificationForTeamMember\`
    - **Purpose:** Toggle notification delivery status for a specified team member.
    
    ---
    
    ### 9. \`getTeamMember\`
    - **Purpose:** Retrieve details about a specific team member.
    
    ---
    
    ### 10. \`createTeamMember\`
    - **Purpose:** Provision a new team member in the Botsify workspace. **DO NOT:** Autogenerate or leave required fields blank. Always explicitly ask the user for these values.
    - **Required Fields:** 
        - \`name\` (string)
        - \`email\` (string)
        - \`role\` (must be one of: "editor", "admin", "live chat agent")
        - \`botsifyChatBotApiKey\` (string)
    - **DO NOT:** Autogenerate or leave required fields blank. Always explicitly ask the user for these values.
    
    ---
    
    ### 11. \`DeleteTeamMember\`
    - **Purpose:** Remove a team member from the bot workspace.
    - **Precondition:** User must explicitly confirm deletion (ask: "Do you really want to delete this team member?").
    - **Confirmation:** The \`confirm\` field **must** be provided by the user as \`true\`. It must **never** be assumed or autofilled. This action is irreversible.
    
    ---
    
    ### 12. \`clearBotData\`
    - **Purpose:** Permanently clear all bot instructions and user interactions as of the current date.
    - **Precondition:** User **must** confirm intent by providing the exact text: \`"DELETE DATA"\`.
    - **Confirmation:** The \`confirm\` field **must** be user-provided and never automated. Action is irreversible.
    
    ---
    
    ### 13. \`getChatBotMenu\`
    - **Purpose:** Retrieve the current chatbot menu structure.
    
    ---
    
    ### 14. \`setChatBotMenu\`
    - **Purpose:** Define the chatbot menu.
    - **Required Inputs:** An array of buttons (type: "postback" or "web_url", with title and response), and input field status.
    - **Dynamic Variables:** Responses can include template variables (e.g., \`{first_name}\`, \`{last_name}\`, \`{timezone}\`).
    
    ---
    
    ### 15. \`createPageMessage\`
    - **Purpose:** Post a page message (text/story) to URLs.
    - **Parameters:** 
        - \`url\` (string, comma-separated)
        - \`html\` (string, message text)
        - \`show_message_after\` ('scroll' \\| 'delay')
        - \`story\` (string, optional story ID)
        - \`timeout\` (int, ms)
        - \`type\` ('message' \\| 'story')
        - \`botsifyChatBotApiKey\` (string, required)
    
    ---
    
    ### 16. \`updatePageMessage\`
    - **Purpose:** Update existing page messages by ID.
    - **Precondition:** Always request explicit update confirmation from user prior to execution.
    - **Required Fields:** 
        - \`id\`, \`url\`, \`html\`, \`show_message_after\`, \`story\`, \`timeout\`, \`type\`, \`botsifyChatBotApiKey\`, \`confirm\` (must be \`true\`).
    
    ---
    
    ### 17. \`deletePageMessage\`
    - **Purpose:** Remove a specific page message by ID.
    - **Precondition:** Ask for, and require, explicit deletion confirmation.
    - **Required Inputs:** 
        - \`id\`, \`botsifyChatBotApiKey\`, \`confirm\` (must be \`true\`).
    
    ---
    
    ### 18. \`getAllPageMessages\`
    - **Purpose:** Fetch all current page messages.
    
    ---
    
    ### 19. \`getOfflineHours\`
    - **Purpose:** Fetch offline hours of chatbot.
    
    ---
    
    ### 20. \`setOfflineHours\`
    - **Purpose:** set offline hours for the chatbot.
    
    ---
    
    > **Critical Note:**  
    > All irreversible, destructive, or access-control actions require explicit, user-initiated confirmations (either boolean or strict text matches, as described). NEVER automate, autofill, or bypass confirmation requirements. All authentication fields (API keys) must be explicitly requested from the user when required.
    
    ---
    
    **End of MCP Server Tooling Guide.**  
    `
});

/**
 * Register all tools.
 */
registerAllTools(server)

/**
 * Get existing session transport or create new one.
 * @param sessionId
 */
async function getOrCreateTransport(sessionId: string | undefined) {
    if (sessionId && sessions[sessionId]) {
        sessions[sessionId].updatedAt = Date.now();
        return sessions[sessionId].transport;
    }
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
            sessions[id] = {
                sessionId: id,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                deleteRequested: false,
                transport,
            };
            console.log("Session initialized:", id);
        }
    });
    transport.onclose = () => {
        if (transport.sessionId) delete sessions[transport.sessionId];
    };
    await server.connect(transport);
    return transport;
}

/**
 * MCP post route.
 */
app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;
    if (sessionId && sessions[sessionId]) {
        sessions[sessionId].updatedAt = Date.now();
        transport = sessions[sessionId].transport;
    } else if (!sessionId && isInitializeRequest(req.body)) {
        try {
            transport = await getOrCreateTransport(undefined);
        } catch (error) {
            res.status(500).json({error: "Failed to create transport"});
            return;
        }
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
    try {
        await transport.handleRequest(req, res, req.body);
        if (sessionId && sessions[sessionId]) {
            sessions[sessionId].updatedAt = Date.now();
        }
    } catch (error) {
        res.status(500).json({error: "Failed to handle request"});
    }
});

/**
 * handle session request.
 * @param req
 * @param res
 */
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions[sessionId]) {
        res.status(400).send("Invalid or missing session ID");
        return;
    }
    const session = sessions[sessionId];
    session.updatedAt = Date.now();
    try {
        await session.transport.handleRequest(req, res);
        session.updatedAt = Date.now();
    } catch (error) {
        res.status(500).json({error: "Failed to handle session request"});
    }
};

app.get("/mcp", handleSessionRequest);

/**
 * Delete mcp session.
 */
app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions[sessionId]) {
        sessions[sessionId].deleteRequested = true;
        sessions[sessionId].updatedAt = Date.now();
        // delete sessions[sessionId];
        res.status(200).send("Session deleted");
    } else {
        res.status(400).send("Invalid session ID");
    }
});

app.get('/', (req, res) => {
    res.json({
        name: "botsify-mcp-server",
        version: "1.0.0",
        capabilities: {
            tools: [
                "updateBotSettings",
                "updateBotGeneralSettings",
                "getBotsifyChatBotApiKey",
                "getTeamMembers",
                "toggleBotAccessForTeamMember",
                "resendInvitationToTeamMember",
                "toggleBotNotificationForTeamMember",
                "getTeamMember",
                "createTeamMember",
                "updateTeamMember",
                "deleteTeamMember",
                "getOfflineHours",
                "setOfflineHours",
                "clearBotData",
                "getChatBotMenu",
                "setChatBotMenu",
                "createPageMessage",
                "updatePageMessage",
                "deletePageMessage",
                "getAllPageMessages"
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
    const parsedPort = portValue !== undefined ? parseInt(portValue, 10) : NaN;
    if (!isNaN(parsedPort)) port = parsedPort;
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