import React, { useState } from "react";
import { DailyTask, SyllabusTopic } from "@/types/syllabus";
import { SUBJECT_INFO } from "@/types/question";
import AITeachingPage from "./AITeachingPage";
import { SyllabusDayLayout } from "@/components/syllabus/SyllabusDayLayout";
import { SyllabusTopicAccordion } from "@/components/syllabus/SyllabusTopicAccordion";

interface SyllabusDayViewProps {
  task: DailyTask;
  canAdvance: boolean;
  onComplete: (masteryScore: number) => void;
  onBack: () => void;
  onAskTutor: (topic: SyllabusTopic, question: string) => void;
}

export const SyllabusDayView: React.FC<SyllabusDayViewProps> = ({
  task,
  canAdvance,
  onComplete,
  onBack,
  onAskTutor,
}) => {
  const [teachingTopic, setTeachingTopic] = useState<SyllabusTopic | null>(null);
  const subjectInfo = SUBJECT_INFO[task.subject];

  if (teachingTopic) {
    return (
      <AITeachingPage
        task={task}
        topic={teachingTopic}
        onBack={() => setTeachingTopic(null)}
        onComplete={() => setTeachingTopic(null)}
      />
    );
  }

  const topicsContent = task.topics.length > 0 ? (
    <div className="space-y-4">
      {task.topics.map((topic) => (
        <SyllabusTopicAccordion
          key={topic.id}
          id={topic.id}
          title={topic.name}
          tag={topic.difficulty}
          description={topic.description}
          subtopics={topic.subtopics}
          onStart={() => {
            setTeachingTopic(topic);
            onAskTutor(topic, "");
          }}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-8">
      <h3 className="font-medium mb-2">Review Day</h3>
      <p className="text-sm text-muted-foreground">
        Practice past questions and review concepts from previous days.
      </p>
    </div>
  );

  return (
    <SyllabusDayLayout
      day={task.day}
      subjectName={subjectInfo.name}
      subjectIcon={subjectInfo.icon}
      subjectClassName={`subject-${task.subject}`}
      isCompleted={task.isCompleted}
      masteryScore={task.masteryScore}
      canAdvance={canAdvance}
      topics={topicsContent}
      topicCount={task.topics.length}
      learningObjectives={task.learningObjectives}
      checkpointQuestions={task.checkpointQuestions}
      onComplete={onComplete}
      onBack={onBack}
    />
  );
};

export default SyllabusDayView;
