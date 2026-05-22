"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } async function _asyncNullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return await rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _class; var _class2; var _class3; var _class4;// src/core/ToolExecutor.ts
var ToolExecutor = (_class = class {
  __init() {this.handlers = /* @__PURE__ */ new Map()}
  
  constructor(opts = {}) {;_class.prototype.__init.call(this);
    this.adapter = opts.adapter;
  }
  /** Dynamically register a handler for a tool name. */
  register(name, handler) {
    this.handlers.set(name, handler);
  }
  /** Get all available tool definitions from the adapter. */
  getAvailableTools() {
    return _nullishCoalesce(_optionalChain([this, 'access', _ => _.adapter, 'optionalAccess', _2 => _2.getAvailableTools, 'call', _3 => _3()]), () => ( []));
  }
  /** Execute a single tool call. */
  async execute(call) {
    const handler = this.handlers.get(call.name);
    if (handler) {
      try {
        const result = await handler(call.args);
        return {
          success: true,
          content: this.serializeResult(result)
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }
    if (this.adapter) {
      try {
        return await this.adapter.executeTool(call);
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        };
      }
    }
    return {
      success: false,
      error: `No tool handler or adapter found for "${call.name}"`
    };
  }
  /** Execute multiple tool calls in parallel. */
  async executeBatch(calls) {
    return Promise.all(calls.map((call) => this.execute(call)));
  }
  serializeResult(result) {
    if (result === null || result === void 0) return "";
    if (typeof result === "string") return result;
    try {
      return JSON.stringify(result, null, 2);
    } catch (e) {
      return String(result);
    }
  }
}, _class);

// src/core/AgentLoop.ts
var defaultFormatter = (_toolName, result) => {
  if (result.error) {
    return `Error: ${result.error}`;
  }
  return _nullishCoalesce(result.content, () => ( JSON.stringify(result, null, 2)));
};
function toAdapterMessages(messages) {
  return messages.map((m) => ({
    role: m.role,
    content: m.content
  }));
}
var AgentLoop = class {
  
  
  constructor(opts, formatResult = defaultFormatter) {
    this.opts = opts;
    this.formatResult = formatResult;
  }
  /**
   * Runs the agent loop with the given initial messages and tools.
   *
   * @param session - Chat session (for metadata)
   * @param messages - Conversation messages (system + history + user)
   * @param tools - Tool definitions to make available to the LLM
   * @param signal - AbortSignal for cancellation
   * @returns Final accumulated text and metadata
   */
  async run(session, messages, tools, signal) {
    const { llmAdapter, toolExecutor, maxSteps = 5, autoApply = false } = this.opts;
    let fullText = "";
    let currentMessages = [...messages];
    for (let step = 0; step < maxSteps; step++) {
      let stepText = "";
      let pendingCalls = [];
      const stream = llmAdapter.streamChatWithTools(
        toAdapterMessages(currentMessages),
        tools,
        signal
      );
      for await (const event of stream) {
        if (_optionalChain([signal, 'optionalAccess', _4 => _4.aborted])) break;
        switch (event.type) {
          case "text-delta":
            stepText += event.text;
            fullText += event.text;
            _optionalChain([this, 'access', _5 => _5.opts, 'access', _6 => _6.onTextDelta, 'optionalCall', _7 => _7(fullText)]);
            break;
          case "tool-call":
            pendingCalls.push(event.call);
            _optionalChain([this, 'access', _8 => _8.opts, 'access', _9 => _9.onToolCall, 'optionalCall', _10 => _10(event.call)]);
            break;
          case "tool-error":
            console.warn(
              `[AgentLoop] tool-error from stream: ${event.callId} \u2014 ${event.error}`
            );
            break;
          case "error":
            throw new Error(event.message);
          // finish, tool-result from stream are bookkeeping
          default:
            break;
        }
      }
      if (_optionalChain([signal, 'optionalAccess', _11 => _11.aborted])) {
        console.log(`[AgentLoop] aborted during step ${step}`);
        break;
      }
      if (pendingCalls.length === 0) {
        console.log(
          `[AgentLoop] done \u2014 no tool calls at step ${step}, ${fullText.length} chars`
        );
        return { text: fullText, stepsTaken: step + 1 };
      }
      const results = [];
      for (const call of pendingCalls) {
        console.log(
          `[AgentLoop] step ${step} tool-call: ${call.name}`,
          call.args
        );
        let result;
        if (autoApply || !this.opts.requestApproval) {
          result = toolExecutor ? await toolExecutor.execute(call) : {
            success: false,
            error: "No tool executor configured"
          };
        } else {
          result = await _asyncNullishCoalesce(await this.opts.requestApproval(call), async () => ( {
            success: false,
            error: "User rejected the tool call"
          }));
        }
        console.log(
          `[AgentLoop] step ${step} tool-result:`,
          _nullishCoalesce(result.error, () => ( "success"))
        );
        _optionalChain([this, 'access', _12 => _12.opts, 'access', _13 => _13.onToolResult, 'optionalCall', _14 => _14(call, result)]);
        results.push({ call, result });
      }
      const assistantParts = [];
      if (stepText) {
        assistantParts.push({ type: "text", text: stepText });
      }
      for (const { call } of results) {
        assistantParts.push({
          type: "tool-call",
          toolCallId: call.id,
          toolName: call.name,
          input: call.args
        });
      }
      const assistantMsg = {
        id: `assistant-${session.id}-${step}`,
        role: "assistant",
        content: JSON.stringify(assistantParts),
        timestamp: Date.now()
      };
      const toolMessages = results.map(({ call, result }) => {
        const formatted = this.formatResult(call.name, result);
        const toolParts = [
          {
            type: "tool-result",
            toolCallId: call.id,
            toolName: call.name,
            output: {
              type: "text",
              value: formatted
            }
          }
        ];
        return {
          id: `tool-${call.id}`,
          role: "assistant",
          // Vercel SDK uses "tool" role, but our types say 'user'|'assistant'|'system'
          content: JSON.stringify(toolParts),
          timestamp: Date.now()
        };
      });
      currentMessages = [
        ...currentMessages,
        assistantMsg,
        ...toolMessages
      ];
    }
    return { text: fullText, stepsTaken: maxSteps };
  }
};

// src/adapters/VercelLLMAdapter.ts





var _ai = require('ai');
var _zod = require('zod');
var providerModules = {
  openai: async () => {
    const { createOpenAI } = await Promise.resolve().then(() => _interopRequireWildcard(require("@ai-sdk/openai")));
    return (apiKey, baseUrl) => createOpenAI({ apiKey, baseURL: baseUrl });
  },
  anthropic: async () => {
    const { createAnthropic } = await Promise.resolve().then(() => _interopRequireWildcard(require("@ai-sdk/anthropic")));
    return (apiKey) => createAnthropic({ apiKey });
  },
  google: async () => {
    const { createGoogleGenerativeAI } = await Promise.resolve().then(() => _interopRequireWildcard(require("@ai-sdk/google")));
    return (apiKey) => createGoogleGenerativeAI({ apiKey });
  },
  azure: async () => {
    const { createAzure } = await Promise.resolve().then(() => _interopRequireWildcard(require("@ai-sdk/azure")));
    return (apiKey, baseUrl) => createAzure({
      apiKey,
      resourceName: _nullishCoalesce(_optionalChain([baseUrl, 'optionalAccess', _15 => _15.split, 'call', _16 => _16("."), 'access', _17 => _17[0]]), () => ( ""))
    });
  },
  ollama: async () => {
    const { createOllama } = await Promise.resolve().then(() => _interopRequireWildcard(require("ollama-ai-provider")));
    return (_apiKey, baseUrl) => createOllama({ baseURL: _nullishCoalesce(baseUrl, () => ( "http://localhost:11434/api")) });
  },
  openrouter: async () => {
    const { createOpenRouter } = await Promise.resolve().then(() => _interopRequireWildcard(require("@openrouter/ai-sdk-provider")));
    return (apiKey) => createOpenRouter({ apiKey });
  },
  deepseek: async () => {
    const { createDeepSeek } = await Promise.resolve().then(() => _interopRequireWildcard(require("@ai-sdk/deepseek")));
    return (apiKey, baseUrl) => createDeepSeek({ apiKey, baseURL: baseUrl });
  },
  kimi: async () => {
    const { createOpenAI } = await Promise.resolve().then(() => _interopRequireWildcard(require("@ai-sdk/openai")));
    return (apiKey, baseUrl) => createOpenAI({
      apiKey,
      baseURL: _nullishCoalesce(baseUrl, () => ( "https://api.moonshot.cn/v1"))
    });
  }
};
var VercelLLMAdapter = class {
  
  
  
  constructor(opts) {
    this.profile = opts.profile;
    this.systemPrompt = opts.systemPrompt;
  }
  async getProvider() {
    if (this.providerInstance) return this.providerInstance;
    const loader = providerModules[this.profile.provider];
    if (!loader) {
      throw new Error(
        `Unsupported provider: ${this.profile.provider}. Supported: ${Object.keys(providerModules).join(", ")}`
      );
    }
    const factory = await loader();
    this.providerInstance = factory(
      this.profile.apiKey,
      this.profile.baseUrl
    );
    return this.providerInstance;
  }
  // --------------------------------------------------------------------------
  // Simple text streaming (no tools)
  // --------------------------------------------------------------------------
  async *streamChat(messages, signal) {
    const provider = await this.getProvider();
    const model = provider.chat(this.profile.model);
    const uiMessages = this.toUIMessages(messages);
    const result = _ai.streamText.call(void 0, {
      model,
      system: this.systemPrompt,
      messages: await _ai.convertToModelMessages.call(void 0, uiMessages),
      abortSignal: signal
    });
    for await (const chunk of result.textStream) {
      if (_optionalChain([signal, 'optionalAccess', _18 => _18.aborted])) break;
      yield chunk;
    }
  }
  // --------------------------------------------------------------------------
  // Tool-capable streaming (single step via stopWhen)
  // --------------------------------------------------------------------------
  async *streamChatWithTools(messages, tools, signal) {
    const provider = await this.getProvider();
    const model = provider.chat(this.profile.model);
    const sdkTools = this.buildSdkTools(tools);
    const uiMessages = this.toUIMessages(messages);
    const result = _ai.streamText.call(void 0, {
      model,
      system: this.systemPrompt,
      messages: await _ai.convertToModelMessages.call(void 0, uiMessages),
      tools: sdkTools,
      stopWhen: _ai.stepCountIs.call(void 0, 1),
      abortSignal: signal
    });
    let accumulatedText = "";
    const pendingCalls = [];
    for await (const chunk of result.fullStream) {
      if (_optionalChain([signal, 'optionalAccess', _19 => _19.aborted])) break;
      const event = this.convertChunk(chunk);
      if (!event) continue;
      if (event.type === "text-delta") {
        accumulatedText += event.text;
      }
      if (event.type === "tool-call") {
        pendingCalls.push(event.call);
      }
      yield event;
    }
    if (!_optionalChain([signal, 'optionalAccess', _20 => _20.aborted])) {
      const reason = pendingCalls.length > 0 ? "tool-calls-detected" : accumulatedText.length > 0 ? "text-complete" : "empty";
      yield { type: "finish", reason };
    }
  }
  // --------------------------------------------------------------------------
  // Provider info
  // --------------------------------------------------------------------------
  getProviders() {
    return Object.keys(providerModules).map((id) => ({
      id,
      name: this.providerDisplayName(id)
    }));
  }
  getModels(_provider) {
    return this.profile.models;
  }
  async testConnection() {
    try {
      const provider = await this.getProvider();
      const model = provider.chat(this.profile.model);
      const result = _ai.streamText.call(void 0, {
        model,
        prompt: "Hi",
        maxOutputTokens: 5
      });
      const { textStream } = result;
      let gotData = false;
      for await (const _chunk of textStream) {
        gotData = true;
        break;
      }
      return {
        ok: gotData,
        message: gotData ? `Connected to ${this.profile.provider}/${this.profile.model}` : "Stream started but no data received"
      };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err)
      };
    }
  }
  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  /**
   * Convert simple {role, content} messages to UIMessage format for v6 SDK.
   */
  toUIMessages(messages) {
    return messages.map((m, i) => ({
      id: `msg-${i}`,
      role: m.role,
      parts: [{ type: "text", text: m.content }],
      createdAt: /* @__PURE__ */ new Date()
    }));
  }
  providerDisplayName(id) {
    const names = {
      openai: "OpenAI",
      anthropic: "Anthropic",
      google: "Google Gemini",
      azure: "Azure OpenAI",
      ollama: "Ollama",
      openrouter: "OpenRouter",
      deepseek: "DeepSeek",
      kimi: "Kimi (Moonshot)"
    };
    return _nullishCoalesce(names[id], () => ( id));
  }
  /**
   * Converts super-chat ToolDefinition[] to AI SDK tool objects.
   */
  buildSdkTools(tools) {
    const sdkTools = {};
    for (const t of tools) {
      const schema = this.buildZodSchema(t.parameters);
      sdkTools[t.name] = _ai.tool.call(void 0, {
        description: t.description,
        inputSchema: schema
      });
    }
    return sdkTools;
  }
  buildZodSchema(params) {
    if (params.type === "object" && typeof params.properties === "object") {
      const props = params.properties;
      const required = Array.isArray(params.required) ? params.required : [];
      const shape = {};
      for (const [key, prop] of Object.entries(props)) {
        shape[key] = this.jsonSchemaToZod(prop);
        if (!required.includes(key)) {
          shape[key] = shape[key].optional();
        }
      }
      return _zod.z.object(shape);
    }
    return _zod.z.record(_zod.z.any());
  }
  jsonSchemaToZod(schema) {
    const type = schema.type;
    switch (type) {
      case "string":
        return _zod.z.string();
      case "number":
      case "integer":
        return _zod.z.number();
      case "boolean":
        return _zod.z.boolean();
      case "array":
        if (schema.items) {
          return _zod.z.array(
            this.jsonSchemaToZod(schema.items)
          );
        }
        return _zod.z.array(_zod.z.any());
      case "object":
        if (schema.properties) {
          const props = schema.properties;
          const shape = {};
          for (const [key, prop] of Object.entries(props)) {
            shape[key] = this.jsonSchemaToZod(prop);
          }
          return _zod.z.object(shape);
        }
        return _zod.z.record(_zod.z.any());
      default:
        return _zod.z.any();
    }
  }
  /**
   * Convert AI SDK stream chunk to super-chat StreamEvent.
   */
  convertChunk(chunk) {
    switch (chunk.type) {
      case "text-delta":
        return { type: "text-delta", text: chunk.text };
      case "tool-call": {
        const call = {
          id: _nullishCoalesce(_nullishCoalesce(chunk.toolCallId, () => ( chunk.id)), () => ( `call-${Date.now()}`)),
          name: _nullishCoalesce(_nullishCoalesce(chunk.toolName, () => ( chunk.name)), () => ( "unknown")),
          args: _nullishCoalesce(_nullishCoalesce(chunk.input, () => ( chunk.args)), () => ( {}))
        };
        return { type: "tool-call", call };
      }
      case "tool-result":
        return null;
      case "error":
        return {
          type: "error",
          message: chunk.error instanceof Error ? chunk.error.message : String(chunk.error)
        };
      case "finish-step":
        return { type: "step-finish", step: 0 };
      case "finish":
        return null;
      default:
        return null;
    }
  }
};
function createProviderProfile(provider, model, apiKey, options) {
  const id = `${provider}-${model}`.replace(/[^a-zA-Z0-9-]/g, "-");
  const defaultModels = {
    openai: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128e3 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128e3 }
    ],
    anthropic: [
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", contextWindow: 2e5 },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", contextWindow: 2e5 }
    ],
    google: [
      { id: "gemini-2-flash", name: "Gemini 2 Flash", contextWindow: 1e6 }
    ],
    ollama: [
      { id: "llama3.1", name: "Llama 3.1", contextWindow: 128e3 }
    ],
    openrouter: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4 (via OpenRouter)", contextWindow: 2e5 }
    ],
    deepseek: [
      { id: "deepseek-chat", name: "DeepSeek Chat", contextWindow: 64e3 }
    ],
    kimi: [
      { id: "kimi-k2-5", name: "Kimi K2.5", contextWindow: 256e3 }
    ]
  };
  return {
    id,
    name: _nullishCoalesce(_optionalChain([options, 'optionalAccess', _21 => _21.name]), () => ( `${provider} / ${model}`)),
    provider,
    model,
    apiKey,
    baseUrl: _optionalChain([options, 'optionalAccess', _22 => _22.baseUrl]),
    models: _nullishCoalesce(_nullishCoalesce(_optionalChain([options, 'optionalAccess', _23 => _23.models]), () => ( defaultModels[provider])), () => ( [])),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

// src/adapters/MemoryPersistence.ts
var MemoryPersistenceAdapter = (_class2 = class {constructor() { _class2.prototype.__init2.call(this); }
  __init2() {this.sessions = /* @__PURE__ */ new Map()}
  async loadSessions() {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  }
  async saveSession(session) {
    this.sessions.set(session.id, {
      ...session,
      updatedAt: Date.now()
    });
  }
  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
  }
  async archiveSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.set(sessionId, {
        ...session,
        archived: true,
        updatedAt: Date.now()
      });
    }
  }
  /** Clear all sessions (useful for testing) */
  clear() {
    this.sessions.clear();
  }
  /** Get count of stored sessions */
  getCount() {
    return this.sessions.size;
  }
}, _class2);

