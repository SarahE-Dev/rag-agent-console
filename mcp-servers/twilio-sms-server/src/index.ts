#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import twilio from "twilio";

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio MCP Server: Missing required environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)");
    console.error("Twilio server will not start. Please configure Twilio credentials to enable SMS functionality.");
    return null;
  }

  return { accountSid, authToken, fromNumber };
}

// Only initialize Twilio client if config is available
const config = getTwilioConfig();
let client: any = null;
let fromNumber: string = '';

if (config) {
  client = twilio(config.accountSid, config.authToken);
  fromNumber = config.fromNumber;
} else {
  console.error("Twilio MCP Server: Skipping initialization due to missing credentials");
  process.exit(0); // Exit gracefully without error
}

// Tool definitions
const SEND_SMS_TOOL: Tool = {
  name: "send_sms",
  description: "Send an SMS message to a phone number",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "Recipient phone number (E.164 format, e.g., +1234567890)"
      },
      message: {
        type: "string",
        description: "The message content to send"
      }
    },
    required: ["to", "message"]
  }
};

const LIST_MESSAGES_TOOL: Tool = {
  name: "list_sms_messages",
  description: "List recent SMS messages from your account",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Number of messages to retrieve (default: 20, max: 100)",
        default: 20,
        minimum: 1,
        maximum: 100
      },
      to: {
        type: "string",
        description: "Filter messages sent to this number"
      },
      from: {
        type: "string",
        description: "Filter messages sent from this number"
      }
    }
  }
};

const GET_MESSAGE_TOOL: Tool = {
  name: "get_sms_message",
  description: "Get details of a specific SMS message",
  inputSchema: {
    type: "object",
    properties: {
      messageSid: {
        type: "string",
        description: "The unique SID of the message"
      }
    },
    required: ["messageSid"]
  }
};

const SMS_TOOLS = [
  SEND_SMS_TOOL,
  LIST_MESSAGES_TOOL,
  GET_MESSAGE_TOOL,
] as const;

// API handlers
async function handleSendSMS(to: string, message: string) {
  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          sid: result.sid,
          status: result.status,
          to: result.to,
          from: result.from,
          body: result.body,
          dateCreated: result.dateCreated,
          price: result.price,
          priceUnit: result.priceUnit
        }, null, 2)
      }],
      isError: false
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Failed to send SMS: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleListMessages(limit: number = 20, to?: string, from?: string) {
  try {
    const messages = await client.messages.list({
      limit: Math.min(limit, 100),
      to: to,
      from: from
    });

    const messageList = messages.map((msg: any) => ({
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      body: msg.body,
      dateCreated: msg.dateCreated,
      dateSent: msg.dateSent,
      price: msg.price,
      priceUnit: msg.priceUnit,
      direction: msg.direction
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          count: messageList.length,
          messages: messageList
        }, null, 2)
      }],
      isError: false
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Failed to list messages: ${error.message}`
      }],
      isError: true
    };
  }
}

async function handleGetMessage(messageSid: string) {
  try {
    const message = await (client.messages(messageSid) as any).fetch();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          sid: message.sid,
          status: message.status,
          to: message.to,
          from: message.from,
          body: message.body,
          dateCreated: message.dateCreated,
          dateSent: message.dateSent,
          dateUpdated: message.dateUpdated,
          price: message.price,
          priceUnit: message.priceUnit,
          direction: message.direction,
          errorCode: message.errorCode,
          errorMessage: message.errorMessage
        }, null, 2)
      }],
      isError: false
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `Failed to get message: ${error.message}`
      }],
      isError: true
    };
  }
}

// Server setup
const server = new Server({
  name: "mcp-server/twilio-sms",
  version: "0.1.0",
});

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: SMS_TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "send_sms": {
        const { to, message } = request.params.arguments as { to: string; message: string };
        return await handleSendSMS(to, message);
      }

      case "list_sms_messages": {
        const { limit, to, from } = request.params.arguments as {
          limit?: number;
          to?: string;
          from?: string;
        };
        return await handleListMessages(limit, to, from);
      }

      case "get_sms_message": {
        const { messageSid } = request.params.arguments as { messageSid: string };
        return await handleGetMessage(messageSid);
      }

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${request.params.name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Twilio SMS MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
