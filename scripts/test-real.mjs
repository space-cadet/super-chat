#!/usr/bin/env node
/**
 * Real-world integration test for super-chat
 * Uses actual API keys from ~/.openclaw/workspace/.keys/API_Keys.md
 */

import { ChatEngine, VercelLLMAdapter, createProviderProfile, DemoToolAdapter, MemoryPersistenceAdapter } from '../dist/index.js';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// ── Load API Key ───────────────────────────────────────────────────────────

function loadApiKey() {
  // Try environment first
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }
  
  // Try to extract from keys file
  try {
    const keysPath = join(homedir(), '.openclaw/workspace/.keys/API_Keys.md');
    const content = readFileSync(keysPath, 'utf-8');
    
    // Find first active OpenRouter key
    const match = content.match(/`sk-or-v1-[a-f0-9…]+`.*?\|.*?Active/s);
    if (match) {
      // Extract the key (remove backticks)
      const keyLine = match[0];
      const keyMatch = keyLine.match(/`([^`]+)`/);
      if (keyMatch) {
        // Keys are truncated with …, so we can't use them directly
        console.log('⚠️  Found key reference but it is truncated in the file');
      }
    }
  } catch {
    // ignore
  }
  
  return null;
}

const API_KEY = loadApiKey();

if (!API_KEY) {
  console.error('❌ No API key found.');
  console.error('Set OPENROUTER_API_KEY environment variable or add key to .env.local');
  console.error('');
  console.error('Example:');
  console.error('  OPENROUTER_API_KEY=sk-or-v1-xxx pnpm test:real');
  process.exit(1);
}

// ── Setup ─────────────────────────────────────────────────────────────────

const profile = createProviderProfile('openrouter', 'google/gemma-4-26b-a4b-it', API_KEY);
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

async function runRealTest(name, userMessage, enableTools = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 REAL TEST: ${name}`);
  console.log(`👤 User: ${userMessage}`);
  console.log(`${'─'.repeat(70)}`);

  const startTime = Date.now();
  let textBuffer = '';
  let toolCalls = [];
  let toolResults = [];
  let firstTokenTime = null;

  const session = engine.createSession(`Test: ${name}`);
  
  try {
    const stream = engine.sendMessage(userMessage, { enableTools, sessionId: session.id });

    for await (const event of stream) {
      switch (event.type) {
        case 'text-delta':
          if (!firstTokenTime) firstTokenTime = Date.now() - startTime;
          textBuffer += event.text;
          process.stdout.write(event.text);
          break;
        case 'tool-call':
          toolCalls.push(event.call);
          console.log(`\n🔧 TOOL: ${event.call.name}(${JSON.stringify(event.call.args)})`);
          break;
        case 'tool-result':
          toolResults.push(event.result);
          console.log(`\n📊 RESULT: ${event.result.success ? '✅' : '❌'} ${event.result.content?.slice(0, 100)}...`);
          break;
        case 'error':
          console.error(`\n❌ ERROR: ${event.message}`);
          break;
        case 'finish':
          console.log(`\n${'─'.repeat(70)}`);
          break;
      }
    }
  } catch (err) {
    console.error(`\n💥 FAIL: ${err.message}`);
    return false;
  }

  const duration = Date.now() - startTime;
  
  console.log(`\n📊 METRICS:`);
  console.log(`   Response length: ${textBuffer.length} chars`);
  console.log(`   TTFT: ${firstTokenTime || 'N/A'}ms`);
  console.log(`   Total: ${duration}ms`);
  console.log(`   Tool calls: ${toolCalls.length}`);
  console.log(`   Tool results: ${toolResults.length}`);
  
  return textBuffer.length > 0;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 super-chat Real-World Test');
  console.log(`   Provider: OpenRouter`);
  console.log(`   Model: google/gemma-4-26b-a4b-it`);
  console.log(`   API Key: ${API_KEY.slice(0, 12)}...`);
  console.log('');
  console.log('This test makes REAL API calls. Costs will apply.');
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: Simple chat
  if (await runRealTest('Simple Chat', 'What is quantum entanglement? Explain in 2 sentences.', false)) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: Tool calling
  if (await runRealTest('Tool Use', 'What is 12345 * 67890?', true)) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: Multi-step
  if (await runRealTest('Multi-step', 'Calculate 2+2, then multiply by 5', true)) {
    passed++;
  } else {
    failed++;
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📋 SUMMARY');
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n✅ All real-world tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
