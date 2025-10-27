// 전역 변수
let currentPage = 'dashboard';
let dashboardData = null;
let processes = [];
let workers = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadProcesses();
    loadWorkers();
    showPage('dashboard');
});

// 페이지 전환
function showPage(pageName) {
    currentPage = pageName;
    const app = document.getElementById('app');
    
    switch(pageName) {
        case 'dashboard':
            app.innerHTML = getDashboardHTML();
            loadDashboard();
            break;
        case 'quiz-upload':
            app.innerHTML = getQuizUploadHTML();
            loadQuizUploadPage();
            break;
        case 'assessment-upload':
            app.innerHTML = getAssessmentUploadHTML();
            break;
        case 'worker-upload':
            app.innerHTML = getWorkerUploadHTML();
            break;
        case 'test-page':
            app.innerHTML = getTestPageHTML();
            loadTestPage();
            break;
    }
}

// 프로세스 목록 로드
async function loadProcesses() {
    try {
        const response = await axios.get('/api/processes');
        processes = response.data;
    } catch (error) {
        console.error('프로세스 로드 실패:', error);
    }
}

// 작업자 목록 로드
async function loadWorkers() {
    try {
        const response = await axios.get('/api/workers');
        workers = response.data;
    } catch (error) {
        console.error('작업자 로드 실패:', error);
    }
}

// ==================== 대시보드 페이지 ====================

function getDashboardHTML() {
    return `
        <div class="space-y-6">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-chart-bar mr-2"></i>
                Skill Level 평가 요약
            </h2>
            
            <!-- 요약 카드 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">전체 작업자 수</p>
                            <p id="total-workers" class="text-3xl font-bold text-blue-600">-</p>
                        </div>
                        <i class="fas fa-users text-4xl text-blue-200"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Written Test 응시자</p>
                            <p id="test-takers" class="text-3xl font-bold text-green-600">-</p>
                        </div>
                        <i class="fas fa-clipboard-list text-4xl text-green-200"></i>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-500 text-sm">Written Test 합격자</p>
                            <p id="test-passed" class="text-3xl font-bold text-purple-600">-</p>
                        </div>
                        <i class="fas fa-check-circle text-4xl text-purple-200"></i>
                    </div>
                </div>
            </div>
            
            <!-- Written Test 현황 차트 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-chart-bar mr-2"></i>
                        프로세스별 Written Test 현황
                    </h3>
                    <canvas id="test-status-chart"></canvas>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-chart-column mr-2"></i>
                        프로세스별 평균 점수
                    </h3>
                    <canvas id="avg-score-chart"></canvas>
                </div>
            </div>
            
            <!-- Supervisor Assessment 현황 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-star mr-2"></i>
                    Level별 법인 현황 (Supervisor Assessment)
                </h3>
                <canvas id="assessment-chart"></canvas>
            </div>
        </div>
    `;
}

async function loadDashboard() {
    try {
        const response = await axios.get('/api/dashboard/stats');
        dashboardData = response.data;
        
        // 요약 카드 업데이트
        document.getElementById('total-workers').textContent = dashboardData.total_workers;
        document.getElementById('test-takers').textContent = dashboardData.written_test_takers;
        document.getElementById('test-passed').textContent = dashboardData.written_test_passed;
        
        // 차트 렌더링
        renderTestStatusChart();
        renderAvgScoreChart();
        renderAssessmentChart();
    } catch (error) {
        console.error('대시보드 로드 실패:', error);
        alert('대시보드 데이터를 불러오는데 실패했습니다.');
    }
}

