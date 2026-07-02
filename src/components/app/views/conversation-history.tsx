'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle, Trash2, Search, User, Bot, Clock,
} from 'lucide-react';
import { cn, formatDateShort } from '@/lib/utils';

export function ConversationHistoryView() {
  const history = useStore((s) => s.aiChatHistory);
  const clearHistory = useStore((s) => s.clearAIChat);
  const summaries = useStore((s) => s.conversationSummaries);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'user' | 'assistant'>('all');

  const filtered = history.filter((m) => {
    if (filter !== 'all' && m.role !== filter) return false;
    if (search) {
      return m.content.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Stats
  const userMsgs = history.filter((m) => m.role === 'user').length;
  const aiMsgs = history.filter((m) => m.role === 'assistant').length;
  const firstMsg = history[0];
  const lastMsg = history[history.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AI Chat Log</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" />
            Conversation History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {history.length} messages · {userMsgs} you · {aiMsgs} AI
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" onClick={() => {
            if (confirm('Clear all conversation history? This cannot be undone.')) {
              clearHistory();
            }
          }}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear All
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Messages</div>
            <div className="text-2xl font-bold">{history.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Your Messages</div>
            <div className="text-2xl font-bold text-primary">{userMsgs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">AI Responses</div>
            <div className="text-2xl font-bold text-violet-500">{aiMsgs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">First Chat</div>
            <div className="text-sm font-bold">
              {firstMsg ? formatDateShort(firstMsg.timestamp.slice(0, 10)) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-md border border-input bg-background text-sm"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'user', 'assistant'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversation list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No conversations yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start chatting with the AI Assistant to build your history.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto scroll-thin">
          {filtered.slice().reverse().map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-3 p-3 rounded-lg border',
                msg.role === 'user' ? 'bg-primary/5' : 'bg-muted/30',
              )}
            >
              <div className={cn(
                'h-8 w-8 shrink-0 rounded-full flex items-center justify-center',
                msg.role === 'user' ? 'bg-primary/15' : 'bg-violet-500/15',
              )}>
                {msg.role === 'user'
                  ? <User className="h-4 w-4 text-primary" />
                  : <Bot className="h-4 w-4 text-violet-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap line-clamp-4">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conversation summaries (auto-saved) */}
      {summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversation Summaries</CardTitle>
            <CardDescription>AI-generated summaries of past conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {summaries.slice(0, 10).map((s) => (
              <div key={s.id} className="p-3 rounded-md border text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">{s.message_count} msgs</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateShort(s.created_at.slice(0, 10))}
                  </span>
                </div>
                <p className="text-foreground/80 line-clamp-3">{s.summary}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
