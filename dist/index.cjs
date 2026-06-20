"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } async function _asyncNullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return await rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _class; var _class2; var _class3; var _class4; var _class5;require('./chunk-EMMSS5I5.cjs');

// src/core/ToolExecutor.ts
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

// src/core/tokenEstimator.ts
var TOKEN_ESTIMATE_RATIO = 4;
function estimateTokens(text) {
  return Math.ceil(text.length / TOKEN_ESTIMATE_RATIO);
}

// src/core/AgentLoop.ts
var defaultFormatter = (toolName, result) => {
  if (result.error) {
    return `Error: ${result.error}`;
  }
  switch (toolName) {
    case "search_web": {
      try {
        const data = JSON.parse(_nullishCoalesce(result.content, () => ( "[]")));
        if (!Array.isArray(data) || data.length === 0) return "No search results found.";
        let md = `Found ${data.length} result${data.length !== 1 ? "s" : ""}:

`;
        for (const item of data) {
          md += `- **${item.title}**
  ${item.snippet}
  <${item.url}>

`;
        }
        return md.trim();
      } catch (e2) {
        return _nullishCoalesce(result.content, () => ( "Search completed."));
      }
    }
    case "get_weather": {
      try {
        const data = JSON.parse(_nullishCoalesce(result.content, () => ( "{}")));
        return `**${data.location}**

- Temperature: ${data.temperature}${data.units}
- Condition: ${data.condition}
- Humidity: ${data.humidity}
- Forecast: ${data.forecast}`;
      } catch (e3) {
        return _nullishCoalesce(result.content, () => ( "Weather data unavailable."));
      }
    }
    case "fetch_arxiv": {
      try {
        const data = JSON.parse(_nullishCoalesce(result.content, () => ( "[]")));
        if (!Array.isArray(data) || data.length === 0) return "No papers found.";
        let md = `Found ${data.length} paper${data.length !== 1 ? "s" : ""}:

`;
        for (const paper of data) {
          md += `- **${paper.title}** (${paper.year})
`;
          md += `  Authors: ${paper.authors.join(", ")}
`;
          md += `  ${paper.snippet}
`;
          md += `  <${paper.url}>

`;
        }
        return md.trim();
      } catch (e4) {
        return _nullishCoalesce(result.content, () => ( "arXiv search completed."));
      }
    }
    case "calculate":
      return `Result: ${result.content}`;
    default:
      return _nullishCoalesce(result.content, () => ( JSON.stringify(result, null, 2)));
  }
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
   * Yields StreamEvent in real-time as the loop progresses:
   *   - text-delta: as text arrives from the LLM
   *   - tool-call: when a tool call is detected
   *   - tool-result: after tool execution completes
   *   - pending-approval: when approval is needed (if not autoApply)
   *   - step-finish: when a step completes (tools executed, messages updated)
   *
   * Returns AgentLoopResult when the loop finishes.
   *
   * @param session - Chat session (for metadata)
   * @param messages - Conversation messages (system + history + user)
   * @param tools - Tool definitions to make available to the LLM
   * @param signal - AbortSignal for cancellation
   */
  async *run(session, messages, tools, signal) {
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
            yield event;
            break;
          case "tool-call":
            pendingCalls.push(event.call);
            yield event;
            break;
          case "tool-error":
            console.warn(
              `[AgentLoop] tool-error from stream: ${event.callId} \u2014 ${event.error}`
            );
            yield event;
            break;
          case "error":
            throw new Error(event.message);
          // finish, step-finish from stream are bookkeeping
          default:
            break;
        }
      }
      if (_optionalChain([signal, 'optionalAccess', _5 => _5.aborted])) {
        console.log(`[AgentLoop] aborted during step ${step}`);
        return {
          text: fullText,
          tokenEstimate: estimateTokens(fullText),
          stepsTaken: step + 1
        };
      }
      if (pendingCalls.length === 0) {
        console.log(
          `[AgentLoop] done \u2014 no tool calls at step ${step}, ${fullText.length} chars`
        );
        return {
          text: fullText,
          tokenEstimate: estimateTokens(fullText),
          stepsTaken: step + 1
        };
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
          yield { type: "pending-approval", call };
          result = await _asyncNullishCoalesce(await this.opts.requestApproval(call), async () => ( {
            success: false,
            error: "User rejected the tool call"
          }));
        }
        console.log(
          `[AgentLoop] step ${step} tool-result:`,
          _nullishCoalesce(result.error, () => ( "success"))
        );
        yield { type: "tool-result", callId: call.id, result };
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
          content: JSON.stringify(toolParts),
          timestamp: Date.now()
        };
      });
      currentMessages = [...currentMessages, assistantMsg, ...toolMessages];
      yield { type: "step-finish", step: step + 1 };
    }
    return {
      text: fullText,
      tokenEstimate: estimateTokens(fullText),
      stepsTaken: maxSteps
    };
  }
};

