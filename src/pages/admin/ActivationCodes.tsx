import { useState, useEffect } from "react";
import { useActivation, useAdminCodes } from "@/hooks/useActivation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Key, Copy, CheckCircle, Loader2, Shield, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminActivationCodes() {
  const { user, signOut } = useAuth();
  const { status } = useActivation();
  const { codes, loading, generateCodes, listCodes } = useAdminCodes();
  const navigate = useNavigate();

  const [count, setCount] = useState(5);
  const [planType, setPlanType] = useState("basic");
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);

  useEffect(() => {
    listCodes();
  }, [listCodes]);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateCodes(count, planType);
    setGenerating(false);

    if (result.success && result.codes) {
      setGeneratedCodes(result.codes);
      toast.success(`Generated ${result.codes.length} codes`);
      listCodes();
    } else {
      toast.error(result.error || "Failed to generate codes");
    }
  };

  const copyAll = () => {
    const text = generatedCodes.map((c: any) => `${c.code}\t${c.plan_type}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied all codes");
  };

  const stats = {
    total: codes.length,
    used: codes.filter((c: any) => c.is_used).length,
    available: codes.filter((c: any) => !c.is_used).length,
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </button>
          <h1 className="font-semibold">Activation Code Manager</h1>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-card to-primary/5 border-primary/20">
            <CardContent className="pt-5 pb-4 text-center">
              <Key className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Codes</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/5 border-accent/20">
            <CardContent className="pt-5 pb-4 text-center">
              <CheckCircle className="w-5 h-5 text-accent mx-auto mb-2" />
              <p className="text-3xl font-bold">{stats.available}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-destructive/5 border-destructive/20">
            <CardContent className="pt-5 pb-4 text-center">
              <Users className="w-5 h-5 text-destructive mx-auto mb-2" />
              <p className="text-3xl font-bold">{stats.used}</p>
              <p className="text-xs text-muted-foreground">Used</p>
            </CardContent>
          </Card>
        </div>

        {/* Generate Codes */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="w-5 h-5 text-primary" />
              Generate Activation Codes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Quantity</label>
                <div className="flex gap-2">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-accent">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    {generatedCodes.length} codes generated
                  </p>
                  <Button variant="ghost" size="sm" onClick={copyAll} className="text-xs">
                    <Copy className="w-3 h-3 mr-1" /> Copy all
                  </Button>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {generatedCodes.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                      <code className="font-mono text-sm tracking-wider text-primary">{c.code}</code>
                      <span className="text-xs text-muted-foreground capitalize">{c.plan_type}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Code List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              All Codes ({codes.length})
            </CardTitle>
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
                    {codes.map((c: any) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="py-2 px-2">
                          <code className="font-mono text-xs bg-secondary/50 px-1.5 py-0.5 rounded">{c.code}</code>
                        </td>
                        <td className="py-2 px-2 capitalize">{c.plan_type}</td>
                        <td className="py-2 px-2">
                          {c.is_used ? (
                            <span className="text-accent text-xs flex items-center gap-1">
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
      </main>
    </div>
  );
}
