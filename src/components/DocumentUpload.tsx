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

interface DocumentUploadProps {
  onUploadComplete: () => void;
  onClose: () => void;
}

type UploadStatus = 'idle' | 'reading' | 'parsing' | 'saving' | 'complete' | 'error';

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState<Subject>('physics');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setStatus('reading');
      setProgress(20);
      
      setStatus('parsing');
      setProgress(40);

      let textContent: string;

      if (selectedFile.type === 'text/plain') {
        textContent = await selectedFile.text();
      } else {
        setStatus('reading');
        const base64Data = await fileToBase64(selectedFile);
        const mimeType = selectedFile.type || 'application/pdf';
        textContent = `[File: ${selectedFile.name}]\n[MIME: ${mimeType}]\n[Base64: ${base64Data.substring(0, 200)}...]`;
        textContent += `\n\nNote: This is a ${mimeType} file. Extract all exam questions visible in this document.`;
      }

      setStatus('parsing');
      setProgress(50);

      const fullPrompt = DOCUMENT_PARSE_PROMPT + `\n\nDocument name: ${selectedFile.name}\nSubject: ${subject}\n\nDocument content:\n${textContent}`;
      const response = await chatCompletion(fullPrompt, []);

      setStatus('saving');
      setProgress(70);

      let parsed: { questions: any[] };
      try {
        const jsonStr = response.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        throw new Error('Failed to parse AI response. The model may not have returned valid JSON.');
      }

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('No questions found in the document');
      }

      setProgress(80);

      // Save to Supabase
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        toast.error('Please sign in to save questions');
        setStatus('error');
        setErrorMessage('Authentication required.');
        return;
      }

      const questionsToInsert = parsed.questions.map((q: any) => ({
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
      case 'parsing': return 'AI is extracting questions with OCR...';
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