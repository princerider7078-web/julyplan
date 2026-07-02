// Public AI API — single entry point for components.
// Components should never touch providers directly.
import { AIManager, type AIManagerOptions } from './manager';
import { getAIManager } from './manager';
import {
  buildChatPrompt, buildPlannerPrompt, buildReportPrompt,
  buildNotificationPrompt, buildJournalSummaryPrompt,
  buildKnowledgeSummaryPrompt, buildMemoryExtractionPrompt,
} from './prompts';
import type { AIContext, AIResponse } from './types';

export async function aiChat(
  userMessage: string,
  ctx?: AIContext,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
  opts?: AIManagerOptions,
): Promise<AIResponse> {
  const mgr = getAIManager(opts);
  const messages = buildChatPrompt(userMessage, ctx, history);
  return mgr.complete({ type: 'chat', messages, responseFormat: 'text' });
}

export async function aiPlan(
  slot: 'morning' | 'afternoon' | 'evening' | 'night' | 'recovery' | 'weekly' | 'monthly',
  ctx?: AIContext,
  opts?: AIManagerOptions,
): Promise<AIResponse> {
  const mgr = getAIManager(opts);
  const messages = buildPlannerPrompt(slot, ctx);
  return mgr.complete({ type: 'planning', messages, responseFormat: 'text' });
}

export async function aiReport(
  type: 'daily' | 'weekly' | 'monthly',
  ctx?: AIContext,
  opts?: AIManagerOptions,
): Promise<AIResponse> {
  const mgr = getAIManager(opts);
  const messages = buildReportPrompt(type, ctx);
  return mgr.complete({ type: 'reports', messages, responseFormat: 'text' });
}

export async function aiNotification(
  type: 'water' | 'workout' | 'sleep' | 'task' | 'habit' | 'finance',
  ctx?: AIContext,
  opts?: AIManagerOptions,
): Promise<AIResponse> {
  const mgr = getAIManager(opts);
  const messages = buildNotificationPrompt(type, ctx);
  return mgr.complete({
    type: 'notification',
    messages,
    maxTokens: 80,
    responseFormat: 'text',
  });
}

export async function aiJournalSummary(
  content: string,
  mood: number,
  opts?: AIManagerOptions,
): Promise<AIResponse> {
  const mgr = getAIManager(opts);
  const messages = buildJournalSummaryPrompt(content, mood);
  return mgr.complete({ type: 'reports', messages, responseFormat: 'text' });
}

export async function aiKnowledgeSummary(
  content: string,
  opts?: AIManagerOptions,
): Promise<AIResponse> {
  const mgr = getAIManager(opts);
  const messages = buildKnowledgeSummaryPrompt(content);
  return mgr.complete({ type: 'reports', messages, responseFormat: 'json' });
}

export async function aiExtractMemories(
  conversation: string,
  opts?: AIManagerOptions,
): Promise<AIResponse> {
  const mgr = getAIManager(opts);
  const messages = buildMemoryExtractionPrompt(conversation);
  return mgr.complete({ type: 'chat', messages, responseFormat: 'json' });
}

export { AIManager, getAIManager };
export type { AIContext, AIResponse, AIManagerOptions };
