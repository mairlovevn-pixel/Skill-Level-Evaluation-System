const XLSX = require('xlsx');

// Worker 엑셀 파일 읽기
const workbook = XLSX.readFile('worker_template.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

console.log('📊 Worker 엑셀 파일 분석');
console.log('총 행 수:', jsonData.length);
console.log('\n📋 컬럼 목록:');
const columns = Object.keys(jsonData[0]);
columns.forEach((col, index) => {
    console.log(`${index + 1}. "${col}"`);
});

console.log('\n\n🔍 각 컬럼의 고유값 분석:\n');

// 각 컬럼별 고유값 분석
columns.forEach(col => {
    const uniqueValues = new Set();
    jsonData.forEach(row => {
        const value = row[col];
        if (value !== null && value !== undefined && value !== '') {
            uniqueValues.add(String(value).trim());
        }
    });
    
    console.log(`\n📌 컬럼: "${col}"`);
    console.log(`   고유값 개수: ${uniqueValues.size}개`);
    
    // 고유값이 50개 이하면 전체 출력
    if (uniqueValues.size <= 50) {
        const sortedValues = Array.from(uniqueValues).sort((a, b) => {
            // 숫자면 숫자로 정렬, 아니면 문자열로 정렬
            const aNum = Number(a);
            const bNum = Number(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        
        console.log('   값 목록:');
        sortedValues.forEach(val => {
            // 해당 값이 몇 건인지 카운트
            const count = jsonData.filter(row => String(row[col]).trim() === val).length;
            console.log(`      - "${val}" (${count}건)`);
        });
    } else {
        console.log('   (고유값이 50개를 초과하여 샘플만 표시)');
        const sample = Array.from(uniqueValues).slice(0, 10);
        sample.forEach(val => {
            console.log(`      - "${val}"`);
        });
        console.log('      ...');
    }
});

// 샘플 데이터 3개 출력
console.log('\n\n📄 샘플 데이터 (첫 3개 행):');
jsonData.slice(0, 3).forEach((row, index) => {
    console.log(`\n[행 ${index + 1}]`);
    Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: "${value}"`);
    });
});
