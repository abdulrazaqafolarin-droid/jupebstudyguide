import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useActivation, useAdminCodes, type ActivationCodeResult } from "@/hooks/useActivation";
import { SUPER_ADMIN_EMAIL } from "@/lib/adminEmail";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Key, Copy, CheckCircle, Loader2, Shield,
  Users, TrendingUp, DollarSign, Activity,
  UserCheck, BarChart3, Download, RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AIKeyVault from "@/components/admin/AIKeyVault";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

interface DashboardStats {
  totalUsers: number;
  activatedUsers: number;
  totalCodes: number;
  usedCodes: number;
  recentSignups: { date: string; count: number }[];
  planDistribution: { name: string; value: number }[];
}

const PIE_COLORS = ["#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

function StatCard({ icon: Icon, label, value, sub, color, delay }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; sub?: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card className={cn("border-l-4 overflow-hidden", color)}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
              <p className="text-2xl sm:text-3xl font-bold">{value}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const { status } = useActivation();
  const { codes, loading, generateCodes, listCodes } = useAdminCodes();
  const navigate = useNavigate();

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/auth", { replace: true });
  }, [signOut, navigate]);

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, activatedUsers: 0, totalCodes: 0, usedCodes: 0,
    recentSignups: [], planDistribution: [],
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [count, setCount] = useState(5);
  const [planType, setPlanType] = useState("basic");
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<ActivationCodeResult[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const loadStats = useCallback(async (showLoader = true) => {
    if (showLoader) setStatsLoading(true);
    const { data, error } = await supabase.rpc("get_admin_dashboard_stats", {
      p_admin_email: SUPER_ADMIN_EMAIL || null,
    });

    if (error) {
      console.error("Failed to load dashboard stats:", error);
      if (showLoader) toast.error("Dashboard load failed: " + error.message);
      if (showLoader) setStatsLoading(false);
      return;
    }

    setStats({
      totalUsers: data.total_users,
      activatedUsers: data.activated_users,
      totalCodes: data.total_codes,
      usedCodes: data.used_codes,
      recentSignups: (data.recent_signups || []).map((s: { date: string; count: number }) => ({
        date: format(new Date(s.date + "T00:00:00"), "MMM d"),
        count: s.count,
      })),
      planDistribution: data.plan_distribution || [],
    });
    if (showLoader) setStatsLoading(false);
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStats(false), listCodes()]);
    setRefreshing(false);
    toast.success("Dashboard refreshed");
  }, [loadStats, listCodes]);

  useEffect(() => {
    listCodes();
    loadStats();
    intervalRef.current = setInterval(() => { loadStats(false); listCodes(); }, 30000);
    return () => clearInterval(intervalRef.current);
  }, [listCodes, loadStats]);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateCodes(count, planType);
    setGenerating(false);

    if (result.success && result.codes) {
      setGeneratedCodes(result.codes);
      toast.success(`Generated ${result.codes.length} codes`);
      console.warn("Generated codes:", result.codes);
      listCodes();
      setStats(s => ({
        ...s,
        totalCodes: s.totalCodes + result.codes!.length,
        planDistribution: [
          ...s.planDistribution.filter(p => p.name !== planType),
          { name: planType, value: (s.planDistribution.find(p => p.name === planType)?.value || 0) + result.codes!.length },
        ],
      }));
    } else {
      toast.error(result.error || "Failed to generate codes");
    }
  };

  const copyAll = () => {
    const text = generatedCodes.map((c) => `${c.code}\t${c.plan_type}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied all codes");
  };

  const codeStats = {
    total: codes.length,
    used: codes.filter((c) => c.is_used).length,
    available: codes.filter((c) => !c.is_used).length,
    conversionRate: codes.length > 0 ? Math.round((codes.filter((c) => c.is_used).length / codes.length) * 100) : 0,
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  if (status.checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!status.is_admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md border-destructive/30">
          <CardContent className="pt-8 pb-8 text-center">
            <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You do not have admin privileges.</p>
            <Button onClick={() => navigate("/")}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeSignups = stats.recentSignups || [];
  const safePlans = stats.planDistribution && stats.planDistribution.length > 0 ? stats.planDistribution : [{ name: "No data", value: 1 }];
  const totalPlansValue = safePlans.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-semibold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refreshAll} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/codes")} className="hidden sm:flex gap-1.5">
              <Key className="w-3.5 h-3.5" /> Codes
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          <StatCard
            icon={Users} label="Total Users"
            value={stats.totalUsers}
            color="border-l-primary"
            delay={0}
          />
          <StatCard
            icon={UserCheck} label="Activated"
            value={stats.activatedUsers}
            sub={`${stats.totalUsers > 0 ? Math.round((stats.activatedUsers / stats.totalUsers) * 100) : 0}% activation`}
            color="border-l-emerald-500"
            delay={0.1}
          />
          <StatCard
            icon={Key} label="Codes Generated"
            value={codeStats.total}
            color="border-l-amber-500"
            delay={0.2}
          />
          <StatCard
            icon={Activity} label="Conversion"
            value={`${codeStats.conversionRate}%`}
            sub={`${codeStats.used} of ${codeStats.total} used`}
            color="border-l-violet-500"
            delay={0.3}
          />
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      User Growth (30 days)
                    </CardTitle>
                    <CardDescription>Daily new signups</CardDescription>
                  </div>
                  <BarChart3 className="w-8 h-8 text-muted-foreground/30" />
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={safeSignups}>
                      <defs>
                        <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2}
                        fill="url(#signupGradient)" dot={{ r: 2, fill: "#8b5cf6" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Plan Distribution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Plan Distribution
                    </CardTitle>
                    <CardDescription>Codes by plan type</CardDescription>
                  </div>
                  <PieChart className="w-8 h-8 text-muted-foreground/30" />
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center justify-center h-48"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : safePlans.length === 0 || safePlans[0].name === "No data" ? (
                  <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                    No codes generated yet
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={safePlans}
                          cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                          paddingAngle={3} dataKey="value"
                        >
                          {safePlans.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 shrink-0">
                      {safePlans.map((p, idx) => (
                        <div key={p.name} className="flex items-center gap-2 text-sm">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="capitalize">{p.name}</span>
                          <span className="text-muted-foreground">({Math.round((p.value / totalPlansValue) * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Activation vs Total Users Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Activation Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: "Total Users", count: stats.totalUsers, fill: "#8b5cf6" },
                  { name: "Activated", count: stats.activatedUsers, fill: "#10b981" },
                  { name: "Codes Used", count: codeStats.used, fill: "#f59e0b" },
                  { name: "Available", count: codeStats.available, fill: "#6366f1" },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {[{ name: "Total Users", count: stats.totalUsers, fill: "#8b5cf6" },
                      { name: "Activated", count: stats.activatedUsers, fill: "#10b981" },
                      { name: "Codes Used", count: codeStats.used, fill: "#f59e0b" },
                      { name: "Available", count: codeStats.available, fill: "#6366f1" },
                    ].map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Code Generation Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-5 h-5 text-primary" />
                Generate Activation Codes
              </CardTitle>
              <CardDescription>Create new codes for users to activate their accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Quantity</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 5, 10, 25, 50, 100].map(n => (
                      <button
                        key={n}
                        onClick={() => setCount(n)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                          count === n
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">Plan Type</label>
                  <Select value={planType} onValueChange={setPlanType}>
                    <SelectTrigger className="w-36 bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-gradient-to-r from-primary to-accent"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                  Generate
                </Button>
              </div>

              {generatedCodes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-accent">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      {generatedCodes.length} codes generated
                      <span className="text-muted-foreground font-normal ml-2">
                        (plan: {planType})
                      </span>
                    </p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={copyAll} className="text-xs">
                        <Copy className="w-3 h-3 mr-1" /> Copy all
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setGeneratedCodes([])} className="text-xs">
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3 max-h-48 overflow-y-auto border border-border/30">
                    {generatedCodes.map((c, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                        <code className="font-mono text-sm tracking-wider text-primary">{c.code}</code>
                        <span className="text-xs text-muted-foreground capitalize">{c.plan_type}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* All Codes Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    All Codes ({codes.length})
                  </CardTitle>
                  <CardDescription>Complete history of generated activation codes</CardDescription>
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => {
                    const csv = [["Code", "Plan", "Status", "Used By", "Created"].join(",")].concat(
                      codes.map((c) =>
                        [c.code, c.plan_type, c.is_used ? "Used" : "Available", c.used_by_profile?.display_name || "", c.created_at].join(",")
                      )
                    ).join("\n");
                    navigator.clipboard.writeText(csv);
                    toast.success("CSV copied to clipboard");
                  }}
                  className="text-xs"
                >
                  <Download className="w-3 h-3 mr-1" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : codes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No codes generated yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Code</th>
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Plan</th>
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Used By</th>
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map((c) => (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <td className="py-2 px-2">
                            <code className="font-mono text-xs bg-secondary/50 px-1.5 py-0.5 rounded">{c.code}</code>
                          </td>
                          <td className="py-2 px-2 capitalize">{c.plan_type}</td>
                          <td className="py-2 px-2">
                            {c.is_used ? (
                              <span className="text-emerald-500 text-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Used
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Available</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">
                            {c.used_by_profile?.display_name || "-"}
                          </td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">
                            {format(new Date(c.created_at), "MMM d, yyyy")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        {/* AI Key Vault */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <AIKeyVault />
        </motion.div>
      </main>
    </div>
  );
}
