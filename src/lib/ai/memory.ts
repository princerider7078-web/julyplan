// Memory System — loads, saves, and retrieves durable user memories.
// V3: uses the full AIMemoryItem shape with categories, importance, flags.
// Memory lives in the local store (Zustand) and syncs to Supabase when authed.
import { supabase } from '../supabase/client';
import { useStore } from '../store';
import type { AIMemoryItem, MemoryCategory, MemoryImportance, MemorySource } from '../types';

// ---------- Local store helpers (work offline + online) ----------

export function getAllMemories(): AIMemoryItem[] {
  return useStore.getState().memories;
}

export function getActiveMemories(): AIMemoryItem[] {
  return useStore.getState().memories.filter((m) => !m.archived && !m.disabled);
}

export function getPinnedMemories(): AIMemoryItem[] {
  return useStore.getState().memories.filter((m) => m.pinned && !m.archived && !m.disabled);
}

export function getFavoriteMemories(): AIMemoryItem[] {
  return useStore.getState().memories.filter((m) => m.favorite && !m.archived);
}

export function addMemory(input: {
  title: string;
  content: string;
  category?: MemoryCategory;
  importance?: MemoryImportance;
  confidence?: number;
  source?: MemorySource;
  pinned?: boolean;
  favorite?: boolean;
  tags?: string[];
}): string {
  return useStore.getState().addMemory({
    title: input.title,
    content: input.content,
    category: input.category ?? 'custom',
    importance: input.importance ?? 'medium',
    confidence: input.confidence ?? 0.7,
    source: input.source ?? 'chat',
    pinned: input.pinned ?? false,
    favorite: input.favorite ?? false,
    tags: input.tags ?? [],
  });
}

export function updateMemory(id: string, patch: Partial<AIMemoryItem>): void {
  useStore.getState().updateMemory(id, patch);
}

export function deleteMemory(id: string): void {
  useStore.getState().deleteMemory(id);
}

export function clearAllMemories(): void {
  const store = useStore.getState();
  store.memories.forEach((m) => {
    if (!m.locked) store.deleteMemory(m.id);
  });
}

export function touchMemory(id: string): void {
  useStore.getState().touchMemory(id);
}

// ---------- Semantic-ish retrieval (TF-IDF + recency) ----------
// Real semantic search requires pgvector; this is the client-side fallback.

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

// Find memories relevant to a query. Combines:
// - Pinned memories (always included)
// - Keyword/semantic similarity
// - Recency boost
// - Importance boost
export function retrieveRelevantMemories(query: string, limit = 8): AIMemoryItem[] {
  const all = getActiveMemories();
  if (all.length === 0) return [];

  const queryTokens = tokenize(query);
  const now = Date.now();

  const scored = all.map((m) => {
    // Always include pinned
    if (m.pinned) return { memory: m, score: 1000 };

    const titleTokens = tokenize(m.title);
    const contentTokens = tokenize(m.content);
    const tagTokens = new Set(m.tags.map((t) => t.toLowerCase()));

    // Jaccard similarity (semantic-ish)
    const titleSim = jaccardSimilarity(queryTokens, titleTokens);
    const contentSim = jaccardSimilarity(queryTokens, contentTokens);
    const tagOverlap = Array.from(tagTokens).filter((t) => queryTokens.has(t)).length;

    const similarityScore = (titleSim * 3) + (contentSim * 2) + (tagOverlap * 0.5);

    // Recency boost (last 7 days gets +1, decays after)
    const ageDays = (now - new Date(m.updatedAt).getTime()) / 86400000;
    const recencyBoost = Math.max(0, 1 - ageDays / 30);

    // Importance boost
    const importanceBoost = { critical: 1.5, high: 1.0, medium: 0.5, low: 0.2 }[m.importance];

    // Use frequency boost
    const useBoost = Math.min(0.5, m.useCount * 0.1);

    const score = similarityScore + recencyBoost + importanceBoost + useBoost;
    return { memory: m, score };
  });

  return scored
    .filter((s) => s.score > 0.1 || s.memory.pinned)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.memory);
}

// ---------- Supabase sync (when authenticated) ----------

export async function loadMemoriesFromSupabase(userId: string): Promise<AIMemoryItem[]> {
  if (!userId || userId === 'offline-user') return [];
  try {
    const { data, error } = await supabase
      .from('ai_memories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.memory_key,
      content: r.memory_value,
      category: (r.memory_type as MemoryCategory) ?? 'custom',
      importance: 'medium' as MemoryImportance,
      confidence: r.confidence_score ?? 0.7,
      source: 'chat' as MemorySource,
      pinned: false,
      favorite: false,
      archived: false,
      locked: false,
      disabled: false,
      tags: [],
      lastUsedAt: r.last_used_at,
      useCount: 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function pushMemoryToSupabase(
  userId: string,
  memory: AIMemoryItem,
): Promise<void> {
  if (!userId || userId === 'offline-user') return;
  try {
    await supabase.from('ai_memories').upsert({
      id: memory.id,
      user_id: userId,
      memory_type: memory.category,
      memory_key: memory.title,
      memory_value: memory.content,
      confidence_score: memory.confidence,
      source_module: 'chat',
      last_used_at: memory.lastUsedAt,
    }, { onConflict: 'id' });
  } catch { /* silent */ }
}

export async function deleteMemoryFromSupabase(userId: string, memoryId: string): Promise<void> {
  if (!userId || userId === 'offline-user') return;
  try {
    await supabase.from('ai_memories').delete().eq('id', memoryId).eq('user_id', userId);
  } catch { /* silent */ }
}

// Re-export for backward compat with old code
export async function loadMemories(userId: string): Promise<AIMemoryItem[]> {
  return loadMemoriesFromSupabase(userId);
}

export async function saveMemory(userId: string, memory: Partial<AIMemoryItem> & { memory_type?: string; memory_key?: string; memory_value?: string; confidence_score?: number }): Promise<void> {
  if (!userId || userId === 'offline-user') return;
  try {
    await supabase.from('ai_memories').upsert({
      user_id: userId,
      memory_type: memory.memory_type ?? memory.category ?? 'custom',
      memory_key: memory.memory_key ?? memory.title ?? '',
      memory_value: memory.memory_value ?? memory.content ?? '',
      confidence_score: memory.confidence_score ?? memory.confidence ?? 0.7,
      source_module: 'chat',
    }, { onConflict: 'user_id,memory_type,memory_key' });
  } catch { /* silent */ }
}
