export type QuestionType = "single" | "multiple" | "likert";

export type AssessmentCategory = {
  slug: string;
  name: string;
  description: string;
};

export type AssessmentOption = {
  label: string;
  value: string;
  score?: number;
  dimension?: string;
};

export type AssessmentQuestion = {
  id: string;
  title: string;
  helper?: string;
  type: QuestionType;
  required?: boolean;
  min?: number;
  max?: number;
  dimension?: string;
  options: AssessmentOption[];
};

export type ReportTemplate = {
  title: string;
  summary: string;
  traits: string[];
  strengths: string[];
  risks: string[];
  growth: string[];
  careers: string[];
  relationships: string[];
  source?: "template" | "ai";
  generatedByAi?: boolean;
  generatedAt?: string;
};

export type Assessment = {
  slug: string;
  title: string;
  subtitle: string;
  categorySlug: string;
  category: string;
  description: string;
  estimatedMinutes: number;
  isPremium?: boolean;
  priceCents?: number;
  tags: string[];
  scoring: {
    kind:
      | "sum"
      | "mbti"
      | "dimension"
      | "enneagram"
      | "disc"
      | "holland"
      | "attachment";
    maxScore?: number;
  };
  questions: AssessmentQuestion[];
  reportTemplates: Record<string, ReportTemplate>;
};

export type AssessmentAnswerInput = {
  questionId: string;
  values: string[];
};

export type AssessmentResult = {
  id: string;
  testSlug: string;
  testTitle: string;
  category: string;
  score: number;
  maxScore: number;
  type: string;
  title: string;
  summary: string;
  dimensions: Record<string, number>;
  advanced: ReportTemplate;
  advancedSource?: "template" | "ai";
  isUnlocked: boolean;
  createdAt: string;
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  readingMinutes: number;
  publishedAt: string;
  content: string;
};

export type PlanSlug = "free" | "monthly" | "yearly" | "single-report";

export type MembershipPlan = {
  slug: PlanSlug;
  name: string;
  priceCents: number;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};
