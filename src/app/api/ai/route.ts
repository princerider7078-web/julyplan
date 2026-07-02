// Server-side AI proxy route — uses z-ai-web-dev-sdk (server-only).
// Client code calls this endpoint instead of importing the SDK directly.
// This also lets us add auth/rate-limiting later.
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let cachedClient: ZAI | null = null;
async function getClient() {
  if (!cachedClient) cachedClient = await ZAI.create();
  return cachedClient;
}

interface RequestBody {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json';
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const client = await getClient();
    const result = await client.chat.completions.create({
      model: body.model || 'glm-4.6',
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens ?? 1500,
      ...(body.response_format === 'json' ? { response_format: { type: 'json_object' } } : {}),
    });

    const text = result?.choices?.[0]?.message?.content ?? '';
    let json: unknown = undefined;
    if (body.response_format === 'json') {
      try { json = JSON.parse(text); } catch { /* leave undefined */ }
    }

    return NextResponse.json({
      text,
      json,
      provider: 'zai',
      model: body.model || 'glm-4.6',
      tokensUsed: result?.usage?.total_tokens,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI request failed' },
      { status: 500 },
    );
  }
}
