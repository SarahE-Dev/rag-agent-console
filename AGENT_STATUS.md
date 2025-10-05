# 🔄 Agent Status & Functionality

## Agent Status Types

### `configured`
- **What it means**: Agent has been created and configured but is not active
- **Can you chat?**: ❌ No - inputs are disabled
- **Can you use voice?**: ❌ No - voice features disabled
- **What you see**: Agent appears in dropdown, shows "configured" status
- **What happens**: No AI processing occurs

### `ready`
- **What it means**: Agent is stopped but ready to be started
- **Can you chat?**: ❌ No - inputs are disabled
- **Can you use voice?**: ❌ No - voice features disabled
- **What you see**: Agent shows "ready" status, can be started
- **What happens**: Agent is prepared but not consuming resources

### `running`
- **What it means**: Agent is active and can process requests
- **Can you chat?**: ✅ Yes - full chat functionality available
- **Can you use voice?**: ✅ Yes - TTS and STT work (if voice agent)
- **What you see**: Agent shows "running" status with glowing badge
- **What happens**: Agent consumes OpenAI API credits, can generate responses

### `error`
- **What it means**: Agent encountered an error and needs attention
- **Can you chat?**: ❌ No - inputs are disabled
- **Can you use voice?**: ❌ No - voice features disabled
- **What you see**: Agent shows "error" status
- **What happens**: Agent needs to be restarted or reconfigured

## How Agent Status Affects Functionality

### Chat Agents (`type: 'chat'`)
- **Running**: Uses OpenAI Chat Completions API with configured model, temperature, system prompt
- **Not Running**: Returns "Agent is not running. Please start the agent first."

### Voice Agents (`type: 'voice'`)
- **Running**: Full voice interaction - STT (Whisper) + Chat + TTS (OpenAI TTS)
- **Not Running**: No voice features available, only text chat with error message

## Starting & Stopping Agents

### In the Chat Interface
- Click the **Start/Stop** button next to the agent selector
- **Start**: Changes status from `configured`/`ready` → `running`
- **Stop**: Changes status from `running` → `ready`

### Manual Control
- Agents can be started/stopped via API endpoints
- Status persists until manually changed or server restart

## OpenAI API Integration

### Chat Completion
```typescript
// When agent is running and type === 'chat'
const completion = await openai.chat.completions.create({
  model: agent.chatSettings.model,      // e.g., 'gpt-4', 'gpt-3.5-turbo'
  messages: [...conversationHistory],   // Full conversation context
  temperature: agent.chatSettings.temperature,
  max_tokens: agent.chatSettings.maxTokens,
})
```

### Voice Synthesis (TTS)
```typescript
// When agent is running and type === 'voice'
const mp3 = await openai.audio.speech.create({
  model: agent.voiceSettings.model,     // 'tts-1' or 'tts-1-hd'
  voice: agent.voiceSettings.voice,     // 'alloy', 'echo', 'fable', etc.
  input: textToSpeak,
  speed: agent.voiceSettings.speed,
})
```

### Speech Recognition (STT)
```typescript
// For voice agents when recording
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  language: 'en',
})
```

## Cost Implications

### When Agent is Running
- **Chat Messages**: Cost per token (input + output)
- **Voice Synthesis**: Cost per character (TTS)
- **Speech Recognition**: Cost per minute of audio (Whisper)

### When Agent is Not Running
- **Zero Cost**: No API calls made
- **UI Disabled**: Prevents accidental usage

## Best Practices

### 1. Start Agents When Needed
- Only run agents when actively using them
- Stop agents when done to save costs

### 2. Monitor Status
- Check the glowing badge in chat interface
- Footer shows system-wide status

### 3. Handle Errors
- If agent shows "error" status, try restarting
- Check OpenAI API key if issues persist

### 4. Voice Agent Workflow
1. Select voice agent
2. Click "Start" to activate
3. Use microphone button to record
4. Text is transcribed via Whisper
5. Chat response generated via GPT
6. Response spoken via TTS
7. Click volume icon on messages to replay

## Troubleshooting

### "Agent is not running" message
- **Solution**: Click the "Start" button next to the agent selector

### Voice features not working
- **Check**: Agent type must be "voice"
- **Check**: Agent status must be "running"
- **Check**: Browser must allow microphone access

### API errors
- **Check**: OpenAI API key is valid
- **Check**: Sufficient credits available
- **Check**: Network connectivity

### Chat not responding
- **Check**: Agent type is "chat"
- **Check**: Agent status is "running"
- **Check**: OpenAI API key configured

---

**💡 Pro Tip**: Always start your agents before trying to use them - this ensures full AI functionality and prevents unexpected behavior!
