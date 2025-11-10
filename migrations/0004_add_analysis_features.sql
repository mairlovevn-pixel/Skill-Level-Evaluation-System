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
