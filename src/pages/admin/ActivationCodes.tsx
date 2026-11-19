import { useState, useEffect, useRef, useCallback } from "react";
import { useActivation, useAdminCodes, type ActivationCodeResult } from "@/hooks/useActivation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Key, Copy, CheckCircle, Loader2, Shield, Users, TrendingUp, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ExamProgramId } from "@/lib/exam-program";

const PROGRAM_LABEL: Record<ExamProgramId, string> = { jupeb: "JUPEB", jamb: "JAMB / UTME" };

export default function AdminActivationCodes() {
  const { signOut } = useAuth();
  const { status } = useActivation("jupeb");
  const { codes, loading, generateCodes, listCodes } = useAdminCodes();
  const navigate = useNavigate();
  const [count, setCount] = useState(5);
  const [durationDays, setDurationDays] = useState("7");
  const [programId, setProgramId] = useState<ExamProgramId>("jupeb");
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<ActivationCodeResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const handleSignOut = useCallback(async () => { await signOut(); navigate("/auth", { replace: true }); }, [signOut, navigate]);
  const refresh = useCallback(async () => { setRefreshing(true); await listCodes(); setRefreshing(false); }, [listCodes]);

  useEffect(() => {
    void listCodes();
    intervalRef.current = setInterval(() => { void listCodes(); }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [listCodes]);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateCodes(count, Number(durationDays), programId);
    setGenerating(false);
    if (result.success && result.codes) {
      setGeneratedCodes(result.codes);
      toast.success(`Generated ${result.codes.length} ${PROGRAM_LABEL[programId]} codes`);
      void listCodes();
    } else toast.error(result.error || "Failed to generate codes");
  };

  const copyAll = async () => {
    const text = generatedCodes.map((code) => `${code.code}\t${PROGRAM_LABEL[code.exam_program_id]}\t${code.duration_days ?? ""} days`).join("\n");
    try { await navigator.clipboard.writeText(text); toast.success("Copied all codes"); }
    catch { toast.error("Could not access clipboard"); }
  };

  const stats = { total: codes.length, used: codes.filter((code) => code.is_used).length, available: codes.filter((code) => !code.is_used).length };

  if (status.checking) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!status.is_admin) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md border-destructive/30"><CardContent className="pt-8 pb-8 text-center">
        <Shield className="mx-auto mb-4 h-16 w-16 text-destructive" />
        <h2 className="mb-2 text-xl font-bold">Access Denied</h2>
        <p className="mb-4 text-muted-foreground">You do not have admin privileges.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /> Dashboard</button>
          <h1 className="font-semibold">Programme Activation Codes</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={refreshing}><RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} /> Refresh</Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-5 pb-4 text-center"><Key className="mx-auto mb-2 h-5 w-5 text-primary" /><p className="text-3xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Codes</p></CardContent></Card>
          <Card><CardContent className="pt-5 pb-4 text-center"><CheckCircle className="mx-auto mb-2 h-5 w-5 text-accent" /><p className="text-3xl font-bold">{stats.available}</p><p className="text-xs text-muted-foreground">Available</p></CardContent></Card>
          <Card><CardContent className="pt-5 pb-4 text-center"><Users className="mx-auto mb-2 h-5 w-5 text-destructive" /><p className="text-3xl font-bold">{stats.used}</p><p className="text-xs text-muted-foreground">Used</p></CardContent></Card>
        </div>
        <Card className="border-primary/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Key className="h-5 w-5 text-primary" /> Generate Activation Codes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5"><label className="text-sm text-muted-foreground">Programme</label>
                <Select value={programId} onValueChange={(value) => setProgramId(value as ExamProgramId)}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jupeb">JUPEB</SelectItem><SelectItem value="jamb">JAMB / UTME</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-1.5"><label className="text-sm text-muted-foreground">Quantity</label><div className="flex flex-wrap gap-2">
                {[1, 5, 10, 25, 50, 100].map((n) => <button type="button" key={n} onClick={() => setCount(n)} className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium", count === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>{n}</button>)}
              </div></div>
              <div className="space-y-1.5"><label className="text-sm text-muted-foreground">Subscription duration</label>
                <Select value={durationDays} onValueChange={setDurationDays}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">7 days</SelectItem><SelectItem value="30">30 days</SelectItem><SelectItem value="90">90 days</SelectItem></SelectContent></Select>
              </div>
              <Button onClick={() => void handleGenerate()} disabled={generating}>{generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />} Generate</Button>
            </div>
            <p className="text-xs text-muted-foreground">Codes generated here work only for the selected programme.</p>
            {generatedCodes.length > 0 && <div className="space-y-2">
              <div className="flex items-center justify-between"><p className="text-sm font-medium text-accent"><CheckCircle className="mr-1 inline h-4 w-4" /> {generatedCodes.length} {PROGRAM_LABEL[programId]} codes generated</p><Button variant="ghost" size="sm" onClick={() => void copyAll()}><Copy className="mr-1 h-3 w-3" /> Copy all</Button></div>
              <div className="max-h-48 overflow-y-auto rounded-lg bg-secondary/30 p-3">{generatedCodes.map((code, i) => <div key={`${code.code}-${i}`} className="flex items-center justify-between gap-3 border-b border-border/30 py-1.5 last:border-0"><code className="font-mono text-sm tracking-wider text-primary">{code.code}</code><span className="text-xs text-muted-foreground">{PROGRAM_LABEL[code.exam_program_id]} · {code.duration_days} days</span><button type="button" aria-label="Copy activation code" onClick={() => { void navigator.clipboard.writeText(code.code); toast.success("Copied"); }}><Copy className="h-3 w-3" /></button></div>)}</div>
            </div>}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" /> All Codes ({codes.length})</CardTitle></CardHeader>
          <CardContent>{loading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : codes.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No codes generated yet</p> : <div className="overflow-x-auto">
            <table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="px-2 py-2 text-left">Programme</th><th className="px-2 py-2 text-left">Code</th><th className="px-2 py-2 text-left">Term</th><th className="px-2 py-2 text-left">Status</th><th className="px-2 py-2 text-left">Used By</th><th className="px-2 py-2 text-left">Created</th></tr></thead>
              <tbody>{codes.map((code) => <tr key={code.id || code.code} className="border-b border-border/50"><td className="px-2 py-2 text-xs font-semibold">{PROGRAM_LABEL[code.exam_program_id]}</td><td className="px-2 py-2"><code className="rounded bg-secondary/50 px-1.5 py-0.5 font-mono text-xs">{code.code}</code></td><td className="px-2 py-2 text-xs">{code.duration_days ? `${code.duration_days} days` : code.plan_type}</td><td className="px-2 py-2">{code.is_used ? <span className="flex items-center gap-1 text-xs text-accent"><CheckCircle className="h-3 w-3" /> Used</span> : <span className="text-xs text-muted-foreground">Available</span>}</td><td className="px-2 py-2 text-xs text-muted-foreground">{code.used_by_profile?.display_name || "-"}</td><td className="px-2 py-2 text-xs text-muted-foreground">{format(new Date(code.created_at), "MMM d, yyyy")}</td></tr>)}</tbody>
            </table>
          </div>}</CardContent>
        </Card>
      </main>
    </div>
  );
}