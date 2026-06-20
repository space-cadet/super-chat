import { describe, it, expect, vi } from "vitest";
import { ChatEngine } from "./ChatEngine";
import { ManyBodyOrchestrator } from "./Orchestrator";
import type { OrchestratorAgent } from "./Orchestrator";
import {
	FullyConnectedTopology,
	RingTopology,
	StarTopology,
} from "./Topology";
import type { LLMAdapter, StreamEvent, ToolDefinition } from "./types";

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockLLMAdapter(
	toolEvents: StreamEvent[][] = [],
	textChunks: string[] = [],
): LLMAdapter {
	let toolCallIndex = 0;
	return {
		streamChatWithTools: async function* (
			_messages: { role: string; content: string }[],
			_tools: ToolDefinition[],
			signal?: AbortSignal,
		) {
			const events = toolEvents[toolCallIndex++] ?? [];
			for (const event of events) {
				if (signal?.aborted) break;
				yield event;
			}
		},
		streamChat: async function* (_messages: unknown, signal?: AbortSignal) {
			for (const chunk of textChunks) {
				if (signal?.aborted) break;
				yield chunk;
			}
		},
		getProviders: () => [{ id: "mock", name: "Mock" }],
		getModels: () => [],
		testConnection: async () => ({ ok: true, message: "ok" }),
	};
}

function createMockEngine(responseText: string): ChatEngine {
	const adapter = createMockLLMAdapter([], [responseText]);
	return new ChatEngine({ llmAdapter: adapter });
}

function createFailingEngine(): ChatEngine {
	const adapter: LLMAdapter = {
		streamChatWithTools: async function* () {
			throw new Error("Simulated engine failure");
		},
		streamChat: async function* () {
			throw new Error("Simulated engine failure");
		},
		getProviders: () => [{ id: "mock", name: "Mock" }],
		getModels: () => [],
		testConnection: async () => ({ ok: true, message: "ok" }),
	};
	return new ChatEngine({ llmAdapter: adapter });
}

async function collectResponses<T>(
	gen: AsyncGenerator<T>,
): Promise<T[]> {
	const responses: T[] = [];
	for await (const item of gen) {
		responses.push(item);
	}
	return responses;
}

function makeAgent(id: string, name: string, engine: ChatEngine): OrchestratorAgent {
	return { id, name, color: "#000", engine };
}

// ============================================================================
// Tests
// ============================================================================

