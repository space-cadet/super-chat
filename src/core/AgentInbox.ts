/**
 * AgentInbox — Per-agent message store and router.
 *
 * Messages are stored in a shared queue and filtered by recipient.
 * The InboxRouter uses a Topology to decide which agents receive
 * which messages.
 */

import type { Topology } from "./Topology";
import { USER_ID } from "./Topology";

// ============================================================================
// Message Types
// ============================================================================

export interface AgentMessage {
	/** Sender ID. Use USER_ID for human user messages. */
	from: string;
	/** Recipient ID. Use '*' for broadcast (routed by topology). */
	to: string;
	/** Message content. */
	content: string;
	/** Unix timestamp (ms). */
	timestamp: number;
	/** Optional round number (for debate mode). */
	round?: number;
}

// ============================================================================
// AgentInbox Interface
// ============================================================================

/**
 * Per-agent message store. Each agent has its own inbox
 * containing only the messages it is allowed to see.
 */
export interface AgentInbox {
	/** Add a message to the store. */
	push(message: AgentMessage): void;
	/** Get all messages visible to a specific agent. */
	messages(agentId: string): AgentMessage[];
	/** Get messages from a specific round for an agent. */
	messagesForRound(agentId: string, round: number): AgentMessage[];
	/** Clear all messages for a specific agent. */
	clear(agentId: string): void;
	/** Clear all messages across all agents. */
	clearAll(): void;
}

// ============================================================================
// InMemoryAgentInbox — Simple in-memory implementation
// ============================================================================

export class InMemoryAgentInbox implements AgentInbox {
	private store: Map<string, AgentMessage[]> = new Map();

	push(message: AgentMessage): void {
		// Store in recipient's inbox
		const recipient = message.to;
		if (!this.store.has(recipient)) {
			this.store.set(recipient, []);
		}
		this.store.get(recipient)!.push(message);
	}

	messages(agentId: string): AgentMessage[] {
		return this.store.get(agentId) ?? [];
	}

	messagesForRound(agentId: string, round: number): AgentMessage[] {
		return this.messages(agentId).filter((m) => m.round === round);
	}

	clear(agentId: string): void {
		this.store.delete(agentId);
	}

	clearAll(): void {
		this.store.clear();
	}
}

// ============================================================================
// InboxRouter — Routes messages based on Topology
// ============================================================================

export interface InboxRouterOptions {
	topology: Topology;
	inbox?: AgentInbox;
}

/**
 * Routes messages to agents according to a Topology.
 *
 * When a message is sent, the router determines which agents
 * can see it and delivers a copy to each of their inboxes.
 */
export class InboxRouter {
	private topology: Topology;
	private inbox: AgentInbox;

	constructor(opts: InboxRouterOptions) {
		this.topology = opts.topology;
		this.inbox = opts.inbox ?? new InMemoryAgentInbox();
	}

	/** Send a message from one entity to another, respecting topology. */
	route(message: AgentMessage): void {
		const { from, to } = message;

		// Direct message: only deliver if topology allows
		if (to !== "*") {
			if (this.topology.canReceiveFrom(to, from)) {
				this.inbox.push({ ...message, to });
			}
			return;
		}

		// Broadcast: deliver to all agents that can see the sender
		for (const agentId of this.topology.allAgentIds()) {
			if (this.topology.canReceiveFrom(agentId, from)) {
				this.inbox.push({ ...message, to: agentId });
			}
		}
	}

	/** Send a user message to all agents that can see the user. */
	broadcastUserMessage(content: string, round?: number): void {
		const message: AgentMessage = {
			from: USER_ID,
			to: "*",
			content,
			timestamp: Date.now(),
			round,
		};
		this.route(message);
	}

	/** Send an agent's response to its neighbors. */
	broadcastAgentResponse(
		fromAgentId: string,
		content: string,
		round?: number,
	): void {
		const message: AgentMessage = {
			from: fromAgentId,
			to: "*",
			content,
			timestamp: Date.now(),
			round,
		};
		this.route(message);
	}

	/** Get all messages visible to a specific agent. */
	getMessages(agentId: string): AgentMessage[] {
		return this.inbox.messages(agentId);
	}

	/** Get messages for a specific round. */
	getMessagesForRound(agentId: string, round: number): AgentMessage[] {
		return this.inbox.messagesForRound(agentId, round);
	}

	/** Clear all inboxes. */
	clear(): void {
		this.inbox.clearAll();
	}
}
