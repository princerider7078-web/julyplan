'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Cloud, CloudOff, Loader2 } from 'lucide-react';

export function LoginScreen() {
  const { signIn, signUp, signInOffline } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError(null); setBusy(true);
    const { error } = await signIn(email.trim(), password);
    if (error) setError(error);
    setBusy(false);
  }

  async function handleSignUp() {
    setError(null); setBusy(true);
    const { error } = await signUp(email.trim(), password, name.trim() || undefined);
    if (error) setError(error);
    else setError('Check your email for the confirmation link, then sign in.');
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-stone-950 dark:to-stone-900">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <img src="/logo.png" alt="July Plan" className="h-20 w-20 rounded-2xl shadow-lg shadow-orange-500/30 mb-4 mx-auto" />
          <h1 className="text-3xl font-bold tracking-tight">July Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personal AI Operating System · V2
          </p>
          <p className="text-xs text-muted-foreground mt-3 max-w-sm mx-auto">
            Cloud-powered life management with AI brain. Tasks, habits, health, voice, mind, finance, journal — connected by a single AI coach.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Welcome</CardTitle>
            <CardDescription>Sign in to sync your data, or continue offline</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-3 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signin-pw">Password</Label>
                  <Input
                    id="signin-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                  />
                </div>
                <Button onClick={handleSignIn} disabled={busy || !email || !password} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Cloud className="h-4 w-4 mr-1" /> Sign In</>}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="signup-name">Name (optional)</Label>
                  <Input
                    id="signup-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-pw">Password (min 6 chars)</Label>
                  <Input
                    id="signup-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleSignUp} disabled={busy || !email || password.length < 6} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Create Account</>}
                </Button>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert className="mt-4" variant={error.includes('Check your email') ? 'default' : 'destructive'}>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button variant="outline" onClick={signInOffline} className="w-full">
              <CloudOff className="h-4 w-4 mr-1" /> Continue Offline (local only)
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Offline mode stores data only in this browser. No cloud sync, no AI memory.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
