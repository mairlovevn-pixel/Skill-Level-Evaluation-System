-- SQL statements to insert data for employee 9467 (worker_id=972)

-- Step 1: Insert test result
INSERT INTO written_test_results (worker_id, process_id, score, passed, test_date)
SELECT 
  972 as worker_id,
  p.id as process_id,
  0 as score,
  0 as passed,
  '2025-10-28' as test_date
FROM positions p
WHERE p.name = 'LS WELDING'
LIMIT 1;

-- Step 2: Get result_id (for reference, this will be the MAX id)
-- In production, we'll use: SELECT MAX(id) FROM written_test_results WHERE worker_id = 972

-- Step 3: Insert 25 answers
-- Question 1: 다음 그림에서 용접금속은 어느 것인가?... - Selected: B, Correct: B, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'B' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = '다음 그림에서 용접금속은 어느 것인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 2: 아래 그림은 어떤 용접 공정을 나타냅니까?... - Selected: D, Correct: D, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = '아래 그림은 어떤 용접 공정을 나타냅니까?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 3: LONGSEAM 작업에서 사용되는 Controller의 주요 기능은 무엇인가요?... - Selected: B, Correct: B, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'B' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSEAM 작업에서 사용되는 Controller의 주요 기능은 무엇인가요?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 4: LONGSEAM 작업 중 Flux Recovery System의 목적은 무엇인가요?... - Selected: D, Correct: B, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSEAM 작업 중 Flux Recovery System의 목적은 무엇인가요?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 5: WELDING WIRE가 습기가 있는 상태에서 용접을 했을 경우 가장 많이 생기는 결함은?... - Selected: A, Correct: A, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'A' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'WELDING WIRE가 습기가 있는 상태에서 용접을 했을 경우 가장 많이 생기는 결함은?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 6: Manipulator 용접 장비에서 제어하는 파라미터는 무엇인가요?... - Selected: D, Correct: D, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'Manipulator 용접 장비에서 제어하는 파라미터는 무엇인가요?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 7: LONGSAM Process에서 Flux 송급을 위한 적절한 Air Pressure는 얼마... - Selected: B, Correct: B, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'B' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSAM Process에서 Flux 송급을 위한 적절한 Air Pressure는 얼마인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 8: Manipulator를 사용하는 주된 이유는 무엇인가요?... - Selected: B, Correct: C, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'B' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'Manipulator를 사용하는 주된 이유는 무엇인가요?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 9: LONGSEAM 공정에서 슬래그의 역할은 무엇인가요?... - Selected: D, Correct: B, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSEAM 공정에서 슬래그의 역할은 무엇인가요?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 10: LONGSEAM WELD TORCH의 DC/AC TORCH ANGLE은 얼마인가?... - Selected: D, Correct: D, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSEAM WELD TORCH의 DC/AC TORCH ANGLE은 얼마인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 11: 다음을 보고 틀린 것을 고르시오.... - Selected: C, Correct: D, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'C' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = '다음을 보고 틀린 것을 고르시오.'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 12: WPS란 무엇의 약자인가요?... - Selected: B, Correct: A, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'B' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'WPS란 무엇의 약자인가요?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 13: LONGSEAM WELD TORCH에서 두 와이어 사이의 거리는 얼마인가?... - Selected: B, Correct: B, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'B' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSEAM WELD TORCH에서 두 와이어 사이의 거리는 얼마인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 14: TORCH SET UP에서 일직선을 맞춰야 하는 것은?... - Selected: D, Correct: D, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'TORCH SET UP에서 일직선을 맞춰야 하는 것은?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 15: 다음 그림은 무엇에 대한 그림인가?... - Selected: D, Correct: D, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = '다음 그림은 무엇에 대한 그림인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 16: WIRE/FLUX의 LOT. No를 기록하는 이유는 무엇인가?... - Selected: C, Correct: C, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'C' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'WIRE/FLUX의 LOT. No를 기록하는 이유는 무엇인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 17: WELDING WIRE의 점검 사항이 아닌 것은?... - Selected: A, Correct: A, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'A' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'WELDING WIRE의 점검 사항이 아닌 것은?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 18: SKIRT와 WELDING TORCH의 CONTACT TIP 사이의 거리를 나타내는 용어는... - Selected: D, Correct: C, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'SKIRT와 WELDING TORCH의 CONTACT TIP 사이의 거리를 나타내는 용어는?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 19: TORCH ANGLE에 대한 설명으로 바른 것은?... - Selected: C, Correct: A, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'C' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'TORCH ANGLE에 대한 설명으로 바른 것은?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 20: LONGSEAM 용접 시작 전 용접 부분을 GRINDING 하는 이유는 무엇인가?... - Selected: D, Correct: D, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSEAM 용접 시작 전 용접 부분을 GRINDING 하는 이유는 무엇인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 21: SKIRT THICKNESS에 따른 PRE-HEATING 온도에 대해 바르게 설명한 것은?... - Selected: D, Correct: B, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'SKIRT THICKNESS에 따른 PRE-HEATING 온도에 대해 바르게 설명한 것은?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 22: PRE-HEATING의 온도를 측정할 때 측정 위치를 구분하는 기준은 무엇인가?... - Selected: D, Correct: D, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'PRE-HEATING의 온도를 측정할 때 측정 위치를 구분하는 기준은 무엇인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 23: LONGSEAM 작업에서 발생할 수 있는 Under Cut는 어떤 문제를 의미하나요?... - Selected: C, Correct: B, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'C' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSEAM 작업에서 발생할 수 있는 Under Cut는 어떤 문제를 의미하나요?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 24: LONGSEAM WELDING을 시작하기 전에 WIRE를 SKIRT와 접촉한 뒤 1~2mm... - Selected: C, Correct: B, Result: Wrong
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'C' as selected_answer,
  0 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'LONGSEAM WELDING을 시작하기 전에 WIRE를 SKIRT와 접촉한 뒤 1~2mm 띄우는 이유는 무엇인가?'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Question 25: S.A.W의 WIRE를 절단할 때 바른 것을 고르시오.... - Selected: D, Correct: D, Result: Correct
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT 
  (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) as result_id,
  q.id as quiz_id,
  'D' as selected_answer,
  1 as is_correct
