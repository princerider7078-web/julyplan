// Groq provider adapter (stub — set NEXT_PUBLIC_GROQ_API_KEY to enable)
import type { AIProviderAdapter, AIRequest, AIResponse } from '../types';

const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

export const groqProvider: AIProviderAdapter = {
  name: 'groq',
  available: !!API_KEY,
  models: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)', type: ['chat', 'planning'] },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', type: ['chat', 'notification'] },
  ],
  async complete(req: AIRequest, model: string): Promise<AIResponse> {
    if (!API_KEY) throw new Error('Groq API key not configured');
    const start = Date.now();
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1500,
      }),
    });
    if (!res.ok) throw new Error(`Groq error: ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return {
      text,
      provider: 'groq',
      model: model || 'llama-3.3-70b-versatile',
      tokensUsed: data?.usage?.total_tokens,
      latencyMs: Date.now() - start,
    };
  },
};
