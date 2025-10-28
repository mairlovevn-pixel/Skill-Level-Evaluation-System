export type Bindings = {
  DB: D1Database;
}

export interface Worker {
  id?: number;
  employee_id: string;
  name: string;
  entity: string;
  team: string;
  position: string;
  start_to_work_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Process {
  id?: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface WrittenTestQuiz {
  id?: number;
  process_id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  created_at?: string;
}

export interface WrittenTestResult {
  id?: number;
  worker_id: number;
  process_id: number;
  score: number;
  passed: boolean;
  test_date?: string;
}

export interface SupervisorAssessmentItem {
  id?: number;
  process_id?: number;
  category: string;
  item_name: string;
  description?: string;
  created_at?: string;
}

export interface SupervisorAssessment {
  id?: number;
  worker_id: number;
  item_id: number;
  level: number;
  assessed_by: string;
  assessment_date?: string;
  comments?: string;
}

export interface DashboardStats {
  total_workers: number;
  written_test_takers: number;
  written_test_passed: number;
  written_test_by_process: Array<{
    process_name: string;
    takers: number;
    passed: number;
  }>;
  avg_score_by_process: Array<{
    process_name: string;
    avg_score: number;
  }>;
  supervisor_assessment_by_level: Array<{
    level: number;
    entity: string;
    count: number;
  }>;
}
