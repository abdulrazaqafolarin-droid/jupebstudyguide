import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Key, Trash2, RefreshCw, RotateCcw, AlertTriangle,
  CheckCircle, XCircle, Activity, BarChart3, GripVertical,
  Shield, Eye, EyeOff, ArrowUpDown, Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";

// ---- Types ----

interface ApiKey {
  id: string;
  label: string;
  key_preview: string;
  priority: number;
  is_active: boolean;
  token_exhausted: boolean;
  total_requests: number;
  total_tokens_used: number;
  last_used_at: string | null;
  exhausted_at: string | null;
  created_at: string;
}

interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  activeKeysCount: number;
  totalKeysCount: number;
  currentActiveKey: { label: string; priority: number } | null;
  byFeature: { feature: string; totalTokens: number; totalRequests: number }[];
  byKey: { keyId: string; label: string; totalTokens: number; totalRequests: number; percentageOfLoad: number }[];
  dailyUsage: { date: string; totalTokens: number; totalRequests: number }[];
}

interface UsageLog {
  id: string;
  key_id: string;
  feature: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
  status: string;
  error_message: string | null;
  created_at: string;
  ai_api_keys: { label: string } | null;
}

const FEATURE_COLORS: Record<string, string> = {
  "ai-router": "#8b5cf6",
  "ai-router-stream": "#a78bfa",
  "chat-proxy": "#f59e0b",
  "ai-tutor": "#10b981",
};

const STATUS_COLORS: Record<string, string> = {
  success: "text-emerald-500 bg-emerald-500/10",
  quota_error: "text-red-500 bg-red-500/10",
  error: "text-amber-500 bg-amber-500/10",
};

// ---- Helpers ----

