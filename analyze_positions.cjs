const XLSX = require('xlsx');

// Worker 엑셀 파일 읽기
const workbook = XLSX.readFile('worker_template.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

// Position 고유값 추출
const positions = new Set();
jsonData.forEach(row => {
    const pos = row['Position'];
    if (pos !== null && pos !== undefined && pos !== '') {
        positions.add(String(pos).trim());
    }
});

console.log('📊 Position 컬럼의 모든 고유값 (알파벳 순):\n');
console.log(`총 ${positions.size}개\n`);

const sortedPositions = Array.from(positions).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
);

sortedPositions.forEach((pos, index) => {
    const count = jsonData.filter(row => String(row['Position']).trim() === pos).length;
    console.log(`${String(index + 1).padStart(2, ' ')}. "${pos}" (${count}건)`);
});

// Team별 Position 분포
console.log('\n\n📊 Team별 Position 분포:\n');

const teams = new Set();
jsonData.forEach(row => {
    const team = row['Team'];
    if (team !== null && team !== undefined && team !== '') {
        teams.add(String(team).trim());
    }
});

Array.from(teams).sort().forEach(team => {
    console.log(`\n[${team}]`);
    const teamPositions = new Set();
    jsonData.filter(row => String(row['Team']).trim() === team).forEach(row => {
        const pos = row['Position'];
        if (pos !== null && pos !== undefined && pos !== '') {
            teamPositions.add(String(pos).trim());
        }
    });
    
    Array.from(teamPositions).sort((a, b) => 
        a.toLowerCase().localeCompare(b.toLowerCase())
    ).forEach(pos => {
        const count = jsonData.filter(row => 
            String(row['Team']).trim() === team && 
            String(row['Position']).trim() === pos
        ).length;
        console.log(`  - ${pos} (${count}명)`);
    });
});
