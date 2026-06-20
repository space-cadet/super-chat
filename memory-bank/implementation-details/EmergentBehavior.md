# Implementation Details: Emergent Behavior & Independent Agent Lifecycles

*Created: 2026-06-20 14:40 IST*
*Last Updated: 2026-06-20 14:40 IST*
*Related Tasks: T6 (Phase B/C)*

## Overview

Phase A of T6 (MVP) implemented topology-aware multi-agent dispatch with user-initiated messages. Phases B and C introduce **independent agent lifecycles** — the core of the "many-body physics" vision.

**Key shift**: From "user asks, agents respond" to "agents live, interact, and exhibit emergent behavior."

## Phase B: Independent Agent Lifecycles

### The AgentProcess

Currently, agents are passive — they only act when the user sends a message. Phase B makes them active:

```typescript
interface AgentProcess {
  id: string;
  name: string;
  color: string;
  engine: ChatEngine;
  
  // Agent's own async loop
  start(): void;
  stop(): void;
  
  // Check inbox, decide what to do
  processInbox(): Promise<void>;
  
  // Send a message to another agent (initiated by this agent!)
  sendMessage(toAgentId: string, content: string): Promise<void>;
  
  // Internal state
  state: AgentState;
}

interface AgentState {
  // What this agent is "thinking about"
  currentFocus?: string;
  // Accumulated preferences over time
  preferences: Record<string, number>;
  // Mood / energy level (affects response probability)
  energy: number; // 0.0 - 1.0
  // Memory of past interactions
  memory: AgentMemory[];
}
```

### The Agent Loop

```typescript
class AgentProcess {
  private loopInterval: ReturnType<typeof setInterval>;
  
  start() {
    // Every few seconds, check inbox and decide what to do
    this.loopInterval = setInterval(() => {
      this.processInbox();
    }, 5000); // 5 second polling (configurable)
  }
  
  async processInbox() {
    const unread = this.inbox.getUnread(this.id);
    if (unread.length === 0) return;
    
    // Agent "decides" whether to respond based on:
    // 1. Energy level (tired agents may ignore)
    // 2. Relevance to current focus
    // 3. Randomness (simulate spontaneity)
    
    const decision = await this.decide(unread);
    if (decision.shouldRespond) {
      const response = await this.engine.sendMessage(decision.prompt);
      
      // Send to neighbors (not just user!)
      for (const neighborId of this.topology.neighbors(this.id)) {
        await this.sendMessage(neighborId, response.content);
      }
    }
    
    this.inbox.markRead(this.id);
  }
}
```

### Agent-Initiated Communication

This is the breakthrough: agents can talk to each other **without the user prompting**.

```typescript
// Agent A decides to ask Agent B something
async function agentInitiatedGossip() {
  const agentA = orchestrator.getAgent("sage");
  const agentB = orchestrator.getAgent("cloudy");
  
  // Agent A has its own goal
  const goal = "I want to understand quantum field theory better.";
  
  // Agent A decides Agent B might know
  await agentA.sendMessage(agentB.id, 
    `Hey ${agentB.name}, I'm working on: ${goal}. Do you have any insights?`
  );
  
  // Agent B will receive this in its inbox and may respond
  // ...in its own time, not synchronously
}
```

## Phase C: Emergent Dynamics

### Observable Phenomena

With independent agents and local topology, we can observe:

#### 1. Consensus Formation

```typescript
function detectConsensus(responses: AgentResponse[]): boolean {
  // All agents say roughly the same thing
  const embeddings = await embedAll(responses);
  const avgSimilarity = cosineSimilarityMatrix(embeddings);
  return avgSimilarity > 0.85; // threshold
}
```

- **Ring topology**: Consensus takes ~N/2 rounds (information must travel around the ring)
- **Fully connected**: Consensus in 1 round (everyone sees everything immediately)
- **Star topology**: Hub drives consensus, leaves follow

#### 2. Polarization

```typescript
function detectPolarization(responses: AgentResponse[]): boolean {
  // Two clusters with opposite views
  const clusters = clusterResponses(responses);
  return clusters.length === 2 && clustersAreDivergent(clusters);
}
```

- Occurs when topology creates echo chambers
- Ring topology with strong initial disagreement → stable polarization
- Adding long-range edges (small-world) → breaks polarization

#### 3. Oscillation

```typescript
function detectOscillation(history: AgentResponse[][]): boolean {
  // Opinions flip back and forth over time
  return hasPeriodicity(history, period = 2);
}
```

- Agents alternate between two states
- Classic example: "majority rule" dynamics on ring topology
- Requires memory (agents remember previous round)

#### 4. Phase Transitions

```typescript
function detectPhaseTransition(
  before: CollectiveState,
  after: CollectiveState
): 'order-to-chaos' | 'chaos-to-order' | 'none' {
  const orderBefore = calculateOrderParameter(before);
  const orderAfter = calculateOrderParameter(after);
  
  if (orderBefore > 0.8 && orderAfter < 0.2) return 'order-to-chaos';
  if (orderBefore < 0.2 && orderAfter > 0.8) return 'chaos-to-order';
  return 'none';
}
```

- Sudden shift from ordered (consensus) to chaotic (disagreement)
- Triggered by: new information, topology change, agent removal
- Analogous to physical phase transitions (Ising model)

### Collective State Metrics

```typescript
interface CollectiveState {
  // Order parameter: 0 = chaos, 1 = perfect consensus
  order: number;
  
