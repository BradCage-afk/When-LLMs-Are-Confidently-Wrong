// Typed data contracts for the runtime-fetched JSON/CSV files.

export interface CalibrationBucket {
  bucket: string; // e.g. "0-10"
  mean_confidence: number;
  actual_accuracy: number;
  count: number;
}

export interface TierStats {
  accuracy: number;
  mean_confidence: number;
}

export interface SubtopicStats {
  accuracy: number;
  count: number;
}

export interface PerModelDomain {
  accuracy: number;
  ece: number;
  overconfidence_score: number;
  dangerous_zone_count: number;
  calibration_curve: CalibrationBucket[];
  per_tier: Record<string, TierStats>;
  per_subtopic: Record<string, SubtopicStats>;
}

export interface LeaderboardEntry {
  model: string;
  composite_score: number;
  fide_accuracy: number;
  fia_accuracy: number;
}

export interface Metrics {
  models: string[];
  domains: string[];
  per_model_domain: Record<string, PerModelDomain>;
  calibration_gaps: Record<string, number>;
  leaderboard: LeaderboardEntry[];
}

export interface ResultRow {
  question_id: string;
  domain: string;
  tier: string;
  subtopic: string;
  model: string;
  confidence_percent: number;
  score: number;
  justification: string;
  common_misconception: string;
}

export interface BenchmarkQuestion {
  id: string;
  domain: string;
  tier: number | string;
  subtopic: string;
  question: string;
  correct_answer: string;
  explanation: string;
  source: string;
  common_misconception: string;
}

export function emptyMetrics(): Metrics {
  return {
    models: [],
    domains: [],
    per_model_domain: {},
    calibration_gaps: {},
    leaderboard: [],
  };
}
