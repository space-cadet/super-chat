import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatEngine, VercelLLMAdapter, createProviderProfile, DemoToolAdapter, MemoryPersistenceAdapter } from 'super-chat';
import { ChatApp } from 'super-chat/react';

// ============================================================================
// Provider Configuration
// ============================================================================

interface ProviderConfig {
  id: string;
  name: string;
  color: string;
  model: string;
  apiKeyEnv: string;
  baseUrl?: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    color: '#4d6bfa',
    model: 'deepseek-chat',
    apiKeyEnv: 'VITE_DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    color: '#2563eb',
    model: 'kimi-k2.5',
    apiKeyEnv: 'VITE_KIMI_API_KEY',
    baseUrl: 'https://api.moonshot.cn/v1',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#ef4444',
    model: 'google/gemini-2.0-flash',
    apiKeyEnv: 'VITE_OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    color: '#4285f4',
    model: 'gemini-2.0-flash',
    apiKeyEnv: 'VITE_GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },
];

// ============================================================================
// Mock LLM Adapter for UI testing without API keys
// ============================================================================

class MockLLMAdapter {
  private toolDefinitions: any[] = [];

  setTools(tools: any[]) {
    this.toolDefinitions = tools;
  }

  async *streamChatWithTools(
    messages: Array<{ role: string; content: string }>,
    _tools: any[],
    signal?: AbortSignal
  ): AsyncIterable<any> {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content?.toLowerCase() || '';

    // Simulate thinking delay
    await new Promise(r => setTimeout(r, 800));
    if (signal?.aborted) return;

    // Determine which tool to "call" based on message content
    let responseText = '';
    let toolCall = null;

    if (content.includes('calculate') || content.includes('125') || content.includes('math')) {
      responseText = "I'll calculate that for you.";
      toolCall = {
        type: 'tool-call',
        call: {
          id: `calc-${Date.now()}`,
          name: 'calculate',
          args: { expression: '125 * 47' },
        },
      };
    } else if (content.includes('weather') || content.includes('tokyo')) {
      responseText = "Let me check the weather in Tokyo for you.";
      toolCall = {
        type: 'tool-call',
        call: {
          id: `weather-${Date.now()}`,
          name: 'get_weather',
          args: { location: 'Tokyo, Japan', units: 'celsius' },
        },
      };
    } else if (content.includes('arxiv') || content.includes('paper') || content.includes('quantum')) {
      responseText = "I'll search arXiv for recent papers on that topic.";
      toolCall = {
        type: 'tool-call',
        call: {
          id: `arxiv-${Date.now()}`,
          name: 'fetch_arxiv',
          args: { query: 'quantum error correction', max_results: 3 },
        },
      };
    } else if (content.includes('search') || content.includes('web')) {
      responseText = "I'll search the web for that information.";
      toolCall = {
        type: 'tool-call',
        call: {
          id: `search-${Date.now()}`,
          name: 'search_web',
          args: { query: content.replace('search', '').trim(), num_results: 5 },
        },
      };
    } else {
      responseText = "Hello! I'm running in **Mock Mode** (no API key needed).\n\nI can demonstrate tool calling with these scenarios:\n\n1. **Calculate**: Try \"What's 125 × 47?\"\n2. **Weather**: Try \"What's the weather in Tokyo?\"\n3. **arXiv**: Try \"Search arXiv for quantum error correction\"\n4. **Web Search**: Try \"Search for recent AI breakthroughs\"\n\nOr click the scenario buttons below.";
    }

    // Stream text character by character
    for (let i = 0; i < responseText.length; i++) {
      if (signal?.aborted) return;
      yield { type: 'text-delta', text: responseText[i] };
      await new Promise(r => setTimeout(r, 15));
    }

    if (toolCall) {
      if (signal?.aborted) return;
      yield toolCall;
    }

    yield { type: 'finish', reason: toolCall ? 'tool-calls-detected' : 'text-complete' };
  }

  async *streamChat(): AsyncIterable<string> {
    yield "Mock mode active. Use tool scenarios to see the full flow.";
  }
}

