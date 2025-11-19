-- Insert written_test_results for worker 972 (employee_id 9467)
-- First, we need to insert the test result record
INSERT INTO written_test_results (worker_id, process_id, score, passed, test_date)
VALUES (
  972,  -- worker_id for employee 9467
  (SELECT id FROM positions WHERE name = 'LS WELDING' LIMIT 1),  -- process_id
  0,  -- score (will be calculated later)
  0,  -- passed (will be updated later)
  '2025-10-28'  -- test_date
);

-- Get the result_id we just created
-- For SQLite, we'll use last_insert_rowid() in separate statements

-- Now insert the 25 answers
-- Question 1: 다음 그림에서 용접금속은 어느 것인가? - B (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT last_insert_rowid(), id, 'B', 0
FROM written_test_quizzes 
WHERE question = '다음 그림에서 용접금속은 어느 것인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 2: 아래 그림은 어떤 용접 공정을 나타냅니까? - D (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = '아래 그림은 어떤 용접 공정을 나타냅니까?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 3: LONGSEAM 작업에서 사용되는 Controller의 주요 기능은 무엇인가요? - B (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'B', 0
FROM written_test_quizzes 
WHERE question = 'LONGSEAM 작업에서 사용되는 Controller의 주요 기능은 무엇인가요?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 4: LONGSEAM 작업 중 Flux Recovery System의 목적은 무엇인가요? - D (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'LONGSEAM 작업 중 Flux Recovery System의 목적은 무엇인가요?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 5: WELDING WIRE가 습기가 있는 상태에서 용접을 했을 경우 가장 많이 생기는 결함은? - A (Wrong, correct is A)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'A', 0
FROM written_test_quizzes 
WHERE question = 'WELDING WIRE가 습기가 있는 상태에서 용접을 했을 경우 가장 많이 생기는 결함은?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 6: Manipulator 용접 장비에서 제어하는 파라미터는 무엇인가요? - D (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'Manipulator 용접 장비에서 제어하는 파라미터는 무엇인가요?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 7: LONGSAM Process에서 Flux 송급을 위한 적절한 Air Pressure는 얼마인가? - B (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'B', 0
FROM written_test_quizzes 
WHERE question = 'LONGSAM Process에서 Flux 송급을 위한 적절한 Air Pressure는 얼마인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 8: Manipulator를 사용하는 주된 이유는 무엇인가요? - B (Wrong, correct is C)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'B', 0
FROM written_test_quizzes 
WHERE question = 'Manipulator를 사용하는 주된 이유는 무엇인가요?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 9: LONGSEAM 공정에서 슬래그의 역할은 무엇인가요? - D (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'LONGSEAM 공정에서 슬래그의 역할은 무엇인가요?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 10: LONGSEAM WELD TORCH의 DC/AC TORCH ANGLE은 얼마인가? - D (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'LONGSEAM WELD TORCH의 DC/AC TORCH ANGLE은 얼마인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 11: 다음을 보고 틀린 것을 고르시오. - C (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'C', 0
FROM written_test_quizzes 
WHERE question = '다음을 보고 틀린 것을 고르시오.' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 12: WPS란 무엇의 약자인가요? - B (Wrong, correct is A)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'B', 0
FROM written_test_quizzes 
WHERE question = 'WPS란 무엇의 약자인가요?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 13: LONGSEAM WELD TORCH에서 두 와이어 사이의 거리는 얼마인가? - B (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'B', 0
FROM written_test_quizzes 
WHERE question = 'LONGSEAM WELD TORCH에서 두 와이어 사이의 거리는 얼마인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 14: TORCH SET UP에서 일직선을 맞춰야 하는 것은? - D (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'TORCH SET UP에서 일직선을 맞춰야 하는 것은?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 15: 다음 그림은 무엇에 대한 그림인가? - D (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = '다음 그림은 무엇에 대한 그림인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 16: WIRE/FLUX의 LOT. No를 기록하는 이유는 무엇인가? - C (Wrong, correct is C)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'C', 0
FROM written_test_quizzes 
WHERE question = 'WIRE/FLUX의 LOT. No를 기록하는 이유는 무엇인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 17: WELDING WIRE의 점검 사항이 아닌 것은? - A (Wrong, correct is A)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'A', 0
FROM written_test_quizzes 
WHERE question = 'WELDING WIRE의 점검 사항이 아닌 것은?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 18: SKIRT와 WELDING TORCH의 CONTACT TIP 사이의 거리를 나타내는 용어는? - D (Wrong, correct is C)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'SKIRT와 WELDING TORCH의 CONTACT TIP 사이의 거리를 나타내는 용어는?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 19: TORCH ANGLE에 대한 설명으로 바른 것은? - C (Wrong, correct is A)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'C', 0
FROM written_test_quizzes 
WHERE question = 'TORCH ANGLE에 대한 설명으로 바른 것은?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 20: LONGSEAM 용접 시작 전 용접 부분을 GRINDING 하는 이유는 무엇인가? - D (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'LONGSEAM 용접 시작 전 용접 부분을 GRINDING 하는 이유는 무엇인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 21: SKIRT THICKNESS에 따른 PRE-HEATING 온도에 대해 바르게 설명한 것은? - D (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'SKIRT THICKNESS에 따른 PRE-HEATING 온도에 대해 바르게 설명한 것은?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 22: PRE-HEATING의 온도를 측정할 때 측정 위치를 구분하는 기준은 무엇인가? - D (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'PRE-HEATING의 온도를 측정할 때 측정 위치를 구분하는 기준은 무엇인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 23: LONGSEAM 작업에서 발생할 수 있는 Under Cut는 어떤 문제를 의미하나요? - C (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'C', 0
FROM written_test_quizzes 
WHERE question = 'LONGSEAM 작업에서 발생할 수 있는 Under Cut는 어떤 문제를 의미하나요?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 24: LONGSEAM WELDING을 시작하기 전에 WIRE를 SKIRT와 접촉한 뒤 1~2mm 띄우는 이유는 무엇인가? - C (Wrong, correct is B)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'C', 0
FROM written_test_quizzes 
WHERE question = 'LONGSEAM WELDING을 시작하기 전에 WIRE를 SKIRT와 접촉한 뒤 1~2mm 띄우는 이유는 무엇인가?' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Question 25: S.A.W의 WIRE를 절단할 때 바른 것을 고르시오. - D (Wrong, correct is D)
INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
SELECT (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972), id, 'D', 0
FROM written_test_quizzes 
WHERE question = 'S.A.W의 WIRE를 절단할 때 바른 것을 고르시오.' 
  AND position_id = (SELECT id FROM positions WHERE name = 'LS WELDING')
LIMIT 1;

-- Finally, update the score in written_test_results
UPDATE written_test_results 
SET score = (
  SELECT COUNT(*) * 4.0 
  FROM written_test_answers 
  WHERE result_id = (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) 
    AND is_correct = 1
),
passed = (
  SELECT CASE 
    WHEN COUNT(*) * 4.0 >= 60 THEN 1 
    ELSE 0 
  END
  FROM written_test_answers 
  WHERE result_id = (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972) 
    AND is_correct = 1
)
WHERE id = (SELECT MAX(id) FROM written_test_results WHERE worker_id = 972);
