/**
 * Orchestrator — Multi-agent coordination with topology awareness.
 *
 * The ManyBodyOrchestrator manages multiple ChatEngine instances,
 * routing messages according to a Topology and supporting three
 * execution modes: sequential, parallel, and debate.
 *
 * Error isolation: if one agent fails, others continue.
 */

import type { ChatEngine } from "./ChatEngine";
import type {
	AgentResponse,
	ChatMessage,
	StreamEvent,
} from "./types";
import type { Topology } from "./Topology";
import { USER_ID } from "./Topology";
import { InboxRouter, type AgentInbox, InMemoryAgentInbox } from "./AgentInbox";

// ============================================================================
// Types
// ============================================================================

export interface OrchestratorAgent {
	id: string;
	name: string;
	color: string;
	engine: ChatEngine;
}

export interface ManyBodyOrchestratorOptions {
	agents: OrchestratorAgent[];
	topology: Topology;
	mode?: "sequential" | "parallel" | "debate";
	/** Number of debate rounds (default: 2). Only used in debate mode. */
	debateRounds?: number;
	/** Optional custom inbox. */
	inbox?: AgentInbox;
}

export interface OrchestratorRunResult {
	responses: AgentResponse[];
	errors: Array<{ agentId: string; error: string }>;
}

// ============================================================================
// Helpers
// ============================================================================

async function collectAgentResponse(
	entry: OrchestratorAgent,
	text: string,
): Promise<AgentResponse> {
	// Ensure the agent has an active session
	if (!entry.engine.getActiveSession()) {
		entry.engine.createSession(`Session: ${entry.name}`);
	}

	const events: StreamEvent[] = [];
	let fullText = "";
	let errorMessage: string | null = null;

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

	const message: ChatMessage = {
		id: `msg-${entry.id}-${Date.now()}`,
		role: "assistant",
		content: fullText,
		timestamp: Date.now(),
	};

	return {
		agentId: entry.id,
		agentName: entry.name,
		message,
	};
}

function makeErrorResponse(
	entry: OrchestratorAgent,
	err: unknown,
): AgentResponse {
	const message: ChatMessage = {
		id: `error-${entry.id}-${Date.now()}`,
		role: "assistant",
		content: `[ERROR] ${err instanceof Error ? err.message : String(err)}`,
		timestamp: Date.now(),
	};
	return {
		agentId: entry.id,
		agentName: entry.name,
		message,
	};
}

// ============================================================================
// ManyBodyOrchestrator
// ============================================================================

export class ManyBodyOrchestrator {
	private agents: Map<string, OrchestratorAgent>;
	private topology: Topology;
	private router: InboxRouter;
	private mode: "sequential" | "parallel" | "debate";
	private debateRounds: number;

