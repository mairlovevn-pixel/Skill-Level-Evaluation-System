const XLSX = require('xlsx');

// Assessment 엑셀 파일 읽기
const workbook = XLSX.readFile('assessment_data.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

// 프로세스명 추출 (중복 제거)
const processNames = new Set();
jsonData.forEach(row => {
    const processName = row['프로세스'];
    if (processName) {
        processNames.add(String(processName).trim());
    }
});

console.log('📊 Assessment 엑셀 파일에서 발견된 프로세스명 (알파벳 순):');
console.log('총', processNames.size, '개의 고유한 프로세스명\n');

const sortedProcesses = Array.from(processNames).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

sortedProcesses.forEach((name, index) => {
    console.log(`${index + 1}. "${name}"`);
});

// 대소문자 변형 분석
console.log('\n\n🔍 대소문자 및 공백 변형 분석:');
const normalized = {};
sortedProcesses.forEach(name => {
    const key = name.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!normalized[key]) {
        normalized[key] = [];
    }
    normalized[key].push(name);
});

Object.entries(normalized).forEach(([key, variants]) => {
    if (variants.length > 1) {
        console.log(`\n"${key}" 의 변형들:`);
        variants.forEach(v => console.log(`  - "${v}"`));
    }
});