function renderTestStatusChart() {
    const ctx = document.getElementById('test-status-chart');
    const data = dashboardData.written_test_by_process;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.process_name),
            datasets: [
                {
                    label: '응시자',
                    data: data.map(d => d.takers),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                },
                {
                    label: '합격자',
                    data: data.map(d => d.passed),
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function renderAvgScoreChart() {
    const ctx = document.getElementById('avg-score-chart');
    const data = dashboardData.avg_score_by_process;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.process_name),
            datasets: [{
                label: '평균 점수',
                data: data.map(d => parseFloat(d.avg_score).toFixed(1)),
                backgroundColor: 'rgba(168, 85, 247, 0.6)',
                borderColor: 'rgba(168, 85, 247, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function renderAssessmentChart() {
    const ctx = document.getElementById('assessment-chart');
    const data = dashboardData.supervisor_assessment_by_level;
    
    // 법인별로 그룹화
    const entities = [...new Set(data.map(d => d.entity))];
    const levels = [...new Set(data.map(d => d.level))].sort();
    
    const datasets = entities.map((entity, index) => {
        const colors = [
            'rgba(239, 68, 68, 0.6)',
            'rgba(59, 130, 246, 0.6)',
            'rgba(34, 197, 94, 0.6)',
            'rgba(234, 179, 8, 0.6)',
            'rgba(168, 85, 247, 0.6)'
        ];
        
        return {
            label: entity,
            data: levels.map(level => {
                const item = data.find(d => d.entity === entity && d.level === level);
                return item ? item.count : 0;
            }),
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length].replace('0.6', '1'),
            borderWidth: 1
        };
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: levels.map(l => `Level ${l}`),
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ==================== Quiz 등록 페이지 ====================

function loadQuizUploadPage() {
    // 프로세스 목록 로드
    const processSelect = document.getElementById('quiz-process-select');
    if (processSelect) {
        processSelect.innerHTML = '<option value="">프로세스를 선택하세요</option>';
        processes.forEach(process => {
            const option = document.createElement('option');
            option.value = process.id;
            option.textContent = process.name;
            processSelect.appendChild(option);
        });
    }
}

function getQuizUploadHTML() {
    return `
        <div class="bg-white rounded-lg shadow-md p-8">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-question-circle mr-2"></i>
                Written Test Quiz 등록
            </h2>
            
            <div class="mb-6">
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p class="text-sm text-blue-700 mb-2">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>지원 형식 1:</strong> Process ID, Question, Option A, Option B, Option C, Option D, Correct Answer
                    </p>
                    <p class="text-sm text-blue-700">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>지원 형식 2:</strong> 번호, 질문, 1), 2), 3), 4), 정답 (자동 변환됨)
                    </p>
                </div>
                
                <div class="mb-4">
                    <label class="block text-gray-700 font-semibold mb-2">
                        프로세스 선택 (형식 2 사용 시 필수)
                    </label>
                    <select id="quiz-process-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">프로세스를 선택하세요</option>
                    </select>
                </div>
                
                <label class="block text-gray-700 font-semibold mb-2">
                    엑셀 파일 선택
                </label>
                <input type="file" id="quiz-file" accept=".xlsx,.xls" 
                       class="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100
                              cursor-pointer">
            </div>
            
            <div class="mb-6">
                <button onclick="downloadQuizTemplate()" 
                        class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition">
                    <i class="fas fa-download mr-2"></i>
                    템플릿 다운로드
                </button>
            </div>
            
            <button onclick="uploadQuizzes()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                <i class="fas fa-upload mr-2"></i>
                퀴즈 업로드
            </button>
        </div>
    `;
}

function downloadQuizTemplate() {
    const wb = XLSX.utils.book_new();
    const ws_data = [
        ['Process ID', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer'],
        [1, '샘플 질문입니다?', '옵션 A', '옵션 B', '옵션 C', '옵션 D', 'A']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Quizzes');
    XLSX.writeFile(wb, 'quiz_template.xlsx');
}

async function uploadQuizzes() {
    const fileInput = document.getElementById('quiz-file');
    if (!fileInput.files.length) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet);
            
            if (rows.length === 0) {
                alert('엑셀 파일에 데이터가 없습니다.');
                return;
            }
            
            // 첫 번째 행의 컬럼 확인하여 형식 감지
            const firstRow = rows[0];
            let quizzes = [];
            
            // 형식 1: Process ID, Question, Option A, Option B, Option C, Option D, Correct Answer
            if (firstRow.hasOwnProperty('Process ID') && firstRow.hasOwnProperty('Question')) {
                quizzes = rows.map(row => ({
                    process_id: row['Process ID'],
                    question: row['Question'],
                    option_a: row['Option A'],
                    option_b: row['Option B'],
                    option_c: row['Option C'] || '',
                    option_d: row['Option D'] || '',
                    correct_answer: row['Correct Answer']
                }));
            }
            // 형식 2: 번호, 질문, 1), 2), 3), 4), 정답
            else if (firstRow.hasOwnProperty('번호') && firstRow.hasOwnProperty('질문')) {
                const processSelect = document.getElementById('quiz-process-select');
                const processId = processSelect.value;
                
                if (!processId) {
                    alert('프로세스를 선택해주세요. (형식 2 사용 시 필수)');
                    return;
                }
                
                quizzes = rows.map(row => {
                    // 정답 매핑: A/B/C/D 형식으로 변환
                    let correctAnswer = row['정답'];
                    if (correctAnswer && typeof correctAnswer === 'string') {
                        correctAnswer = correctAnswer.trim().toUpperCase();
                        // 만약 정답이 숫자면 변환 (1->A, 2->B, 3->C, 4->D)
                        if (['1', '2', '3', '4'].includes(correctAnswer)) {
                            const mapping = {'1': 'A', '2': 'B', '3': 'C', '4': 'D'};
                            correctAnswer = mapping[correctAnswer];
                        }
                    }
                    
                    return {
                        process_id: parseInt(processId),
                        question: row['질문'],
                        option_a: row['1)'] || '',
                        option_b: row['2)'] || '',
                        option_c: row['3)'] || '',
                        option_d: row['4)'] || '',
                        correct_answer: correctAnswer
                    };
                });
            } else {
                alert('지원하지 않는 엑셀 파일 형식입니다.\n\n지원 형식:\n1. Process ID, Question, Option A, Option B, Option C, Option D, Correct Answer\n2. 번호, 질문, 1), 2), 3), 4), 정답');
                return;
            }
            
            // 데이터 검증
            for (let i = 0; i < quizzes.length; i++) {
                const quiz = quizzes[i];
                if (!quiz.process_id || !quiz.question || !quiz.option_a || !quiz.option_b || !quiz.correct_answer) {
                    alert(`${i + 1}번째 행에 필수 항목이 누락되었습니다.`);
                    return;
                }
                if (!['A', 'B', 'C', 'D'].includes(quiz.correct_answer)) {
                    alert(`${i + 1}번째 행의 정답이 올바르지 않습니다. (A, B, C, D 중 하나여야 합니다)`);
                    return;
                }
            }
            
            const response = await axios.post('/api/quizzes/bulk', quizzes);
            alert(`${response.data.count}개의 퀴즈가 성공적으로 등록되었습니다.`);
            fileInput.value = '';
            if (document.getElementById('quiz-process-select')) {
                document.getElementById('quiz-process-select').value = '';
            }
        } catch (error) {
            console.error('퀴즈 업로드 실패:', error);
            alert('퀴즈 업로드에 실패했습니다.\n\n오류: ' + (error.response?.data?.error || error.message));
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// ==================== Assessment 등록 페이지 ====================

function getAssessmentUploadHTML() {
    return `
        <div class="bg-white rounded-lg shadow-md p-8">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-clipboard-check mr-2"></i>
                Supervisor Assessment 항목 등록
            </h2>
            
            <div class="mb-6">
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p class="text-sm text-blue-700">
                        <i class="fas fa-info-circle mr-2"></i>
                        엑셀 파일 형식: Category, Item Name, Description
                    </p>
                </div>
                
                <label class="block text-gray-700 font-semibold mb-2">
                    엑셀 파일 선택
                </label>
                <input type="file" id="assessment-file" accept=".xlsx,.xls" 
                       class="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100
                              cursor-pointer">
            </div>
            
            <div class="mb-6">
                <button onclick="downloadAssessmentTemplate()" 
                        class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition">
                    <i class="fas fa-download mr-2"></i>
                    템플릿 다운로드
                </button>
            </div>
            
            <button onclick="uploadAssessmentItems()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                <i class="fas fa-upload mr-2"></i>
                평가 항목 업로드
            </button>
        </div>
    `;
}

function downloadAssessmentTemplate() {
    const wb = XLSX.utils.book_new();
    const ws_data = [
        ['Category', 'Item Name', 'Description'],
        ['기술 능력', '작업 숙련도', '작업 과정의 숙련 정도']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Assessment Items');
    XLSX.writeFile(wb, 'assessment_template.xlsx');
}

async function uploadAssessmentItems() {
    const fileInput = document.getElementById('assessment-file');
    if (!fileInput.files.length) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet);
            
            const items = rows.map(row => ({
                category: row['Category'],
                item_name: row['Item Name'],
                description: row['Description'] || ''
            }));
            
            const response = await axios.post('/api/assessment-items/bulk', items);
            alert(`${response.data.count}개의 평가 항목이 성공적으로 등록되었습니다.`);
            fileInput.value = '';
        } catch (error) {
            console.error('평가 항목 업로드 실패:', error);
            alert('평가 항목 업로드에 실패했습니다.');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// ==================== 작업자 등록 페이지 ====================

function getWorkerUploadHTML() {
    return `
        <div class="bg-white rounded-lg shadow-md p-8">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-users mr-2"></i>
                작업자 현황 등록
            </h2>
            
            <div class="mb-6">
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p class="text-sm text-blue-700 mb-2">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>지원 형식 1:</strong> No, Entity, Name, Employee ID, Team, Position, Start to work date
                    </p>
                    <p class="text-sm text-blue-700">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>지원 형식 2:</strong> Name, Employee ID, Company, Department, Position, start to work (자동 변환됨)
                    </p>
                </div>
                
                <label class="block text-gray-700 font-semibold mb-2">
                    엑셀 파일 선택
                </label>
                <input type="file" id="worker-file" accept=".xlsx,.xls" 
                       class="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-semibold
                              file:bg-blue-50 file:text-blue-700
                              hover:file:bg-blue-100
                              cursor-pointer">
            </div>
            
            <div class="mb-6">
                <button onclick="downloadWorkerTemplate()" 
                        class="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition">
                    <i class="fas fa-download mr-2"></i>
                    템플릿 다운로드
                </button>
            </div>
            
            <button onclick="uploadWorkers()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                <i class="fas fa-upload mr-2"></i>
                작업자 업로드
            </button>
        </div>
    `;
}

function downloadWorkerTemplate() {
    const wb = XLSX.utils.book_new();
    const ws_data = [
        ['No', 'Entity', 'Name', 'Employee ID', 'Team', 'Position', 'Start to work date'],
        [1, 'Seoul HQ', '김철수', 'EMP001', 'Assembly Team', 'Operator', '2023-01-15']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, 'Workers');
    XLSX.writeFile(wb, 'worker_template.xlsx');
}

async function uploadWorkers() {
    const fileInput = document.getElementById('worker-file');
    if (!fileInput.files.length) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet);
            
            if (rows.length === 0) {
                alert('엑셀 파일에 데이터가 없습니다.');
                return;
            }
            
            // 첫 번째 행의 컬럼 확인하여 형식 감지
            const firstRow = rows[0];
            let workers = [];
            
            // 형식 1: No, Entity, Name, Employee ID, Team, Position, Start to work date
            if (firstRow.hasOwnProperty('Entity') && firstRow.hasOwnProperty('Team')) {
                workers = rows.map(row => {
                    // 날짜 처리
                    let startDate = row['Start to work date'];
                    if (startDate instanceof Date) {
                        startDate = startDate.toISOString().split('T')[0];
                    } else if (typeof startDate === 'number') {
                        // Excel 날짜 시리얼 번호를 JavaScript Date로 변환
                        const excelEpoch = new Date(1899, 11, 30);
                        const jsDate = new Date(excelEpoch.getTime() + startDate * 86400000);
                        startDate = jsDate.toISOString().split('T')[0];
                    }
                    
                    return {
                        employee_id: String(row['Employee ID'] || ''),
                        name: String(row['Name'] || ''),
                        entity: String(row['Entity'] || ''),
                        team: String(row['Team'] || ''),
                        position: String(row['Position'] || ''),
                        start_to_work_date: String(startDate || '')
                    };
                });
            }
            // 형식 2: Name, Employee ID, Company, Department, Position, start to work
            else if (firstRow.hasOwnProperty('Company') && firstRow.hasOwnProperty('Department')) {
                workers = rows.map(row => {
                    // 날짜 처리
                    let startDate = row['start to work'];
                    if (startDate instanceof Date) {
                        startDate = startDate.toISOString().split('T')[0];
                    } else if (typeof startDate === 'number') {
                        // Excel 날짜 시리얼 번호를 JavaScript Date로 변환
                        const excelEpoch = new Date(1899, 11, 30);
                        const jsDate = new Date(excelEpoch.getTime() + startDate * 86400000);
                        startDate = jsDate.toISOString().split('T')[0];
                    }
                    
                    return {
                        employee_id: String(row['Employee ID'] || ''),
                        name: String(row['Name'] || ''),
                        entity: String(row['Company'] || ''),  // Company -> Entity
                        team: String(row['Department'] || ''),  // Department -> Team
                        position: String(row['Position'] || ''),
                        start_to_work_date: String(startDate || '')
                    };
                });
            } else {
                alert('지원하지 않는 엑셀 파일 형식입니다.\n\n지원 형식:\n1. No, Entity, Name, Employee ID, Team, Position, Start to work date\n2. Name, Employee ID, Company, Department, Position, start to work');
                return;
            }
            
            // 필수 항목 검증
            for (let i = 0; i < workers.length; i++) {
                const worker = workers[i];
                if (!worker.employee_id || !worker.name || !worker.entity || 
                    !worker.team || !worker.position || !worker.start_to_work_date) {
                    alert(`${i + 2}번째 행에 필수 항목이 누락되었습니다.\n누락된 항목을 확인해주세요.`);
                    return;
                }
            }
            
            const response = await axios.post('/api/workers/bulk', workers);
            alert(`${response.data.count}명의 작업자가 성공적으로 등록되었습니다.`);
            fileInput.value = '';
            loadWorkers(); // 작업자 목록 새로고침
        } catch (error) {
            console.error('작업자 업로드 실패:', error);
            alert('작업자 업로드에 실패했습니다.\n\n오류: ' + (error.response?.data?.error || error.message));
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// ==================== 시험 응시 페이지 ====================

function getTestPageHTML() {
    return `
        <div class="bg-white rounded-lg shadow-md p-8">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-pencil-alt mr-2"></i>
                Written Test 응시
            </h2>
            
            <div id="test-selection" class="space-y-4">
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">작업자 선택</label>
                    <select id="worker-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">작업자를 선택하세요</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">프로세스 선택</label>
                    <select id="process-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">프로세스를 선택하세요</option>
                    </select>
                </div>
                
                <button onclick="startTest()" 
                        class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                    <i class="fas fa-play mr-2"></i>
                    시험 시작
                </button>
            </div>
            
            <div id="test-content" class="hidden">
                <div id="quiz-container" class="space-y-6"></div>
                
                <button onclick="submitTest()" 
                        class="mt-6 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                    <i class="fas fa-check mr-2"></i>
                    제출하기
                </button>
            </div>
        </div>
    `;
}

let currentQuizzes = [];
let selectedAnswers = {};

async function loadTestPage() {
    // 작업자 목록 로드
    const workerSelect = document.getElementById('worker-select');
    workers.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.id;
        option.textContent = `${worker.name} (${worker.employee_id})`;
        workerSelect.appendChild(option);
    });
    
    // 프로세스 목록 로드
    const processSelect = document.getElementById('process-select');
    processes.forEach(process => {
        const option = document.createElement('option');
        option.value = process.id;
        option.textContent = process.name;
        processSelect.appendChild(option);
    });
}

async function startTest() {
    const workerId = document.getElementById('worker-select').value;
    const processId = document.getElementById('process-select').value;
    
    if (!workerId || !processId) {
        alert('작업자와 프로세스를 선택해주세요.');
        return;
    }
    
    try {
        const response = await axios.get(`/api/quizzes/${processId}`);
        currentQuizzes = response.data;
        
        if (currentQuizzes.length === 0) {
            alert('해당 프로세스에 등록된 퀴즈가 없습니다.');
            return;
        }
        
        selectedAnswers = {};
        document.getElementById('test-selection').classList.add('hidden');
        document.getElementById('test-content').classList.remove('hidden');
        
        renderQuizzes();
    } catch (error) {
        console.error('퀴즈 로드 실패:', error);
        alert('퀴즈를 불러오는데 실패했습니다.');
    }
}

function renderQuizzes() {
    const container = document.getElementById('quiz-container');
    container.innerHTML = '';
    
    currentQuizzes.forEach((quiz, index) => {
        const quizDiv = document.createElement('div');
        quizDiv.className = 'bg-gray-50 p-6 rounded-lg border border-gray-200';
        quizDiv.innerHTML = `
            <h3 class="font-bold text-lg mb-4">${index + 1}. ${quiz.question}</h3>
            <div class="space-y-2">
                <label class="flex items-center p-3 bg-white rounded-lg hover:bg-blue-50 cursor-pointer">
                    <input type="radio" name="quiz-${quiz.id}" value="A" 
                           onchange="selectAnswer(${quiz.id}, 'A')"
                           class="mr-3 w-4 h-4">
                    <span>A. ${quiz.option_a}</span>
                </label>
                <label class="flex items-center p-3 bg-white rounded-lg hover:bg-blue-50 cursor-pointer">
                    <input type="radio" name="quiz-${quiz.id}" value="B" 
                           onchange="selectAnswer(${quiz.id}, 'B')"
                           class="mr-3 w-4 h-4">
                    <span>B. ${quiz.option_b}</span>
                </label>
                ${quiz.option_c ? `
                    <label class="flex items-center p-3 bg-white rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="radio" name="quiz-${quiz.id}" value="C" 
                               onchange="selectAnswer(${quiz.id}, 'C')"
                               class="mr-3 w-4 h-4">
                        <span>C. ${quiz.option_c}</span>
                    </label>
                ` : ''}
                ${quiz.option_d ? `
                    <label class="flex items-center p-3 bg-white rounded-lg hover:bg-blue-50 cursor-pointer">
                        <input type="radio" name="quiz-${quiz.id}" value="D" 
                               onchange="selectAnswer(${quiz.id}, 'D')"
                               class="mr-3 w-4 h-4">
                        <span>D. ${quiz.option_d}</span>
                    </label>
                ` : ''}
            </div>
        `;
        container.appendChild(quizDiv);
    });
}

function selectAnswer(quizId, answer) {
    selectedAnswers[quizId] = answer;
}

async function submitTest() {
    const workerId = document.getElementById('worker-select').value;
    const processId = document.getElementById('process-select').value;
    
    // 모든 문제에 답했는지 확인
    if (Object.keys(selectedAnswers).length !== currentQuizzes.length) {
        alert('모든 문제에 답해주세요.');
        return;
    }
    
    // 채점
    let correctCount = 0;
    currentQuizzes.forEach(quiz => {
        if (selectedAnswers[quiz.id] === quiz.correct_answer) {
            correctCount++;
        }
    });
    
    const score = (correctCount / currentQuizzes.length) * 100;
    const passed = score >= 70; // 70점 이상 합격
    
    try {
        await axios.post('/api/test-results', {
            worker_id: parseInt(workerId),
            process_id: parseInt(processId),
            score: score,
            passed: passed
        });
        
        alert(`시험 완료!\n점수: ${score.toFixed(1)}점\n결과: ${passed ? '합격' : '불합격'}`);
        
        // 초기화
        document.getElementById('test-selection').classList.remove('hidden');
        document.getElementById('test-content').classList.add('hidden');
        document.getElementById('worker-select').value = '';
        document.getElementById('process-select').value = '';
    } catch (error) {
        console.error('시험 결과 제출 실패:', error);
        alert('시험 결과 제출에 실패했습니다.');
    }
}
