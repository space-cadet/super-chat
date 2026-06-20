import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ChatEngine, VercelLLMAdapter, createProviderProfile, DemoToolAdapter, MemoryPersistenceAdapter } from 'super-chat';
import { ChatApp } from 'super-chat/react';

const DEMO_CONFIG = {
  provider: 'openrouter',
  model: 'google/gemma-4-26b-a4b-it',
  apiKey: localStorage.getItem('demo_api_key') || '',
};

function Demo() {
  const [apiKey, setApiKey] = useState(DEMO_CONFIG.apiKey);
  const [engine, setEngine] = useState<ChatEngine | null>(null);
  const [started, setStarted] = useState(false);

  const startChat = useCallback(() => {
    if (!apiKey.trim()) return;
    
    localStorage.setItem('demo_api_key', apiKey);
    
    const profile = createProviderProfile(DEMO_CONFIG.provider, DEMO_CONFIG.model, apiKey);
    const llmAdapter = new VercelLLMAdapter({ profile });
    const toolAdapter = new DemoToolAdapter();
    const persistence = new MemoryPersistenceAdapter();
    
    const newEngine = new ChatEngine({
      llmAdapter,
      toolAdapter,
      persistenceAdapter: persistence,
      systemPrompt: 'You are a helpful research assistant. Be concise and accurate.',
    });
    
    setEngine(newEngine);
    setStarted(true);
  }, [apiKey]);

  if (!started) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-4">super-chat Demo</h1>
        <p className="text-gray-600 mb-4">
          Test the ChatApp component with real LLM calls.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">OpenRouter API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Key is stored in browser localStorage only.
            </p>
          </div>
          
          <button
            onClick={startChat}
            disabled={!apiKey.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 hover:bg-blue-700"
          >
            Start Chat
          </button>
        </div>
      </div>
    );
  }

  if (!engine) return null;

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b p-3 flex justify-between items-center">
        <h1 className="font-bold">super-chat Demo</h1>
        <div className="text-sm text-gray-500">
          Model: {DEMO_CONFIG.model} | Provider: {DEMO_CONFIG.provider}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatApp engine={engine} />
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Demo />);
