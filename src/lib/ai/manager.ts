// AI Manager — the central brain orchestrator.
// Flow: request → load memory → build context → choose model → call provider
//       → validate → save memory → log → return response
import type {
  AIRequest, AIResponse, AIRequestType, AIProfile, AIContext,
} from './types';
import { getProvider } from './providers';
import { supabase } from '../supabase/client';

const DEFAULT_PROFILE: AIProfile = {
  provider: 'zai',
  model_chat: 'glm-4.6',
  model_planning: 'glm-4.6',
  model_reports: 'glm-4.6',
  fallback_model: 'glm-4.5',
  temperature: 0.7,
  max_tokens: 1500,
  prompt_style: 'coach',
  enabled_modules_json: [],
};

function pickModel(profile: AIProfile, type: AIRequestType): string {
  switch (type) {
    case 'chat': return profile.model_chat;
    case 'planning': return profile.model_planning;
    case 'reports': return profile.model_reports;
    case 'voice':
    case 'nutrition':
    case 'notification':
    default:
      return profile.model_chat || profile.fallback_model || 'glm-4.6';
  }
}

export interface AIManagerOptions {
  profile?: AIProfile;
  context?: AIContext;
  userId?: string;
  logToSupabase?: boolean;
}

export class AIManager {
  private profile: AIProfile;
  private context?: AIContext;
  private userId?: string;
  private logToSupabase: boolean;

  constructor(opts: AIManagerOptions = {}) {
    this.profile = opts.profile ?? DEFAULT_PROFILE;
    this.context = opts.context;
    this.userId = opts.userId;
    this.logToSupabase = opts.logToSupabase ?? true;
  }

  setProfile(p: AIProfile) { this.profile = p; }
  setContext(c: AIContext) { this.context = c; }
  setUserId(id?: string) { this.userId = id; }

  async complete(req: AIRequest): Promise<AIResponse> {
    const model = pickModel(this.profile, req.type);
    const provider = getProvider(this.profile.provider);

    let response: AIResponse;
    try {
      response = await provider.complete(
        {
          ...req,
          temperature: req.temperature ?? this.profile.temperature,
          maxTokens: req.maxTokens ?? this.profile.max_tokens,
        },
        model,
      );
    } catch (err) {
      // Fallback to fallback_model on the same provider, then to zai
      if (this.profile.fallback_model && this.profile.fallback_model !== model) {
        try {
          response = await getProvider('zai').complete(
            { ...req, temperature: req.temperature, maxTokens: req.maxTokens },
            this.profile.fallback_model,
          );
        } catch {
          throw err;
        }
      } else {
        throw err;
      }
    }

    // Async log to Supabase (non-blocking)
    if (this.logToSupabase && this.userId && supabase) {
      this.logRequest(req, response).catch(() => { /* silent */ });
    }

    return response;
  }

  private async logRequest(req: AIRequest, res: AIResponse) {
    if (!this.userId) return;
    try {
      const { data: reqRow } = await supabase.from('ai_requests').insert({
        user_id: this.userId,
        request_type: req.type,
        prompt_text: req.messages.map((m) => `[${m.role}] ${m.content.slice(0, 500)}`).join('\n\n').slice(0, 5000),
        context_json: this.context ?? {},
        provider: res.provider,
        model: res.model,
        token_usage: res.tokensUsed,
        response_preview: res.text.slice(0, 500),
      }).select('id').single();
      if (reqRow?.id) {
        await supabase.from('ai_responses').insert({
          request_id: reqRow.id,
          user_id: this.userId,
          response_text: res.text,
          response_type: req.type,
        });
      }
    } catch { /* silent — logging is best-effort */ }
  }
}

// Singleton manager — components can import and use directly
let defaultManager: AIManager | null = null;
export function getAIManager(opts?: AIManagerOptions): AIManager {
  if (!defaultManager) defaultManager = new AIManager(opts);
  else if (opts) {
    if (opts.profile) defaultManager.setProfile(opts.profile);
    if (opts.context) defaultManager.setContext(opts.context);
    if (opts.userId !== undefined) defaultManager.setUserId(opts.userId);
  }
  return defaultManager;
}