	constructor(opts: ManyBodyOrchestratorOptions) {
		this.agents = new Map(opts.agents.map((a) => [a.id, a]));
		this.topology = opts.topology;
		this.mode = opts.mode ?? "parallel";
		this.debateRounds = opts.debateRounds ?? 2;

		// Validate that all agent IDs are known to the topology
		const topologyIds = new Set(opts.topology.allAgentIds());
		for (const agent of opts.agents) {
			if (!topologyIds.has(agent.id)) {
				throw new Error(
					`Agent "${agent.id}" not found in topology. ` +
					`Known IDs: ${Array.from(topologyIds).join(", ")}`,
				);
			}
		}

		this.router = new InboxRouter({
			topology: opts.topology,
			inbox: opts.inbox ?? new InMemoryAgentInbox(),
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
	async *userMessage(text: string): AsyncGenerator<AgentResponse> {
		// Route the user message through the inbox
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
	dispatch(text: string): void {
		this.router.broadcastUserMessage(text);
		for (const [id, entry] of this.agents) {
			if (!this.topology.canReceiveFrom(id, USER_ID)) continue;
			if (!entry.engine.getActiveSession()) {
				entry.engine.createSession(`Session: ${entry.name}`);
			}
			// Fire-and-forget: start the stream but don't await it
			void this.runAgentAndIgnore(entry, text);
		}
	}

	/** Get the IDs of agents that can see the user. */
	getVisibleAgentIds(): string[] {
		return this.topology
			.allAgentIds()
			.filter((id) => this.topology.canReceiveFrom(id, USER_ID));
	}

	/** Get all agent IDs in the topology. */
	getAllAgentIds(): string[] {
		return this.topology.allAgentIds();
	}

	/** Get an agent by ID. */
	getAgent(id: string): OrchestratorAgent | undefined {
		return this.agents.get(id);
	}

	/** Access the inbox router (for advanced use cases). */
	getRouter(): InboxRouter {
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
	private async *runSequential(text: string): AsyncGenerator<AgentResponse> {
		for (const [id, entry] of this.agents) {
			if (!this.topology.canReceiveFrom(id, USER_ID)) continue;

			try {
				const response = await collectAgentResponse(entry, text);
				this.router.broadcastAgentResponse(
					response.agentId,
					response.message.content,
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
	private async *runParallel(text: string): AsyncGenerator<AgentResponse> {
		const visibleAgents = Array.from(this.agents.entries()).filter(([id]) =>
			this.topology.canReceiveFrom(id, USER_ID),
		);

		if (visibleAgents.length === 0) return;

		// Start all agents in parallel
		const pending = new Map<
			string,
			Promise<AgentResponse>
		>();
		for (const [id, entry] of visibleAgents) {
			pending.set(
				id,
				collectAgentResponse(entry, text).catch((err) =>
					makeErrorResponse(entry, err),
				),
			);
		}

		// Yield results as they complete
		while (pending.size > 0) {
			// Race all pending promises
			const entries = Array.from(pending.entries());
			const result = await Promise.race(
				entries.map(async ([agentId, promise]) => {
					const response = await promise;
					return { agentId, response };
				}),
			);

			pending.delete(result.agentId);

			// Broadcast successful responses to neighbors
			if (!result.response.message.content.startsWith("[ERROR]")) {
				this.router.broadcastAgentResponse(
					result.response.agentId,
					result.response.message.content,
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
	private async *runDebate(text: string): AsyncGenerator<AgentResponse> {
		for (let round = 0; round < this.debateRounds; round++) {
			const roundResponses: AgentResponse[] = [];

			for (const [id, entry] of this.agents) {
				// In round 0, only agents that can see the user participate.
				// In later rounds, all agents participate if they received messages.
				if (
					round === 0 &&
					!this.topology.canReceiveFrom(id, USER_ID)
				) {
					continue;
				}

				const prompt =
					round === 0
						? text
						: this.buildDebatePrompt(id, text, round);

				try {
					const response = await collectAgentResponse(entry, prompt);
					this.router.broadcastAgentResponse(
						response.agentId,
						response.message.content,
						round,
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

	private buildDebatePrompt(
		agentId: string,
		originalQuestion: string,
		round: number,
	): string {
		const neighborMessages = this.router.getMessagesForRound(
			agentId,
			round - 1,
		);

		let prompt = "";
		if (neighborMessages.length > 0) {
			prompt +=
				"Here are responses from your neighbors in the previous round:\n\n";
			for (const msg of neighborMessages) {
				prompt += `[${msg.from}]: ${msg.content}\n`;
			}
			prompt += "\n---\n\n";
		}
		prompt += `Original question: ${originalQuestion}\n\n`;
		prompt += `Please share your response for round ${round + 1}.`;

		return prompt;
	}

	private async runAgentAndIgnore(
		entry: OrchestratorAgent,
		text: string,
	): Promise<void> {
		try {
			for await (const _event of entry.engine.sendMessage(text)) {
				// Intentionally ignoring events — dispatch is fire-and-forget
			}
		} catch {
			// Intentionally swallowing errors in fire-and-forget mode
		}
	}
}