// src/core/Topology.ts
var USER_ID = "__user__";
var FullyConnectedTopology = class {
  
  constructor(agentIds) {
    this.agentIds = [...agentIds];
  }
  neighbors(agentId) {
    return this.agentIds.filter((id) => id !== agentId);
  }
  allAgentIds() {
    return [...this.agentIds];
  }
  canReceiveFrom(agentId, fromId) {
    return fromId !== agentId && this.agentIds.includes(agentId);
  }
};
var RingTopology = class {
  
  constructor(agentIds) {
    if (agentIds.length < 2) {
      throw new Error("RingTopology requires at least 2 agents");
    }
    this.agentIds = [...agentIds];
  }
  neighbors(agentId) {
    const idx = this.agentIds.indexOf(agentId);
    if (idx === -1) return [];
    const n = this.agentIds.length;
    const prev = this.agentIds[(idx - 1 + n) % n];
    const next = this.agentIds[(idx + 1) % n];
    return [prev, next];
  }
  allAgentIds() {
    return [...this.agentIds];
  }
  canReceiveFrom(agentId, fromId) {
    if (fromId === USER_ID) return this.agentIds.includes(agentId);
    return this.neighbors(agentId).includes(fromId);
  }
};
var StarTopology = class {
  
  
  constructor(hubId, leafIds) {
    if (leafIds.includes(hubId)) {
      throw new Error("Hub ID cannot also be a leaf ID");
    }
    this.hubId = hubId;
    this.leafIds = [...leafIds];
  }
  neighbors(agentId) {
    if (agentId === this.hubId) {
      return [...this.leafIds];
    }
    if (this.leafIds.includes(agentId)) {
      return [this.hubId];
    }
    return [];
  }
  allAgentIds() {
    return [this.hubId, ...this.leafIds];
  }
  canReceiveFrom(agentId, fromId) {
    if (fromId === USER_ID) return this.allAgentIds().includes(agentId);
    return this.neighbors(agentId).includes(fromId);
  }
};

