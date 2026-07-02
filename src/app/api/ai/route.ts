// Server-side AI proxy route — Vercel-compatible.
// Supports multiple AI providers via env vars:
//   - OPENROUTER_API_KEY  (recommended — has free models, works everywhere)
//   - GROQ_API_KEY        (free, fast)
//   - OPENAI_API_KEY
//   - GEMINI_API_KEY
//   - ZAI_API_KEY + ZAI_BASE_URL  (Z.ai public API, if you have one)
//
// Falls back to z-ai-web-dev-sdk + .z-ai-config (sandbox mode) if no env vars set.
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RequestBody {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json';
}

// ---------- Provider implementations ----------

async function callOpenRouter(body: RequestBody, apiKey: string): Promise<{ text: string; tokensUsed?: number }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://julyplan.app',
      'X-Title': 'July Plan',
    },
    body: JSON.stringify({
      model: body.model || 'meta-llama/llama-3.3-70b-instruct:free',
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1500,
      ...(body.response_format === 'json' ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: data?.choices?.[0]?.message?.content ?? '',
    tokensUsed: data?.usage?.total_tokens,
  };
}

async function callGroq(body: RequestBody, apiKey: string): Promise<{ text: string; tokensUsed?: number }> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // Groq's free models — auto-pick based on requested model name
      model: body.model?.includes('llama-3.3') ? 'llama-3.3-70b-versatile'
        : body.model?.includes('llama-3.1') ? 'llama-3.1-8b-instant'
        : body.model?.includes('mixtral') ? 'mixtral-8x7b-32768'
        : 'llama-3.3-70b-versatile',
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1500,
      ...(body.response_format === 'json' ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: data?.choices?.[0]?.message?.content ?? '',
    tokensUsed: data?.usage?.total_tokens,
  };
}

async function callOpenAI(body: RequestBody, apiKey: string): Promise<{ text: string; tokensUsed?: number }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model?.startsWith('gpt-') ? body.model : 'gpt-4o-mini',
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1500,
      ...(body.response_format === 'json' ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: data?.choices?.[0]?.message?.content ?? '',
    tokensUsed: data?.usage?.total_tokens,
  };
}

async function callGemini(body: RequestBody, apiKey: string): Promise<{ text: string; tokensUsed?: number }> {
  const model = body.model?.startsWith('gemini-') ? body.model : 'gemini-1.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: body.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: body.temperature ?? 0.7,
          maxOutputTokens: body.max_tokens ?? 1500,
        },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
  };
}

async function callZaiPublic(body: RequestBody, apiKey: string, baseUrl: string): Promise<{ text: string; tokensUsed?: number }> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Z-AI-From': 'Z',
    },
    body: JSON.stringify({
      model: body.model || 'glm-4.6',
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1500,
      ...(body.response_format === 'json' ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Z.ai error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    text: data?.choices?.[0]?.message?.content ?? '',
    tokensUsed: data?.usage?.total_tokens,
  };
}

// Fallback: z-ai-web-dev-sdk (sandbox only — needs .z-ai-config file)
async function callZaiSdk(body: RequestBody): Promise<{ text: string; tokensUsed?: number; provider: string }> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  const client = await ZAI.create();
  const result = await client.chat.completions.create({
    model: body.model || 'glm-4.6',
    messages: body.messages,
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens ?? 1500,
    ...(body.response_format === 'json' ? { response_format: { type: 'json_object' } } : {}),
  });
  return {
    text: result?.choices?.[0]?.message?.content ?? '',
    tokensUsed: result?.usage?.total_tokens,
    provider: 'zai-sdk',
  };
}

// ---------- Main route handler ----------

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    // Detect which provider to use based on available env vars.
    // Priority: OpenRouter > Groq > OpenAI > Gemini > Z.ai public > z-ai-sdk (sandbox)
    let result: { text: string; tokensUsed?: number; provider: string; model: string };

    if (process.env.OPENROUTER_API_KEY) {
      const r = await callOpenRouter(body, process.env.OPENROUTER_API_KEY);
      result = { ...r, provider: 'openrouter', model: body.model || 'llama-3.3-70b' };
    } else if (process.env.GROQ_API_KEY) {
      const r = await callGroq(body, process.env.GROQ_API_KEY);
      result = { ...r, provider: 'groq', model: body.model || 'llama-3.3-70b-versatile' };
    } else if (process.env.OPENAI_API_KEY) {
      const r = await callOpenAI(body, process.env.OPENAI_API_KEY);
      result = { ...r, provider: 'openai', model: body.model || 'gpt-4o-mini' };
    } else if (process.env.GEMINI_API_KEY) {
      const r = await callGemini(body, process.env.GEMINI_API_KEY);
      result = { ...r, provider: 'gemini', model: body.model || 'gemini-1.5-flash' };
    } else if (process.env.ZAI_API_KEY && process.env.ZAI_BASE_URL) {
      const r = await callZaiPublic(body, process.env.ZAI_API_KEY, process.env.ZAI_BASE_URL);
      result = { ...r, provider: 'zai', model: body.model || 'glm-4.6' };
    } else {
      // Sandbox fallback — uses .z-ai-config (only works in Z.ai sandbox)
      try {
        result = await callZaiSdk(body);
      } catch (sdkErr) {
        return NextResponse.json({
          error: 'No AI provider configured. Set one of these env vars on Vercel: OPENROUTER_API_KEY (recommended, free), GROQ_API_KEY (free), OPENAI_API_KEY, GEMINI_API_KEY, or ZAI_API_KEY + ZAI_BASE_URL. ' +
                 `(${sdkErr instanceof Error ? sdkErr.message : 'SDK error'})`,
        }, { status: 500 });
      }
    }

    let json: unknown = undefined;
    if (body.response_format === 'json') {
      try { json = JSON.parse(result.text); } catch { /* leave undefined */ }
    }

    return NextResponse.json({
      text: result.text,
      json,
      provider: result.provider,
      model: result.model,
      tokensUsed: result.tokensUsed,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI request failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Health check — shows which provider is configured
  const providers = [];
  if (process.env.OPENROUTER_API_KEY) providers.push('openrouter');
  if (process.env.GROQ_API_KEY) providers.push('groq');
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.GEMINI_API_KEY) providers.push('gemini');
  if (process.env.ZAI_API_KEY && process.env.ZAI_BASE_URL) providers.push('zai-public');
  if (providers.length === 0) providers.push('zai-sdk (sandbox fallback)');

  return NextResponse.json({
    status: 'ok',
    providers,
    active: providers[0],
    hint: providers[0] === 'zai-sdk (sandbox fallback)'
      ? 'No API keys set. On Vercel, set OPENROUTER_API_KEY (free) or GROQ_API_KEY (free) in Project Settings → Environment Variables.'
      : `Using ${providers[0]}`,
  });
}
