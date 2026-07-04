export type TourPage =
  | "home"
  | "past-questions"
  | "syllabus"
  | "chat"
  | "leaderboard"
  | "achievements"
  | "profile"
  | "discover"
  | "ai-tutor";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  benefit: string;
  selector: string;
  placement: "top" | "bottom" | "left" | "right" | "center";
  route?: string;
  action?: {
    label: string;
    to: string;
  };
}

export interface TourPageConfig {
  page: TourPage;
  route: string;
  title: string;
  icon: string;
  steps: TourStep[];
}

export interface TourState {
  completedPages: string[];
  dismissed: boolean;
  currentStep: number;
}
