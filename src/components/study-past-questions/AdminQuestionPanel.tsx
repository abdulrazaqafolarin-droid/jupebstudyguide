import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Plus, AlertTriangle, GripVertical } from "lucide-react";
import type { StudyQuestion, StudyCategory } from "@/types/study-questions";
import type { Subject } from "@/types/question";
import { addQuestion, updateQuestion, deleteQuestion, generateQuestionId } from "@/lib/admin-questions-service";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminQuestionPanelProps {
  question: StudyQuestion | null;
  questions?: StudyQuestion[];
  subject: Subject;
  year: number;
  category: StudyCategory;
  onQuestionUpdated: (question: StudyQuestion) => void;
  onQuestionDeleted: (id: string) => void;
  onQuestionAdded: (question: StudyQuestion) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface OptionEntry {
  label: string;
  text: string;
}

type Mode = "edit" | "add" | null;

export function AdminQuestionPanel({
  question,
  questions,
  subject,
  year,
  category,
  onQuestionUpdated,
  onQuestionDeleted,
  onQuestionAdded,
  isOpen,
  onClose,
}: AdminQuestionPanelProps) {
  const [mode, setMode] = useState<Mode>(null);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<OptionEntry[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isObjective = category === "objective";

  useEffect(() => {
    if (!isOpen) {
      setMode(null);
      setConfirmDelete(false);
      setError(null);
    }
  }, [isOpen]);

  const loadQuestion = useCallback((q: StudyQuestion) => {
    setQuestionText(q.question || "");
    setOptions(q.options ? q.options.map(o => ({ label: o.label, text: o.text })) : []);
    setCorrectAnswer(q.correctAnswer || "");
    setExplanation(q.explanation || "");
    setDifficulty(q.difficulty || "medium");
    setTopic(q.topic || "");
    setError(null);
  }, []);

  const resetForm = useCallback(() => {
    setQuestionText("");
    setOptions(isObjective ? [{ label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" }, { label: "D", text: "" }] : []);
    setCorrectAnswer("");
    setExplanation("");
    setDifficulty("medium");
    setTopic("");
    setError(null);
  }, [isObjective]);

  useEffect(() => {
    if (mode === "edit" && question) {
      loadQuestion(question);
    } else if (mode === "add") {
      resetForm();
    }
  }, [mode, question, loadQuestion, resetForm]);

  const handleEdit = () => {
    if (!question) return;
    setMode("edit");
    loadQuestion(question);
  };

  const handleAdd = () => {
    setMode("add");
    resetForm();
  };

  const handleSave = async () => {
    if (!questionText.trim()) {
      setError("Question text is required");
      return;
    }
    if (isObjective) {
      const validOptions = options.filter(o => o.text.trim());
      if (validOptions.length < 2) {
        setError("At least 2 options are required");
        return;
      }
      if (!correctAnswer.trim()) {
        setError("Correct answer is required");
        return;
      }
      const validLabels = validOptions.map(o => o.label);
      if (!validLabels.includes(correctAnswer.trim().toUpperCase())) {
        setError(`Correct answer must be one of: ${validLabels.join(", ")}`);
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      if (mode === "edit" && question) {
        const result = await updateQuestion(question.id, {
          question: questionText.trim(),
          options: isObjective ? options.filter(o => o.text.trim()) : null,
          correctAnswer: correctAnswer.trim().toUpperCase() || null,
          explanation: explanation.trim() || null,
          difficulty,
          topic: topic.trim() || null,
        });

        if (!result.success) {
          setError(result.error || "Failed to update question");
          setSaving(false);
          return;
        }

        onQuestionUpdated({
          ...question,
          question: questionText.trim(),
          options: isObjective ? options.filter(o => o.text.trim()) : undefined,
          correctAnswer: correctAnswer.trim().toUpperCase() || undefined,
          explanation: explanation.trim() || undefined,
          difficulty: difficulty as "easy" | "medium" | "hard",
          topic: topic.trim() || undefined,
        });
      } else if (mode === "add") {
        const newId = generateQuestionId(subject, year, category);
        const result = await addQuestion({
          id: newId,
          subject,
          year,
          category,
          question: questionText.trim(),
          options: isObjective ? options.filter(o => o.text.trim()) : null,
          correctAnswer: correctAnswer.trim().toUpperCase() || null,
          explanation: explanation.trim() || null,
          difficulty,
          topic: topic.trim() || null,
        });

        if (!result.success) {
          setError(result.error || "Failed to add question");
          setSaving(false);
          return;
        }

        onQuestionAdded({
          id: newId,
          subject,
          year,
          category,
          question: questionText.trim(),
          options: isObjective ? options.filter(o => o.text.trim()) : undefined,
          correctAnswer: correctAnswer.trim().toUpperCase() || undefined,
          explanation: explanation.trim() || undefined,
          difficulty: difficulty as "easy" | "medium" | "hard",
          topic: topic.trim() || undefined,
        });
      }

      setSaving(false);
      setMode(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!question) return;
    setSaving(true);
    setError(null);

    try {
      const result = await deleteQuestion(question.id);
      if (!result.success) {
        setError(result.error || "Failed to delete question");
        setSaving(false);
        return;
      }

      setSaving(false);
      onQuestionDeleted(question.id);
      setMode(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSaving(false);
    }
  };

  const updateOption = (idx: number, text: string) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, text } : o));
  };

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + options.length);
    setOptions(prev => [...prev, { label: nextLabel, text: "" }]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) }));
    });
    if (correctAnswer === options[idx]?.label) {
      setCorrectAnswer("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => { if (!saving) { setMode(null); onClose(); } }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-2xl border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                {mode === "add" ? "Add New Question" : "Edit Question"}
              </h2>
              <div className="flex items-center gap-2">
                {mode === "edit" && question && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => { if (!saving) { setMode(null); onClose(); } }}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {confirmDelete ? (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
                  <div className="flex items-center gap-2 text-destructive font-medium">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Delete this question permanently?</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will remove the question from the database for ALL users.
                    This action cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      {saving ? "Deleting..." : "Delete Forever"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : mode ? (
                <>
                  {error && (
                    <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Question Text</label>
                    <textarea
                      value={questionText}
                      onChange={e => setQuestionText(e.target.value)}
                      rows={4}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      placeholder="Enter the question text..."
                    />
                  </div>

                  {isObjective && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-muted-foreground">Options</label>
                        <button
                          onClick={addOption}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Add Option
                        </button>
                      </div>
                      <div className="space-y-2">
                        {options.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="shrink-0 w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {opt.label}
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => updateOption(idx, e.target.value)}
                              className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder={`Option ${opt.label}`}
                            />
                            {options.length > 2 && (
                              <button
                                onClick={() => removeOption(idx)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Correct Answer</label>
                      <input
                        type="text"
                        value={correctAnswer}
                        onChange={e => setCorrectAnswer(e.target.value.toUpperCase())}
                        className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder={isObjective ? "e.g. A, B, C, D" : "e.g. A"}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Difficulty</label>
                      <select
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value)}
                        className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Topic / Course</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="e.g. chm-atomic, chm-bonding"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Explanation</label>
                    <textarea
                      value={explanation}
                      onChange={e => setExplanation(e.target.value)}
                      rows={3}
                      className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                      placeholder="Explain why the correct answer is right..."
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select a question to edit, or add a new one.
                  </p>

                  {questions && questions.length > 0 && (
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {questions.map((q, idx) => (
                        <button
                          key={q.id}
                          onClick={() => {
                            loadQuestion(q);
                            setMode("edit");
                          }}
                          className="w-full flex items-start gap-2 p-3 rounded-xl border bg-card hover:bg-accent/50 text-left transition-all active:scale-[0.98]"
                        >
                          <span className="shrink-0 w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm line-clamp-2">{q.question}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span className="capitalize">{q.category}</span>
                              {q.correctAnswer && (
                                <>
                                  <span className="text-muted-foreground/40">&middot;</span>
                                  <span className="font-mono text-green-600 dark:text-green-400">Ans: {q.correctAnswer}</span>
                                </>
                              )}
                              {q.difficulty && (
                                <>
                                  <span className="text-muted-foreground/40">&middot;</span>
                                  <span className="capitalize">{q.difficulty}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                    {question && (
                      <Button onClick={handleEdit} variant="default" size="sm">
                        Edit Current Question
                      </Button>
                    )}
                    <Button onClick={handleAdd} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" /> Add New Question
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {mode && !confirmDelete && (
              <div className="flex items-center justify-end gap-2 p-4 border-t shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setMode(null); onClose(); }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
