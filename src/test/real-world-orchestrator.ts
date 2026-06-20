/**
 * Real-World Multi-Agent Test
 *
 * Tests the ManyBodyOrchestrator with actual LLM API calls.
 * Uses small batches (2-3 agents) with cheap/fast models.
 *
 * Usage:
 *   source ~/.openclaw/workspace/code/obsidian-ai/.env
 *   npx tsx src/test/real-world-orchestrator.ts
 */

import { ManyBodyOrchestrator } from "../core/Orchestrator";
import {
	FullyConnectedTopology,
	RingTopology,
	StarTopology,
} from "../core/Topology";
import { ChatEngine } from "../core/ChatEngine";
import { VercelLLMAdapter } from "../adapters/VercelLLMAdapter";
import type { AgentResponse } from "../core/types";

// ============================================================================
// Configuration
// ============================================================================

const TEST_PROMPT =
	"In one sentence, what is the most interesting unsolved problem in physics?";

const TEST_PROMPT_DEBATE =
	"Is loop quantum gravity or string theory more promising for quantum gravity? Argue briefly.";

// Use cheap/fast models for testing
const AGENTS_CONFIG = [
	{
		id: "gemini",
		name: "Gemini",
		color: "#4285f4",
		profile: {
			id: "gemini",
			name: "Gemini",
			provider: "google" as const,
			model: "gemini-2.0-flash-exp",
			apiKey: process.env.GEMINI_API_KEY,
			models: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
	},
	{
		id: "deepseek",
		name: "DeepSeek",
		color: "#4f46e5",
		profile: {
			id: "deepseek",
			name: "DeepSeek",
			provider: "deepseek" as const,
			model: "deepseek-chat",
			apiKey: process.env.DEEPSEEK_API_KEY,
			models: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
	},
	{
		id: "kimi",
		name: "Kimi",
		color: "#10b981",
		profile: {
			id: "kimi",
			name: "Kimi",
			provider: "kimi" as const,
			model: "moonshot-v1-8k",
			apiKey: process.env.KIMI_API_KEY,
			models: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
	},
];

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHeader(title: string) {
	console.log("\n" + "=".repeat(60));
	console.log(title);
	console.log("=".repeat(60));
}

function printResponse(response: AgentResponse, index: number) {
	const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
	console.log(`\n[${timestamp}] #${index + 1} ${response.agentName}:`);
	console.log(`  ${response.message.content}`);
	if (response.tokenEstimate) {
		console.log(`  (tokens: ~${response.tokenEstimate})`);
	}
}

// ============================================================================
// Agent Factory
// ============================================================================

function createAgentEngine(config: (typeof AGENTS_CONFIG)[number]) {
	if (!config.profile.apiKey) {
		throw new Error(`Missing API key for ${config.name} (${config.profile.provider})`);
	}

	const adapter = new VercelLLMAdapter({
		profile: config.profile,
		systemPrompt: `You are ${config.name}, a helpful physics-aware AI assistant. Be concise (1-2 sentences).`,
	});

	const engine = new ChatEngine({ llmAdapter: adapter });
	return { engine, ...config };
}

// ============================================================================
// Test: Sequential Mode (Fully Connected)
// ============================================================================

async function testSequential() {
	printHeader("TEST 1: Sequential Mode (Fully Connected, 2 agents)");

	const configs = AGENTS_CONFIG.filter((c) => c.profile.apiKey).slice(0, 2);
	if (configs.length < 2) {
		console.log("⚠️  Need 2+ API keys. Skipping.");
		return;
	}

	const agents = configs.map((c) => {
		const { engine, ...meta } = createAgentEngine(c);
		return { id: meta.id, name: meta.name, color: meta.color, engine };
	});

	const orchestrator = new ManyBodyOrchestrator({
		agents,
		topology: new FullyConnectedTopology(agents.map((a) => a.id)),
		mode: "sequential",
	});

	console.log(`Prompt: "${TEST_PROMPT}"`);
	console.log(`Agents: ${agents.map((a) => a.name).join(", ")}`);
	console.log("Mode: sequential (each agent sees previous responses)");

	let count = 0;
	for await (const response of orchestrator.userMessage(TEST_PROMPT)) {
		printResponse(response, count++);
	}

	console.log(`\n✅ Sequential test complete: ${count} responses`);
}

// ============================================================================
// Test: Parallel Mode (Fully Connected)
// ============================================================================

async function testParallel() {
	printHeader("TEST 2: Parallel Mode (Fully Connected, 2-3 agents)");

	const configs = AGENTS_CONFIG.filter((c) => c.profile.apiKey).slice(0, 3);
	if (configs.length < 2) {
		console.log("⚠️  Need 2+ API keys. Skipping.");
		return;
	}

	const agents = configs.map((c) => {
		const { engine, ...meta } = createAgentEngine(c);
		return { id: meta.id, name: meta.name, color: meta.color, engine };
	});

	const orchestrator = new ManyBodyOrchestrator({
		agents,
		topology: new FullyConnectedTopology(agents.map((a) => a.id)),
		mode: "parallel",
	});

	console.log(`Prompt: "${TEST_PROMPT}"`);
	console.log(`Agents: ${agents.map((a) => a.name).join(", ")}`);
	console.log("Mode: parallel (all agents respond simultaneously)");

	let count = 0;
	const startTime = Date.now();
	for await (const response of orchestrator.userMessage(TEST_PROMPT)) {
		printResponse(response, count++);
	}
	const elapsed = Date.now() - startTime;

	console.log(
		`\n✅ Parallel test complete: ${count} responses in ${elapsed}ms`,
	);
}

// ============================================================================
// Test: Debate Mode (Ring Topology)
// ============================================================================

async function testDebate() {
	printHeader("TEST 3: Debate Mode (Ring Topology, 2 agents, 2 rounds)");

	const configs = AGENTS_CONFIG.filter((c) => c.profile.apiKey).slice(0, 2);
	if (configs.length < 2) {
		console.log("⚠️  Need 2+ API keys. Skipping.");
		return;
	}

	const agents = configs.map((c) => {
		const { engine, ...meta } = createAgentEngine(c);
		return { id: meta.id, name: meta.name, color: meta.color, engine };
	});

	const orchestrator = new ManyBodyOrchestrator({
		agents,
		topology: new RingTopology(agents.map((a) => a.id)),
		mode: "debate",
		debateRounds: 2,
	});

	console.log(`Prompt: "${TEST_PROMPT_DEBATE}"`);
	console.log(`Agents: ${agents.map((a) => a.name).join(", ")}`);
	console.log("Topology: ring (each agent sees only its neighbors)");
	console.log("Mode: debate (2 rounds, agents see each other's responses)");

	let count = 0;
	for await (const response of orchestrator.userMessage(TEST_PROMPT_DEBATE)) {
		printResponse(response, count++);
	}

	console.log(`\n✅ Debate test complete: ${count} responses`);
}

// ============================================================================
// Test: Star Topology (3 agents)
// ============================================================================

async function testStarTopology() {
	printHeader("TEST 4: Star Topology (3 agents, hub sees all)");

	const configs = AGENTS_CONFIG.filter((c) => c.profile.apiKey).slice(0, 3);
	if (configs.length < 3) {
		console.log("⚠️  Need 3 API keys. Skipping.");
		return;
	}

	const agents = configs.map((c) => {
		const { engine, ...meta } = createAgentEngine(c);
		return { id: meta.id, name: meta.name, color: meta.color, engine };
	});

	// Hub = first agent, leaves = rest
	const hubId = agents[0].id;
	const leafIds = agents.slice(1).map((a) => a.id);

	const orchestrator = new ManyBodyOrchestrator({
		agents,
		topology: new StarTopology(hubId, leafIds),
		mode: "sequential",
	});

	console.log(`Prompt: "${TEST_PROMPT}"`);
	console.log(`Hub: ${agents[0].name} (sees all)`);
	console.log(`Leaves: ${agents.slice(1).map((a) => a.name).join(", ")} (see only hub)`);
	console.log("Mode: sequential");

	let count = 0;
	for await (const response of orchestrator.userMessage(TEST_PROMPT)) {
		printResponse(response, count++);
	}

	console.log(`\n✅ Star topology test complete: ${count} responses`);
}

// ============================================================================
// Test: Error Isolation (1 working + 1 broken agent)
// ============================================================================

async function testErrorIsolation() {
	printHeader("TEST 5: Error Isolation (1 working + 1 broken agent)");

	const configs = AGENTS_CONFIG.filter((c) => c.profile.apiKey).slice(0, 1);
	if (configs.length < 1) {
		console.log("⚠️  Need at least 1 API key. Skipping.");
		return;
	}

	const working = createAgentEngine(configs[0]);
	const workingAgent = {
		id: working.id,
		name: working.name,
		color: working.color,
		engine: working.engine,
	};

	// Create a broken agent with invalid API key
	const brokenAdapter = new VercelLLMAdapter({
		profile: {
			id: "broken",
			name: "BrokenBot",
			provider: "google",
			model: "gemini-2.0-flash-exp",
			apiKey: "invalid-key-for-testing",
			models: [],
			createdAt: Date.now(),
			updatedAt: Date.now(),
		},
		systemPrompt: "You are broken.",
	});
	const brokenEngine = new ChatEngine({ llmAdapter: brokenAdapter });
	const brokenAgent = {
		id: "broken",
		name: "BrokenBot",
		color: "#ff0000",
		engine: brokenEngine,
	};

	const orchestrator = new ManyBodyOrchestrator({
		agents: [workingAgent, brokenAgent],
		topology: new FullyConnectedTopology([workingAgent.id, brokenAgent.id]),
		mode: "parallel",
	});

	console.log(`Prompt: "${TEST_PROMPT}"`);
	console.log(`Agents: ${workingAgent.name} (working), ${brokenAgent.name} (broken key)`);
	console.log("Mode: parallel (should continue even if one fails)");

	let count = 0;
	for await (const response of orchestrator.userMessage(TEST_PROMPT)) {
		printResponse(response, count++);
	}

	console.log(`\n✅ Error isolation test complete: ${count} responses`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
	console.log("🧪 Real-World Multi-Agent Orchestrator Tests");
	console.log("============================================");
	console.log(`API keys found: ${AGENTS_CONFIG.filter((c) => c.profile.apiKey).length}/4`);
	console.log(`Available: ${AGENTS_CONFIG.filter((c) => c.profile.apiKey).map((c) => c.name).join(", ") || "NONE"}`);

	if (AGENTS_CONFIG.filter((c) => c.profile.apiKey).length < 2) {
		console.log("\n⚠️  Need at least 2 API keys for meaningful tests.");
		console.log("Set GEMINI_API_KEY, DEEPSEEK_API_KEY, KIMI_API_KEY, or OPENROUTER_API_KEY.");
		process.exit(1);
	}

	try {
		await testSequential();
		await sleep(1000); // Rate limit buffer
		await testParallel();
		await sleep(1000);
		await testDebate();
		await sleep(1000);
		await testStarTopology();
		await sleep(1000);
		await testErrorIsolation();

		console.log("\n" + "=".repeat(60));
		console.log("🎉 ALL REAL-WORLD TESTS COMPLETE");
		console.log("=".repeat(60));
	} catch (error) {
		console.error("\n❌ Test failed:", error);
		process.exit(1);
	}
}

main();
