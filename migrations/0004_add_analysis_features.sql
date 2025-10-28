-- Add category column to written_test_quizzes table
-- Categories: 안전(Safety), 기술(Technical), 품질(Quality), 절차(Procedure), 장비(Equipment)
ALTER TABLE written_test_quizzes ADD COLUMN category TEXT DEFAULT '기술';

-- Create training_programs table for education recommendations
CREATE TABLE IF NOT EXISTS training_programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  target_weakness TEXT,
  duration_hours INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- Insert sample training programs for Cutting process (ID: 1)
INSERT INTO training_programs (process_id, title, description, category, target_weakness, duration_hours) VALUES
(1, '절단 안전 작업 교육', '절단 작업 시 안전 수칙 및 보호구 착용 방법', '안전', 'Safety', 8),
(1, '고급 절단 기술 실습', '정밀 절단 기법 및 품질 향상 기술', '기술', 'Technical', 16),
(1, '절단 품질 관리 기법', '절단 품질 검사 기준 및 불량 예방', '품질', 'Quality', 12),
(1, '절단 작업 표준 절차', 'SOP 준수 및 작업 표준화 교육', '절차', 'Procedure', 8),
(1, '절단 장비 유지보수', '절단 장비 점검 및 유지보수 실무', '장비', 'Equipment', 16),
(1, '절단 안전 사고 예방', '안전 사고 사례 분석 및 예방 대책', '안전', 'Safety', 8),
(1, '절단 작업 효율화', '작업 속도 향상 및 생산성 증대 기법', '기술', 'Technical', 12);

-- Insert sample training programs for Beveling process (ID: 2)
INSERT INTO training_programs (process_id, title, description, category, target_weakness, duration_hours) VALUES
(2, '베벨링 안전 작업 교육', '베벨링 작업 시 안전 수칙 및 위험 요소 관리', '안전', 'Safety', 8),
(2, '고급 베벨링 기술 실습', '정밀 베벨링 기법 및 각도 조절 기술', '기술', 'Technical', 16),
(2, '베벨링 품질 관리 기법', '베벨링 품질 검사 및 불량 예방', '품질', 'Quality', 12),
(2, '베벨링 작업 표준 절차', 'SOP 준수 및 작업 표준화 교육', '절차', 'Procedure', 8),
(2, '베벨링 장비 유지보수', '베벨링 장비 점검 및 유지보수 실무', '장비', 'Equipment', 16),
(2, '베벨링 안전 사고 예방', '안전 사고 사례 분석 및 예방 대책', '안전', 'Safety', 8),
(2, '베벨링 작업 효율화', '작업 속도 향상 및 생산성 증대 기법', '기술', 'Technical', 12);
