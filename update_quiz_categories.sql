-- Cutting 프로세스 quiz 카테고리 업데이트 (30개 문제를 5개 카테고리로 균등 분배)
UPDATE written_test_quizzes SET category = '안전' WHERE process_id = 1 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 1 ORDER BY id LIMIT 6
);
UPDATE written_test_quizzes SET category = '기술' WHERE process_id = 1 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 1 ORDER BY id LIMIT 6 OFFSET 6
);
UPDATE written_test_quizzes SET category = '품질' WHERE process_id = 1 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 1 ORDER BY id LIMIT 6 OFFSET 12
);
UPDATE written_test_quizzes SET category = '절차' WHERE process_id = 1 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 1 ORDER BY id LIMIT 6 OFFSET 18
);
UPDATE written_test_quizzes SET category = '장비' WHERE process_id = 1 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 1 ORDER BY id LIMIT 6 OFFSET 24
);

-- Beveling 프로세스 quiz 카테고리 업데이트
UPDATE written_test_quizzes SET category = '안전' WHERE process_id = 2 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 2 ORDER BY id LIMIT 6
);
UPDATE written_test_quizzes SET category = '기술' WHERE process_id = 2 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 2 ORDER BY id LIMIT 6 OFFSET 6
);
UPDATE written_test_quizzes SET category = '품질' WHERE process_id = 2 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 2 ORDER BY id LIMIT 6 OFFSET 12
);
UPDATE written_test_quizzes SET category = '절차' WHERE process_id = 2 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 2 ORDER BY id LIMIT 6 OFFSET 18
);
UPDATE written_test_quizzes SET category = '장비' WHERE process_id = 2 AND id IN (
  SELECT id FROM written_test_quizzes WHERE process_id = 2 ORDER BY id LIMIT 6 OFFSET 24
);