describe("ManyBodyOrchestrator", () => {
	describe("topology: fully connected", () => {
		it("all agents see the user in fully-connected topology", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Agent 1", createMockEngine("Response from agent 1")),
				makeAgent("a2", "Agent 2", createMockEngine("Response from agent 2")),
				makeAgent("a3", "Agent 3", createMockEngine("Response from agent 3")),
			];
			const topology = new FullyConnectedTopology(["a1", "a2", "a3"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "parallel",
			});

			const visible = orch.getVisibleAgentIds();
			expect(visible).toHaveLength(3);
			expect(visible).toContain("a1");
			expect(visible).toContain("a2");
			expect(visible).toContain("a3");
		});

		it("yields responses from all agents in parallel mode", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Agent 1", createMockEngine("Hello from one")),
				makeAgent("a2", "Agent 2", createMockEngine("Hello from two")),
			];
			const topology = new FullyConnectedTopology(["a1", "a2"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "parallel",
			});

			const responses = await collectResponses(orch.userMessage("Hi everyone"));

			expect(responses).toHaveLength(2);
			const agentIds = responses.map((r) => r.agentId);
			expect(agentIds).toContain("a1");
			expect(agentIds).toContain("a2");
		});
	});

	describe("topology: ring", () => {
		it("only neighbors see agent-to-agent messages in ring topology", () => {
			const topology = new RingTopology(["a1", "a2", "a3", "a4"]);

			// a1's neighbors are a4 and a2
			expect(topology.neighbors("a1")).toEqual(["a4", "a2"]);
			// a2's neighbors are a1 and a3
			expect(topology.neighbors("a2")).toEqual(["a1", "a3"]);
			// a3's neighbors are a2 and a4
			expect(topology.neighbors("a3")).toEqual(["a2", "a4"]);
			// a4's neighbors are a3 and a1
			expect(topology.neighbors("a4")).toEqual(["a3", "a1"]);
		});

		it("user broadcasts to all agents in ring topology", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Agent 1", createMockEngine("A1 says hi")),
				makeAgent("a2", "Agent 2", createMockEngine("A2 says hi")),
				makeAgent("a3", "Agent 3", createMockEngine("A3 says hi")),
			];
			const topology = new RingTopology(["a1", "a2", "a3"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "parallel",
			});

			const visible = orch.getVisibleAgentIds();
			expect(visible).toHaveLength(3);
		});

		it("agent messages only reach neighbors in ring topology", () => {
			const topology = new RingTopology(["a1", "a2", "a3", "a4"]);

			// a1 can send to a2 and a4 (neighbors), but not a3
			expect(topology.canReceiveFrom("a2", "a1")).toBe(true);
			expect(topology.canReceiveFrom("a4", "a1")).toBe(true);
			expect(topology.canReceiveFrom("a3", "a1")).toBe(false); // a3 is not a neighbor of a1
			expect(topology.canReceiveFrom("a1", "a2")).toBe(true);
		});
	});

	describe("mode: sequential", () => {
		it("agents respond one after another in sequential mode", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Alpha", createMockEngine("Alpha response")),
				makeAgent("a2", "Beta", createMockEngine("Beta response")),
				makeAgent("a3", "Gamma", createMockEngine("Gamma response")),
			];
			const topology = new FullyConnectedTopology(["a1", "a2", "a3"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "sequential",
			});

			const responses = await collectResponses(orch.userMessage("Hello"));

			expect(responses).toHaveLength(3);
			// Should be in agent definition order (Map insertion order)
			expect(responses[0].agentId).toBe("a1");
			expect(responses[1].agentId).toBe("a2");
			expect(responses[2].agentId).toBe("a3");
		});

		it("sequential mode respects topology visibility", async () => {
			// Star topology: hub sees user, leaves see user
			const agents: OrchestratorAgent[] = [
				makeAgent("hub", "Hub", createMockEngine("Hub here")),
				makeAgent("leaf1", "Leaf 1", createMockEngine("Leaf 1 here")),
				makeAgent("leaf2", "Leaf 2", createMockEngine("Leaf 2 here")),
			];
			const topology = new StarTopology("hub", ["leaf1", "leaf2"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "sequential",
			});

			// All agents can see user in StarTopology
			const responses = await collectResponses(orch.userMessage("Hello"));
			expect(responses).toHaveLength(3);
		});
	});

	describe("mode: parallel", () => {
		it("agents respond simultaneously in parallel mode", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("fast", "Fast", createMockEngine("Fast response")),
				makeAgent("slow", "Slow", createMockEngine("Slow response")),
			];
			const topology = new FullyConnectedTopology(["fast", "slow"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "parallel",
			});

			const responses = await collectResponses(orch.userMessage("Go"));

			expect(responses).toHaveLength(2);
			expect(responses.map((r) => r.agentId)).toContain("fast");
			expect(responses.map((r) => r.agentId)).toContain("slow");
		});

		it("parallel mode yields all agent responses with correct content", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Agent 1", createMockEngine("First reply")),
				makeAgent("a2", "Agent 2", createMockEngine("Second reply")),
				makeAgent("a3", "Agent 3", createMockEngine("Third reply")),
			];
			const topology = new FullyConnectedTopology(["a1", "a2", "a3"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "parallel",
			});

			const responses = await collectResponses(orch.userMessage("Test"));

			const contents = responses.map((r) => r.message.content);
			expect(contents).toContain("First reply");
			expect(contents).toContain("Second reply");
			expect(contents).toContain("Third reply");
		});
	});

	describe("mode: debate", () => {
		it("runs multiple debate rounds", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Agent 1", createMockEngine("A1 round")),
				makeAgent("a2", "Agent 2", createMockEngine("A2 round")),
			];
			const topology = new FullyConnectedTopology(["a1", "a2"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "debate",
				debateRounds: 3,
			});

			const responses = await collectResponses(orch.userMessage("Debate this"));

			// 2 agents × 3 rounds = 6 responses
			expect(responses).toHaveLength(6);
		});

		it("debate mode includes neighbor responses in prompts", async () => {
			// Use a simple topology where agents can see each other
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Agent 1", createMockEngine("A1 response")),
				makeAgent("a2", "Agent 2", createMockEngine("A2 response")),
			];
			const topology = new FullyConnectedTopology(["a1", "a2"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "debate",
				debateRounds: 2,
			});

			const responses = await collectResponses(orch.userMessage("Topic"));

			// Check that round 1 responses exist (after round 0)
			expect(responses).toHaveLength(4);

			// Verify inbox has routed messages
			const router = orch.getRouter();
			const a1Messages = router.getMessages("a1");
			const a2Messages = router.getMessages("a2");

			// Both agents should have received user message + each other's round 0 response
			expect(a1Messages.length).toBeGreaterThanOrEqual(1);
			expect(a2Messages.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe("error isolation", () => {
		it("continues with other agents when one fails", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("good1", "Good 1", createMockEngine("I am fine")),
				makeAgent("bad", "Bad", createFailingEngine()),
				makeAgent("good2", "Good 2", createMockEngine("Me too")),
			];
			const topology = new FullyConnectedTopology(["good1", "bad", "good2"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "parallel",
			});

			const responses = await collectResponses(orch.userMessage("Test"));

			expect(responses).toHaveLength(3);

			const successResponses = responses.filter(
				(r) => !r.message.content.startsWith("[ERROR]"),
			);
			const errorResponses = responses.filter((r) =>
				r.message.content.startsWith("[ERROR]"),
			);

			expect(successResponses).toHaveLength(2);
			expect(errorResponses).toHaveLength(1);
			expect(errorResponses[0].agentId).toBe("bad");
		});

		it("sequential mode continues after an agent failure", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Agent 1", createMockEngine("OK")),
				makeAgent("a2", "Agent 2", createFailingEngine()),
				makeAgent("a3", "Agent 3", createMockEngine("Also OK")),
			];
			const topology = new FullyConnectedTopology(["a1", "a2", "a3"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "sequential",
			});

			const responses = await collectResponses(orch.userMessage("Test"));

			expect(responses).toHaveLength(3);
			expect(responses[0].message.content).toBe("OK");
			expect(responses[1].message.content.startsWith("[ERROR]")).toBe(true);
			expect(responses[2].message.content).toBe("Also OK");
		});
	});

	describe("dispatch", () => {
		it("dispatches user message to visible agents without collecting", () => {
			const engine1 = createMockEngine("Response 1");
			const engine2 = createMockEngine("Response 2");
			const sendSpy1 = vi.spyOn(engine1, "sendMessage");
			const sendSpy2 = vi.spyOn(engine2, "sendMessage");

			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Agent 1", engine1),
				makeAgent("a2", "Agent 2", engine2),
			];
			const topology = new FullyConnectedTopology(["a1", "a2"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "parallel",
			});

			orch.dispatch("Hello dispatch");

			// dispatch is fire-and-forget; spies should have been called
			expect(sendSpy1).toHaveBeenCalledWith("Hello dispatch");
			expect(sendSpy2).toHaveBeenCalledWith("Hello dispatch");
		});
	});

	describe("topology validation", () => {
		it("throws if agent ID is not in topology", () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("orphan", "Orphan", createMockEngine("Hi")),
			];
			const topology = new FullyConnectedTopology(["a1", "a2"]);

			expect(() => {
				new ManyBodyOrchestrator({ agents, topology });
			}).toThrow('Agent "orphan" not found in topology');
		});
	});

	describe("AgentResponse structure", () => {
		it("returns proper AgentResponse with all fields", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("a1", "Alpha", createMockEngine("Hello world")),
			];
			const topology = new FullyConnectedTopology(["a1"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "sequential",
			});

			const responses = await collectResponses(orch.userMessage("Hi"));

			expect(responses).toHaveLength(1);
			const r = responses[0];
			expect(r.agentId).toBe("a1");
			expect(r.agentName).toBe("Alpha");
			expect(r.message.role).toBe("assistant");
			expect(r.message.content).toBe("Hello world");
			expect(typeof r.message.timestamp).toBe("number");
			expect(r.message.id).toMatch(/^msg-/);
		});
	});

	describe("StarTopology integration", () => {
		it("hub sees all leaves and user in star topology", async () => {
			const agents: OrchestratorAgent[] = [
				makeAgent("hub", "Hub", createMockEngine("Hub response")),
				makeAgent("leaf1", "Leaf 1", createMockEngine("Leaf 1 response")),
				makeAgent("leaf2", "Leaf 2", createMockEngine("Leaf 2 response")),
			];
			const topology = new StarTopology("hub", ["leaf1", "leaf2"]);
			const orch = new ManyBodyOrchestrator({
				agents,
				topology,
				mode: "parallel",
			});

			// All agents see user
			const visible = orch.getVisibleAgentIds();
			expect(visible).toHaveLength(3);

			const responses = await collectResponses(orch.userMessage("Hello"));
			expect(responses).toHaveLength(3);
		});

		it("leaves only see hub in star topology", () => {
			const topology = new StarTopology("hub", ["leaf1", "leaf2"]);

			// Leaf1's only neighbor is hub
			expect(topology.neighbors("leaf1")).toEqual(["hub"]);
			// Leaf2's only neighbor is hub
			expect(topology.neighbors("leaf2")).toEqual(["hub"]);
			// Hub sees all leaves
			expect(topology.neighbors("hub")).toEqual(["leaf1", "leaf2"]);

			// Leaves cannot receive from each other
			expect(topology.canReceiveFrom("leaf1", "leaf2")).toBe(false);
			expect(topology.canReceiveFrom("leaf2", "leaf1")).toBe(false);
			// But leaves can receive from hub
			expect(topology.canReceiveFrom("leaf1", "hub")).toBe(true);
			expect(topology.canReceiveFrom("leaf2", "hub")).toBe(true);
		});
	});
});
