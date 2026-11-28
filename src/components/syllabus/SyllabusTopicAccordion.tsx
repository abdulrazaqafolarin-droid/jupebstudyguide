import { useState } from "react";
import { ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuestionMath from "@/components/QuestionMath";

interface SyllabusTopicAccordionProps {
  id: string;
  title: string;
  tag: string;
  description: string;
  subtopics: string[];
  objectives?: string[];
  actionLabel?: string;
  onStart: () => void;
}

/** Shared topic accordion used by both programme-specific day lessons. */
export function SyllabusTopicAccordion({
  id,
  title,
  tag,
  description,
  subtopics,
  objectives = [],
  actionLabel = "Start Learning This Topic",
  onStart,
}: SyllabusTopicAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div key={id} className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary shrink-0">
            {tag}
          </span>
          <span className="font-medium text-left"><QuestionMath inline content={title} /></span>
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-border space-y-4">
          {description && <p className="text-sm text-muted-foreground"><QuestionMath inline content={description} /></p>}
          {subtopics.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Subtopics:</h4>
              <ul className="space-y-1">
                {subtopics.map((subtopic, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <QuestionMath inline content={subtopic} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {objectives.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Syllabus objectives:</h4>
              <ul className="space-y-1">
                {objectives.map((objective, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <QuestionMath inline content={objective} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            onClick={onStart}
          >
            <PlayCircle className="w-5 h-5" />
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default SyllabusTopicAccordion;
