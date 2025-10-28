// 모든 테스트 결과에 대한 답안 데이터 생성 스크립트
// Node.js로 실행하여 SQL 파일 생성

const fs = require('fs');

// 테스트 결과 점수 목록 (generate_test_results.sql에서 사용한 점수들)
const testResults = [
  // Cutting (result_id 1-34)
  { id: 1, processId: 1, score: 96.7, startQuizId: 1 },
  { id: 2, processId: 1, score: 93.3, startQuizId: 1 },
  { id: 3, processId: 1, score: 90.0, startQuizId: 1 },
  { id: 4, processId: 1, score: 90.0, startQuizId: 1 },
  { id: 5, processId: 1, score: 90.0, startQuizId: 1 },
  { id: 6, processId: 1, score: 86.7, startQuizId: 1 },
  { id: 7, processId: 1, score: 86.7, startQuizId: 1 },
  { id: 8, processId: 1, score: 83.3, startQuizId: 1 },
  { id: 9, processId: 1, score: 83.3, startQuizId: 1 },
  { id: 10, processId: 1, score: 80.0, startQuizId: 1 },
  { id: 11, processId: 1, score: 80.0, startQuizId: 1 },
  { id: 12, processId: 1, score: 80.0, startQuizId: 1 },
  { id: 13, processId: 1, score: 76.7, startQuizId: 1 },
  { id: 14, processId: 1, score: 76.7, startQuizId: 1 },
  { id: 15, processId: 1, score: 73.3, startQuizId: 1 },
  { id: 16, processId: 1, score: 73.3, startQuizId: 1 },
  { id: 17, processId: 1, score: 73.3, startQuizId: 1 },
  { id: 18, processId: 1, score: 70.0, startQuizId: 1 },
  { id: 19, processId: 1, score: 70.0, startQuizId: 1 },
  { id: 20, processId: 1, score: 70.0, startQuizId: 1 },
  { id: 21, processId: 1, score: 66.7, startQuizId: 1 },
  { id: 22, processId: 1, score: 66.7, startQuizId: 1 },
  { id: 23, processId: 1, score: 63.3, startQuizId: 1 },
  { id: 24, processId: 1, score: 63.3, startQuizId: 1 },
  { id: 25, processId: 1, score: 60.0, startQuizId: 1 },
  { id: 26, processId: 1, score: 56.7, startQuizId: 1 },
  { id: 27, processId: 1, score: 56.7, startQuizId: 1 },
  { id: 28, processId: 1, score: 53.3, startQuizId: 1 },
  { id: 29, processId: 1, score: 53.3, startQuizId: 1 },
  { id: 30, processId: 1, score: 50.0, startQuizId: 1 },
  { id: 31, processId: 1, score: 50.0, startQuizId: 1 },
  { id: 32, processId: 1, score: 46.7, startQuizId: 1 },
  { id: 33, processId: 1, score: 43.3, startQuizId: 1 },
  { id: 34, processId: 1, score: 40.0, startQuizId: 1 },
  
  // Beveling (result_id 35-68)
  { id: 35, processId: 2, score: 96.7, startQuizId: 31 },
  { id: 36, processId: 2, score: 93.3, startQuizId: 31 },
  { id: 37, processId: 2, score: 90.0, startQuizId: 31 },
  { id: 38, processId: 2, score: 90.0, startQuizId: 31 },
  { id: 39, processId: 2, score: 90.0, startQuizId: 31 },
  { id: 40, processId: 2, score: 86.7, startQuizId: 31 },
  { id: 41, processId: 2, score: 86.7, startQuizId: 31 },
  { id: 42, processId: 2, score: 83.3, startQuizId: 31 },
  { id: 43, processId: 2, score: 83.3, startQuizId: 31 },
  { id: 44, processId: 2, score: 80.0, startQuizId: 31 },
  { id: 45, processId: 2, score: 80.0, startQuizId: 31 },
  { id: 46, processId: 2, score: 80.0, startQuizId: 31 },
  { id: 47, processId: 2, score: 76.7, startQuizId: 31 },
  { id: 48, processId: 2, score: 76.7, startQuizId: 31 },
  { id: 49, processId: 2, score: 73.3, startQuizId: 31 },
  { id: 50, processId: 2, score: 73.3, startQuizId: 31 },
  { id: 51, processId: 2, score: 73.3, startQuizId: 31 },
  { id: 52, processId: 2, score: 70.0, startQuizId: 31 },
  { id: 53, processId: 2, score: 70.0, startQuizId: 31 },
  { id: 54, processId: 2, score: 70.0, startQuizId: 31 },
  { id: 55, processId: 2, score: 66.7, startQuizId: 31 },
  { id: 56, processId: 2, score: 66.7, startQuizId: 31 },
  { id: 57, processId: 2, score: 63.3, startQuizId: 31 },
  { id: 58, processId: 2, score: 63.3, startQuizId: 31 },
  { id: 59, processId: 2, score: 60.0, startQuizId: 31 },
  { id: 60, processId: 2, score: 56.7, startQuizId: 31 },
  { id: 61, processId: 2, score: 56.7, startQuizId: 31 },
  { id: 62, processId: 2, score: 53.3, startQuizId: 31 },
  { id: 63, processId: 2, score: 53.3, startQuizId: 31 },
  { id: 64, processId: 2, score: 50.0, startQuizId: 31 },
  { id: 65, processId: 2, score: 50.0, startQuizId: 31 },
  { id: 66, processId: 2, score: 46.7, startQuizId: 31 },
  { id: 67, processId: 2, score: 43.3, startQuizId: 31 },
  { id: 68, processId: 2, score: 40.0, startQuizId: 31 }
];