async function callAdminManager(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No session");

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-key-manager`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    }
  );
  return res.json();
}

// ---- Component ----

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.23, 1, 0.32, 1] } },
};

export default function AIKeyVault() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add key form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [adding, setAdding] = useState(false);

  // Auto-refresh
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setKeysLoading(true);
    try {
      const [keysResult, summaryResult] = await Promise.all([
        callAdminManager("list-keys") as Promise<{ keys: ApiKey[] }>,
        callAdminManager("get-usage-summary") as Promise<UsageSummary>,
      ]);
      if (keysResult.keys) setKeys(keysResult.keys);
      if (summaryResult) setSummary(summaryResult);
    } catch (err) {
      console.error("Failed to load key vault data:", err);
    } finally {
      if (showLoader) setKeysLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const result = await callAdminManager("get-recent-logs", { limit: 50 }) as { logs: UsageLog[] };
      if (result.logs) setLogs(result.logs);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(false), loadLogs()]);
    setRefreshing(false);
    toast.success("Key vault refreshed");
  }, [loadData, loadLogs]);

  useEffect(() => {
    loadData();
    loadLogs();
    intervalRef.current = setInterval(() => { loadData(false); }, 60000);
    return () => clearInterval(intervalRef.current);
  }, [loadData, loadLogs]);

  const handleAddKey = async () => {
    if (!newLabel.trim() || !newKey.trim()) {
      toast.error("Label and API key are required");
      return;
    }
    setAdding(true);
    try {
      const result = await callAdminManager("add-key", {
        label: newLabel.trim(),
        apiKey: newKey,
        priority: newPriority ? parseInt(newPriority) : undefined,
      });
      if (result.key) {
        toast.success(`Key "${result.key.label}" added`);
        setKeys(prev => [...prev, result.key].sort((a, b) => a.priority - b.priority));
        setNewLabel("");
        setNewKey("");
        setNewPriority("");
        setShowAddForm(false);
      } else {
        toast.error(result.error || "Failed to add key");
      }
    } catch (err) {
      toast.error("Failed to add key");
    } finally {
      setAdding(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    const result = await callAdminManager("update-key", { id, is_active: !current });
    if (result.key) {
      setKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: !current } : k));
      toast.success(`Key ${current ? "disabled" : "enabled"}`);
    }
  };

  const handleResetExhausted = async (id: string) => {
    const result = await callAdminManager("reset-exhausted", { id });
    if (result.key) {
      setKeys(prev => prev.map(k => k.id === id ? result.key : k));
      toast.success("Key reset");
    }
  };

  const handleResetAllExhausted = async () => {
    const result = await callAdminManager("reset-all-exhausted") as { resetCount: number };
    if (result.resetCount !== undefined) {
      setKeys(prev => prev.map(k => ({ ...k, token_exhausted: false, exhausted_at: null })));
      toast.success(`Reset ${result.resetCount} exhausted keys`);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await callAdminManager("delete-key", { id });
    if (result.success) {
      setKeys(prev => prev.filter(k => k.id !== id));
      toast.success("Key deleted");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const idx = keys.findIndex(k => k.id === id);
    if (idx < 0) return;
    const newKeys = [...keys];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newKeys.length) return;
    [newKeys[idx], newKeys[swapIdx]] = [newKeys[swapIdx], newKeys[idx]];
    const orderedIds = newKeys.map(k => k.id);
    const result = await callAdminManager("reorder-keys", { orderedIds });
    if (result.success) {
      setKeys(newKeys.map((k, i) => ({ ...k, priority: i + 1 })));
      toast.success("Keys reordered");
    }
  };

  if (!user) return null;

  const activeKeys = keys.filter(k => k.is_active && !k.token_exhausted);
  const hasAnyExhausted = keys.some(k => k.token_exhausted);
  const hasQuotaError = logs.some(l => l.status === "quota_error");

  const safeDailyUsage = summary?.dailyUsage || [];
  const safeByFeature = summary?.byFeature || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Key Vault</h2>
            <p className="text-sm text-muted-foreground">
              Manage Gemini API keys with automatic failover
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing} className="gap-1.5">
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Summary Strip */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <motion.div variants={item}>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total API Calls</p>
              <p className="text-2xl font-bold">{summary?.totalRequests?.toLocaleString() || 0}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="border-l-4 border-l-violet-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Tokens</p>
              <p className="text-2xl font-bold">{(summary?.totalTokens || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Keys</p>
              <p className="text-2xl font-bold">{activeKeys.length} / {keys.length}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Key</p>
              <p className="text-2xl font-bold truncate" title={summary?.currentActiveKey?.label}>
                {summary?.currentActiveKey?.label || "None"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* SECTION A — Key Pool Manager */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="w-4 h-4 text-primary" />
              Key Pool
            </CardTitle>
            <CardDescription>Manage your Gemini API keys. Keys are encrypted at rest using AES-256-GCM.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasAnyExhausted && (
              <Button variant="ghost" size="sm" onClick={handleResetAllExhausted} className="text-xs gap-1">
                <RotateCcw className="w-3 h-3" /> Reset All
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => setShowAddForm(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add Key Form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-secondary/30 rounded-lg p-4 border border-border/50 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Label</label>
                  <Input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="e.g. Key 1, Personal, Backup"
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">API Key</label>
                  <Input
                    type="password"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="Paste your Gemini API key"
                    className="bg-background/50 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Priority (optional)</label>
                  <Input
                    type="number"
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    placeholder="Auto"
                    min={1}
                    className="bg-background/50"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setNewKey(""); setNewLabel(""); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddKey} disabled={adding} className="gap-1.5">
                  {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Save Key
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 italic">
                Security: Keys are encrypted at rest using AES-256-GCM. The raw key value is never stored or transmitted in plain text after saving.
              </p>
            </motion.div>
          )}

          {/* Key List */}
          {keysLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No API keys configured. Add your first Gemini API key above.
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((key, idx) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border transition-all",
                    key.is_active && !key.token_exhausted
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : key.token_exhausted
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-border/50 bg-secondary/10"
                  )}
                >
                  {/* Reorder buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleReorder(key.id, "up")}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                    >
                      <ArrowUpDown className="w-3 h-3 rotate-90" />
                    </button>
                  </div>

                  {/* Label + Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{key.label}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        #{key.priority}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">{key.key_preview}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {!key.is_active ? (
                        <Badge variant="secondary" className="text-[10px] h-4">Disabled</Badge>
                      ) : key.token_exhausted ? (
                        <Badge variant="destructive" className="text-[10px] h-4 gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> Exhausted
                        </Badge>
                      ) : (
                        <Badge className="text-[10px] h-4 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 gap-1">
                          <CheckCircle className="w-2.5 h-2.5" /> Active
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {key.total_requests} req &middot; {(key.total_tokens_used || 0).toLocaleString()} tokens
                      </span>
                      {key.last_used_at && (
                        <span className="text-[10px] text-muted-foreground">
                          &middot; Last: {format(new Date(key.last_used_at), "MMM d, HH:mm")}
                        </span>
                      )}
                      {key.exhausted_at && (
                        <span className="text-[10px] text-red-400">
                          &middot; Exhausted: {format(new Date(key.exhausted_at), "MMM d, HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {key.token_exhausted && (
                      <Button variant="ghost" size="sm" onClick={() => handleResetExhausted(key.id)}
                        className="h-7 w-7 p-0" title="Reset exhausted">
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(key.id, key.is_active)}
                      className={cn("h-7 w-7 p-0", key.is_active ? "text-muted-foreground" : "text-emerald-500")}
                      title={key.is_active ? "Disable" : "Enable"}>
                      {key.is_active ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(key.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION B — AI Usage Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-4 h-4 text-primary" />
            AI Usage Overview
          </CardTitle>
          <CardDescription>Token consumption and request volume across all AI features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage by Feature */}
          {safeByFeature.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Usage by Feature (30 days)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={safeByFeature}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="feature" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="totalTokens" radius={[4, 4, 0, 0]}>
                      {safeByFeature.map((entry, idx) => (
                        <Cell key={idx} fill={FEATURE_COLORS[entry.feature] || "#8b5cf6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Feature legend */}
                <div className="space-y-2">
                  {safeByFeature.map((f) => (
                    <div key={f.feature} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: FEATURE_COLORS[f.feature] || "#8b5cf6" }}
                        />
                        <span>{f.feature}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{(f.totalTokens || 0).toLocaleString()}</span>
                        <span className="text-muted-foreground ml-2">tokens</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Daily Token Usage Chart */}
          {safeDailyUsage.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Daily Token Usage (30 days)</h4>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={safeDailyUsage}>
                  <defs>
                    <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone" dataKey="totalTokens" stroke="#8b5cf6" strokeWidth={2}
                    fill="url(#tokenGradient)" dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {safeDailyUsage.length === 0 && safeByFeature.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No usage data yet. Start using AI features to see statistics.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Health Table */}
      {summary?.byKey && summary.byKey.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-primary" />
              Key Health
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Key</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Requests</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Tokens</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">% Load</th>
                </tr>
              </thead>
              <tbody>
                {summary.byKey.map((entry) => (
                  <tr key={entry.keyId} className="border-b border-border/50 hover:bg-secondary/10">
                    <td className="py-2 px-2 font-medium">{entry.label}</td>
                    <td className="py-2 px-2">{entry.totalRequests?.toLocaleString() || 0}</td>
                    <td className="py-2 px-2">{(entry.totalTokens || 0).toLocaleString()}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(entry.percentageOfLoad || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{entry.percentageOfLoad || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 50 AI requests</CardDescription>
          </div>
          {hasQuotaError && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" /> Quota errors detected
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">No activity yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Time</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Feature</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Tokens</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Key</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-secondary/10 text-xs">
                      <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, HH:mm")}
                      </td>
                      <td className="py-2 px-2">{log.feature}</td>
                      <td className="py-2 px-2">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                          STATUS_COLORS[log.status] || "text-muted-foreground bg-secondary/50"
                        )}>
                          {log.status === "success" && <CheckCircle className="w-2.5 h-2.5" />}
                          {log.status === "quota_error" && <AlertTriangle className="w-2.5 h-2.5" />}
                          {log.status === "error" && <XCircle className="w-2.5 h-2.5" />}
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono">{log.total_tokens}</td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {log.ai_api_keys?.label || "Deleted"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-muted-foreground">
        <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p>
          All API keys are stored securely with database-level RLS policies. The
          admin-key-manager edge function validates JWT authentication on every request.
          Only the admin email can manage keys.
        </p>
      </div>
    </div>
  );
}
