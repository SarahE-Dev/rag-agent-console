# Twilio SMS MCP Server

This MCP server provides integration with Twilio's SMS service, allowing AI agents to send and receive text messages programmatically.

## Features

- **Send SMS**: Send text messages to phone numbers
- **List Messages**: Retrieve recent SMS messages
- **Get Message Details**: Get detailed information about specific messages

## Setup

1. Sign up for a Twilio account at [twilio.com](https://twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase or verify a phone number for sending SMS
4. Install dependencies:
```bash
npm install
```

5. Build the server:
```bash
npm run build
```

## Environment Variables

Set the following environment variables:
```bash
export TWILIO_ACCOUNT_SID=your_account_sid
export TWILIO_AUTH_TOKEN=your_auth_token
export TWILIO_FROM_NUMBER=+1234567890  # Your Twilio phone number
```

## Available Tools

### send_sms
Send an SMS message to a phone number.

**Input:**
```json
{
  "to": "+1234567890",
  "message": "Hello from your AI assistant!"
}
```

**Output:**
```json
{
  "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "to": "+1234567890",
  "from": "+19876543210",
  "body": "Hello from your AI assistant!",
  "dateCreated": "2024-01-01T00:00:00.000Z",
  "price": null,
  "priceUnit": "USD"
}
```

### list_sms_messages
List recent SMS messages from your account.

**Input:**
```json
{
  "limit": 10,
  "to": "+1234567890",     // Optional: filter by recipient
  "from": "+19876543210"  // Optional: filter by sender
}
```

### get_sms_message
Get details of a specific SMS message.

**Input:**
```json
{
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

## Running the Server

```bash
npm start
```

The server communicates via stdio and can be integrated with MCP-compatible clients.

## Important Notes

- Phone numbers must be in E.164 format (+1234567890)
- For trial accounts, you can only send SMS to verified numbers
- Message delivery status may take a few seconds to update
- Costs apply for sending SMS messages (check Twilio pricing)