// src/core/AgentInbox.ts
var InMemoryAgentInbox = (_class2 = class {constructor() { _class2.prototype.__init2.call(this); }
  __init2() {this.store = /* @__PURE__ */ new Map()}
  push(message) {
    const recipient = message.to;
    if (!this.store.has(recipient)) {
      this.store.set(recipient, []);
    }
    this.store.get(recipient).push(message);
  }
  messages(agentId) {
    return _nullishCoalesce(this.store.get(agentId), () => ( []));
  }
  messagesForRound(agentId, round) {
    return this.messages(agentId).filter((m) => m.round === round);
  }
  clear(agentId) {
    this.store.delete(agentId);
  }
  clearAll() {
    this.store.clear();
  }
}, _class2);
var InboxRouter = class {
  
  
  constructor(opts) {
    this.topology = opts.topology;
    this.inbox = _nullishCoalesce(opts.inbox, () => ( new InMemoryAgentInbox()));
  }
  /** Send a message from one entity to another, respecting topology. */
  route(message) {
    const { from, to } = message;
    if (to !== "*") {
      if (this.topology.canReceiveFrom(to, from)) {
        this.inbox.push({ ...message, to });
      }
      return;
    }
    for (const agentId of this.topology.allAgentIds()) {
      if (this.topology.canReceiveFrom(agentId, from)) {
        this.inbox.push({ ...message, to: agentId });
      }
    }
  }
  /** Send a user message to all agents that can see the user. */
  broadcastUserMessage(content, round) {
    const message = {
      from: USER_ID,
      to: "*",
      content,
      timestamp: Date.now(),
      round
    };
    this.route(message);
  }
  /** Send an agent's response to its neighbors. */
  broadcastAgentResponse(fromAgentId, content, round) {
    const message = {
      from: fromAgentId,
      to: "*",
      content,
      timestamp: Date.now(),
      round
    };
    this.route(message);
  }
  /** Get all messages visible to a specific agent. */
  getMessages(agentId) {
    return this.inbox.messages(agentId);
  }
  /** Get messages for a specific round. */
  getMessagesForRound(agentId, round) {
    return this.inbox.messagesForRound(agentId, round);
  }
  /** Clear all inboxes. */
  clear() {
    this.inbox.clearAll();
  }
};