FROM written_test_quizzes q
JOIN positions p ON q.position_id = p.id
WHERE q.question = 'S.A.W의 WIRE를 절단할 때 바른 것을 고르시오.'
  AND p.name = 'LS WELDING'
LIMIT 1;

-- Step 4: Update score and passed status
UPDATE written_test_results 
SET 
  score = (
    SELECT CAST(SUM(CASE WHEN wta.is_correct = 1 THEN 4.0 ELSE 0 END) AS REAL)
    FROM written_test_answers wta
    WHERE wta.result_id = written_test_results.id
  ),
  passed = (
    SELECT CASE 
      WHEN SUM(CASE WHEN wta.is_correct = 1 THEN 4.0 ELSE 0 END) >= 60 THEN 1 
      ELSE 0 
    END
    FROM written_test_answers wta
    WHERE wta.result_id = written_test_results.id
  )
WHERE id = (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972);

-- Verification query
SELECT 
  wtr.id,
  wtr.worker_id,
  w.employee_id,
  w.name,
  wtr.score,
  wtr.passed,
  COUNT(wta.id) as answer_count,
  SUM(CASE WHEN wta.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
FROM written_test_results wtr
JOIN workers w ON wtr.worker_id = w.id
LEFT JOIN written_test_answers wta ON wtr.id = wta.result_id
WHERE wtr.worker_id = 972
GROUP BY wtr.id, wtr.worker_id, w.employee_id, w.name, wtr.score, wtr.passed;