// ============================================================================
// Demo Component
// ============================================================================

function Demo() {
  const [engine, setEngine] = useState<ChatEngine | null>(null);
  const [started, setStarted] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    (import.meta as any).env?.VITE_DEFAULT_PROVIDER || 'deepseek'
  );
  const [apiKey, setApiKey] = useState('');
  const [useMockMode, setUseMockMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');

  // Load API key from env or localStorage
  useEffect(() => {
    const provider = PROVIDERS.find(p => p.id === selectedProvider);
    if (provider) {
      const envKey = (import.meta as any).env?.[provider.apiKeyEnv] || '';
      const storedKey = localStorage.getItem(`demo_key_${provider.id}`) || '';
      setApiKey(envKey || storedKey);
    }
  }, [selectedProvider]);

  const testConnection = useCallback(async () => {
    if (useMockMode) return true;
    
    setConnectionStatus('testing');
    try {
      const provider = PROVIDERS.find(p => p.id === selectedProvider);
      if (!provider || !apiKey.trim()) {
        setConnectionStatus('failed');
        return false;
      }

      const profile = createProviderProfile(selectedProvider, provider.model, apiKey, {
        baseUrl: provider.baseUrl,
      });
      const adapter = new VercelLLMAdapter({ profile });
      const result = await adapter.testConnection();
      
      if (result.ok) {
        setConnectionStatus('connected');
        return true;
      } else {
        setConnectionStatus('failed');
        setError(result.message);
        return false;
      }
    } catch (err) {
      setConnectionStatus('failed');
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, [selectedProvider, apiKey, useMockMode]);

  const startChat = useCallback(async () => {
    setError(null);

    try {
      if (useMockMode) {
        // Mock mode - no API key needed
        const mockAdapter = new MockLLMAdapter() as any;
        const toolAdapter = new DemoToolAdapter();
        const persistence = new MemoryPersistenceAdapter();

        const newEngine = new ChatEngine({
          llmAdapter: mockAdapter,
          toolAdapter,
          persistenceAdapter: persistence,
          systemPrompt: 'You are a helpful assistant with access to tools. Use them when appropriate.',
        });

        setEngine(newEngine);
        setStarted(true);
        return;
      }

      // Real mode - need valid API key
      const provider = PROVIDERS.find(p => p.id === selectedProvider);
      if (!provider) return;

      if (!apiKey.trim()) {
        setError(`Please enter your ${provider.name} API key`);
        return;
      }

      // Save key to localStorage for convenience
      localStorage.setItem(`demo_key_${provider.id}`, apiKey);

      const profile = createProviderProfile(selectedProvider, provider.model, apiKey, {
        baseUrl: provider.baseUrl,
      });

      const llmAdapter = new VercelLLMAdapter({ 
        profile,
        systemPrompt: 'You are a helpful research assistant with access to tools: calculate, search_web, get_weather, and fetch_arxiv. Use these tools proactively when they would help answer the user\'s question.',
      });
      const toolAdapter = new DemoToolAdapter();
      const persistence = new MemoryPersistenceAdapter();

      const newEngine = new ChatEngine({
        llmAdapter,
        toolAdapter,
        persistenceAdapter: persistence,
      });

      setEngine(newEngine);
      setStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [selectedProvider, apiKey, useMockMode]);

  // Quick scenario buttons
  const scenarios = [
    { label: '🧮 Calculate 125×47', message: 'What is 125 multiplied by 47?' },
    { label: '🌤️ Weather in Tokyo', message: 'What is the weather in Tokyo?' },
    { label: '📚 arXiv: Quantum Error Correction', message: 'Search arXiv for recent papers on quantum error correction' },
    { label: '🔍 Web Search', message: 'Search the web for recent breakthroughs in quantum computing' },
  ];

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 500, margin: '0 auto', padding: 24, border: '1px solid #fca5a5', borderRadius: 8, background: '#fef2f2' }}>
          <h2 style={{ color: '#dc2626', margin: '0 0 16px' }}>⚠️ Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
          <button 
            onClick={() => setError(null)}
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#f5f5f5',
        padding: 20,
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: 480, 
          background: 'white', 
          borderRadius: 12, 
          padding: 32,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>🚀 super-chat Demo</h1>
          <p style={{ color: '#666', margin: '0 0 24px' }}>Test tool-calling with real or mock LLMs</p>

          {/* Mode Toggle */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={useMockMode}
                onChange={(e) => setUseMockMode(e.target.checked)}
              />
              <span>Use Mock Mode (no API key needed)</span>
            </label>
            {useMockMode && (
              <p style={{ fontSize: 13, color: '#666', margin: '8px 0 0' }}>
                Simulates LLM responses with pre-defined tool calls. Great for testing the UI flow.
              </p>
            )}
          </div>

          {!useMockMode && (
            <>
              {/* Provider Selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Provider</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 20,
                        border: '2px solid ' + (selectedProvider === p.id ? p.color : '#e5e7eb'),
                        background: selectedProvider === p.id ? p.color + '15' : 'white',
                        color: selectedProvider === p.id ? p.color : '#374151',
                        cursor: 'pointer',
                        fontWeight: selectedProvider === p.id ? 600 : 400,
                        transition: 'all 0.2s',
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                  API Key {connectionStatus === 'connected' && '✅'}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setConnectionStatus('idle'); }}
                  placeholder={`Enter ${PROVIDERS.find(p => p.id === selectedProvider)?.name} API key`}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={testConnection}
                    disabled={!apiKey.trim() || connectionStatus === 'testing'}
                    style={{
                      padding: '6px 12px',
                      fontSize: 13,
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                      background: 'white',
                      cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
                      opacity: apiKey.trim() ? 1 : 0.5,
                    }}
                  >
                    {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                  {connectionStatus === 'failed' && (
                    <span style={{ color: '#dc2626', fontSize: 13, alignSelf: 'center' }}>Connection failed</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Start Button */}
          <button
            onClick={startChat}
            disabled={!useMockMode && !apiKey.trim()}
            style={{
              width: '100%',
              padding: '12px',
              background: useMockMode || apiKey.trim() ? '#2563eb' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: useMockMode || apiKey.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {useMockMode ? 'Start Mock Demo' : 'Start Chat'}
          </button>

          {/* Scenarios Preview */}
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 12px' }}>Demo scenarios (click to try after starting):</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {scenarios.map((s, i) => (
                <span 
                  key={i}
                  style={{
                    padding: '4px 10px',
                    background: '#f3f4f6',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#4b5563',
                  }}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!engine) return null;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        background: 'white', 
        borderBottom: '1px solid #e5e7eb', 
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18 }}>🚀 super-chat Demo</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
            {useMockMode ? '🎭 Mock Mode — Simulated responses' : `⚡ ${PROVIDERS.find(p => p.id === selectedProvider)?.name} — ${PROVIDERS.find(p => p.id === selectedProvider)?.model}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Scenario Buttons */}
          {scenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                // Inject message via engine
                const input = document.querySelector('textarea') as HTMLTextAreaElement;
                if (input) {
                  input.value = s.message;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  // Find and click send button
                  const sendBtn = document.querySelector('[data-send-btn]') as HTMLButtonElement;
                  sendBtn?.click();
                }
              }}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                borderRadius: 16,
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => { setStarted(false); setEngine(null); }}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              background: '#f3f4f6',
              cursor: 'pointer',
            }}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Chat */}
      <div style={{ padding: '8px 16px', fontSize: 12, color: '#666', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        API Keys: DeepSeek {(import.meta as any).env?.VITE_DEEPSEEK_API_KEY ? '✅' : '❌'} | 
        Kimi {(import.meta as any).env?.VITE_KIMI_API_KEY ? '✅' : '❌'} | 
        OpenRouter {(import.meta as any).env?.VITE_OPENROUTER_API_KEY ? '✅' : '❌'} | 
        Gemini {(import.meta as any).env?.VITE_GEMINI_API_KEY ? '✅' : '❌'}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ChatApp engine={engine} />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Demo />);
