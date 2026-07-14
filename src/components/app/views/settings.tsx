'use client';
import { useRef, useState } from 'react';
import { useStore, ACCENT_COLORS } from '@/lib/store';
import type { AccentColorKey } from '@/lib/types';
import { useAuth } from '@/lib/auth/context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTheme } from 'next-themes';
import { useToast } from '@/hooks/use-toast';
import { SyncIndicator } from '@/components/app/sync-indicator';
import {
  Sun, Moon, Monitor, Download, Upload, RotateCcw, Bell, Volume2,
  Droplet, Beef, AlertTriangle, CalendarX, RefreshCw, Cloud,
  Palette, Sparkles, Check, Server, Link,
} from 'lucide-react';

export function SettingsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);

  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { profile, isOffline } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `july-plan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Backup file downloaded.' });
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? '');
      const ok = importData(text);
      toast(
        ok
          ? { title: 'Imported', description: 'Data restored successfully.' }
          : { title: 'Failed', description: 'Invalid backup file.', variant: 'destructive' },
      );
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Configure</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize July Plan to fit your routine
        </p>
      </div>

      {/* Appearance — premium section with theme + accent color + gradient intensity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Theme, accent color, and gradient intensity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Theme mode */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">Theme Mode</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark', label: 'Dark', icon: Moon },
                { key: 'system', label: 'System', icon: Monitor },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setTheme(key); updateSettings({ theme: key as 'light' | 'dark' | 'system' }); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    theme === key ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent/40 text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent color picker */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">Accent Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(ACCENT_COLORS) as AccentColorKey[]).map((key) => {
                const def = ACCENT_COLORS[key];
                const selected = settings.accentColor === key;
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ accentColor: key })}
                    className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                      selected ? 'border-foreground/20 bg-accent/40' : 'border-transparent hover:bg-accent/30'
                    }`}
                  >
                    <span
                      className="h-9 w-9 rounded-full flex items-center justify-center shadow-md"
                      style={{ background: `linear-gradient(135deg, ${def.gradient.from}, ${def.gradient.to})` }}
                    >
                      {selected && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                    </span>
                    <span className={`text-[10px] font-medium ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {def.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gradient intensity */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 block flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Gradient Intensity
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'subtle',  label: 'Subtle',  desc: 'Minimal' },
                { key: 'medium',  label: 'Medium',  desc: 'Balanced' },
                { key: 'vibrant', label: 'Vibrant', desc: 'Bold' },
              ].map(({ key, label, desc }) => {
                const selected = settings.gradientIntensity === key as 'subtle' | 'medium' | 'vibrant';
                return (
                  <button
                    key={key}
                    onClick={() => updateSettings({ gradientIntensity: key as 'subtle' | 'medium' | 'vibrant' })}
                    className={`flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 transition-all ${
                      selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/40'
                    }`}
                  >
                    <span
                      className="h-2 w-12 rounded-full mb-1"
                      style={{
                        background: `linear-gradient(90deg, var(--grad-from), var(--grad-to))`,
                        opacity: key === 'subtle' ? 0.35 : key === 'medium' ? 0.65 : 1.0,
                      }}
                    />
                    <span className={`text-xs font-medium ${selected ? 'text-primary' : 'text-foreground'}`}>{label}</span>
                    <span className="text-[10px] text-muted-foreground">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live preview */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">Live Preview</Label>
            <div className="rounded-2xl p-4 gradient-hero border border-primary/20 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary-strong flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold gradient-text-accent">Your accent color</div>
                <div className="text-[11px] text-muted-foreground">Updates instantly across the whole app</div>
              </div>
              <div className="h-9 px-4 rounded-xl gradient-primary-strong text-white text-xs font-semibold flex items-center shadow-sm">
                Button
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily Targets</CardTitle>
          <CardDescription>Personalized nutrition & discipline goals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <Droplet className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="flex-1">
              <Label htmlFor="water-target" className="text-sm">Water target (ml)</Label>
              <p className="text-xs text-muted-foreground">Recommended: 3000–3500 ml</p>
            </div>
            <Input
              id="water-target"
              type="number"
              value={settings.waterTarget}
              onChange={(e) => updateSettings({ waterTarget: parseInt(e.target.value || '0', 10) })}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-red-500/15 flex items-center justify-center">
              <Beef className="h-4 w-4 text-red-500" />
            </div>
            <div className="flex-1">
              <Label htmlFor="protein-target" className="text-sm">Protein target (g)</Label>
              <p className="text-xs text-muted-foreground">Recommended: 80–100g for weight gain</p>
            </div>
            <Input
              id="protein-target"
              type="number"
              value={settings.proteinTarget}
              onChange={(e) => updateSettings({ proteinTarget: parseInt(e.target.value || '0', 10) })}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <CalendarX className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1">
              <Label htmlFor="wasted-target" className="text-sm">Max missed days / month</Label>
              <p className="text-xs text-muted-foreground">App warns when limit is reached</p>
            </div>
            <Input
              id="wasted-target"
              type="number"
              min={0}
              max={31}
              value={settings.maxWastedDays}
              onChange={(e) => updateSettings({ maxWastedDays: parseInt(e.target.value || '0', 10) })}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notifications & Sound</CardTitle>
          <CardDescription>Offline reminders (browser-based)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-sm">Enable notifications</Label>
              <p className="text-xs text-muted-foreground">Reminders fire for scheduled tasks</p>
            </div>
            <Switch
              checked={settings.notificationsEnabled}
              onCheckedChange={(v) => updateSettings({ notificationsEnabled: v })}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Volume2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <Label className="text-sm">Sound on completion</Label>
              <p className="text-xs text-muted-foreground">Play a sound when marking tasks done</p>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Backend — default Vercel URL + manual override */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            AI Backend
          </CardTitle>
          <CardDescription>
            Server that powers AI chat, planning, and memory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">Backend URL</Label>
            <Input
              value={settings.aiBackendUrl ?? ''}
              onChange={(e) => updateSettings({ aiBackendUrl: e.target.value.trim() })}
              placeholder="https://your-deployment.vercel.app"
              className="text-sm font-mono"
            />
            {settings.aiBackendUrl ? (
              <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1 break-all">
                <Link className="h-3 w-3 shrink-0" />
                <span>Will call: {settings.aiBackendUrl.replace(/\/$/, '')}/api/ai</span>
              </p>
            ) : (
              <p className="text-[11px] text-amber-500 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Empty — AI will use relative /api/ai (works on web, not APK)
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ aiBackendUrl: 'https://julyplan.vercel.app' })}
              className="flex-1"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Use default
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ aiBackendUrl: '' })}
              className="flex-1"
            >
              Clear
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Default is <code className="bg-muted px-1 rounded text-[10px]">https://julyplan.vercel.app</code>.
            The APK needs a full URL since it runs offline from a WebView. Change this only if you self-host.
          </p>
        </CardContent>
      </Card>

      {/* Cloud Sync */}
      {!isOffline && profile && profile.id !== 'offline-user' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              Cloud Sync
            </CardTitle>
            <CardDescription>
              Your data syncs to Supabase automatically · <SyncIndicator className="inline-flex" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true);
                const { pullAllUserData } = await import('@/lib/sync');
                await pullAllUserData(profile.id);
                setSyncing(false);
                toast({ title: 'Sync complete', description: 'All data pulled from cloud.' });
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Pulls all data from Supabase (tasks, habits, finance, journal, knowledge, memories, routine, sections).
              Use this if auto-sync missed something.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Management</CardTitle>
          <CardDescription>
            Offline storage in this browser · {useStore.getState().tasks.length} tasks · {useStore.getState().habits.length} habits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" /> Export backup
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Import backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
            <Button variant="destructive" onClick={() => setResetOpen(true)}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reset all data
            </Button>
          </div>
          <div className="text-xs text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              All data is stored locally in this browser only. Export regularly to avoid losing progress when clearing browser data.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">About July Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg shadow-orange-500/20">
              J
            </div>
            <div>
              <div className="font-semibold">July Plan v1.0</div>
              <p className="text-xs text-muted-foreground mt-1">
                Personal Execution OS for the July plan. Track health, voice, study, routine, habits, and finance — all offline, all in one place.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="outline" className="text-[10px]">Offline-first</Badge>
                <Badge variant="outline" className="text-[10px]">Single-user</Badge>
                <Badge variant="outline" className="text-[10px]">Local storage</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL your tasks, habits, finance entries, and routine progress. The app will be restored to factory defaults. This cannot be undone. Consider exporting a backup first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                resetAll();
                setResetOpen(false);
                toast({ title: 'Reset complete', description: 'All data cleared.' });
              }}
            >
              Yes, reset everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
