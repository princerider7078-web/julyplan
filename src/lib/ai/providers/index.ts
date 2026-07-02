// Provider registry — single source of truth for all AI providers.
// To add a new provider: implement AIProviderAdapter, register it here.
import type { AIProvider, AIProviderAdapter } from '../types';
import { zaiProvider } from './zai';
import { openrouterProvider } from './openrouter';
import { geminiProvider } from './gemini';
import { groqProvider } from './groq';
import { openaiProvider } from './openai';

export const providers: Record<AIProvider, AIProviderAdapter> = {
  zai: zaiProvider,
  openrouter: openrouterProvider,
  gemini: geminiProvider,
  groq: groqProvider,
  openai: openaiProvider,
  ollama: {
    // Local Ollama stub — enable by running ollama serve locally
    name: 'ollama',
    available: false,
    models: [
      { id: 'llama3.2', label: 'Llama 3.2 (local)', type: ['chat'] },
    ],
    async complete() {
      throw new Error('Ollama not yet configured — run ollama serve locally and add adapter');
    },
  },
};

export function getProvider(name: AIProvider): AIProviderAdapter {
  return providers[name] ?? providers.zai;
}

export function listAvailableProviders(): AIProviderAdapter[] {
  return Object.values(providers).filter((p) => p.available);
}

export function listAllProviders(): { name: AIProvider; available: boolean; models: { id: string; label: string }[] }[] {
  return Object.values(providers).map((p) => ({
    name: p.name,
    available: p.available,
    models: p.models.map((m) => ({ id: m.id, label: m.label })),
  }));
}
