// DB에서 실제 데이터를 가져와서 답안 생성
const { execSync } = require('child_process');
const fs = require('fs');

const CUTTING_QUIZ_IDS = [1,2,3,4,5,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35];
const BEVELING_QUIZ_IDS = [6,7,8,9,10,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60];
const TOTAL_QUESTIONS = 30;
const CORRECT_ANSWER = 'A';
const WRONG_ANSWER = 'B';

// DB에서 테스트 결과 가져오기
const cmd = 'npx wrangler d1 execute webapp-production --local --command="SELECT id, process_id, score FROM written_test_results ORDER BY id" --json';
const output = execSync(cmd, { cwd: '/home/user/webapp' }).toString();

// JSON 파싱 (wrangler 출력에서 results 추출)
const lines = output.split('\n');
const jsonStart = lines.findIndex(line => line.includes('['));
const jsonStr = lines.slice(jsonStart).join('\n');
const data = JSON.parse(jsonStr);
const results = data[0].results;

console.log(`✓ ${results.length}개의 테스트 결과를 찾았습니다.`);

let sql = '-- 실제 DB 데이터 기반 답안 생성\n\n';

results.forEach(result => {
  const correctCount = Math.round((result.score / 100) * TOTAL_QUESTIONS);
  const quizIds = result.process_id === 1 ? CUTTING_QUIZ_IDS : BEVELING_QUIZ_IDS;
  
  sql += `-- Result ID ${result.id}: Process ${result.process_id}, Score ${result.score} (${correctCount}/${TOTAL_QUESTIONS} correct)\n`;
  sql += 'INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct) VALUES\n';
  
  const answers = [];
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const quizId = quizIds[i];
    
    // 카테고리별로 고르게 오답 분산 (6문제씩 5개 카테고리)
    const categoryIndex = Math.floor(i / 6);
    const wrongPerCategory = Math.ceil((TOTAL_QUESTIONS - correctCount) / 5);
    const positionInCategory = i % 6;
    
    let isCorrect = 1;
    let selectedAnswer = CORRECT_ANSWER;
    
    // 각 카테고리 마지막 문제들을 오답으로 (고르게 분산)
    if (positionInCategory >= (6 - wrongPerCategory) && (i >= TOTAL_QUESTIONS - (TOTAL_QUESTIONS - correctCount))) {
      isCorrect = 0;
      selectedAnswer = WRONG_ANSWER;
    }
    
    answers.push(`(${result.id}, ${quizId}, '${selectedAnswer}', ${isCorrect})`);
  }
  
  sql += answers.join(',\n');
  sql += ';\n\n';
});

fs.writeFileSync('generated_test_answers_from_db.sql', sql);
console.log('✓ generated_test_answers_from_db.sql 파일이 생성되었습니다.');
console.log(`✓ 총 ${results.length}개 테스트 결과에 대한 답안 데이터 (${results.length * 30}개 답안)`);
