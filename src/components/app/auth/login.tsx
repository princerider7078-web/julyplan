'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/context';
import { AnimatedLogo } from '@/components/app/animated-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-stone-50 to-amber-50/50 dark:from-stone-950 dark:to-stone-900">
      <div className="w-full max-w-sm space-y-8">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <AnimatedLogo size={100} showText={false} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">July Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your personal AI operating system
          </p>
        </div>

        {/* Auth card */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signin-pw" className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    id="signin-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                    className="h-11"
                  />
                </div>
                <Button onClick={handleSignIn} disabled={busy || !email || !password} className="w-full h-11">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Cloud className="h-4 w-4 mr-1.5" /> Sign In</>}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    id="signup-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-pw" className="text-xs text-muted-foreground">Password (min 6 chars)</Label>
                  <Input
                    id="signup-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button onClick={handleSignUp} disabled={busy || !email || password.length < 6} className="w-full h-11">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
                </Button>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert className="mt-4" variant={error.includes('Check your email') ? 'default' : 'destructive'}>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Offline mode */}
            <Button variant="outline" onClick={signInOffline} className="w-full h-11">
              <CloudOff className="h-4 w-4 mr-1.5" /> Continue Offline
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Offline stores data only on this device
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
