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

export interface Position {
  id?: number;
  name: string;
  description?: string;
  created_at?: string;
}

export interface WrittenTestQuiz {
  id?: number;
  position_id: number;
  question: string;
  question_image_url?: string;
  option_a: string;
  option_a_image_url?: string;
  option_b: string;
  option_b_image_url?: string;
  option_c?: string;
  option_c_image_url?: string;
  option_d?: string;
  option_d_image_url?: string;
  correct_answer: string;
  created_at?: string;
}

export interface WrittenTestResult {
  id?: number;
  worker_id: number;
  position_id: number;
  score: number;
  passed: boolean;
  test_date?: string;
}

export interface SupervisorAssessmentItem {
  id?: number;
  position_id?: number;
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
  written_test_by_position: Array<{
    position_name: string;
    takers: number;
    passed: number;
  }>;
  avg_score_by_position: Array<{
    position_name: string;
    avg_score: number;
  }>;
  supervisor_assessment_by_level: Array<{
    level: number;
    entity: string;
    count: number;
  }>;
  worker_level_details?: Array<{
    id: number;
    entity: string;
    team: string;
    position: string;
    level: number;
  }>;
}