  // Entropy: high = diverse opinions, low = uniform
  entropy: number;
  
  // Clustering: how many opinion clusters exist
  clusterCount: number;
  
  // Activity: how many agents are "active" (not idle)
  activityRate: number;
  
  // Messages per round
  messageRate: number;
}
```

## Architecture for Emergence

### Event-Driven Design

```typescript
interface AgentEvent {
  type: 'inbox-update' | 'timer' | 'state-change' | 'topology-change';
  agentId: string;
  payload: unknown;
}

class EmergentOrchestrator extends ManyBodyOrchestrator {
  private eventBus: EventEmitter;
  
  constructor(options) {
    super(options);
    this.eventBus = new EventEmitter();
    
    // When any agent's inbox updates, notify neighbors
    this.eventBus.on('inbox-update', (event) => {
      const neighbors = this.topology.neighbors(event.agentId);
      for (const neighborId of neighbors) {
        this.notifyAgent(neighborId, event);
      }
    });
  }
  
  // Agents can subscribe to events
  subscribeAgent(agentId: string, handler: (event: AgentEvent) => void) {
    this.eventBus.on(`agent:${agentId}`, handler);
  }
}
```

### State Persistence

Agents need memory to exhibit emergent behavior:

```typescript
interface AgentMemory {
  id: string;
  timestamp: number;
  content: string;
  withAgentId: string; // who this memory is about
  sentiment: number; // -1 (negative) to +1 (positive)
}

class PersistentAgentState {
  private db: SQLiteDatabase; // or localStorage in browser
  
  async addMemory(agentId: string, memory: AgentMemory) {
    await this.db.insert('memories', memory);
  }
  
  async getMemoriesAbout(agentId: string, targetAgentId: string): Promise<AgentMemory[]> {
    return this.db.select('memories', {
      where: { agentId, withAgentId: targetAgentId },
      orderBy: 'timestamp DESC',
      limit: 10,
    });
  }
}
```

## Use Cases

### 1. Research Collaboration
- Multiple specialized agents (theorist, experimentalist, mathematician)
- They discuss a problem asynchronously
- Consensus emerges (or doesn't) over time
- Human observes and intervenes at key moments

### 2. Debate Simulation
- Two agents with opposing views
- Debate continues until consensus or timeout
- Human can observe argument quality, identify fallacies
- Topology: star (human as hub, agents as leaves)

### 3. Creative Writing
- Agents write alternate chapters of a story
- Each agent sees only the previous chapter (ring topology)
- Story evolves with emergent themes
- Human edits the final product

### 4. Debugging Team
- Code agent, test agent, review agent
- Each works on its own aspect
- They report findings to each other
- Topology: fully connected (all need full context)

## Implementation Roadmap

### Phase B (Weeks 1-2)
- [ ] `AgentProcess` class with async loop
- [ ] `processInbox()` decision logic
- [ ] `sendMessage()` agent-initiated communication
- [ ] `AgentState` with energy, focus, memory
- [ ] Event bus for inter-agent notifications
- [ ] Tests: 2 agents gossiping without user prompt

### Phase C (Weeks 3-4)
- [ ] `CollectiveState` metrics
- [ ] Consensus detection
- [ ] Polarization detection
- [ ] Oscillation detection
- [ ] Phase transition detection
- [ ] Visualization: real-time topology + message flow graph
- [ ] Tests: 5 agents on ring topology, observe consensus formation

## Design Principles

1. **Autonomy**: Agents make their own decisions. No puppet strings.
2. **Locality**: Agents act on local information only. No global coordinator.
3. **Observability**: Must be able to see what's happening. Debuggability is crucial.
4. **Safety**: Agents can be paused, reset, or terminated. No runaway processes.
5. **Ergodicity**: Given enough time, the system explores all accessible states. (We want to see what happens.)

## Files

- Future: `src/core/AgentProcess.ts` — Independent agent lifecycle
- Future: `src/core/EmergentOrchestrator.ts` — Event-driven orchestrator
- Future: `src/core/CollectiveState.ts` — Metrics and detection
- Future: `src/core/AgentState.ts` — Memory, preferences, energy

## Related

- `Orchestrator.md` — Phase A: ManyBodyOrchestrator (user-initiated)
- `Topology.md` — Graph theory, topology implementations
- `AgentLoop.md` — How each agent's ChatEngine works internally
