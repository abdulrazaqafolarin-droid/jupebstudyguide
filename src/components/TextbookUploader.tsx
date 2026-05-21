import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { BookOpen, Upload, Loader2, CheckCircle, AlertCircle, Trash2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { processPDF, clearAllTextbooks } from "@/lib/rag";

interface TextbookUploaderProps {
  onClose: () => void;
}

export const TextbookUploader = ({ onClose }: TextbookUploaderProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [done, setDone] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const pdfs = selected.filter((f) => f.type === "application/pdf");
    if (pdfs.length !== selected.length) {
      toast.warning("Only PDF files are supported. Non-PDF files were skipped.");
    }
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setDone(false);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatusText(`Processing "${file.name}" (${i + 1}/${files.length})...`);
        await processPDF(file, (stage, pct) => {
          const overallPct = Math.round((i / files.length) * 100 + pct / files.length);
          setProgress(Math.min(overallPct, 99));
          setStatusText(stage);
        });
      }

      setProgress(100);
      setStatusText("All textbooks processed!");
      setDone(true);
      toast.success(`Successfully processed ${files.length} textbook(s)!`);
    } catch (err) {
      console.error("Textbook processing error:", err);
      toast.error("Failed to process textbook: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = async () => {
    await clearAllTextbooks();
    setFiles([]);
    setDone(false);
    setProgress(0);
    setStatusText("");
    toast.success("All textbook data cleared");
  };

  return (
    <Card className="border-primary/30 bg-card/95 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="w-5 h-5 text-primary" />
          Upload Textbooks
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload PDF textbooks to build a knowledge base. The AI tutor will draw from these when answering your questions.
        </p>

        {files.length === 0 && !done && (
          <div className="border-2 border-dashed rounded-lg p-6 text-center border-muted-foreground/30 hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="textbook-upload"
            />
            <label htmlFor="textbook-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium">Select PDF files</span>
              <span className="text-xs text-muted-foreground">You can select multiple textbooks at once</span>
            </label>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm truncate flex-1">{f.name}</span>
                {!processing && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(i)}>
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {processing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>{statusText}</span>
            </div>
          </div>
        )}

        {done && (
          <div className="flex items-center gap-2 text-sm text-green-500">
            <CheckCircle className="w-4 h-4" />
            <span>Textbooks processed and ready for AI tutor!</span>
          </div>
        )}

        <div className="flex gap-2">
          {files.length > 0 && !processing && (
            <Button onClick={handleProcess} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Process {files.length} Textbook(s)
            </Button>
          )}
          {done && (
            <Button variant="outline" onClick={() => { setFiles([]); setDone(false); setProgress(0); setStatusText(""); }} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Add More
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleClear} title="Clear all textbook data">
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
