const XLSX = require('xlsx');

// 엑셀 파일 읽기
const workbook = XLSX.readFile('assessment_data.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// JSON으로 변환
const jsonData = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 총 행 수:', jsonData.length);
console.log('\n📋 첫 3개 행의 전체 데이터:');
console.log(JSON.stringify(jsonData.slice(0, 3), null, 2));

console.log('\n📅 날짜 컬럼 분석 (첫 10개 행):');
jsonData.slice(0, 10).forEach((row, index) => {
    const dateValue = row['평가일자'];
    console.log(`행 ${index + 1}:`, {
        원본값: dateValue,
        타입: typeof dateValue,
        isNumber: typeof dateValue === 'number',
        isString: typeof dateValue === 'string',
        value: dateValue
    });
});

console.log('\n📊 컬럼 이름 목록:');
console.log(Object.keys(jsonData[0]));
