// 전역 변수
let currentPage = 'dashboard';
let dashboardData = null;
let processes = [];
let workers = [];

// 유틸리티 함수: Excel 날짜를 ISO 형식으로 변환
function convertExcelDate(dateValue) {
    if (!dateValue) return '';
    
    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
    }
    
    if (typeof dateValue === 'number') {
        // Excel 날짜 시리얼 번호를 JavaScript Date로 변환
        const excelEpoch = new Date(1899, 11, 30);
        const jsDate = new Date(excelEpoch.getTime() + dateValue * 86400000);
        return jsDate.toISOString().split('T')[0];
    }
    
    return String(dateValue);
}

// 차트 공통 설정
const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: true
};

const CHART_SCALE_DEFAULTS = {
    y: {
        beginAtZero: true,
        ticks: {
            stepSize: 1
        }
    }
};

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
            loadAssessmentUploadPage();
            break;
        case 'worker-upload':
            app.innerHTML = getWorkerUploadHTML();
            loadWorkerUploadPage();
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
            ...CHART_DEFAULTS,
            scales: CHART_SCALE_DEFAULTS
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
            ...CHART_DEFAULTS,
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
            ...CHART_DEFAULTS,
            scales: CHART_SCALE_DEFAULTS
        }
    });
}

// ==================== Quiz 등록 페이지 ====================

async function loadQuizUploadPage() {
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
    
    // 등록된 Quiz 현황 로드
    await loadQuizStatus();
}