// src/adapters/LocalStoragePersistence.ts
var STORAGE_KEY = "super-chat:sessions";
var SESSION_PREFIX = "super-chat:session:";
var LocalStoragePersistenceAdapter = class {
  
  constructor(options) {
    this.maxSessions = _nullishCoalesce(_optionalChain([options, 'optionalAccess', _24 => _24.maxSessions]), () => ( 100));
  }
  async loadSessions() {
    if (typeof localStorage === "undefined") {
      return [];
    }
    try {
      const idsJson = localStorage.getItem(STORAGE_KEY);
      const ids = idsJson ? JSON.parse(idsJson) : [];
      const sessions = [];
      for (const id of ids) {
        const sessionJson = localStorage.getItem(`${SESSION_PREFIX}${id}`);
        if (sessionJson) {
          try {
            sessions.push(JSON.parse(sessionJson));
          } catch (e2) {
          }
        }
      }
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (e3) {
      return [];
    }
  }
  async saveSession(session) {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      const updatedSession = {
        ...session,
        updatedAt: Date.now()
      };
      localStorage.setItem(
        `${SESSION_PREFIX}${session.id}`,
        JSON.stringify(updatedSession)
      );
      const idsJson = localStorage.getItem(STORAGE_KEY);
      const ids = idsJson ? JSON.parse(idsJson) : [];
      if (!ids.includes(session.id)) {
        ids.unshift(session.id);
      }
      while (ids.length > this.maxSessions) {
        const removed = ids.pop();
        if (removed) {
          localStorage.removeItem(`${SESSION_PREFIX}${removed}`);
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (err) {
      if (this.isQuotaError(err)) {
        await this.evictOldestSessions();
        await this.saveSession(session);
      } else {
        throw err;
      }
    }
  }
  async deleteSession(sessionId) {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.removeItem(`${SESSION_PREFIX}${sessionId}`);
    const idsJson = localStorage.getItem(STORAGE_KEY);
    const ids = idsJson ? JSON.parse(idsJson) : [];
    const filtered = ids.filter((id) => id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  async archiveSession(sessionId) {
    if (typeof localStorage === "undefined") {
      return;
    }
    const sessionJson = localStorage.getItem(`${SESSION_PREFIX}${sessionId}`);
    if (sessionJson) {
      const session = JSON.parse(sessionJson);
      localStorage.setItem(
        `${SESSION_PREFIX}${sessionId}`,
        JSON.stringify({
          ...session,
          archived: true,
          updatedAt: Date.now()
        })
      );
    }
  }
  isQuotaError(err) {
    return err instanceof Error && (err.name === "QuotaExceededError" || err.message.includes("quota") || err.message.includes("exceeded"));
  }
  async evictOldestSessions() {
    const idsJson = localStorage.getItem(STORAGE_KEY);
    const ids = idsJson ? JSON.parse(idsJson) : [];
    const toRemove = Math.max(1, Math.floor(ids.length * 0.1));
    const removed = ids.slice(-toRemove);
    const remaining = ids.slice(0, -toRemove);
    for (const id of removed) {
      localStorage.removeItem(`${SESSION_PREFIX}${id}`);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  }
};

// src/adapters/DemoToolAdapter.ts
var DemoToolAdapter = (_class3 = class {constructor() { _class3.prototype.__init3.call(this); }
  __init3() {this.tools = [
    {
      name: "calculate",
      description: "Evaluate a mathematical expression. Use this when the user asks for calculations, conversions, or numerical analysis.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The mathematical expression to evaluate, e.g. '2 + 2' or 'sin(pi/4)'"
          }
        },
        required: ["expression"]
      }
    },
    {
      name: "search_web",
      description: "Search the web for current information. Use this when the question requires up-to-date facts, news, or information not in training data.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query string"
          },
          num_results: {
            type: "number",
            description: "Number of results to return (default: 5)",
            default: 5
          }
        },
        required: ["query"]
      }
    },
    {
      name: "get_weather",
      description: "Get current weather for a location. Use this when the user asks about weather, temperature, or forecasts.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City name or coordinates, e.g. 'San Francisco, CA'"
          },
          units: {
            type: "string",
            description: "Temperature units: 'celsius' or 'fahrenheit' (default: celsius)",
            default: "celsius"
          }
        },
        required: ["location"]
      }
    },
    {
      name: "fetch_arxiv",
      description: "Search arXiv for physics papers. Use this when the user asks about research, papers, or specific physics topics.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for arXiv, e.g. 'loop quantum gravity'"
          },
          max_results: {
            type: "number",
            description: "Maximum number of papers to return (default: 3)",
            default: 3
          }
        },
        required: ["query"]
      }
    }
  ]}
  getAvailableTools() {
    return this.tools;
  }
  async executeTool(call) {
    const { name, args } = call;
    switch (name) {
      case "calculate":
        return this.handleCalculate(args);
      case "search_web":
        return this.handleSearchWeb(
          args
        );
      case "get_weather":
        return this.handleGetWeather(
          args
        );
      case "fetch_arxiv":
        return this.handleFetchArxiv(
          args
        );
      default:
        return {
          success: false,
          error: `Unknown tool: ${name}`
        };
    }
  }
  handleCalculate(args) {
    try {
      const sanitized = args.expression.replace(/[^0-9+\-*/().\s^sqrtlogsinconstan]/gi, "");
      const result = new Function("return " + sanitized)();
      return {
        success: true,
        content: String(result)
      };
    } catch (err) {
      return {
        success: false,
        error: `Could not evaluate expression: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
  handleSearchWeb(args) {
    const numResults = _nullishCoalesce(args.num_results, () => ( 5));
    const mockResults = [
      {
        title: `Results for "${args.query}" \u2014 Wikipedia`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(args.query.replace(/\s+/g, "_"))}`,
        snippet: `Wikipedia article about ${args.query}. Comprehensive overview with references and related topics.`
      },
      {
        title: `${args.query} \u2014 Latest News`,
        url: `https://news.example.com/search?q=${encodeURIComponent(args.query)}`,
        snippet: `Recent developments and news articles about ${args.query}. Updated hourly.`
      },
      {
        title: `${args.query} \u2014 Research Papers`,
        url: `https://scholar.example.com/?q=${encodeURIComponent(args.query)}`,
        snippet: `Academic papers and citations for ${args.query}. Peer-reviewed sources.`
      }
    ];
    return {
      success: true,
      content: JSON.stringify(
        mockResults.slice(0, numResults),
        null,
        2
      )
    };
  }
  handleGetWeather(args) {
    const units = _nullishCoalesce(args.units, () => ( "celsius"));
    const isCelsius = units === "celsius";
    const hash = this.simpleHash(args.location);
    const tempC = 15 + hash % 20;
    const temp = isCelsius ? tempC : Math.round(tempC * 9 / 5 + 32);
    const conditions = ["Sunny", "Partly cloudy", "Cloudy", "Light rain", "Clear skies"];
    const condition = conditions[hash % conditions.length];
    const humidity = 40 + hash % 50;
    return {
      success: true,
      content: JSON.stringify(
        {
          location: args.location,
          temperature: temp,
          units: isCelsius ? "\xB0C" : "\xB0F",
          condition,
          humidity: `${humidity}%`,
          forecast: `Expect ${condition.toLowerCase()} throughout the day.`
        },
        null,
        2
      )
    };
  }
  handleFetchArxiv(args) {
    const maxResults = _nullishCoalesce(args.max_results, () => ( 3));
    const mockPapers = [
      {
        id: `arxiv:2401.${1e3 + this.simpleHash(args.query) % 9e3}`,
        title: `On the ${args.query} in Quantum Field Theory`,
        authors: ["A. Einstein", "M. Planck"],
        year: 2024,
        url: `https://arxiv.org/abs/2401.${1e3 + this.simpleHash(args.query) % 9e3}`,
        snippet: `We investigate the implications of ${args.query} for modern quantum field theory...`
      },
      {
        id: `arxiv:2312.${1e3 + (this.simpleHash(args.query) + 1) % 9e3}`,
        title: `${args.query}: A New Perspective`,
        authors: ["R. Feynman", "J. Schwinger"],
        year: 2023,
        url: `https://arxiv.org/abs/2312.${1e3 + (this.simpleHash(args.query) + 1) % 9e3}`,
        snippet: `This paper presents a novel approach to ${args.query} using path integrals...`
      },
      {
        id: `arxiv:2311.${1e3 + (this.simpleHash(args.query) + 2) % 9e3}`,
        title: `Advances in ${args.query}`,
        authors: ["N. Bohr", "W. Heisenberg"],
        year: 2023,
        url: `https://arxiv.org/abs/2311.${1e3 + (this.simpleHash(args.query) + 2) % 9e3}`,
        snippet: `Recent experimental results have shed new light on ${args.query}...`
      }
    ];
    return {
      success: true,
      content: JSON.stringify(mockPapers.slice(0, maxResults), null, 2)
    };
  }
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}, _class3);

