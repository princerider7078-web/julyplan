// Default AI provider: calls the /api/ai server route (which uses z-ai-web-dev-sdk).
// This keeps the SDK server-side only — the browser never imports it.
import type { AIProviderAdapter, AIRequest, AIResponse } from '../types';

export const zaiProvider: AIProviderAdapter = {
  name: 'zai',
  available: true,
  models: [
    { id: 'glm-4.6', label: 'GLM-4.6 (default)', type: ['chat', 'planning', 'reports', 'voice', 'nutrition', 'notification'] },
    { id: 'glm-4.5', label: 'GLM-4.5', type: ['chat', 'planning', 'reports'] },
  ],
  async complete(req: AIRequest, model: string): Promise<AIResponse> {
    const start = Date.now();
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: req.messages,
        model: model || 'glm-4.6',
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1500,
        response_format: req.responseFormat,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'request failed' }));
      throw new Error(err.error || `AI route returned ${res.status}`);
    }
    const data = await res.json();
    return {
      text: data.text ?? '',
      json: data.json,
      provider: 'zai',
      model: data.model || model || 'glm-4.6',
      tokensUsed: data.tokensUsed,
      latencyMs: Date.now() - start,
    };
  },
};
