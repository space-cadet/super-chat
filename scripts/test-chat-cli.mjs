import { ChatEngine } from '../dist/index.js';
import { VercelLLMAdapter, createProviderProfile, DemoToolAdapter, MemoryPersistenceAdapter } from '../dist/index.js';

// ── Configuration ───────────────────────────────────────────────────────────

const PROVIDER = process.env.CHAT_PROVIDER || 'openrouter';
const MODEL = process.env.CHAT_MODEL || 'google/gemma-4-26b-a4b-it';
const API_KEY = process.env.CHAT_API_KEY || process.env.OPENROUTER_API_KEY || '';

if (!API_KEY) {
  console.error('❌ No API key found. Set CHAT_API_KEY or OPENROUTER_API_KEY');
  process.exit(1);
}

// ── Setup ─────────────────────────────────────────────────────────────────

const profile = createProviderProfile(PROVIDER, MODEL, API_KEY);
const llmAdapter = new VercelLLMAdapter({ profile });
const toolAdapter = new DemoToolAdapter();
const persistence = new MemoryPersistenceAdapter();

const engine = new ChatEngine({
  llmAdapter,
  toolAdapter,
  persistenceAdapter: persistence,
  systemPrompt: 'You are a helpful research assistant. Be concise.',
});

// ── Test Cases ────────────────────────────────────────────────────────────

async function runTest(name, userMessage, enableTools = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${name}`);
  console.log(`👤 User: ${userMessage}`);
  console.log(`${'─'.repeat(60)}`);

  const session = engine.createSession(`CLI Test: ${name}`);
  const startTime = Date.now();

  let textBuffer = '';
  let toolCalls = [];
  let toolResults = [];
  let errors = [];
  let usage = null;
  let metrics = null;

  try {
    const stream = engine.sendMessage(userMessage, { enableTools });

    for await (const event of stream) {
      switch (event.type) {
        case 'text-delta':
          textBuffer += event.text;
          process.stdout.write(event.text);
          break;
        case 'tool-call':
          toolCalls.push(event.call);
          console.log(`\n🔧 TOOL CALL: ${event.call.name}(${JSON.stringify(event.call.args)})`);
          break;
        case 'tool-result':
          toolResults.push(event.result);
          console.log(`\n✅ TOOL RESULT: ${event.result.success ? 'OK' : 'FAIL'} — ${event.result.content?.slice(0, 200)}...`);
          break;
        case 'usage':
          usage = event;
          break;
        case 'metrics':
          metrics = event;
          break;
        case 'error':
          errors.push(event.message);
          console.error(`\n❌ ERROR: ${event.message}`);
          break;
        case 'finish':
          console.log(`\n${'─'.repeat(60)}`);
          console.log(`✅ Done`);
          break;
      }
    }
  } catch (err) {
    console.error(`\n💥 UNCAUGHT: ${err.message}`);
    errors.push(err.message);
  }

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Text length: ${textBuffer.length} chars`);
  if (usage) {
    console.log(`   Tokens (est): ${usage.totalTokens} (${usage.promptTokens} prompt + ${usage.completionTokens} completion)`);
  }
  if (metrics) {
    console.log(`   TTFT: ${metrics.ttftMs}ms | Total: ${metrics.totalDurationMs}ms`);
  }
  console.log(`   Tool calls: ${toolCalls.length}`);
  console.log(`   Tool results: ${toolResults.length}`);
  console.log(`   Errors: ${errors.length}`);

  return { textBuffer, toolCalls, toolResults, errors, session };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 super-chat CLI Test Runner');
  console.log(`   Provider: ${PROVIDER}`);
  console.log(`   Model: ${MODEL}`);
  console.log(`   API Key: ${API_KEY.slice(0, 8)}...`);

  // Test 1: Simple chat (no tools)
  await runTest('Simple Chat', 'What is quantum entanglement in one sentence?', false);

  // Test 2: Tool calling
  await runTest('Tool Calling', 'What is the weather in Tokyo?', true);

  // Test 3: Multi-step tool (calculate)
  await runTest('Calculator Tool', 'Calculate 123 * 456', true);

  // Test 4: ArXiv tool
  await runTest('ArXiv Search', 'Find recent papers on loop quantum gravity', true);

  // Test 5: Streaming quality
  await runTest('Long Response', 'Explain general relativity in 3 paragraphs', false);

  // Print session state
  console.log(`\n${'='.repeat(60)}`);
  console.log('📁 Session State:');
  const sessions = engine.getSessions();
  for (const s of sessions) {
    console.log(`   ${s.id}: ${s.title} (${s.messages.length} messages)`);
  }

  console.log('\n✨ All tests complete');
}

main().catch(console.error);
