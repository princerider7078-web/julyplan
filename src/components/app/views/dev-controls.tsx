'use client';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth/context';
import { listAllProviders } from '@/lib/ai/providers';
import { loadMemories, clearAllMemories, deleteMemory } from '@/lib/ai/memory';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Cpu, Brain, Trash2, Database, Activity, Settings as SettingsIcon, Zap,
} from 'lucide-react';
import type { AIMemory } from '@/lib/ai/types';
import type { AIProvider } from '@/lib/ai/types';

const MODULES = ['tasks', 'habits', 'health', 'voice', 'mind', 'skin', 'nutrition', 'finance', 'journal', 'knowledge'];

export function DevControlsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const { profile, isOffline } = useAuth();
  const providers = listAllProviders();

  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [logs, setLogs] = useState<{ id: string; request_type: string; provider: string; model: string; token_usage: number; created_at: string; response_preview: string }[]>([]);

  useEffect(() => {
    if (profile?.id && !isOffline) {
      loadMemories(profile.id).then(setMemories);
      // Load recent AI request logs
      supabase
        .from('ai_requests')
        .select('id,request_type,provider,model,token_usage,created_at,response_preview')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => setLogs(data ?? []));
    }
  }, [profile, isOffline]);

  async function handleClearMemories() {
    if (!profile?.id) return;
    await clearAllMemories(profile.id);
    setMemories([]);
  }

  async function handleDeleteMemory(id: string) {
    if (!profile?.id) return;
    await deleteMemory(profile.id, id);
    setMemories((m) => m.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Developer</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
          <Cpu className="h-7 w-7 text-primary" />
          AI Control Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Swap providers, tune models, manage memory, view logs — without touching code.
        </p>
      </div>

      <Tabs defaultValue="provider">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="provider"><Cpu className="h-3.5 w-3.5 mr-1" /> Provider</TabsTrigger>
          <TabsTrigger value="memory"><Brain className="h-3.5 w-3.5 mr-1" /> Memory</TabsTrigger>
          <TabsTrigger value="logs"><Activity className="h-3.5 w-3.5 mr-1" /> Logs</TabsTrigger>
          <TabsTrigger value="modules"><Zap className="h-3.5 w-3.5 mr-1" /> Modules</TabsTrigger>
        </TabsList>

        {/* Provider */}
        <TabsContent value="provider" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Provider</CardTitle>
              <CardDescription>Switch providers without rewriting the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {providers.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => updateSettings({ aiProvider: p.name as AIProvider })}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      settings.aiProvider === p.name
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{p.name}</span>
                      {p.available
                        ? <Badge className="text-[9px] bg-emerald-500">Live</Badge>
                        : <Badge variant="outline" className="text-[9px]">Stub</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {p.models.length} model{p.models.length === 1 ? '' : 's'}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Models by Task</CardTitle>
              <CardDescription>Pick the best model per request type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label>Chat model</Label>
                <Select
                  value={settings.aiModelChat}
                  onValueChange={(v) => updateSettings({ aiModelChat: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providers.find((p) => p.name === settings.aiProvider)?.models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                    )) ?? <SelectItem value="glm-4.6">GLM-4.6</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Planning model</Label>
                <Input
                  value={settings.aiModelPlanning}
                  onChange={(e) => updateSettings({ aiModelPlanning: e.target.value })}
                  placeholder="e.g. glm-4.6"
                />
              </div>
              <div className="grid gap-2">
                <Label>Reports model</Label>
                <Input
                  value={settings.aiModelReports}
                  onChange={(e) => updateSettings({ aiModelReports: e.target.value })}
                  placeholder="e.g. glm-4.6"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generation Parameters</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Temperature: {(settings.aiTemperature ?? 0.7).toFixed(1)}</Label>
                <Input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.1}
                  value={settings.aiTemperature ?? 0.7}
                  onChange={(e) => updateSettings({ aiTemperature: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Max tokens</Label>
                <Input
                  type="number"
                  value={settings.aiMaxTokens ?? 1500}
                  onChange={(e) => updateSettings({ aiMaxTokens: parseInt(e.target.value || '1500', 10) })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Memory */}
        <TabsContent value="memory" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">AI Memory Store</CardTitle>
                  <CardDescription>
                    Durable facts about the user. Lives in Supabase, not in the model.
                  </CardDescription>
                </div>
                {memories.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearMemories} className="text-red-500">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isOffline ? (
                <p className="text-sm text-muted-foreground italic">
                  Memory sync requires sign-in. Sign out of offline mode to use cloud memory.
                </p>
              ) : memories.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No memories yet. Use AI Chat — the system will auto-extract durable facts.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                  {memories.map((m) => (
                    <div key={m.id} className="flex items-start gap-3 p-2 rounded-md border">
                      <Badge variant="outline" className="text-[10px] shrink-0">{m.memory_type}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">{m.memory_key}</div>
                        <div className="text-sm">{m.memory_value}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          confidence: {m.confidence_score.toFixed(2)} · source: {m.source_module ?? 'unknown'}
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
                        onClick={() => handleDeleteMemory(m.id!)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Request Logs</CardTitle>
              <CardDescription>Last 20 AI requests with provider, model, tokens</CardDescription>
            </CardHeader>
            <CardContent>
              {isOffline ? (
                <p className="text-sm text-muted-foreground italic">
                  Logging requires Supabase sign-in.
                </p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No requests logged yet. Try AI Chat or AI Planner.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
                  {logs.map((log) => (
                    <div key={log.id} className="p-2 rounded-md border text-xs">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline">{log.request_type}</Badge>
                        <span className="font-mono text-[10px]">{log.provider}/{log.model}</span>
                        {log.token_usage != null && (
                          <Badge variant="outline" className="text-[9px]">{log.token_usage} tok</Badge>
                        )}
                        <span className="text-muted-foreground ml-auto">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-muted-foreground line-clamp-2">
                        {log.response_preview}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules */}
        <TabsContent value="modules" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enabled AI Modules</CardTitle>
              <CardDescription>Toggle which modules get AI features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {MODULES.map((m) => {
                  const enabled = settings.aiEnabledModules.includes(m);
                  return (
                    <div key={m} className="flex items-center justify-between p-2 rounded-md border">
                      <span className="text-sm capitalize">{m}</span>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => {
                          const next = v
                            ? [...settings.aiEnabledModules, m]
                            : settings.aiEnabledModules.filter((x) => x !== m);
                          updateSettings({ aiEnabledModules: next });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
