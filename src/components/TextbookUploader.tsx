import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Upload, Loader2, CheckCircle, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { ExamProgramId } from "@/lib/exam-program";
import { processPDF, clearAllTextbooks, getTextbookCount } from "@/lib/rag";
interface TextbookUploaderProps { programId?: ExamProgramId; }
export const TextbookUploader = ({ programId = "jupeb" }: TextbookUploaderProps) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [done, setDone] = useState(false);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const programmeLabel = programId === "jamb" ? "JAMB" : "JUPEB";
  const refreshCount = useCallback(async () => {
    if (!user?.id) { setBookCount(null); return; }
    try { setBookCount(await getTextbookCount(programId, user.id)); }
    catch (error) { console.error("Could not read the local textbook library:", error); setBookCount(null); }
  }, [programId, user?.id]);
  useEffect(() => { void refreshCount(); }, [refreshCount]);
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    const pdfs = selected.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length !== selected.length) toast.warning("Only PDF files are supported. Non-PDF files were skipped.");
    setFiles((previous) => [...previous, ...pdfs]);
    event.target.value = "";
  };
  const removeFile = (index: number) => setFiles((previous) => previous.filter((_, i) => i !== index));
  const handleProcess = async () => {
    if (!user?.id || files.length === 0 || processing) return;
    setProcessing(true); setDone(false); setProgress(0);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatusText(`Processing "${file.name}" (${i + 1}/${files.length})...`);
        await processPDF(file, (stage, pct) => {
          const overallPct = Math.round((i / files.length) * 100 + pct / files.length);
          setProgress(Math.min(overallPct, 99)); setStatusText(stage);
        }, programId, user.id);
      }
      const uploaded = files.length;
      setProgress(100); setStatusText("All textbooks processed!"); setDone(true); setFiles([]);
      await refreshCount();
      toast.success(`Added ${uploaded} ${programmeLabel} textbook(s) to your local library.`);
    } catch (error) {
      console.error("Textbook processing error:", error);
      toast.error("Failed to process textbook: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally { setProcessing(false); }
  };
  const handleClear = async () => {
    if (!user?.id || processing || bookCount === 0) return;
    try {
      await clearAllTextbooks(programId, user.id);
      setFiles([]); setDone(false); setProgress(0); setStatusText(""); setBookCount(0);
      toast.success(`Your ${programmeLabel} textbook library was cleared on this device.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not clear the textbook library."); }
  };
  return (
    <Card className="border-primary/30 bg-card/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="h-5 w-5 text-primary" />{programmeLabel} Textbook Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add PDF textbooks to your private, on-device {programmeLabel} knowledge library. Relevant passages can be used by this programme's AI tutor only; another account or the other exam workspace cannot read this index.
        </p>
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Indexed textbooks on this device</span>
          <span className="font-semibold tabular-nums">{bookCount === null ? "—" : bookCount}</span>
        </div>
        {files.length === 0 && !done && (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center transition-colors hover:border-primary/50">
            <input type="file" accept=".pdf,application/pdf" multiple onChange={handleFileSelect} className="hidden" id={`textbook-upload-${programId}`} />
            <label htmlFor={`textbook-upload-${programId}`} className="flex cursor-pointer flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Select PDF files</span>
              <span className="text-xs text-muted-foreground">You can select multiple textbooks at once</span>
            </label>
          </div>
        )}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-secondary/30 p-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" /><span className="flex-1 truncate text-sm">{file.name}</span>
                {!processing && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}><span aria-hidden>×</span></Button>}
              </div>
            ))}
          </div>
        )}
        {processing && <div className="space-y-2"><Progress value={progress} className="h-2" /><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span>{statusText}</span></div></div>}
        {done && <div className="flex items-center gap-2 text-sm text-green-500"><CheckCircle className="h-4 w-4" /><span>Textbooks processed and ready for the {programmeLabel} AI tutor!</span></div>}
        <div className="flex gap-2">
          {files.length > 0 && !processing && <Button onClick={() => void handleProcess()} disabled={!user?.id} className="flex-1"><Upload className="mr-2 h-4 w-4" />Process {files.length} textbook(s)</Button>}
          {done && <Button variant="outline" onClick={() => { setDone(false); setProgress(0); setStatusText(""); }} className="flex-1"><Upload className="mr-2 h-4 w-4" />Add more</Button>}
          <Button variant="ghost" size="icon" onClick={() => void handleClear()} disabled={!user?.id || processing || bookCount === 0} title="Clear this account's textbook data"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </CardContent>
    </Card>
  );
};
