'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  todayISO, formatDateShort, cn,
} from '@/lib/utils';
import {
  Plus, Trash2, TrendingUp, TrendingDown, Wallet, Target, PiggyBank,
} from 'lucide-react';

export function FinanceView() {
  const finance = useStore((s) => s.finance);
  const targets = useStore((s) => s.financeTargets);
  const addEntry = useStore((s) => s.addFinanceEntry);
  const deleteEntry = useStore((s) => s.deleteFinanceEntry);
  const addTarget = useStore((s) => s.addFinanceTarget);
  const deleteTarget = useStore((s) => s.deleteFinanceTarget);

  const [addOpen, setAddOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'saving'>('expense');
  const [category, setCategory] = useState('General');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  // Target form
  const [targetTitle, setTargetTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetType, setTargetType] = useState<'monthly' | 'savings' | 'future'>('monthly');

  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const thisWeekStart = (() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  })();

  const todaySpend = finance
    .filter((f) => f.type === 'expense' && f.date === today)
    .reduce((sum, f) => sum + f.amount, 0);
  const weekSpend = finance
    .filter((f) => f.type === 'expense' && f.date >= thisWeekStart)
    .reduce((sum, f) => sum + f.amount, 0);
  const monthSpend = finance
    .filter((f) => f.type === 'expense' && f.date.slice(0, 7) === thisMonth)
    .reduce((sum, f) => sum + f.amount, 0);
  const monthIncome = finance
    .filter((f) => f.type === 'income' && f.date.slice(0, 7) === thisMonth)
    .reduce((sum, f) => sum + f.amount, 0);
  const totalSavings = finance
    .filter((f) => f.type === 'saving')
    .reduce((sum, f) => sum + f.amount, 0);

  const monthlyTarget = targets.find((t) => t.type === 'monthly');
  const savingsTarget = targets.find((t) => t.type === 'savings');
  const futureTarget = targets.find((t) => t.type === 'future');

  const recent = useMemo(() => [...finance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30), [finance]);

  function handleSubmit() {
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0) return;
    addEntry({
      title: title.trim(),
      amount: amt,
      type,
      date,
      category: category.trim() || 'General',
      note: note.trim() || undefined,
    });
    setTitle(''); setAmount(''); setNote(''); setCategory('General');
    setAddOpen(false);
  }

  function handleTargetSubmit() {
    const amt = parseFloat(targetAmount);
    if (!targetTitle.trim() || isNaN(amt) || amt <= 0) return;
    addTarget(targetTitle.trim(), amt, targetType);
    setTargetTitle(''); setTargetAmount('');
    setTargetOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Money</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Finance Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily spend · Monthly targets · Savings matrix
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTargetOpen(true)}>
            <Target className="h-4 w-4 mr-1" /> New Target
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Wallet className="h-3.5 w-3.5" /> Today
            </div>
            <div className="text-2xl font-bold">₹{todaySpend.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">spent today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3.5 w-3.5" /> This week
            </div>
            <div className="text-2xl font-bold">₹{weekSpend.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">spent this week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" /> This month
            </div>
            <div className="text-2xl font-bold">₹{monthSpend.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              of ₹{(monthlyTarget?.amount ?? 0).toLocaleString()} budget
            </div>
            <Progress
              value={monthlyTarget ? Math.min(100, (monthSpend / monthlyTarget.amount) * 100) : 0}
              className="h-1.5 mt-2"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <PiggyBank className="h-3.5 w-3.5" /> Savings
            </div>
            <div className="text-2xl font-bold">₹{totalSavings.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              of ₹{(savingsTarget?.amount ?? 0).toLocaleString()} target
            </div>
            <Progress
              value={savingsTarget ? Math.min(100, (totalSavings / savingsTarget.amount) * 100) : 0}
              className="h-1.5 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Income vs spend summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Income</div>
              <div className="text-xl font-bold text-emerald-500">₹{monthIncome.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Spent</div>
              <div className="text-xl font-bold text-red-500">₹{monthSpend.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Net</div>
              <div className={cn(
                'text-xl font-bold',
                monthIncome - monthSpend >= 0 ? 'text-emerald-500' : 'text-red-500',
              )}>
                ₹{(monthIncome - monthSpend).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Targets
          </CardTitle>
          <CardDescription>Track progress against your money goals</CardDescription>
        </CardHeader>
        <CardContent>
          {targets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No targets yet. Add one to start tracking.
            </p>
          ) : (
            <div className="space-y-3">
              {targets.map((t) => {
                const progress =
                  t.type === 'monthly' ? Math.min(100, (monthSpend / t.amount) * 100) :
                  t.type === 'savings' ? Math.min(100, (totalSavings / t.amount) * 100) :
                  Math.min(100, (totalSavings / t.amount) * 100);
                const isOverBudget = t.type === 'monthly' && monthSpend > t.amount;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-md border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{t.title}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{t.type}</Badge>
                        {isOverBudget && (
                          <Badge variant="destructive" className="text-[10px]">Over budget</Badge>
                        )}
                      </div>
                      <Progress value={progress} className="h-1.5 mt-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.type === 'monthly'
                          ? `₹${monthSpend.toLocaleString()} of ₹${t.amount.toLocaleString()} spent`
                          : `₹${totalSavings.toLocaleString()} of ₹${t.amount.toLocaleString()} saved`
                        }
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => deleteTarget(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Transactions</CardTitle>
          <CardDescription>Last 30 entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 max-h-96 overflow-y-auto scroll-thin">
          {recent.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No transactions yet. Add your first entry.
            </div>
          ) : (
            recent.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/40 transition-colors"
              >
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center',
                    f.type === 'income' ? 'bg-emerald-500/15 text-emerald-500' :
                    f.type === 'expense' ? 'bg-red-500/15 text-red-500' :
                    'bg-cyan-500/15 text-cyan-500',
                  )}
                >
                  {f.type === 'income' ? <TrendingUp className="h-4 w-4" /> :
                   f.type === 'expense' ? <TrendingDown className="h-4 w-4" /> :
                   <PiggyBank className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{f.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateShort(f.date)} · {f.category}
                    {f.note && ` · ${f.note}`}
                  </div>
                </div>
                <div className={cn(
                  'font-bold text-sm',
                  f.type === 'income' ? 'text-emerald-500' :
                  f.type === 'expense' ? 'text-red-500' : 'text-cyan-500',
                )}>
                  {f.type === 'income' ? '+' : f.type === 'expense' ? '-' : '+'}₹{f.amount.toLocaleString()}
                </div>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                  onClick={() => deleteEntry(f.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add entry dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Finance Entry</DialogTitle>
            <DialogDescription>Track income, expense, or saving.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="fin-title">Title</Label>
              <Input
                id="fin-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lunch, Salary, Savings deposit"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="fin-amount">Amount (₹)</Label>
                <Input
                  id="fin-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'income' | 'expense' | 'saving')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="saving">Saving</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="fin-cat">Category</Label>
                <Input
                  id="fin-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Food, Travel"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fin-date">Date</Label>
                <Input
                  id="fin-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fin-note">Note (optional)</Label>
              <Textarea
                id="fin-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add target dialog */}
      <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Finance Target</DialogTitle>
            <DialogDescription>Set a goal to track progress against.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tgt-title">Title</Label>
              <Input
                id="tgt-title"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="e.g. Monthly Budget, Savings Goal"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="tgt-amount">Amount (₹)</Label>
                <Input
                  id="tgt-amount"
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as 'monthly' | 'savings' | 'future')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Budget</SelectItem>
                    <SelectItem value="savings">Savings Goal</SelectItem>
                    <SelectItem value="future">Future Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTargetOpen(false)}>Cancel</Button>
            <Button onClick={handleTargetSubmit}>Add Target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
