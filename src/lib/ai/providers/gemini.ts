// Gemini provider adapter (stub — set NEXT_PUBLIC_GEMINI_API_KEY to enable)
import type { AIProviderAdapter, AIRequest, AIResponse } from '../types';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export const geminiProvider: AIProviderAdapter = {
  name: 'gemini',
  available: !!API_KEY,
  models: [
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', type: ['chat', 'planning', 'reports'] },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', type: ['chat', 'notification'] },
  ],
  async complete(req: AIRequest, model: string): Promise<AIResponse> {
    if (!API_KEY) throw new Error('Gemini API key not configured');
    const start = Date.now();
    const mdl = model || 'gemini-1.5-pro';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: req.messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: req.temperature ?? 0.7,
            maxOutputTokens: req.maxTokens ?? 1500,
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return {
      text,
      provider: 'gemini',
      model: mdl,
      latencyMs: Date.now() - start,
    };
  },
};
