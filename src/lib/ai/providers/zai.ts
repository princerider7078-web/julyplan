// Default AI provider: calls the /api/ai server route (which uses z-ai-web-dev-sdk).
// This keeps the SDK server-side only — the browser never imports it.
//
// URL resolution:
// - Web mode (default): calls relative "/api/ai" — works because Next.js
//   API route is deployed alongside the frontend.
// - APK mode: the user sets `aiBackendUrl` in Dev Controls (e.g.
//   "https://your-deploy.example.com") and this provider calls
//   `${aiBackendUrl}/api/ai` so the APK reaches the cloud AI backend.
import type { AIProviderAdapter, AIRequest, AIResponse } from '../types';
import { useStore } from '../../store';

function getAiUrl(): string {
  // Read from store (browser-safe; returns '' in SSR)
  try {
    const backend = useStore.getState()?.settings?.aiBackendUrl;
    if (backend && typeof window !== 'undefined') {
      return `${backend.replace(/\/$/, '')}/api/ai`;
    }
  } catch { /* store not ready */ }
  return '/api/ai';
}

export const zaiProvider: AIProviderAdapter = {
  name: 'zai',
  available: true,
  models: [
    { id: 'glm-4.6', label: 'GLM-4.6 (default)', type: ['chat', 'planning', 'reports', 'voice', 'nutrition', 'notification'] },
    { id: 'glm-4.5', label: 'GLM-4.5', type: ['chat', 'planning', 'reports'] },
  ],
  async complete(req: AIRequest, model: string): Promise<AIResponse> {
    const start = Date.now();
    const url = getAiUrl();
    let res: Response;
    try {
      res = await fetch(url, {
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
    } catch (networkErr) {
      throw new Error(
        'AI features require a connection to the July Plan backend. ' +
        'If using the APK, open AI Controls → set AI Backend URL to your deployed July Plan URL. ' +
        `(${networkErr instanceof Error ? networkErr.message : 'network error'})`,
      );
    }
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
