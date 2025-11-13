-- Workers (작업자) 테이블
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  entity TEXT NOT NULL,  -- 법인
  team TEXT NOT NULL,
  position TEXT NOT NULL,
  start_to_work_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, entity)  -- Composite unique constraint: employee_id + entity
);

-- Processes (프로세스) 테이블
CREATE TABLE IF NOT EXISTS processes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Written Test Quiz (문제) 테이블
CREATE TABLE IF NOT EXISTS written_test_quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT NOT NULL, -- 'A', 'B', 'C', 'D'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- Written Test Results (시험 결과) 테이블
CREATE TABLE IF NOT EXISTS written_test_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  process_id INTEGER NOT NULL,
  score REAL NOT NULL, -- 점수 (0-100)
  passed BOOLEAN NOT NULL, -- 합격 여부
  test_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- Written Test Answers (답안) 테이블
CREATE TABLE IF NOT EXISTS written_test_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id INTEGER NOT NULL,
  quiz_id INTEGER NOT NULL,
  selected_answer TEXT, -- 'A', 'B', 'C', 'D'
  is_correct BOOLEAN NOT NULL,
  FOREIGN KEY (result_id) REFERENCES written_test_results(id),
  FOREIGN KEY (quiz_id) REFERENCES written_test_quizzes(id)
);

-- Supervisor Assessment Items (평가 항목) 테이블
CREATE TABLE IF NOT EXISTS supervisor_assessment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Supervisor Assessments (평가 결과) 테이블
CREATE TABLE IF NOT EXISTS supervisor_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  level INTEGER NOT NULL, -- 1, 2, 3, 4, 5 등의 레벨
  assessed_by TEXT NOT NULL, -- 평가자 이름
  assessment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  comments TEXT,
  FOREIGN KEY (worker_id) REFERENCES workers(id),
  FOREIGN KEY (item_id) REFERENCES supervisor_assessment_items(id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workers_entity ON workers(entity);
CREATE INDEX IF NOT EXISTS idx_workers_employee_id ON workers(employee_id);
CREATE INDEX IF NOT EXISTS idx_workers_composite ON workers(employee_id, entity);
CREATE INDEX IF NOT EXISTS idx_written_test_results_worker_id ON written_test_results(worker_id);
CREATE INDEX IF NOT EXISTS idx_written_test_results_process_id ON written_test_results(process_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assessments_worker_id ON supervisor_assessments(worker_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assessments_level ON supervisor_assessments(level);