// src/core/Orchestrator.ts
async function collectAgentResponse(entry, text) {
  if (!entry.engine.getActiveSession()) {
    entry.engine.createSession(`Session: ${entry.name}`);
  }
  const events = [];
  let fullText = "";
  let errorMessage = null;
  for await (const event of entry.engine.sendMessage(text)) {
    events.push(event);
    if (event.type === "text-delta") {
      fullText += event.text;
    } else if (event.type === "error") {
      errorMessage = event.message;
    }
  }
  if (errorMessage) {
    throw new Error(errorMessage);
  }
  const message = {
    id: `msg-${entry.id}-${Date.now()}`,
    role: "assistant",
    content: fullText,
    timestamp: Date.now()
  };
  return {
    agentId: entry.id,
    agentName: entry.name,
    message
  };
}
function makeErrorResponse(entry, err) {
  const message = {
    id: `error-${entry.id}-${Date.now()}`,
    role: "assistant",
    content: `[ERROR] ${err instanceof Error ? err.message : String(err)}`,
    timestamp: Date.now()
  };
  return {
    agentId: entry.id,
    agentName: entry.name,
    message
  };
}
var ManyBodyOrchestrator = class {
  
  
  
  
  
  constructor(opts) {
    this.agents = new Map(opts.agents.map((a) => [a.id, a]));
    this.topology = opts.topology;
    this.mode = _nullishCoalesce(opts.mode, () => ( "parallel"));
    this.debateRounds = _nullishCoalesce(opts.debateRounds, () => ( 2));
    const topologyIds = new Set(opts.topology.allAgentIds());
    for (const agent of opts.agents) {
      if (!topologyIds.has(agent.id)) {
        throw new Error(
          `Agent "${agent.id}" not found in topology. Known IDs: ${Array.from(topologyIds).join(", ")}`
        );
      }
    }
    this.router = new InboxRouter({
      topology: opts.topology,
      inbox: _nullishCoalesce(opts.inbox, () => ( new InMemoryAgentInbox()))
    });
  }
  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------
  /**
   * Send a user message to the orchestrator.
   *
   * Yields AgentResponse objects as agents produce them.
   * The order depends on the mode:
   *   - sequential: one at a time, in agent order
   *   - parallel: as they complete (fastest first)
   *   - debate: round by round, all agents per round
   */
  async *userMessage(text) {
    this.router.broadcastUserMessage(text);
    switch (this.mode) {
      case "sequential":
        yield* this.runSequential(text);
        break;
      case "parallel":
        yield* this.runParallel(text);
        break;
      case "debate":
        yield* this.runDebate(text);
        break;
    }
  }
  /**
   * Dispatch a user message to all agents that can see the user,
   * without collecting responses. Used when you want to populate
   * agent sessions before a subsequent operation.
   */
  dispatch(text) {
    this.router.broadcastUserMessage(text);
    for (const [id, entry] of this.agents) {
      if (!this.topology.canReceiveFrom(id, USER_ID)) continue;
      if (!entry.engine.getActiveSession()) {
        entry.engine.createSession(`Session: ${entry.name}`);
      }
      void this.runAgentAndIgnore(entry, text);
    }
  }
  /** Get the IDs of agents that can see the user. */
  getVisibleAgentIds() {
    return this.topology.allAgentIds().filter((id) => this.topology.canReceiveFrom(id, USER_ID));
  }
  /** Get all agent IDs in the topology. */
  getAllAgentIds() {
    return this.topology.allAgentIds();
  }
  /** Get an agent by ID. */
  getAgent(id) {
    return this.agents.get(id);
  }
  /** Access the inbox router (for advanced use cases). */
  getRouter() {
    return this.router;
  }
  // --------------------------------------------------------------------------
  // Mode Implementations
  // --------------------------------------------------------------------------
  /**
   * Sequential mode: agents respond one after another.
   * Each agent sees the original user message.
   * Responses are broadcast to neighbors via the inbox.
   */
  async *runSequential(text) {
    for (const [id, entry] of this.agents) {
      if (!this.topology.canReceiveFrom(id, USER_ID)) continue;
      try {
        const response = await collectAgentResponse(entry, text);
        this.router.broadcastAgentResponse(
          response.agentId,
          response.message.content
        );
        yield response;
      } catch (err) {
        yield makeErrorResponse(entry, err);
      }
    }
  }
  /**
   * Parallel mode: all visible agents respond simultaneously.
   * Results are yielded as they complete (fastest-first order).
   */
  async *runParallel(text) {
    const visibleAgents = Array.from(this.agents.entries()).filter(
      ([id]) => this.topology.canReceiveFrom(id, USER_ID)
    );
    if (visibleAgents.length === 0) return;
    const pending = /* @__PURE__ */ new Map();
    for (const [id, entry] of visibleAgents) {
      pending.set(
        id,
        collectAgentResponse(entry, text).catch(
          (err) => makeErrorResponse(entry, err)
        )
      );
    }
    while (pending.size > 0) {
      const entries = Array.from(pending.entries());
      const result = await Promise.race(
        entries.map(async ([agentId, promise]) => {
          const response = await promise;
          return { agentId, response };
        })
      );
      pending.delete(result.agentId);
      if (!result.response.message.content.startsWith("[ERROR]")) {
        this.router.broadcastAgentResponse(
          result.response.agentId,
          result.response.message.content
        );
      }
      yield result.response;
    }
  }
  /**
   * Debate mode: multiple rounds of agent interaction.
   *
   * Round 0: All visible agents respond to the original user message.
   * Round N: Each agent receives its neighbors' responses from round N-1
   *          and responds again.
   */
  async *runDebate(text) {
    for (let round = 0; round < this.debateRounds; round++) {
      const roundResponses = [];
      for (const [id, entry] of this.agents) {
        if (round === 0 && !this.topology.canReceiveFrom(id, USER_ID)) {
          continue;
        }
        const prompt = round === 0 ? text : this.buildDebatePrompt(id, text, round);
        try {
          const response = await collectAgentResponse(entry, prompt);
          this.router.broadcastAgentResponse(
            response.agentId,
            response.message.content,
            round
          );
          roundResponses.push(response);
        } catch (err) {
          roundResponses.push(makeErrorResponse(entry, err));
        }
      }
      for (const response of roundResponses) {
        yield response;
      }
    }
  }
  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  buildDebatePrompt(agentId, originalQuestion, round) {
    const neighborMessages = this.router.getMessagesForRound(
      agentId,
      round - 1
    );
    let prompt = "";
    if (neighborMessages.length > 0) {
      prompt += "Here are responses from your neighbors in the previous round:\n\n";
      for (const msg of neighborMessages) {
        prompt += `[${msg.from}]: ${msg.content}
`;
      }
      prompt += "\n---\n\n";
    }
    prompt += `Original question: ${originalQuestion}

`;
    prompt += `Please share your response for round ${round + 1}.`;
    return prompt;
  }
  async runAgentAndIgnore(entry, text) {
    try {
      for await (const _event of entry.engine.sendMessage(text)) {
      }
    } catch (e5) {
    }
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
      resourceName: _nullishCoalesce(_optionalChain([baseUrl, 'optionalAccess', _6 => _6.split, 'call', _7 => _7("."), 'access', _8 => _8[0]]), () => ( ""))
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
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const uiMessages = this.toUIMessages(nonSystemMessages);
    const result = _ai.streamText.call(void 0, {
      model,
      system: this.systemPrompt,
      messages: await _ai.convertToModelMessages.call(void 0, uiMessages),
      abortSignal: signal
    });
    for await (const chunk of result.textStream) {
      if (_optionalChain([signal, 'optionalAccess', _9 => _9.aborted])) break;
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
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const uiMessages = this.toUIMessages(nonSystemMessages);
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
      if (_optionalChain([signal, 'optionalAccess', _10 => _10.aborted])) break;
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
    if (!_optionalChain([signal, 'optionalAccess', _11 => _11.aborted])) {
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
    name: _nullishCoalesce(_optionalChain([options, 'optionalAccess', _12 => _12.name]), () => ( `${provider} / ${model}`)),
    provider,
    model,
    apiKey,
    baseUrl: _optionalChain([options, 'optionalAccess', _13 => _13.baseUrl]),
    models: _nullishCoalesce(_nullishCoalesce(_optionalChain([options, 'optionalAccess', _14 => _14.models]), () => ( defaultModels[provider])), () => ( [])),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

// src/adapters/MemoryPersistence.ts
var MemoryPersistenceAdapter = (_class3 = class {constructor() { _class3.prototype.__init3.call(this); }
  __init3() {this.sessions = /* @__PURE__ */ new Map()}
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
}, _class3);

// src/adapters/LocalStoragePersistence.ts
var STORAGE_KEY = "super-chat:sessions";
var SESSION_PREFIX = "super-chat:session:";
var LocalStoragePersistenceAdapter = class {
  
  constructor(options) {
    this.maxSessions = _nullishCoalesce(_optionalChain([options, 'optionalAccess', _15 => _15.maxSessions]), () => ( 100));
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
          } catch (e6) {
          }
        }
      }
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (e7) {
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
var DemoToolAdapter = (_class4 = class {constructor() { _class4.prototype.__init4.call(this); }
  __init4() {this.tools = [
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
}, _class4);

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
var ChatEngine = (_class5 = class {
  
  
  
  
  __init5() {this.customTools = /* @__PURE__ */ new Map()}
  constructor(options) {;_class5.prototype.__init5.call(this);
    this.opts = options;
    this.toolExecutor = new ToolExecutor();
    if (options.toolAdapter) {
      this.registerAdapterTools(options.toolAdapter);
    }
    this.agentLoop = new AgentLoop({
      llmAdapter: options.llmAdapter,
      toolExecutor: this.toolExecutor,
      maxSteps: _nullishCoalesce(_optionalChain([options, 'access', _16 => _16.agentLoopOptions, 'optionalAccess', _17 => _17.maxSteps]), () => ( 5)),
      autoApply: _nullishCoalesce(_optionalChain([options, 'access', _18 => _18.agentLoopOptions, 'optionalAccess', _19 => _19.autoApply]), () => ( false))
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
      llmProvider: _optionalChain([this, 'access', _20 => _20.opts, 'access', _21 => _21.llmAdapter, 'access', _22 => _22.getProviders, 'call', _23 => _23(), 'access', _24 => _24[0], 'optionalAccess', _25 => _25.id])
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
      this.state.activeSessionId = _nullishCoalesce(_optionalChain([this, 'access', _26 => _26.state, 'access', _27 => _27.sessions, 'access', _28 => _28[0], 'optionalAccess', _29 => _29.id]), () => ( null));
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
    const enableTools = _nullishCoalesce(_optionalChain([options, 'optionalAccess', _30 => _30.enableTools]), () => ( this.state.settings.enableTools));
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
    const adapterTools = _nullishCoalesce(_optionalChain([this, 'access', _31 => _31.opts, 'access', _32 => _32.toolAdapter, 'optionalAccess', _33 => _33.getAvailableTools, 'call', _34 => _34()]), () => ( []));
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
    const assistantMessageId = `assistant-${Date.now()}`;
    const startTime = performance.now();
    let firstChunkTime = null;
    const generator = this.agentLoop.run(session, messages, tools, signal);
    let result;
    try {
      while (true) {
        const { value, done } = await generator.next();
        if (done) {
          result = value;
          break;
        }
        if (value.type === "text-delta" && firstChunkTime === null) {
          firstChunkTime = performance.now();
        }
        if (value.type === "text-delta") {
          assistantText += value.text;
        }
        yield value;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      yield { type: "error", message };
      return;
    }
    const totalDurationMs = Math.round(performance.now() - startTime);
    const ttftMs = firstChunkTime ? Math.round(firstChunkTime - startTime) : totalDurationMs;
    if (result) {
      yield {
        type: "usage",
        promptTokens: 0,
        completionTokens: result.tokenEstimate,
        totalTokens: result.tokenEstimate
      };
      yield { type: "metrics", ttftMs, totalDurationMs };
      const assistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: assistantText,
        timestamp: Date.now(),
        tokenCount: result.tokenEstimate
      };
      session.messages.push(assistantMessage);
      await this.saveSession(session);
    }
    if (!signal.aborted) {
      yield { type: "finish", reason: "complete" };
    }
  }
  async *runTextOnly(session, messages, signal, _options) {
    const adapterMessages = messages.map((m) => ({
      role: m.role,
      content: m.content
    }));
    let assistantText = "";
    const assistantMessageId = `assistant-${Date.now()}`;
    const startTime = performance.now();
    let firstChunkTime = null;
    let chunkCount = 0;
    try {
      for await (const chunk of this.opts.llmAdapter.streamChat(
        adapterMessages,
        signal
      )) {
        if (signal.aborted) break;
        if (chunkCount === 0) {
          firstChunkTime = performance.now();
        }
        chunkCount++;
        assistantText += chunk;
        yield { type: "text-delta", text: chunk };
      }
      const totalDurationMs = Math.round(performance.now() - startTime);
      const ttftMs = firstChunkTime ? Math.round(firstChunkTime - startTime) : totalDurationMs;
      const tokenEstimate = Math.ceil(assistantText.length / 4);
      yield {
        type: "usage",
        promptTokens: 0,
        completionTokens: tokenEstimate,
        totalTokens: tokenEstimate
      };
      yield { type: "metrics", ttftMs, totalDurationMs };
      const assistantMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: assistantText,
        timestamp: Date.now(),
        tokenCount: tokenEstimate
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
        (args) => adapter.executeTool({
          id: `tool-${Date.now()}`,
          name: tool2.name,
          args
        })
      );
    }
  }
}, _class5);

















exports.AgentLoop = AgentLoop; exports.ChatEngine = ChatEngine; exports.DemoToolAdapter = DemoToolAdapter; exports.FullyConnectedTopology = FullyConnectedTopology; exports.InMemoryAgentInbox = InMemoryAgentInbox; exports.InboxRouter = InboxRouter; exports.LocalStoragePersistenceAdapter = LocalStoragePersistenceAdapter; exports.ManyBodyOrchestrator = ManyBodyOrchestrator; exports.MemoryPersistenceAdapter = MemoryPersistenceAdapter; exports.RingTopology = RingTopology; exports.StarTopology = StarTopology; exports.ToolExecutor = ToolExecutor; exports.USER_ID = USER_ID; exports.VercelLLMAdapter = VercelLLMAdapter; exports.createProviderProfile = createProviderProfile; exports.estimateTokens = estimateTokens;
//# sourceMappingURL=index.cjs.map