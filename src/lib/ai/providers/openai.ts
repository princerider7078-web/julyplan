// OpenAI provider adapter (stub — set NEXT_PUBLIC_OPENAI_API_KEY to enable)
import type { AIProviderAdapter, AIRequest, AIResponse } from '../types';

const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

export const openaiProvider: AIProviderAdapter = {
  name: 'openai',
  available: !!API_KEY,
  models: [
    { id: 'gpt-4o', label: 'GPT-4o', type: ['chat', 'planning', 'reports'] },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', type: ['chat', 'notification'] },
  ],
  async complete(req: AIRequest, model: string): Promise<AIResponse> {
    if (!API_KEY) throw new Error('OpenAI API key not configured');
    const start = Date.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1500,
        ...(req.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    let json: unknown = undefined;
    if (req.responseFormat === 'json') {
      try { json = JSON.parse(text); } catch { /* leave undefined */ }
    }
    return {
      text,
      json,
      provider: 'openai',
      model: model || 'gpt-4o-mini',
      tokensUsed: data?.usage?.total_tokens,
      latencyMs: Date.now() - start,
    };
  },
};