async function loadQuizStatus() {
    try {
        const statusDiv = document.getElementById('quiz-status-table');
        
        // 프로세스별 Quiz 개수 조회
        const quizCounts = {};
        const latestDates = {};
        
        for (const process of processes) {
            const response = await axios.get(`/api/quizzes/${process.id}`);
            const quizzes = response.data;
            quizCounts[process.id] = quizzes.length;
            
            if (quizzes.length > 0) {
                // 가장 최근 등록일 찾기
                const dates = quizzes.map(q => new Date(q.created_at));
                latestDates[process.id] = new Date(Math.max(...dates));
            }
        }
        
        // 테이블 생성
        let tableHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">프로세스</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록된 Quiz 수</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">최근 등록일</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;
        
        processes.forEach(process => {
            const count = quizCounts[process.id] || 0;
            const latestDate = latestDates[process.id];
            const dateStr = latestDate ? latestDate.toLocaleDateString('ko-KR') : '-';
            const statusBadge = count > 0 
                ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">등록됨</span>'
                : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">미등록</span>';
            
            tableHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${process.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${count}개</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${statusBadge}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        statusDiv.innerHTML = tableHTML;
    } catch (error) {
        console.error('Quiz 현황 로드 실패:', error);
        document.getElementById('quiz-status-table').innerHTML = 
            '<p class="text-red-500">현황을 불러오는데 실패했습니다.</p>';
    }
}

function getQuizUploadHTML() {
    return `
        <div class="space-y-6">
            <!-- 등록된 프로세스 현황 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-list-check mr-2"></i>
                    등록된 Quiz 현황
                </h3>
                <div id="quiz-status-table" class="overflow-x-auto">
                    <p class="text-gray-500">로딩 중...</p>
                </div>
            </div>
            
            <!-- 업로드 섹션 -->
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
            // 현황 새로고침
            await loadQuizStatus();
        } catch (error) {
            console.error('퀴즈 업로드 실패:', error);
            alert('퀴즈 업로드에 실패했습니다.\n\n오류: ' + (error.response?.data?.error || error.message));
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// ==================== Assessment 등록 페이지 ====================

async function loadAssessmentUploadPage() {
    // 프로세스 목록 로드
    const processSelect = document.getElementById('assessment-process-select');
    if (processSelect) {
        processSelect.innerHTML = '<option value="">프로세스를 선택하세요</option>';
        processes.forEach(process => {
            const option = document.createElement('option');
            option.value = process.id;
            option.textContent = process.name;
            processSelect.appendChild(option);
        });
    }
    
    // 등록된 Assessment 항목 현황 로드
    await loadAssessmentStatus();
}

async function loadAssessmentStatus() {
    try {
        const statusDiv = document.getElementById('assessment-status-table');
        
        // 모든 Assessment 항목 조회
        const response = await axios.get('/api/assessment-items');
        const allItems = response.data;
        
        // 프로세스별 항목 개수 계산
        const itemCounts = {};
        const latestDates = {};
        const categoryBreakdown = {};
        
        // 프로세스별로 그룹화
        allItems.forEach(item => {
            const processId = item.process_id || 'general';
            
            if (!itemCounts[processId]) {
                itemCounts[processId] = 0;
                categoryBreakdown[processId] = {};
            }
            
            itemCounts[processId]++;
            
            // 카테고리별 집계
            const category = item.category;
            if (!categoryBreakdown[processId][category]) {
                categoryBreakdown[processId][category] = 0;
            }
            categoryBreakdown[processId][category]++;
            
            // 최근 등록일
            const itemDate = new Date(item.created_at);
            if (!latestDates[processId] || itemDate > latestDates[processId]) {
                latestDates[processId] = itemDate;
            }
        });
        
        // 테이블 생성
        let tableHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">프로세스</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록된 항목 수</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">카테고리 분포</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">최근 등록일</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
        `;
        
        // 일반 항목 (프로세스 미연결)
        if (itemCounts['general']) {
            const count = itemCounts['general'];
            const latestDate = latestDates['general'];
            const dateStr = latestDate ? latestDate.toLocaleDateString('ko-KR') : '-';
            const categories = Object.entries(categoryBreakdown['general'])
                .map(([cat, cnt]) => `${cat}(${cnt})`)
                .join(', ');
            
            tableHTML += `
                <tr class="bg-blue-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">일반 항목 (공통)</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${count}개</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${categories}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">공통</span>
                    </td>
                </tr>
            `;
        }
        
        // 프로세스별 항목
        processes.forEach(process => {
            const count = itemCounts[process.id] || 0;
            const latestDate = latestDates[process.id];
            const dateStr = latestDate ? latestDate.toLocaleDateString('ko-KR') : '-';
            const categories = categoryBreakdown[process.id] 
                ? Object.entries(categoryBreakdown[process.id])
                    .map(([cat, cnt]) => `${cat}(${cnt})`)
                    .join(', ')
                : '-';
            const statusBadge = count > 0 
                ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">등록됨</span>'
                : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">미등록</span>';
            
            tableHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${process.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${count}개</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${categories}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${statusBadge}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        statusDiv.innerHTML = tableHTML;
    } catch (error) {
        console.error('Assessment 현황 로드 실패:', error);
        document.getElementById('assessment-status-table').innerHTML = 
            '<p class="text-red-500">현황을 불러오는데 실패했습니다.</p>';
    }
}

function getAssessmentUploadHTML() {
    return `
        <div class="space-y-6">
            <!-- 등록된 프로세스 현황 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-list-check mr-2"></i>
                    등록된 Assessment 항목 현황
                </h3>
                <div id="assessment-status-table" class="overflow-x-auto">
                    <p class="text-gray-500">로딩 중...</p>
                </div>
            </div>
            
            <!-- 업로드 섹션 -->
            <div class="bg-white rounded-lg shadow-md p-8">
                <h2 class="text-3xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-clipboard-check mr-2"></i>
                    Supervisor Assessment 항목 등록
                </h2>
                
                <div class="mb-6">
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                        <p class="text-sm text-blue-700 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>지원 형식 1:</strong> Category, Item Name, Description
                        </p>
                        <p class="text-sm text-blue-700">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>지원 형식 2:</strong> Level2, Level3, Level4 컬럼 (Cutting.xlsx 형식, 자동 변환됨)
                        </p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-semibold mb-2">
                            프로세스 선택 (형식 2 사용 시 필수)
                        </label>
                        <select id="assessment-process-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">프로세스를 선택하세요</option>
                        </select>
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
            
            // 헤더 없이 전체 데이터를 가져옴 (range 사용)
            const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            let items = [];
            
            // 형식 1: Category, Item Name, Description (일반적인 형식)
            if (sheetData[0] && sheetData[0].includes('Category')) {
                const rows = XLSX.utils.sheet_to_json(firstSheet);
                items = rows.map(row => ({
                    process_id: null,
                    category: row['Category'],
                    item_name: row['Item Name'],
                    description: row['Description'] || ''
                }));
            }
            // 형식 2: Level2, Level3, Level4 형식 (Cutting.xlsx)
            else if (sheetData[1] && (sheetData[1].includes('Level2') || sheetData[1].includes('Level3') || sheetData[1].includes('Level4'))) {
                const processSelect = document.getElementById('assessment-process-select');
                const processId = processSelect.value;
                
                if (!processId) {
                    alert('프로세스를 선택해주세요. (형식 2 사용 시 필수)');
                    return;
                }
                
                // 행 2: 레벨 정보 (Level2, Level3, Level4)
                // 행 3: 질문 내용
                const levelRow = sheetData[1]; // 행 2
                const questionRow = sheetData[2]; // 행 3
                
                // 컬럼 7부터 질문 시작 (0-based index: 7 = H열)
                for (let i = 7; i < questionRow.length; i++) {
                    const question = questionRow[i];
                    const level = levelRow[i];
                    
                    if (question && level) {
                        items.push({
                            process_id: parseInt(processId),
                            category: level, // Level2, Level3, Level4
                            item_name: question,
                            description: ''
                        });
                    }
                }
            } else {
                alert('지원하지 않는 엑셀 파일 형식입니다.\n\n지원 형식:\n1. Category, Item Name, Description\n2. Level2, Level3, Level4 컬럼 형식 (Cutting.xlsx)');
                return;
            }
            
            if (items.length === 0) {
                alert('평가 항목을 찾을 수 없습니다.');
                return;
            }
            
            const response = await axios.post('/api/assessment-items/bulk', items);
            alert(`${response.data.count}개의 평가 항목이 성공적으로 등록되었습니다.`);
            fileInput.value = '';
            if (document.getElementById('assessment-process-select')) {
                document.getElementById('assessment-process-select').value = '';
            }
            // 현황 새로고침
            await loadAssessmentStatus();
        } catch (error) {
            console.error('평가 항목 업로드 실패:', error);
            alert('평가 항목 업로드에 실패했습니다.\n\n오류: ' + (error.response?.data?.error || error.message));
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// ==================== 작업자 등록 페이지 ====================

async function loadWorkerUploadPage() {
    // 등록된 작업자 현황 로드
    await loadWorkerStatus();
}

async function loadWorkerStatus() {
    try {
        const statusDiv = document.getElementById('worker-status-table');
        
        if (!workers.length) {
            statusDiv.innerHTML = '<p class="text-gray-500">등록된 작업자가 없습니다.</p>';
            return;
        }
        
        // 법인별로 그룹화
        const byEntity = {};
        workers.forEach(worker => {
            if (!byEntity[worker.entity]) {
                byEntity[worker.entity] = [];
            }
            byEntity[worker.entity].push(worker);
        });
        
        // 테이블 생성
        let tableHTML = `
            <div class="space-y-6">
        `;
        
        // 법인별로 테이블 생성
        Object.keys(byEntity).sort().forEach(entity => {
            const entityWorkers = byEntity[entity];
            
            tableHTML += `
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <div class="bg-blue-50 px-6 py-3 border-b border-gray-200">
                        <h4 class="text-lg font-bold text-gray-800">
                            <i class="fas fa-building mr-2"></i>
                            ${entity} (${entityWorkers.length}명)
                        </h4>
                    </div>
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사번</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">팀</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">직책</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">입사일</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
            `;
            
            // 입사일 기준 정렬 (최신순)
            entityWorkers.sort((a, b) => {
                const dateA = new Date(a.start_to_work_date);
                const dateB = new Date(b.start_to_work_date);
                return dateB - dateA;
            });
            
            entityWorkers.forEach(worker => {
                const startDate = new Date(worker.start_to_work_date).toLocaleDateString('ko-KR');
                tableHTML += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${worker.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${worker.employee_id}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${worker.team}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${worker.position}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${startDate}</td>
                    </tr>
                `;
            });
            
            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        tableHTML += `
            </div>
        `;
        
        statusDiv.innerHTML = tableHTML;
    } catch (error) {
        console.error('작업자 현황 로드 실패:', error);
        document.getElementById('worker-status-table').innerHTML = 
            '<p class="text-red-500">현황을 불러오는데 실패했습니다.</p>';
    }
}

function getWorkerUploadHTML() {
    return `
        <div class="space-y-6">
            <!-- 등록된 작업자 현황 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-list-check mr-2"></i>
                    등록된 작업자 현황
                </h3>
                <div id="worker-status-table" class="overflow-x-auto">
                    <p class="text-gray-500">로딩 중...</p>
                </div>
            </div>
            
            <!-- 업로드 섹션 -->
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
                workers = rows.map(row => ({
                    employee_id: String(row['Employee ID'] || ''),
                    name: String(row['Name'] || ''),
                    entity: String(row['Entity'] || ''),
                    team: String(row['Team'] || ''),
                    position: String(row['Position'] || ''),
                    start_to_work_date: convertExcelDate(row['Start to work date'])
                }));
            }
            // 형식 2: Name, Employee ID, Company, Department, Position, start to work
            else if (firstRow.hasOwnProperty('Company') && firstRow.hasOwnProperty('Department')) {
                workers = rows.map(row => ({
                    employee_id: String(row['Employee ID'] || ''),
                    name: String(row['Name'] || ''),
                    entity: String(row['Company'] || ''),  // Company -> Entity
                    team: String(row['Department'] || ''),  // Department -> Team
                    position: String(row['Position'] || ''),
                    start_to_work_date: convertExcelDate(row['start to work'])
                }));
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
            await loadWorkers(); // 작업자 목록 새로고침
            await loadWorkerStatus(); // 현황 새로고침
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
                    <label class="block text-gray-700 font-semibold mb-2">법인 선택</label>
                    <select id="entity-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="filterWorkersByEntity()">
                        <option value="">법인을 선택하세요</option>
                        <option value="CSVN">CSVN</option>
                        <option value="CSCN">CSCN</option>
                        <option value="CSTW">CSTW</option>
                    </select>
                </div>
                
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
    // 프로세스 목록 로드
    const processSelect = document.getElementById('process-select');
    processes.forEach(process => {
        const option = document.createElement('option');
        option.value = process.id;
        option.textContent = process.name;
        processSelect.appendChild(option);
    });
}

function filterWorkersByEntity() {
    const entitySelect = document.getElementById('entity-select');
    const workerSelect = document.getElementById('worker-select');
    const selectedEntity = entitySelect.value;
    
    // 작업자 선택 초기화
    workerSelect.innerHTML = '<option value="">작업자를 선택하세요</option>';
    
    if (!selectedEntity) {
        return;
    }
    
    // 선택된 법인의 작업자만 필터링
    const filteredWorkers = workers.filter(worker => worker.entity === selectedEntity);
    
    filteredWorkers.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.id;
        option.textContent = `${worker.name} (${worker.employee_id})`;
        workerSelect.appendChild(option);
    });
    
    if (filteredWorkers.length === 0) {
        workerSelect.innerHTML += '<option value="" disabled>해당 법인에 등록된 작업자가 없습니다</option>';
    }
}

async function startTest() {
    const entityId = document.getElementById('entity-select').value;
    const workerId = document.getElementById('worker-select').value;
    const processId = document.getElementById('process-select').value;
    
    if (!entityId) {
        alert('법인을 선택해주세요.');
        return;
    }
    
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
    const passed = score >= 60; // 60점 이상 합격
    
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
        document.getElementById('entity-select').value = '';
        document.getElementById('worker-select').value = '';
        document.getElementById('process-select').value = '';
    } catch (error) {
        console.error('시험 결과 제출 실패:', error);
        alert('시험 결과 제출에 실패했습니다.');
    }
}
