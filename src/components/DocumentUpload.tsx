import React, { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Subject, SUBJECT_INFO } from '@/types/question';
import { chatCompletion } from '@/lib/ai-service';
import { DOCUMENT_PARSE_PROMPT } from '@/lib/prompts';

// tesseract.js (~2MB + wasm) loads on demand so the upload dialog stays light.
async function loadTesseract() {
  return (await import('tesseract.js')).default;
}

interface DocumentUploadProps {
  onUploadComplete: () => void;
  onClose: () => void;
}

type UploadStatus = 'idle' | 'reading' | 'ocr' | 'parsing' | 'saving' | 'complete' | 'error';

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState<Subject>('physics');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [ocrProgress, setOcrProgress] = useState('');

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      const isValid = validTypes.some(type => file.type.includes(type.split('/')[1]) || file.type === type);
      
      if (!isValid) {
        toast.error('Please upload a PDF, text file, or image (PNG, JPG)');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }
      setSelectedFile(file);
      setStatus('idle');
      setErrorMessage('');
    }
  }, []);

  async function ocrImage(file: File): Promise<string> {
    setOcrProgress('Initializing OCR engine...');
    const Tesseract = await loadTesseract();
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          setOcrProgress(`OCR: ${pct}%`);
          setProgress(20 + Math.round(pct * 0.3));
        }
      }
    });
    setOcrProgress('');
    return data.text;
  }

  async function extractPDFText(file: File): Promise<string> {
    setOcrProgress('Loading PDF...');
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      setOcrProgress(`Reading page ${i}/${pdf.numPages}...`);
      setProgress(20 + Math.round((i / pdf.numPages) * 30));
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      fullText += pageText + "\n\n";
    }
    if (fullText.trim().length < 50) {
      setOcrProgress('PDF appears scanned. Running OCR on each page...');
      fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        setOcrProgress(`OCR page ${i}/${pdf.numPages}...`);
        setProgress(20 + Math.round((i / pdf.numPages) * 30));
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvas, viewport }).promise;
          const Tesseract = await loadTesseract();
          const { data } = await Tesseract.recognize(canvas, 'eng');
          fullText += data.text + "\n\n";
        }
      }
    }
    setOcrProgress('');
    return fullText;
  }

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setStatus('reading');
      setProgress(10);
      
      let textContent: string;
      const type = selectedFile.type;

      if (type === 'text/plain') {
        textContent = await selectedFile.text();
        setProgress(50);
      } else if (type.startsWith('image/')) {
        setStatus('ocr');
        setProgress(20);
        textContent = await ocrImage(selectedFile);
        setProgress(50);
      } else if (type === 'application/pdf') {
        setStatus('ocr');
        setProgress(20);
        textContent = await extractPDFText(selectedFile);
        setProgress(50);
      } else {
        throw new Error('Unsupported file type');
      }

      if (!textContent.trim()) {
        throw new Error('No text could be extracted from the file. Try an image with clearer text.');
      }

      setStatus('parsing');
      setProgress(60);

      const fullPrompt = DOCUMENT_PARSE_PROMPT + `\n\nDocument name: ${selectedFile.name}\nSubject: ${subject}\n\nDocument content:\n${textContent}`;
      const response = await chatCompletion(fullPrompt, []);

      setStatus('saving');
      setProgress(80);

      interface ParsedQuestion {
        year?: number;
        type?: string;
        topic?: string;
        question: string;
        options?: Array<Record<string, string>>;
        correctAnswer: string;
        explanation?: string;
        difficulty?: string;
      }

      let parsed: { questions: ParsedQuestion[] };
      try {
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error('Failed to parse AI response. The model may not have returned valid JSON.');
      }

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('No questions found in the document');
      }

      setProgress(90);

      // Save to Supabase
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        toast.error('Please sign in to save questions');
        setStatus('error');
        setErrorMessage('Authentication required.');
        return;
      }

      const questionsToInsert = parsed.questions.map((q: ParsedQuestion) => ({
        document_name: selectedFile.name,
        subject,
        year: q.year || null,
        topic: q.topic || null,
        question: q.question,
        question_type: q.type || 'mcq',
        options: q.options || null,
        correct_answer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'medium',
        user_id: session.user.id,
      }));

      const { data, error } = await supabase
        .from('custom_questions')
        .insert(questionsToInsert)
        .select();

      if (error) throw new Error('Failed to save questions to database');

      setQuestionsCount(data.length);
      setProgress(100);
      setStatus('complete');
      
      toast.success(`Successfully extracted ${data.length} questions!`);
      
      setTimeout(() => onUploadComplete(), 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
      toast.error(error instanceof Error ? error.message : 'Failed to process document');
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'reading': return 'Reading document...';
      case 'ocr': return ocrProgress || 'Running OCR...';
      case 'parsing': return 'AI is extracting questions...';
      case 'saving': return 'Saving questions...';
      case 'complete': return `Successfully added ${questionsCount} questions!`;
      case 'error': return errorMessage;
      default: return '';
    }
  };

  const isImageFile = selectedFile?.type.startsWith('image/');

  return (
    <Card className="border-primary/30 bg-card/95 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="w-5 h-5 text-primary" />
          Upload Past Questions
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject Selection */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Subject</label>
          <Select value={subject} onValueChange={(v) => setSubject(v as Subject)}>
            <SelectTrigger className="bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUBJECT_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">
                    <span>{info.icon}</span>
                    <span>{info.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload Area */}
        <div 
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${selectedFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'}
          `}
        >
          <input
            type="file"
            accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={status !== 'idle' && status !== 'error'}
          />
          <label 
            htmlFor="file-upload" 
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {selectedFile ? (
              <>
                {isImageFile ? (
                  <Image className="w-10 h-10 text-primary" />
                ) : (
                  <FileText className="w-10 h-10 text-primary" />
                )}
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <Image className="w-8 h-8 text-muted-foreground" />
                </div>
                <span className="text-sm">Upload PDF, image, or text file</span>
                <span className="text-xs text-muted-foreground">
                  Supports scanned documents with OCR • Max 20MB
                </span>
              </>
            )}
          </label>
        </div>

        {/* OCR Info */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <Loader2 className="w-4 h-4 text-accent shrink-0" />
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">OCR Enabled:</strong> Can extract text from scanned PDFs and images of past questions
          </span>
        </div>

        {/* Progress */}
        {status !== 'idle' && status !== 'error' && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center gap-2 text-sm">
              {status === 'complete' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              <span className={status === 'complete' ? 'text-green-500' : 'text-muted-foreground'}>
                {getStatusMessage()}
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || (status !== 'idle' && status !== 'error')}
          className="w-full"
        >
          {status === 'idle' || status === 'error' ? (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Extract Questions with AI + OCR
            </>
          ) : status === 'complete' ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete!
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          AI extracts questions from images/scans, solves them, and generates detailed explanations
        </p>
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;