-- 프로세스 데이터 삽입
INSERT OR IGNORE INTO processes (id, name, description) VALUES 
  (1, 'Cutting', 'Cutting 프로세스'),
  (2, 'Beveling', 'Beveling 프로세스'),
  (3, 'Bending', 'Bending 프로세스'),
  (4, 'LS Welding', 'LS Welding 프로세스'),
  (5, 'Fit Up', 'Fit Up 프로세스'),
  (6, 'CS Welding', 'CS Welding 프로세스'),
  (7, 'VTMT', 'VTMT 프로세스'),
  (8, 'Bracket FU', 'Bracket FU 프로세스'),
  (9, 'Bracket Weld', 'Bracket Weld 프로세스'),
  (10, 'UT repair', 'UT repair 프로세스'),
  (11, 'DF FU', 'DF FU 프로세스'),
  (12, 'DF Weld', 'DF Weld 프로세스'),
  (13, 'Flatness', 'Flatness 프로세스');

-- 법인 및 작업자 샘플 데이터
INSERT OR IGNORE INTO workers (employee_id, name, entity, team, position, start_to_work_date) VALUES 
  ('EMP001', '김철수', 'Seoul HQ', 'Assembly Team', 'Operator', '2023-01-15'),
  ('EMP002', '이영희', 'Seoul HQ', 'Testing Team', 'Tester', '2023-02-20'),
  ('EMP003', '박민수', 'Busan Branch', 'Assembly Team', 'Operator', '2023-03-10'),
  ('EMP004', '정수진', 'Busan Branch', 'Quality Team', 'QC Inspector', '2023-04-05'),
  ('EMP005', '최현우', 'Incheon Branch', 'Packaging Team', 'Packer', '2023-05-12'),
  ('EMP006', '강민지', 'Seoul HQ', 'Assembly Team', 'Senior Operator', '2022-11-20'),
  ('EMP007', '윤서준', 'Seoul HQ', 'Testing Team', 'Lead Tester', '2022-08-15'),
  ('EMP008', '한지우', 'Busan Branch', 'Assembly Team', 'Operator', '2023-06-01'),
  ('EMP009', '임소연', 'Incheon Branch', 'Quality Team', 'QC Inspector', '2023-07-14'),
  ('EMP010', '장태양', 'Seoul HQ', 'Packaging Team', 'Packer', '2023-08-20');

-- Written Test Quiz 샘플 데이터 (Assembly 프로세스)
INSERT OR IGNORE INTO written_test_quizzes (process_id, question, option_a, option_b, option_c, option_d, correct_answer) VALUES 
  (1, '조립 공정에서 가장 중요한 안전 수칙은?', '빠른 작업 속도', '정확한 부품 배치', '안전 장비 착용', '휴식 시간 준수', 'C'),
  (1, '부품의 불량을 발견했을 때 첫 번째 조치는?', '계속 작업 진행', '즉시 상급자에게 보고', '폐기 처리', '재작업 시도', 'B'),
  (1, '조립 작업 전 확인해야 할 사항은?', '작업 지시서 확인', '휴식 시간', '점심 메뉴', '날씨', 'A'),
  (1, '작업 도구의 올바른 사용법은?', '편한 대로 사용', '매뉴얼에 따라 사용', '빠르게만 하면 됨', '아무거나 사용', 'B'),
  (1, '5S 활동의 의미가 아닌 것은?', '정리', '정돈', '청소', '휴식', 'D');

-- Written Test Quiz 샘플 데이터 (Testing 프로세스)
INSERT OR IGNORE INTO written_test_quizzes (process_id, question, option_a, option_b, option_c, option_d, correct_answer) VALUES 
  (2, '제품 테스트 시 가장 먼저 확인해야 할 항목은?', '외관 검사', '테스트 장비 상태', '작업 시간', '점심 메뉴', 'B'),
  (2, '테스트 불합격 제품의 처리 방법은?', '재포장', '불량 처리 절차 따름', '판매', '폐기', 'B'),
  (2, '테스트 데이터 기록의 중요성은?', '불필요함', '추적성 확보', '시간 낭비', '형식적', 'B'),
  (2, '측정 장비의 교정 주기는?', '필요 없음', '매일', '규정된 주기', '고장 시', 'C'),
  (2, '테스트 환경 조건 관리가 중요한 이유는?', '편의성', '정확한 결과 도출', '형식적', '상관없음', 'B');

-- Written Test Results 샘플 데이터
INSERT OR IGNORE INTO written_test_results (worker_id, process_id, score, passed) VALUES 
  (1, 1, 85.5, 1),
  (2, 2, 92.0, 1),
  (3, 1, 78.0, 1),
  (4, 4, 88.5, 1),
  (5, 3, 65.0, 0),
  (6, 1, 95.0, 1),
  (7, 2, 89.0, 1),
  (8, 1, 72.0, 1),
  (9, 4, 91.5, 1),
  (10, 3, 58.0, 0);

-- Supervisor Assessment Items 샘플 데이터
INSERT OR IGNORE INTO supervisor_assessment_items (category, item_name, description) VALUES 
  ('기술 능력', '작업 숙련도', '작업 과정의 숙련 정도'),
  ('기술 능력', '품질 관리', '품질 기준 준수 능력'),
  ('안전', '안전 수칙 준수', '안전 규정 이행 수준'),
  ('태도', '협업 능력', '팀워크 및 협업 태도'),
  ('태도', '책임감', '업무에 대한 책임감'),
  ('효율성', '작업 속도', '작업 수행 속도'),
  ('효율성', '문제 해결', '문제 상황 대처 능력');

-- Supervisor Assessments 샘플 데이터
INSERT OR IGNORE INTO supervisor_assessments (worker_id, item_id, level, assessed_by, comments) VALUES 
  (1, 1, 3, 'Manager Kim', '양호한 수준'),
  (1, 2, 4, 'Manager Kim', '우수함'),
  (2, 1, 4, 'Manager Lee', '우수한 기술력'),
  (2, 3, 5, 'Manager Lee', '모범적인 안전 의식'),
  (3, 1, 3, 'Manager Park', '보통 수준'),
  (4, 2, 5, 'Manager Choi', '탁월한 품질 관리'),
  (5, 1, 2, 'Manager Jung', '추가 훈련 필요'),
  (6, 1, 5, 'Manager Kim', '매우 우수함'),
  (7, 1, 4, 'Manager Lee', '우수한 테스트 능력'),
  (8, 1, 3, 'Manager Park', '양호함');
