// AI System — Type Definitions
// Provider-agnostic types so OpenRouter / Gemini / Groq / OpenAI / Ollama
// can all be swapped by adding a new provider adapter.

export type AIProvider = 'zai' | 'openrouter' | 'gemini' | 'groq' | 'openai' | 'ollama';

export type AIRequestType =
  | 'chat'        // conversational coaching
  | 'planning'    // generate a plan (morning / weekly / recovery)
  | 'reports'     // summarize analytics
  | 'voice'       // voice session feedback
  | 'nutrition'   // meal suggestions
  | 'notification'; // contextual notification wording

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  type: AIRequestType;
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AIResponse {
  text: string;
  json?: unknown;
  provider: AIProvider;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
}

export interface AIProviderAdapter {
  name: AIProvider;
  available: boolean;
  models: { id: string; label: string; type: AIRequestType[] }[];
  complete(req: AIRequest, model: string): Promise<AIResponse>;
}

export interface AIMemory {
  id?: string;
  memory_type: string;
  memory_key: string;
  memory_value: string;
  confidence_score: number;
  source_module?: string;
  last_used_at?: string;
}

export interface AIContext {
  userProfile?: {
    name?: string;
    wake_time?: string;
    sleep_time?: string;
    office_start_time?: string;
    office_end_time?: string;
    goal_weight?: number;
    current_weight?: number;
    daily_protein_goal?: number;
    daily_water_goal?: number;
  };
  todayTasks?: { title: string; priority: string; time?: string; done: boolean }[];
  recentHabits?: { name: string; doneToday: boolean; streak: number }[];
  recentHealth?: { sleep_hours?: number; water_liters?: number; protein_grams?: number; workout_minutes?: number };
  recentFinance?: { todaySpend: number; monthSpend: number; budget: number };
  recentJournal?: { mood: number; content: string }[];
  memories?: AIMemory[];
  analytics?: { overallScore: number; habitScore: number; healthScore: number };
  currentDate?: string;
}

export interface AIProfile {
  provider: AIProvider;
  model_chat: string;
  model_planning: string;
  model_reports: string;
  fallback_model?: string;
  temperature: number;
  max_tokens: number;
  prompt_style: string;
  enabled_modules_json: string[];
}