// src/core/ChatEngine.ts
var defaultSettings = {
  activeProviderProfileId: "",
  providerProfiles: [],
  enableRAG: false,
  enableTools: true,
  enableCitations: true,
  showTokenCount: false,
  showTimestamps: true,
  enableLaTeXPreview: true,
  maxSavedSessions: 100,
  maxContextTokens: 128e3,
  maxAgentSteps: 5,
  autoApply: false,
  showProviderIndicator: true
};
var ChatEngine = (_class4 = class {
  
  
  
  
  __init4() {this.customTools = /* @__PURE__ */ new Map()}
  constructor(options) {;_class4.prototype.__init4.call(this);
    this.opts = options;
    this.toolExecutor = new ToolExecutor();
    if (options.toolAdapter) {
      this.registerAdapterTools(options.toolAdapter);
    }
    this.agentLoop = new AgentLoop({
      llmAdapter: options.llmAdapter,
      toolExecutor: this.toolExecutor,
      maxSteps: _nullishCoalesce(_optionalChain([options, 'access', _25 => _25.agentLoopOptions, 'optionalAccess', _26 => _26.maxSteps]), () => ( 5)),
      autoApply: _nullishCoalesce(_optionalChain([options, 'access', _27 => _27.agentLoopOptions, 'optionalAccess', _28 => _28.autoApply]), () => ( false))
    });
    this.state = {
      sessions: [],
      activeSessionId: null,
      settings: { ...defaultSettings },
      isStreaming: false,
      abortController: null
    };
  }
  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------
  async loadSessions() {
    if (this.opts.persistenceAdapter) {
      this.state.sessions = await this.opts.persistenceAdapter.loadSessions();
    }
    return [...this.state.sessions];
  }
  async saveSession(session) {
    const target = _nullishCoalesce(session, () => ( this.getActiveSession()));
    if (!target || !this.opts.persistenceAdapter) return;
    const updated = {
      ...target,
      updatedAt: Date.now()
    };
    await this.opts.persistenceAdapter.saveSession(updated);
    const idx = this.state.sessions.findIndex((s) => s.id === updated.id);
    if (idx >= 0) {
      this.state.sessions[idx] = updated;
    } else {
      this.state.sessions.unshift(updated);
    }
  }
  createSession(title) {
    const session = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: _nullishCoalesce(title, () => ( "Untitled Chat")),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      llmProvider: _optionalChain([this, 'access', _29 => _29.opts, 'access', _30 => _30.llmAdapter, 'access', _31 => _31.getProviders, 'call', _32 => _32(), 'access', _33 => _33[0], 'optionalAccess', _34 => _34.id])
    };
    this.state.sessions.unshift(session);
    this.state.activeSessionId = session.id;
    return session;
  }
  switchSession(sessionId) {
    const session = this.state.sessions.find((s) => s.id === sessionId);
    if (!session) return false;
    this.state.activeSessionId = sessionId;
    return true;
  }
  getActiveSession() {
    if (!this.state.activeSessionId) return null;
    return _nullishCoalesce(this.state.sessions.find((s) => s.id === this.state.activeSessionId), () => ( null));
  }
  async deleteSession(sessionId) {
    this.state.sessions = this.state.sessions.filter(
      (s) => s.id !== sessionId
    );
    if (this.state.activeSessionId === sessionId) {
      this.state.activeSessionId = _nullishCoalesce(_optionalChain([this, 'access', _35 => _35.state, 'access', _36 => _36.sessions, 'access', _37 => _37[0], 'optionalAccess', _38 => _38.id]), () => ( null));
    }
    if (this.opts.persistenceAdapter) {
      await this.opts.persistenceAdapter.deleteSession(sessionId);
    }
  }
  async archiveSession(sessionId) {
    const session = this.state.sessions.find((s) => s.id === sessionId);
    if (session) {
      session.archived = true;
      session.updatedAt = Date.now();
    }
    if (this.opts.persistenceAdapter) {
      await this.opts.persistenceAdapter.archiveSession(sessionId);
    }
  }
  getSessions() {
    return [...this.state.sessions];
  }
  // --------------------------------------------------------------------------
  // Messaging
  // --------------------------------------------------------------------------
  /**
   * Send a message and receive streaming events.
   *
   * Yields text-deltas, tool-calls, tool-results, and finish events.
   * Callers should handle UI updates based on event types.
   */
  async *sendMessage(text, options) {
    const session = this.getActiveSession();
    if (!session) {
      yield { type: "error", message: "No active session" };
      return;
    }
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now()
    };
    const messages = [
      ...this.opts.systemPrompt ? [
        {
          id: "system",
          role: "system",
          content: this.opts.systemPrompt,
          timestamp: 0
        }
      ] : [],
      ...session.messages,
      userMessage
    ];
    session.messages.push(userMessage);
    await this.saveSession(session);
    this.state.abortController = new AbortController();
    const signal = this.state.abortController.signal;
    this.state.isStreaming = true;
    const tools = this.getAvailableTools();
    const enableTools = _nullishCoalesce(_optionalChain([options, 'optionalAccess', _39 => _39.enableTools]), () => ( this.state.settings.enableTools));
    try {
      if (enableTools && tools.length > 0) {
        yield* this.runWithTools(session, messages, tools, signal, options);
      } else {
        yield* this.runTextOnly(session, messages, signal, options);
      }
    } finally {
      this.state.isStreaming = false;
      this.state.abortController = null;
    }
  }
  /**
   * Stop the current streaming response.
   */
  stopStreaming() {
    if (this.state.abortController) {
      this.state.abortController.abort();
      this.state.abortController = null;
    }
    this.state.isStreaming = false;
  }
  /**
   * Check if currently streaming.
   */
  get isStreaming() {
    return this.state.isStreaming;
  }
  // --------------------------------------------------------------------------
  // Tool Management
  // --------------------------------------------------------------------------
  /**
   * Register a custom tool handler.
   */
  registerTool(name, handler) {
    this.customTools.set(name, handler);
    this.toolExecutor.register(name, handler);
  }
  /**
   * Get all available tool definitions (from adapter + custom).
   */
  getAvailableTools() {
    const adapterTools = _nullishCoalesce(_optionalChain([this, 'access', _40 => _40.opts, 'access', _41 => _41.toolAdapter, 'optionalAccess', _42 => _42.getAvailableTools, 'call', _43 => _43()]), () => ( []));
    const customToolDefs = [];
    return [...adapterTools, ...customToolDefs];
  }
  /**
   * Execute a tool call directly (for manual/testing use).
   */
  async executeTool(call) {
    return this.toolExecutor.execute(call);
  }
  // --------------------------------------------------------------------------
  // Settings
  // --------------------------------------------------------------------------
  updateSettings(settings) {
    this.state.settings = { ...this.state.settings, ...settings };
  }
  getSettings() {
    return { ...this.state.settings };
  }
  // --------------------------------------------------------------------------
  // Internal Streaming Implementations
  // --------------------------------------------------------------------------
  async *runWithTools(session, messages, tools, signal, _options) {
    let assistantText = "";
    let assistantMessageId = `assistant-${Date.now()}`;
    const result = await this.agentLoop.run(session, messages, tools, signal);
    if (result.text) {
      assistantText = result.text;
      yield { type: "text-delta", text: result.text };
    }
    const assistantMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: assistantText,
      timestamp: Date.now()
    };
    session.messages.push(assistantMessage);
    await this.saveSession(session);
    yield { type: "finish", reason: "complete" };
  }
  async *runTextOnly(session, messages, signal, _options) {
    const adapterMessages = messages.map((m) => ({
      role: m.role,
      content: m.content
    }));
    let assistantText = "";
    const assistantMessageId = `assistant-${Date.now()}`;
    try {
      for await (const chunk of this.opts.llmAdapter.streamChat(
        adapterMessages,
        signal
      )) {
        if (signal.aborted) break;
        assistantText += chunk;
        yield { type: "text-delta", text: chunk };
      }
      const assistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: assistantText,
        timestamp: Date.now()
      };
      session.messages.push(assistantMessage);
      await this.saveSession(session);
      if (!signal.aborted) {
        yield { type: "finish", reason: "complete" };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      yield { type: "error", message };
    }
  }
  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  registerAdapterTools(adapter) {
    const tools = adapter.getAvailableTools();
    for (const tool2 of tools) {
      this.toolExecutor.register(
        tool2.name,
        (args) => adapter.executeTool({ id: `tool-${Date.now()}`, name: tool2.name, args })
      );
    }
  }
}, _class4);









exports.AgentLoop = AgentLoop; exports.ChatEngine = ChatEngine; exports.DemoToolAdapter = DemoToolAdapter; exports.LocalStoragePersistenceAdapter = LocalStoragePersistenceAdapter; exports.MemoryPersistenceAdapter = MemoryPersistenceAdapter; exports.ToolExecutor = ToolExecutor; exports.VercelLLMAdapter = VercelLLMAdapter; exports.createProviderProfile = createProviderProfile;
//# sourceMappingURL=index.cjs.map