# Implementation Details: ManyBodyOrchestrator

*Created: 2026-06-20 14:40 IST*
*Last Updated: 2026-06-20 14:40 IST*
*Related Tasks: T6, T7*

## Overview

The `ManyBodyOrchestrator` is the multi-agent coordination engine that manages multiple `ChatEngine` instances, routing messages according to a `Topology` and supporting three execution modes: sequential, parallel, and debate.

**Key principle**: No central controller. Topology defines message flow, not a manager.

## Architecture Diagram

```
User
 │
 ▼
ManyBodyOrchestrator.userMessage(text)
 │
 ├─ Topology: who sees this message?
 ├─ InboxRouter: route to each agent's inbox
 │
 ├─ Sequential: for each agent → run → yield response
 ├─ Parallel: Promise.all → yield as they complete
 └─ Debate: round 1 → route to inboxes → round 2 → ...
 │
 ▼
AgentResponse[] (each tagged with agentId, name, color)
```

## Core Components

### 1. OrchestratorAgent

Each agent is an independent entity with its own `ChatEngine`:

```typescript
interface OrchestratorAgent {
  id: string;        // e.g., "sage", "cloudy", "ember"
  name: string;       // Display name
  color: string;      // Hex color for UI
  engine: ChatEngine; // Own LLM adapter + tool executor
}
```

### 2. ManyBodyOrchestrator

```typescript
class ManyBodyOrchestrator {
  constructor(options: {
    agents: OrchestratorAgent[];
    topology: Topology;
    mode: 'sequential' | 'parallel' | 'debate';
    debateRounds?: number;  // default: 2
    inbox?: AgentInbox;     // default: InMemoryAgentInbox
  });

  // User sends a message — routed by topology
  async *userMessage(text: string): AsyncGenerator<AgentResponse>;

  // Direct access to inbox (for Phase B: agent-initiated)
  getInbox(): InboxRouter;
}
```

### 3. Message Flow

```
User says "hello"
  │
  ▼
InboxRouter.userBroadcast("hello")
  │
  ├─ Topology: neighbors(USER_ID) = ["sage", "cloudy", "ember"]
  ├─ (Star topology: only hub sees user)
  ├─ (Ring topology: only 2 neighbors see user)
  │
  ▼
For each visible agent:
  InboxRouter.sendTo(agentId, userMessage)
    │
    ▼
  Agent's inbox accumulates message
  Agent's ChatEngine processes → response
  Response yielded to user
  Response also added to agent's inbox (for other agents to see in next round)
```

## Execution Modes

### Sequential Mode

```typescript
for (const agent of visibleAgents) {
  const response = await agent.engine.sendMessage(userMessage);
  yield response;
  // Next agent sees this response in its inbox
}
```

- Each agent responds one after another
- Agent N sees responses from agents 1..N-1
- Useful for building on previous answers
- **Time**: O(N × T) where T = average response time

### Parallel Mode

```typescript
const promises = visibleAgents.map(agent =>
  agent.engine.sendMessage(userMessage)
);
for (const response of await Promise.all(promises)) {
  yield response;
}
```

- All agents respond simultaneously
- No agent sees other agents' responses
- **Time**: O(T) — only as slow as slowest agent
- Error isolation: one failure doesn't block others

### Debate Mode

```typescript
// Round 1: all agents respond to user
for (const agent of visibleAgents) {
  yield await agent.engine.sendMessage(userMessage);
}

// Round 2..N: agents see each other's responses
for (let round = 2; round <= debateRounds; round++) {
  const roundPrompt = buildDebatePrompt(inbox, round);
  for (const agent of visibleAgents) {
    yield await agent.engine.sendMessage(roundPrompt);
  }
}
```

- Round 1: agents respond to user's question
- Round 2+: composite prompt includes all previous round's responses
- Agents can agree, disagree, or build on each other
- **Time**: O(R × N × T) where R = debate rounds

## Error Isolation

```typescript
try {
  const response = await agent.engine.sendMessage(...);
  yield response;
} catch (error) {
  // Log error but don't block other agents
  yield {
    agentId: agent.id,
    agentName: agent.name,
    message: {
      role: 'assistant',
      content: `[ERROR] ${error.message}`,
    },
    tokenEstimate: 0,
  };
}
```

- Per-agent try/catch
- Failed agents yield `[ERROR]` instead of crashing
- Other agents continue unaffected
- Orchestrator completes even if all agents fail

## Design Decisions

### Why AsyncGenerator over Promise<Array>?

Real-time streaming. As soon as one agent responds (in parallel mode) or completes (in sequential mode), we yield it. The UI doesn't wait for all agents to finish.

### Why separate inboxes per agent?

Topology awareness. In a ring topology, agent A sees only its neighbors. The inbox enforces this visibility constraint. A shared message array would break locality.

### Why is the user special?

The user is a broadcast node. All topologies allow user messages by default (via `canReceiveFrom(agentId, USER_ID)`). This ensures the user can always reach at least some agents, even in restrictive topologies like a directed ring.

### Why no central controller?

The many-body philosophy. If we had a `Manager` class that decided who speaks when, we'd be back to mean-field. The topology IS the controller. The orchestrator just executes the routing rules.

## Testing Strategy

- **Unit tests** (18 tests): Mock `ChatEngine`, verify topology routing, mode behavior, error isolation
- **Real-world tests**: Actual LLM API calls with 2-3 agents, cheap models, physics prompts
- **Observability**: Each response tagged with agentId, timestamp, round number (debate mode)

## Future: Phase B (Independent Lifecycles)

Currently, agents only respond when the user sends a message. Phase B adds:

- `AgentProcess` — each agent runs its own async loop
- `processInbox()` — agent checks inbox, decides whether to respond
- `Agent.sendMessage(toAgentId, content)` — agent-initiated communication
- Event-driven: `onInboxUpdate` → agent decides → may or may not respond

This is where emergent behavior begins: agents can gossip, form coalitions, or ignore messages based on their own internal state.

## Future: Phase C (Emergent Dynamics)

- **State evolution**: Agents have memory, preferences, "mood" that changes over time
- **Topology evolution**: Edges can be added/removed dynamically
- **Observable phenomena**: Consensus detection, oscillation detection, polarization metrics
- **Phase transitions**: Sudden shifts from chaotic to ordered behavior

## Files

- `src/core/Orchestrator.ts` — Main implementation
- `src/core/Orchestrator.test.ts` — 18 unit tests
- `src/test/real-world-orchestrator.ts` — Real-world API tests

## Related

- `AgentLoop.md` — How each agent's ChatEngine works internally
- `Topology.md` — Graph theory, topology implementations, routing algorithms
- `EmergentBehavior.md` — Phase B/C design for independent agents