const TOTAL_QUESTIONS = 30;
const CORRECT_ANSWER = 'A'; // 모든 문제의 정답을 A로 가정
const WRONG_ANSWER = 'B';

// 실제 quiz ID 목록
const CUTTING_QUIZ_IDS = [1,2,3,4,5,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35];
const BEVELING_QUIZ_IDS = [6,7,8,9,10,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60];

function generateAnswers() {
  let sql = '-- 모든 테스트 결과에 대한 답안 데이터 생성\n\n';
  
  testResults.forEach(result => {
    const correctCount = Math.round((result.score / 100) * TOTAL_QUESTIONS);
    const wrongCount = TOTAL_QUESTIONS - correctCount;
    
    // 프로세스에 따라 적절한 quiz ID 목록 선택
    const quizIds = result.processId === 1 ? CUTTING_QUIZ_IDS : BEVELING_QUIZ_IDS;
    
    sql += `-- Result ID ${result.id}: score ${result.score} (${correctCount}/${TOTAL_QUESTIONS} correct)\n`;
    sql += 'INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct) VALUES\n';
    
    const answers = [];
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      const quizId = quizIds[i];
      // 앞부분에 정답을 많이 배치하고, 뒷부분에 오답 배치 (카테고리별 고른 분포)
      const isCorrect = i < correctCount ? 1 : 0;
      const selectedAnswer = isCorrect ? CORRECT_ANSWER : WRONG_ANSWER;
      
      // 오답을 각 카테고리에 골고루 분산 (6문제씩 5개 카테고리)
      // 단순화를 위해 순차적으로 배치하되 마지막에 오답 집중
      let actualIsCorrect = isCorrect;
      let actualAnswer = selectedAnswer;
      
      // 오답을 카테고리별로 분산 (각 카테고리당 wrongCount/5개씩)
      const categoryIndex = Math.floor(i / 6); // 0-4 카테고리
      const positionInCategory = i % 6;
      const wrongPerCategory = Math.ceil(wrongCount / 5);
      
      if (positionInCategory >= (6 - wrongPerCategory)) {
        actualIsCorrect = 0;
        actualAnswer = WRONG_ANSWER;
      } else if (correctCount > 0) {
        actualIsCorrect = 1;
        actualAnswer = CORRECT_ANSWER;
      }
      
      answers.push(`(${result.id}, ${quizId}, '${actualAnswer}', ${actualIsCorrect})`);
    }
    
    sql += answers.join(',\n');
    sql += ';\n\n';
  });
  
  return sql;
}

const sqlContent = generateAnswers();
fs.writeFileSync('generated_test_answers.sql', sqlContent);
console.log('✓ generated_test_answers.sql 파일이 생성되었습니다.');
console.log(`✓ 총 ${testResults.length}개 테스트 결과에 대한 답안 데이터 (${testResults.length * 30}개 답안)`);
