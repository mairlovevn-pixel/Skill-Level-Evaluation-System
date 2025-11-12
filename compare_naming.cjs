const XLSX = require('xlsx');

// Worker 엑셀에서 Position 추출
const workbook = XLSX.readFile('worker_template.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

const excelPositions = new Set();
jsonData.forEach(row => {
    const pos = row['Position'];
    if (pos) excelPositions.add(String(pos).trim());
});

// DB processes (위에서 조회한 결과)
const dbProcesses = [
    'Bending', 'Beveling', 'Blasting', 'Bracket FU', 'Bracket Weld',
    'CS Welding', 'Cutting', 'DF FU', 'DF Weld', 'Drilling',
    'EHS', 'Electrical', 'Fit Up', 'Flatness', 'IM_Mounting Final (QIF)',
    'LS Welding', 'MAINTENANCE', 'Material Handler_IM', 'Material Handling',
    'Mechanical', 'Metalizing', 'Paint', 'Paint ring', 'TRANSPORTATION',
    'UT repair', 'VTMT', 'WH_Kitset'
];

// Assessment 엑셀에서 프로세스 추출
const assessmentWorkbook = XLSX.readFile('assessment_data.xlsx');
const assessmentWorksheet = assessmentWorkbook.Sheets[assessmentWorkbook.SheetNames[0]];
const assessmentData = XLSX.utils.sheet_to_json(assessmentWorksheet);

const assessmentProcesses = new Set();
assessmentData.forEach(row => {
    const proc = row['프로세스'];
    if (proc) assessmentProcesses.add(String(proc).trim());
});

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║                   워딩 비교 분석 리포트                        ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('📊 데이터 소스별 개수:');
console.log(`   - Worker 엑셀 (Position): ${excelPositions.size}개`);
console.log(`   - DB (processes 테이블): ${dbProcesses.length}개`);
console.log(`   - Assessment 엑셀 (프로세스): ${assessmentProcesses.size}개`);

console.log('\n\n🔍 유사한 워딩 그룹핑:\n');

// 유사 항목들을 그룹핑
const groups = [
    {
        name: 'Beveling/Bevelling',
        items: {
            db: ['Beveling'],
            excel: ['Bevelling'],
            assessment: ['bevel']
        }
    },
    {
        name: 'Bracket Weld',
        items: {
            db: ['Bracket Weld'],
            excel: ['Bracket WELD', 'Bracket Weld'],
            assessment: []
        }
    },
    {
        name: 'Door Frame (DF)',
        items: {
            db: ['DF FU', 'DF Weld'],
            excel: ['Door Frame FU', 'Door Frame WELD'],
            assessment: []
        }
    },
    {
        name: 'Fit-up/Fit Up',
        items: {
            db: ['Fit Up'],
            excel: ['Fit-up'],
            assessment: []
        }
    },
    {
        name: 'Flatness',
        items: {
            db: ['Flatness'],
            excel: ['Flatness Repair'],
            assessment: []
        }
    },
    {
        name: 'LS Welding',
        items: {
            db: ['LS Welding'],
            excel: ['LS Welding', 'LS welding'],
            assessment: []
        }
    },
    {
        name: 'UT repair/Repair',
        items: {
            db: ['UT repair'],
            excel: ['UT repair', 'UT Repair'],
            assessment: []
        }
    },
    {
        name: 'VT/MT',
        items: {
            db: ['VTMT'],
            excel: ['VT/MT'],
            assessment: []
        }
    },
    {
        name: 'Material Handler IM',
        items: {
            db: ['Material Handler_IM'],
            excel: ['Material Handler-IM'],
            assessment: []
        }
    },
    {
        name: 'Paint Ring',
        items: {
            db: ['Paint ring'],
            excel: ['Paint Ring', 'Fitting paint ring'],
            assessment: []
        }
    },
    {
        name: 'Cutting',
        items: {
            db: ['Cutting'],
            excel: ['Cutting'],
            assessment: ['CNC Cutting']
        }
    },
    {
        name: 'CS Welding',
        items: {
            db: ['CS Welding'],
            excel: ['CS Welding'],
            assessment: ['CS Welding']
        }
    },
    {
        name: 'Warehouse Kitset',
        items: {
            db: ['WH_Kitset'],
            excel: ['Warehouse-Kitset', 'Warehouse-IM', 'Warehouse BT/WT', 'Warehouse WT'],
            assessment: []
        }
    }
];

groups.forEach((group, index) => {
    console.log(`${index + 1}. ${group.name}`);
    console.log(`   DB:         ${group.items.db.length > 0 ? group.items.db.map(x => `"${x}"`).join(', ') : '(없음)'}`);
    console.log(`   Worker:     ${group.items.excel.length > 0 ? group.items.excel.map(x => `"${x}"`).join(', ') : '(없음)'}`);
    console.log(`   Assessment: ${group.items.assessment.length > 0 ? group.items.assessment.map(x => `"${x}"`).join(', ') : '(없음)'}`);
    console.log('');
});

console.log('\n📋 Worker 엑셀에만 있는 Position (DB/Assessment에 없음):');
const workerOnly = Array.from(excelPositions).filter(pos => {
    const lower = pos.toLowerCase();
    return !dbProcesses.some(db => db.toLowerCase() === lower);
}).sort();

workerOnly.forEach(pos => {
    const count = jsonData.filter(row => String(row['Position']).trim() === pos).length;
    console.log(`   - "${pos}" (${count}명)`);
});
