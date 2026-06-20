/**
 * Topology System — Defines visibility graphs between agents.
 *
 * Each topology answers: "Which agents can agent X see?"
 * This controls message routing in the multi-agent orchestrator.
 */

export interface Topology {
	/**
	 * Return the list of agent IDs that `agentId` can directly communicate with.
	 * These are the "neighbors" in the topology graph.
	 */
	neighbors(agentId: string): string[];

	/**
	 * Return all agent IDs known to this topology.
	 */
	allAgentIds(): string[];

	/**
	 * Check if `agentId` can receive a message from `fromId`.
	 * Default implementation uses neighbors(), but topologies may override
	 * for special cases (e.g. user broadcasts).
	 */
	canReceiveFrom(agentId: string, fromId: string): boolean;
}

/** Special ID representing the human user in the topology. */
export const USER_ID = "__user__";

// ============================================================================
// FullyConnectedTopology — Complete graph (default)
// ============================================================================

/**
 * Every agent sees every other agent, and all agents see the user.
 * This is the default topology for traditional multi-agent chat.
 */
export class FullyConnectedTopology implements Topology {
	private agentIds: string[];

	constructor(agentIds: string[]) {
		this.agentIds = [...agentIds];
	}

	neighbors(agentId: string): string[] {
		return this.agentIds.filter((id) => id !== agentId);
	}

	allAgentIds(): string[] {
		return [...this.agentIds];
	}

	canReceiveFrom(agentId: string, fromId: string): boolean {
		// Everyone sees everyone (except themselves)
		return fromId !== agentId && this.agentIds.includes(agentId);
	}
}

// ============================================================================
// RingTopology — Each agent sees exactly 2 neighbors
// ============================================================================

/**
 * Agents arranged in a ring. Each agent sees only its immediate
 * predecessor and successor. The user is connected to all agents
 * (broadcast), but agent-to-agent messages only flow around the ring.
 */
export class RingTopology implements Topology {
	private agentIds: string[];

	constructor(agentIds: string[]) {
		if (agentIds.length < 2) {
			throw new Error("RingTopology requires at least 2 agents");
		}
		this.agentIds = [...agentIds];
	}

	neighbors(agentId: string): string[] {
		const idx = this.agentIds.indexOf(agentId);
		if (idx === -1) return [];
		const n = this.agentIds.length;
		const prev = this.agentIds[(idx - 1 + n) % n];
		const next = this.agentIds[(idx + 1) % n];
		return [prev, next];
	}

	allAgentIds(): string[] {
		return [...this.agentIds];
	}

	canReceiveFrom(agentId: string, fromId: string): boolean {
		// User broadcasts to all agents
		if (fromId === USER_ID) return this.agentIds.includes(agentId);
		// Agents only see their ring neighbors
		return this.neighbors(agentId).includes(fromId);
	}
}

// ============================================================================
// StarTopology — Hub sees all, leaves see only hub
// ============================================================================

/**
 * One hub agent at the center. All leaf agents communicate only
 * through the hub. The user broadcasts to all agents (all leaves
 * and the hub can see user messages).
 */
export class StarTopology implements Topology {
	private hubId: string;
	private leafIds: string[];

	constructor(hubId: string, leafIds: string[]) {
		if (leafIds.includes(hubId)) {
			throw new Error("Hub ID cannot also be a leaf ID");
		}
		this.hubId = hubId;
		this.leafIds = [...leafIds];
	}

	neighbors(agentId: string): string[] {
		if (agentId === this.hubId) {
			return [...this.leafIds];
		}
		if (this.leafIds.includes(agentId)) {
			return [this.hubId];
		}
		return [];
	}

	allAgentIds(): string[] {
		return [this.hubId, ...this.leafIds];
	}

	canReceiveFrom(agentId: string, fromId: string): boolean {
		// User broadcasts to all agents
		if (fromId === USER_ID) return this.allAgentIds().includes(agentId);
		// Hub sees all leaves; leaves see only hub
		return this.neighbors(agentId).includes(fromId);
	}
}
