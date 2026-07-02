// Memory System — loads and writes durable user memories to Supabase.
// Memory lives in the database, not inside the AI model.
import { supabase } from '../supabase/client';
import type { AIMemory } from './types';

export async function loadMemories(userId: string, limit = 50): Promise<AIMemory[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('ai_memories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      memory_type: r.memory_type,
      memory_key: r.memory_key,
      memory_value: r.memory_value,
      confidence_score: r.confidence_score,
      source_module: r.source_module,
      last_used_at: r.last_used_at,
    }));
  } catch {
    return [];
  }
}

export async function saveMemory(
  userId: string,
  memory: Omit<AIMemory, 'id'>,
): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('ai_memories').upsert(
      {
        user_id: userId,
        memory_type: memory.memory_type,
        memory_key: memory.memory_key,
        memory_value: memory.memory_value,
        confidence_score: memory.confidence_score,
        source_module: memory.source_module,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,memory_type,memory_key' },
    );
  } catch { /* silent */ }
}

export async function deleteMemory(userId: string, memoryId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('ai_memories').delete().eq('id', memoryId).eq('user_id', userId);
  } catch { /* silent */ }
}

export async function clearAllMemories(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('ai_memories').delete().eq('user_id', userId);
  } catch { /* silent */ }
}

// Touch last_used_at when memory is consumed
export async function touchMemory(userId: string, memoryId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('ai_memories')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', memoryId)
      .eq('user_id', userId);
  } catch { /* silent */ }
}
