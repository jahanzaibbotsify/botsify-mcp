import {botSettingKeys} from "../tools/botSettingsTools";

export const instructions: string = `
Welcome to the Botsify Model Context Protocol (MCP) server. This interface provides secure, granular, and scalable access to administrative functions for managing Botsify chatbot (also referred to as "Agent") assets, configurations, team resources, and analytics. The terms "Agent" and "Chatbot" are interchangeable and refer to the same entity throughout this guide. Each API tool serves specific intents with strict input validation, authentication, and confirmation protocols. Instructions must be followed precisely by all LLM agents and operators.

Enhanced Enforcement Principles

Strict Input Validation: All inputs must conform to specified formats and constraints. Invalid or unspecified inputs are rejected with detailed error messages.
Explicit User Confirmation: Destructive or sensitive actions require explicit user confirmation (boolean or exact text match). Never assume or autofill confirmations.
Audit Logging: All actions are logged with user ID, timestamp, and action details for traceability.
Rate Limiting: API calls are rate-limited to prevent abuse (default: 100 requests/minute per user).
Error Handling: Tools return detailed error codes and messages for invalid inputs or failed operations.
Terminology: References to "Agent" or "Chatbot" denote the same Botsify-managed conversational entity.


Tool Catalog & Usage Policies
1. Tools Overview
The MCP server provides a suite of tools for mission-critical operations, including configuration management, access control, message delivery, analytics, and backup/restore functionality for Botsify Agents (Chatbots). Each tool is designed for specific intents and enforces strict input and authentication requirements.

2. updateBotSettings

Purpose: Dynamically update configuration key/value pairs for a Chatbot (Agent).
Input Constraints:
Only accept keys from the predefined botSettingKeys list: ${botSettingKeys.join(", ")}.
Reject unknown, empty, or malformed keys with error code INVALID_KEY.


Parameters:
settings (object): Key/value pairs to update.


Validation: Validate each key against botSettingKeys and ensure values match expected types (e.g., string, boolean, number).
Error Handling: Return 400 Bad Request with specific error messages for invalid inputs.


3. updateBotGeneralSettings

Update specific general settings for a Botsify Chatbot (also referred to as "Agent").
 - Only update fields explicitly requested by the user.
 - Reject unspecified, empty, or invalid fields with detailed error messages.
 - Do NOT infer, autofill, or propagate default, empty string, or false /undefined values unless explicitly provided by the user.
 - Validate all inputs against strict constraints (e.g., email format, URL protocol).
 - This action applies to the Chatbot/Agent 's operational configuration and is logged for auditing.
 - Don't pass those fields that are not requested user in Request.

    Fields:
    - botStatus (boolean, optional): Set to true to activate or false to deactivate the Chatbot/Agent. Include only if explicitly requested.
    - email (string, optional): Comma-separated valid email addresses (e.g., "user1@domain.com,user2@domain.com"). Include only if explicitly requested. Must match email format.
    - inactiveUrl (string, optional): Webhook URL for inactive state. Include only if explicitly requested. Must start with "https://".
    - translation (boolean, optional): Enable (true) or disable (false) translation feature. Include only if explicitly requested.
    
    Validation Rules:
    - Email addresses must match regex: ^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$.
    - inactiveUrl must be a valid HTTPS URL.
    - Empty strings or null values are rejected for all fields.
    - Unspecified fields are not updated or included in the request.
    
    Never update or include unspecified or not requested fields or bypass validation.


4. getBotsifyChatBotApiKey

Purpose: Retrieve the Botsify ChatBot (Agent) API key for authentication.
Output: Returns a secure API KEY.
Error Handling: Return 401 Unauthorized if authentication fails.


5. getTeamMembers

Purpose: Fetch the roster of team members in the Chatbot (Agent) workspace.
Output: JSON array of team members with fields: name, email, role, status (active/inactive).
Error Handling: Return 403 Forbidden if API key is invalid.


6. toggleBotAccessForTeamMember

Purpose: Enable or disable Chatbot (Agent) access for a specific team member.
Parameters:
memberId (string, required): Unique team member ID.
access (boolean, required): true to enable, false to disable.


Validation: Verify memberId exists in the workspace.
Error Handling: Return 404 Not Found if memberId is invalid.


7. resendInvitationToTeamMember

Purpose: Resend onboarding invitation to a specified team member.
Parameters:
memberId (string, required): Unique team member ID.


Validation: Ensure the member has a pending invitation.
Error Handling: Return 409 Conflict if no pending invitation exists.


8. toggleBotNotificationForTeamMember

Purpose: Toggle notification delivery status for a team member for the Chatbot (Agent).
Parameters:
memberId (string, required): Unique team member ID.
notifications (boolean, required): true to enable, false to disable.


Validation: Verify memberId exists.
Error Handling: Return 404 Not Found if memberId is invalid.


9. getTeamMember

Purpose: Retrieve details for a specific team member.
Parameters:
memberId (string, required): Unique team member ID.


Output: JSON object with id, name, email, role, status, lastActive.
Error Handling: Return 404 Not Found if memberId is invalid.


10. createTeamMember

Provide Details: Enter the team member’s full name, a valid email address, and their role.
Role Selection: Choose one of:
editor (agent: "0"): Can edit content and settings.
admin (agent: "1"): Full access to manage team and system.
live chat agent (agent: "2"): Handles live chat interactions.


Mandatory Fields: Name, email, and role cannot be blank or auto-generated.

Payload Format

Example: {"name": "Alice Smith", "email": "alice@example.com", "agent": "1"}

Examples

Add Editor:
Input: "Create team member Alice Smith, alice@example.com, editor"
Payload: {"name": "Alice Smith", "email": "alice@example.com", "agent": "0"}


Add Admin:
Input: "Add Bob Johnson, bob@example.com, admin"
Payload: {"name": "Bob Johnson", "email": "bob@example.com", "agent": "1"}


Add Live Chat Agent:
Input: "New member Carol Lee, carol@example.com, live chat agent"
Payload: {"name": "Carol Lee", "email": "carol@example.com", "agent": "2"}



Validation

Name: Must be a non-empty string. Invalid: "" → "Name is required."
Email: Must be a valid email format. Invalid: "alice@" → "Invalid email address."
Role: Must be "0" (editor), "1" (admin), or "2" (live chat agent). Invalid: "3" → "Role must be editor, admin, or live chat agent."


11. deleteTeamMember

Identify Member: Provide either memberId or email to locate the team member. One is mandatory.
Confirm Deletion: Set confirm: true only after explicitly asking the user to confirm (e.g., "Are you sure you want to delete this team member?"). Never assume or auto-set confirmation.
Irreversible Action: Deletion cannot be undone; ensure accuracy before proceeding.

Payload Format

Example: {"memberId": "12345", "confirm": true}
Or: {"email": "alice@example.com", "confirm": true}

Examples

Delete by Member ID with Confirmation:
Input: "Delete team member 12345, confirm"
Payload: {"memberId": "12345", "confirm": true}


Delete by Email with Confirmation:
Input: "Remove bob@example.com, confirm"
Payload: {"email": "bob@example.com", "confirm": true}


No Confirmation Provided:
Input: "Delete team member 67890"
Response: "Confirmation required. Set confirm: true after user verification."



Validation

Identifier: Must provide memberId or email. Invalid: both missing → "Provide memberId or email."
Confirm: Must be true. Invalid: false or omitted → "You must explicitly confirm with the user before proceeding with deletion."
Email Format: If provided, must be valid. Invalid: "bob@" → "Invalid email address."



****updateTeamMember***

Identify Member: Provide either userId or email to locate the team member. One is required.
Update Fields:
name: Set the new full name (non-empty string).
agent: Choose the new role:
0: Editor (content and settings access).
1: Admin (full system and team management).
2: Live Chat Agent (handles live chat).

Confirmation: Set confirm: true to authorize the update. If false or omitted, the update will not proceed.

Payload Format

Example: {"userId": "12345", "name": "Alice Smith", "agent": "1", "confirm": true}
Or: {"email": "alice@example.com", "name": "Alice Smith", "agent": "2", "confirm": true}

Examples

Update Name and Role by User ID:
Input: "Update user 12345 to name Alice Smith, role admin, confirm"
Payload: {"userId": "12345", "name": "Alice Smith", "agent": "1", "confirm": true}

Update Name and Role by Email:
Input: "Change bob@example.com to Bob Johnson, live chat agent, confirm"
Payload: {"email": "bob@example.com", "name": "Bob Johnson", "agent": "2", "confirm": true}

No Confirmation:
Input: "Update user 67890 to Carol Lee, editor"
Response: "Confirmation required. Set confirm: true."

Validation

Identifier: Must provide userId or email. Invalid: both missing → "Provide userId or email."
Name: Non-empty string. Invalid: "" → "Name is required."
Agent: Must be "0" (editor), "1" (admin), or "2" (live chat agent). Invalid: "3" → "Role must be editor, admin, or live chat agent."
Confirm: Must be true. Invalid: false or omitted → "Confirmation required. Set confirm: true."
Email Format: If provided, must be valid. Invalid: "bob@" → "Invalid email address."



12. clearBotData

PERMANENTLY erase all chatbot data or agent data associated with this user, up to today.
**This operation cannot be undone.**

The user must confirm this action by explicitly providing the text 'DELETE DATA' in the 'confirmation' field.
If confirmation is missing or incorrect, you must NOT clear data—inform the user and request explicit confirmation first.

Only proceed if confirmation matches exactly 'DELETE DATA' (case sensitive).


13. getChatBotMenu

Purpose: Retrieve the current Chatbot (Agent) menu structure.
Output: JSON array of menu items with id, title, type (postback or web_url), response, and status.
Error Handling: Return 403 Forbidden if API key is invalid.

14. setChatBotMenu

Check Existing Menu: Always call the getChatbotMenu tool first to retrieve the current menu (buttons and input_field settings).
Update or Create:
If a menu exists, append new buttons to the existing buttons array and update the record.
If no menu exists, create a new one with the provided buttons.


Define Buttons: Add to the buttons array:
type: "postback" (triggers bot action) or "web_url" (opens URL).
title: Button label (e.g., "Contact Us").
response:
For postback: Action/message with variables like {first_name}, {last_name}, {timezone}, {gender}, {last_user_msg}, {last_page}, {os}, {user/last_user_button}, {user/last_user_message}, {user/last_user_message_time}, {user/created_at}, or {user/referrer_domain}.
For web_url: Valid URL (e.g., "https://example.com").


api: Set to 1 (default).
error: Set to false (default).


Input Field: Set input_field:
true: Disable input field (menu-only).
false: Enable input field for text input.

Payload Format

Example (updating existing menu): {"buttons": [...existingButtons, {"type": "postback", "title": "Greet {first_name}", "response": "Hello, {first_name}!", "api": 1, "error": false}], "input_field": false, "botsifyChatBotApiKey": "your-api-key"}

Examples

Add Postback Button to Existing Menu:
Input: "Add button 'Greet User' as postback saying 'Hi, {first_name}!', disable input, API key abc123"
Steps: Call getChatbotMenu, append to existing buttons.
Payload (assuming existing [{type: "web_url", title: "Shop", ...}]): {"buttons": [{"type": "web_url", "title": "Shop", "response": "https://store.example.com", "api": 1, "error": false}, {"type": "postback", "title": "Greet User", "response": "Hi, {first_name}!", "api": 1, "error": false}], "input_field": true, "botsifyChatBotApiKey": "abc123"}


Create New Menu with Web URL Button:
Input: "Set menu with button 'Visit Blog' linking to https://example.com/blog, enable input, API key xyz789"
Steps: getChatbotMenu returns empty, create new.
Payload: {"buttons": [{"type": "web_url", "title": "Visit Blog", "response": "https://example.com/blog", "api": 1, "error": false}], "input_field": false, "botsifyChatBotApiKey": "xyz789"}


Update with Multiple Buttons:
Input: "Add postback 'Support' saying 'Help for {first_name}', keep existing buttons, disable input, API key abc123"
Steps: Call getChatbotMenu, append to existing buttons.
Payload (assuming existing [{type: "web_url", title: "Shop", ...}]): {"buttons": [{"type": "web_url", "title": "Shop", "response": "https://store.example.com", "api": 1, "error": false}, {"type": "postback", "title": "Support", "response": "Help for {first_name}", "api": 1, "error": false}], "input_field": true, "botsifyChatBotApiKey": "abc123"}



Validation

Buttons: Non-empty array. Invalid: [] → "At least one button required."
Type: Must be "postback" or "web_url". Invalid: "link" → "Use 'postback' or 'web_url'."
Title: Non-empty string. Invalid: "" → "Button title required."
Response:
postback: Non-empty string, supports variables. Invalid: "" → "Response required for postback."
web_url: Valid URL. Invalid: "example.com" → "Use valid URL (e.g., https://example.com)."
Input Field: Boolean. Invalid: "yes" → "Use true or false."


15. createPageMessage
Specify URLs: Provide a comma-separated list of URLs where the message will appear (e.g., "https://example.com,https://example.com/about").
Message Content:
For text messages: Set message with the text to display (e.g., "Welcome, !").


Display Trigger: Choose show_message_after:
scroll: Message appears after scrolling a specified distance.
delay: Message appears after a time delay (in milliseconds).


Timing: Set timeout:
For scroll: Scroll distance (in percent) before showing the message.
For delay: Delay time (in seconds).

Examples

Text Message with Delay:
Input: "Create message for https://example.com, text 'Welcome, ...!', show after 3s delay, API key abc123"
Payload: {"url": "https://example.com", "message": "Welcome, ...!", "show_message_after": "delay", "timeout": 3000, "type": "message", "botsifyChatBotApiKey": "abc123"}


Story Message with Scroll:
Input: "Set story story123 for https://example.com/about, show after 500px scroll, API key xyz789"
Payload: {"url": "https://example.com/about", "story": "story123", "show_message_after": "scroll", "timeout": 500, "type": "story", "botsifyChatBotApiKey": "xyz789"}

Validation

URL: Must be valid, comma-separated URLs. Invalid: "example.com" → "Use valid URLs (e.g., https://example.com)."
Message: Required for type: "message". Invalid: empty for message type → "Message is required for type 'message'."
Show Message After: Must be "scroll" or "delay". Invalid: "hover" → "Use 'scroll' or 'delay'."
Timeout: Must be a positive number. Invalid: -100 → "Timeout must be a positive number."



16. updatePageMessage

Identify Message: Provide the id of the page message to update.
Update Fields:
url: Comma-separated list of URLs (e.g., "https://example.com,https://example.com/about").
message: Text to display for type: "message" (e.g., "Hi!").
show_message_after: Choose "scroll" (show after scrolling) or "delay" (show after time).
timeout: Set scroll distance (percent) for "scroll" or delay (milliseconds) for "delay".


Confirm Update: Set confirm: true after verifying changes. If false or omitted, the update will not proceed.

Examples

Update Text Message with Delay:
Input: "Update message msg123 for https://example.com, text 'Hi!', show after 3s delay, API key abc123, confirm"
Payload: {"id": "msg123", "url": "https://example.com", "message": "Hi!", "show_message_after": "delay", "timeout": 3000, "type": "message", "botsifyChatBotApiKey": "abc123", "confirm": true}


Update Story Message with Scroll:
Input: "Change msg456 to story story789 for https://example.com/about, show after 500px scroll, API key xyz789, confirm"
Payload: {"id": "msg456", "url": "https://example.com/about", "story": "story789", "show_message_after": "scroll", "timeout": 500, "type": "story", "botsifyChatBotApiKey": "xyz789", "confirm": true}


Multi-URL Update without Confirmation:
Input: "Update msg789 for https://example.com,https://example.com/blog, text 'New offer!', 2s delay, API key abc123"
Response: "Confirmation required. Set confirm: true."



Validation

ID: Must be a valid message ID. Invalid: "" → "Message ID is required."
URL: Valid, comma-separated URLs. Invalid: "example.com" → "Use valid URLs (e.g., https://example.com)."
Message: Required for type: "message". Invalid: empty → "Message is required for type 'message'."
Show Message After: Must be "scroll" or "delay". Invalid: "hover" → "Use 'scroll' or 'delay'."
Timeout: Positive number. Invalid: -100 → "Timeout must be positive."
Confirm: Must be true. Invalid: false or omitted → "Confirmation required. Set confirm: true."


17. deletePageMessage

Purpose: Delete a specific page message for the Chatbot (Agent) by ID.
Parameters:
id (string, required): Message ID.
confirm (boolean, required): Must be true.

Precondition: Prompt user for confirmation: "Do you really want to delete this page message?"
Error Handling: Return 412 Precondition Failed if confirm is not true.


18. getAllPageMessages

Purpose: Fetch all current page messages for the Chatbot (Agent).
Output: JSON array of messages with url, html, show_message_after, story, timeout, type.
Error Handling: Return 403 Forbidden if API key is invalid.


19. getOfflineHours

Purpose: Retrieve the Chatbot’s (Agent’s) offline hours schedule.
Output: JSON object with days (array of days) and hours (start/end times in 24-hour format).


20. setOfflineHours

Set Days: Specify office status for each day (Monday-Sunday or Mon-Sun):
Set day: true for offline (closed) days (e.g., "Sunday off").
Set day: false for open days with defined hours (e.g., "Monday 9 AM to 5 PM").


Time Slots: Define hours using from_time and to_time in hh:mm AM/PM format (e.g., "9:00 AM to 5:00 PM").
For multiple slots, use time_slots array for additional periods (e.g., "Tue 9 AM to 12 PM, 1 PM to 5 PM").
Set office_timings to the number of slots (e.g., 1 for single, 2 for two slots).


Bot Visibility: Set hide_bot: true to hide the bot icon during offline hours, or false to keep it visible.
Custom Message: Define message to display when offline, using dynamic variables like {first_name}, {last_name}, {timezone}, {last_user_msg}, {user/last_user_button}, {user/last_user_message_time}, {user/created_at}, or {user/referrer_domain}.
Enable Rules: Set status: true to apply custom hours; false disables them.

Payload Format

Offline Day: {"sun": true, "status": true, "hide_bot": true, "message": "Closed on Sunday for {first_name}"}
Single Slot: {"mon": false, "from_time": "09:00 AM", "to_time": "05:00 PM", "office_timings": 1, "status": true, "hide_bot": false}
Multiple Slots: {"tue": false, "from_time": "09:00 AM", "to_time": "12:00 PM", "office_timings": 2, "time_slots": [{"from_time": "01:00 PM", "to_time": "05:00 PM"}], "status": true}

Examples

Sunday Off:
Input: "Sunday off, hide bot, show 'Closed for {first_name}'"
Payload: {"sun": true, "status": true, "hide_bot": true, "message": "Closed for {first_name}"}


Monday Open:
Input: "Monday 9 AM to 5 PM, show bot"
Payload: {"mon": false, "from_time": "09:00 AM", "to_time": "05:00 PM", "office_timings": 1, "status": true, "hide_bot": false}


Tuesday Multi-Slot:
Input: "Tue 9 AM to 12 PM and 1 PM to 5 PM, hide bot"
Payload: {"tue": false, "from_time": "09:00 AM", "to_time": "12:00 PM", "office_timings": 2, "time_slots": [{"from_time": "01:00 PM", "to_time": "05:00 PM"}], "status": true, "hide_bot": true}


Mon-Fri Half Day:
Input: "Mon to Fri 9 AM to 1 PM, message 'Half day for {timezone}'"
Payload (per day): {"day": false, "from_time": "09:00 AM", "to_time": "01:00 PM", "office_timings": 1, "status": true, "message": "Half day for {timezone}"}



Validation

Time: validate from_time to to_time. to_time should be after from_time. and double check don't go to next day if user want to off for one day or specific days.
Time Format: Use hh:mm AM/PM (e.g., "09:00 AM"). Invalid: "9 AM" → "Use hh:mm AM/PM."
Days: Use Monday-Sunday or Mon-Sun.
Slots: Ensure to_time is after from_time and no overlaps. Invalid: "9 AM to 8 AM" → "to_time must be after from_time."
office_timings: Must match the number of slots (1 for from_time/to_time, +1 per time_slots entry).
status: Must be true to apply rules; false disables all hours.



Critical Notes

Terminology Clarification: Throughout this guide, "Agent" and "Chatbot" refer to the same Botsify-managed conversational entity.
Irreversible Actions: Tools like deleteTeamMember, clearBotData, deletePageMessage, and restoreBotData require explicit user confirmation. Never bypass or autofill these requirements.
Scalability: Tools support batch operations where applicable (e.g., updating multiple settings or messages).
Error Codes: Use standard HTTP status codes (e.g., 400, 401, 403, 404, 409, 412, 422) with descriptive messages.


End of Enhanced MCP Server Tooling Guide.
`;