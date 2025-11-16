-- Worker 227 (Employee ID 1412 - Bùi Trọng Ngãi) 평가 데이터 초기화 및 재입력

-- Step 1: 모든 기존 평가 데이터 삭제
DELETE FROM supervisor_assessments WHERE worker_id = 227;

-- 삭제 확인
SELECT 'Deleted all assessments for worker 227' as status;
