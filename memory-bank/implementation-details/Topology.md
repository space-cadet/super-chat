# Implementation Details: Topology System

*Created: 2026-06-20 14:40 IST*
*Last Updated: 2026-06-20 14:40 IST*
*Related Tasks: T6, T7*

## Overview

The Topology system defines visibility graphs between agents. It answers the fundamental question: **"Which agents can agent X see?"**

This is the "many-body" aspect: local coupling, not global broadcast. Agents interact with their neighbors, not everyone in the system.

## Core Interface

```typescript
export interface Topology {
  /** Return the list of agent IDs that `agentId` can directly communicate with. */
  neighbors(agentId: string): string[];

  /** Return all agent IDs known to this topology. */
  allAgentIds(): string[];

  /** Check if `agentId` can receive a message from `fromId`. */
  canReceiveFrom(agentId: string, fromId: string): boolean;
}

/** Special ID representing the human user in the topology. */
export const USER_ID = "__user__";
```

## Implemented Topologies

### 1. FullyConnectedTopology

```typescript
class FullyConnectedTopology implements Topology {
  constructor(agentIds: string[]);
}
```

**Graph**: Complete graph (every node connected to every other node)

**Visibility**:
- User sees all agents
- Each agent sees all other agents
- Each agent sees the user

**Use case**: Traditional multi-agent chat, brainstorming sessions, equal-footing discussions.

**Mathematical properties**:
- Degree: N-1 for all agents
- Diameter: 1 (any agent can reach any other in 1 hop)
- Clustering coefficient: 1 (fully connected)

### 2. RingTopology

```typescript
class RingTopology implements Topology {
  constructor(agentIds: string[]);
}
```

**Graph**: Cycle graph (each node connected to 2 neighbors)

**Visibility**:
- User sees all agents (broadcast)
- Each agent sees only its 2 neighbors (left and right in the ring)
- Agent does NOT see agents across the ring

**Use case**: Consensus formation, message passing, distributed computing analogies.

**Mathematical properties**:
- Degree: 2 for all agents
- Diameter: N/2 (for even N) or (N-1)/2 (for odd N)
- Clustering coefficient: 0 (no triangles)

**Example**: 3 agents [A, B, C] in a ring:
- A sees: B, C (user broadcast)
- B sees: A, C (user broadcast)
- C sees: A, B (user broadcast)
- But A's messages are only visible to B and C

### 3. StarTopology

```typescript
class StarTopology implements Topology {
  constructor(hubId: string, leafIds: string[]);
}
```

**Graph**: Star graph (one central node connected to all leaves)

**Visibility**:
- User sees all agents (broadcast to all)
- Hub sees all leaves and the user
- Each leaf sees only the hub and the user
- Leaves do NOT see each other

**Use case**: Mediated communication, centralized coordination, manager-worker patterns (but still flat — the hub is not a "manager", just a message relay).

**Mathematical properties**:
- Degree: N-1 for hub, 1 for leaves
- Diameter: 2 (hub to leaf in 1 hop, leaf to leaf via hub in 2 hops)
- Clustering coefficient: 0 for leaves, 1 for hub

**Example**: Hub = A, leaves = [B, C, D]:
- A sees: B, C, D, user
- B sees: A, user
- C sees: A, user
- D sees: A, user

## Routing Algorithm

```typescript
class InboxRouter {
  constructor(topology: Topology, inbox: AgentInbox);

  // Route a message to all agents who can see the sender
  route(fromId: string, message: AgentMessage): void {
    const targets = this.topology.allAgentIds();
    for (const targetId of targets) {
      if (targetId === fromId) continue; // Don't send to self
      if (this.topology.canReceiveFrom(targetId, fromId)) {
        this.inbox.addMessage(targetId, message);
      }
    }
  }
}
```

## Why Topology Matters

### Mean-Field vs Many-Body

| Property | Mean-Field (Fully Connected) | Many-Body (Ring/Star) |
|----------|---------------------------|----------------------|
| Information flow | Global (all see all) | Local (neighbors only) |
| Consensus speed | Fast (1 round) | Slow (depends on diameter) |
| Robustness | Fragile (one failure affects all) | Robust (localized failures) |
| Emergence | None (everything is visible) | Yes (hidden information creates dynamics) |

### Physics Analogies

- **Fully connected**: Mean-field approximation — every particle interacts with the average field
- **Ring**: 1D spin chain — nearest-neighbor interactions only
- **Star**: Central potential — electrons orbiting a nucleus
- **Future: Lattice**: 2D Ising model — nearest-neighbor on a grid
- **Future: Small-world**: Watts-Strogatz — mostly local with some long-range connections

## Future Topologies (Phase B/C)

### 4. LatticeTopology (2D Grid)

```typescript
class LatticeTopology implements Topology {
  constructor(width: number, height: number);
  // neighbors: up, down, left, right (von Neumann)
  // or + diagonals (Moore neighborhood)
}
```

**Use case**: Spatial agent simulations, diffusion of information, pattern formation.

### 5. SmallWorldTopology

```typescript
class SmallWorldTopology implements Topology {
  constructor(agentIds: string[], rewireProbability: number);
  // Start with ring, rewire some edges randomly
}
```

**Use case**: Realistic social networks, fast information spread with local structure.

### 6. DynamicTopology

```typescript
class DynamicTopology implements Topology {
  addEdge(a: string, b: string): void;
  removeEdge(a: string, b: string): void;
  // Edges change based on agent interactions
}
```

**Use case**: Trust networks, coalition formation, adaptive organizations.

## Testing

- **Unit tests**: Verify neighbors() returns correct sets for each topology
- **Integration tests**: Verify message routing respects topology
- **Real-world tests**: Run same prompt with different topologies, observe different consensus patterns

## Files

- `src/core/Topology.ts` — All topology implementations
- `src/core/AgentInbox.ts` — InboxRouter with topology-aware routing
- `src/core/Orchestrator.test.ts` — Topology + routing tests

## Related

- `Orchestrator.md` — How topology is used in multi-agent dispatch
- `EmergentBehavior.md` — Phase B/C: topology evolution, dynamic graphs
