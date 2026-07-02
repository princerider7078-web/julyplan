// OpenRouter provider adapter (stub — set OPENROUTER_API_KEY env to enable)
// Swaps in without touching the rest of the app.
import type { AIProviderAdapter, AIRequest, AIResponse } from '../types';

const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

export const openrouterProvider: AIProviderAdapter = {
  name: 'openrouter',
  available: !!API_KEY,
  models: [
    { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', type: ['chat', 'planning', 'reports'] },
    { id: 'openai/gpt-4o', label: 'GPT-4o', type: ['chat', 'planning'] },
    { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B', type: ['chat', 'reports'] },
  ],
  async complete(req: AIRequest, model: string): Promise<AIResponse> {
    if (!API_KEY) throw new Error('OpenRouter API key not configured');
    const start = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-4o',
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1500,
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return {
      text,
      provider: 'openrouter',
      model: model || 'openai/gpt-4o',
      tokensUsed: data?.usage?.total_tokens,
      latencyMs: Date.now() - start,
    };
  },
};
