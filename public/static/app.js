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
        case 'supervisor-assessment':
            app.innerHTML = getSupervisorAssessmentHTML();
            loadSupervisorAssessmentPage();
            break;
        case 'test-page':
            app.innerHTML = getTestPageHTML();
            loadTestPage();
            break;
        case 'analysis-page':
            showAnalysisPage();
            break;
        case 'result-management':
            app.innerHTML = getResultManagementHTML();
            loadResultManagementPage();
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
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-gray-800">
                    <i class="fas fa-chart-bar mr-2"></i>
                    Skill Level 평가 요약
                </h2>
                
                <div class="w-64">
                    <label class="block text-gray-700 font-semibold mb-2">법인 선택</label>
                    <select id="dashboard-entity-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="filterDashboardByEntity()">
                        <option value="">전체 법인</option>
                        <option value="CSVN">CSVN</option>
                        <option value="CSCN">CSCN</option>
                        <option value="CSTW">CSTW</option>
                    </select>
                </div>
            </div>
            
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

let allDashboardData = null;
let currentTestStatusChart = null;
let currentAvgScoreChart = null;
let currentAssessmentChart = null;

async function loadDashboard() {
    try {
        const response = await axios.get('/api/dashboard/stats');
        allDashboardData = response.data;
        dashboardData = response.data;
        
        // 요약 카드 업데이트
        updateDashboardStats();
        
        // 차트 렌더링
        renderTestStatusChart();
        renderAvgScoreChart();
        renderAssessmentChart();
    } catch (error) {
        console.error('대시보드 로드 실패:', error);
        alert('대시보드 데이터를 불러오는데 실패했습니다.');
    }
}

function updateDashboardStats() {
    document.getElementById('total-workers').textContent = dashboardData.total_workers;
    document.getElementById('test-takers').textContent = dashboardData.written_test_takers;
    document.getElementById('test-passed').textContent = dashboardData.written_test_passed;
}

async function filterDashboardByEntity() {
    const entitySelect = document.getElementById('dashboard-entity-select');
    const selectedEntity = entitySelect.value;
    
    try {
        // 법인 필터를 적용하여 서버에서 데이터 가져오기
        let url = '/api/dashboard/stats';
        if (selectedEntity) {
            url += `?entity=${selectedEntity}`;
        }
        
        const response = await axios.get(url);
        dashboardData = response.data;
        
        // 차트가 이미 있으면 삭제
        if (currentTestStatusChart) {
            currentTestStatusChart.destroy();
        }
        if (currentAvgScoreChart) {
            currentAvgScoreChart.destroy();
        }
        if (currentAssessmentChart) {
            currentAssessmentChart.destroy();
        }
        
        // 요약 카드 업데이트
        updateDashboardStats();
        
        // 차트 다시 렌더링
        renderTestStatusChart();
        renderAvgScoreChart();
        renderAssessmentChart();
    } catch (error) {
        console.error('법인별 필터링 실패:', error);
        alert('법인별 데이터를 불러오는데 실패했습니다.');
    }
}

function renderTestStatusChart() {
    const ctx = document.getElementById('test-status-chart');
    const data = dashboardData.written_test_by_process;
    
    currentTestStatusChart = new Chart(ctx, {
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
            scales: CHART_SCALE_DEFAULTS,
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => value,
                    font: {
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

function renderAvgScoreChart() {
    const ctx = document.getElementById('avg-score-chart');
    const data = dashboardData.avg_score_by_process;
    
    currentAvgScoreChart = new Chart(ctx, {
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
            },
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => parseFloat(value).toFixed(1),
                    font: {
                        weight: 'bold'
                    }
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
    
    currentAssessmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: levels.map(l => `Level ${l}`),
            datasets: datasets
        },
        options: {
            ...CHART_DEFAULTS,
            scales: CHART_SCALE_DEFAULTS,
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => value,
                    font: {
                        weight: 'bold'
                    }
                }
            }
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
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
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
            
            const manageButtons = count > 0 
                ? `
                    <div class="flex gap-2">
                        <button onclick="showQuizManagement(${process.id}, '${process.name}')" 
                                class="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded">
                            <i class="fas fa-cog mr-1"></i>관리
                        </button>
                        <button onclick="deleteAllQuizzesByProcess(${process.id}, '${process.name}', ${count})" 
                                class="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded">
                            <i class="fas fa-trash-alt mr-1"></i>전체 삭제
                        </button>
                    </div>
                  `
                : '-';
            
            tableHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${process.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${count}개</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${statusBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${manageButtons}</td>
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

// Quiz 관리 모달 표시
async function showQuizManagement(processId, processName) {
    try {
        const response = await axios.get(`/api/quizzes/${processId}`);
        const quizzes = response.data;
        
        const modalHTML = `
            <div id="quiz-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeQuizModal(event)">
                <div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                        <h3 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-edit mr-2"></i>
                            ${processName} - Quiz 관리 (${quizzes.length}개)
                        </h3>
                        <button onclick="closeQuizModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <div class="p-6 space-y-4">
                        ${quizzes.map((quiz, index) => `
                            <div class="border rounded-lg p-4 bg-gray-50" id="quiz-item-${quiz.id}">
                                <div class="flex justify-between items-start mb-3">
                                    <h4 class="font-bold text-lg">문제 ${index + 1}</h4>
                                    <div class="space-x-2">
                                        <button onclick="editQuiz(${quiz.id})" class="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded">
                                            <i class="fas fa-edit mr-1"></i>수정
                                        </button>
                                        <button onclick="deleteQuiz(${quiz.id}, ${processId})" class="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded">
                                            <i class="fas fa-trash mr-1"></i>삭제
                                        </button>
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <div class="font-semibold">질문: ${quiz.question}</div>
                                    ${quiz.question_image_url ? `<img src="${quiz.question_image_url}" class="max-w-md rounded border" />` : ''}
                                    <div class="ml-4 space-y-1">
                                        <div class="${quiz.correct_answer === 'A' ? 'text-green-600 font-bold' : ''}">
                                            A. ${quiz.option_a}
                                            ${quiz.option_a_image_url ? `<img src="${quiz.option_a_image_url}" class="max-w-sm rounded border mt-1" />` : ''}
                                        </div>
                                        <div class="${quiz.correct_answer === 'B' ? 'text-green-600 font-bold' : ''}">
                                            B. ${quiz.option_b}
                                            ${quiz.option_b_image_url ? `<img src="${quiz.option_b_image_url}" class="max-w-sm rounded border mt-1" />` : ''}
                                        </div>
                                        ${quiz.option_c ? `<div class="${quiz.correct_answer === 'C' ? 'text-green-600 font-bold' : ''}">
                                            C. ${quiz.option_c}
                                            ${quiz.option_c_image_url ? `<img src="${quiz.option_c_image_url}" class="max-w-sm rounded border mt-1" />` : ''}
                                        </div>` : ''}
                                        ${quiz.option_d ? `<div class="${quiz.correct_answer === 'D' ? 'text-green-600 font-bold' : ''}">
                                            D. ${quiz.option_d}
                                            ${quiz.option_d_image_url ? `<img src="${quiz.option_d_image_url}" class="max-w-sm rounded border mt-1" />` : ''}
                                        </div>` : ''}
                                    </div>
                                    <div class="text-sm text-gray-600">정답: <span class="font-bold text-green-600">${quiz.correct_answer}</span></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('Quiz 로드 실패:', error);
        alert('Quiz를 불러오는데 실패했습니다.');
    }
}

function closeQuizModal(event) {
    if (!event || event.target.id === 'quiz-modal') {
        const modal = document.getElementById('quiz-modal');
        if (modal) modal.remove();
        
        const editModal = document.getElementById('quiz-edit-modal');
        if (editModal) editModal.remove();
    }
}

async function deleteQuiz(quizId, processId) {
    if (!confirm('이 문제를 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`/api/quizzes/${quizId}`);
        alert('문제가 삭제되었습니다.');
        closeQuizModal();
        await loadQuizStatus();
    } catch (error) {
        console.error('Quiz 삭제 실패:', error);
        alert('문제 삭제에 실패했습니다.');
    }
}

async function deleteAllQuizzesByProcess(processId, processName, count) {
    const confirmMessage = `⚠️ 경고: ${processName}의 모든 Quiz를 삭제하시겠습니까?\n\n삭제될 문제 수: ${count}개\n\n이 작업은 되돌릴 수 없습니다!`;
    
    if (!confirm(confirmMessage)) return;
    
    // 한 번 더 확인
    if (!confirm(`정말로 ${processName}의 ${count}개 Quiz를 모두 삭제하시겠습니까?`)) return;
    
    try {
        const response = await axios.delete(`/api/quizzes/process/${processId}`);
        alert(`${processName}의 ${response.data.deletedCount}개 Quiz가 삭제되었습니다.`);
        await loadQuizStatus();
    } catch (error) {
        console.error('Quiz 일괄 삭제 실패:', error);
        alert('Quiz 일괄 삭제에 실패했습니다.\n\n오류: ' + (error.response?.data?.error || error.message));
    }
}

async function editQuiz(quizId) {
    try {
        // 현재 문제 데이터 가져오기
        const quizItem = document.querySelector(`#quiz-item-${quizId}`);
        const modalContent = document.querySelector('#quiz-modal .bg-white');
        
        // 수정 폼 모달 생성
        const editModalHTML = `
            <div id="quiz-edit-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeEditModal(event)">
                <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                        <h3 class="text-xl font-bold text-gray-800">
                            <i class="fas fa-edit mr-2"></i>
                            문제 수정
                        </h3>
                        <button onclick="closeEditModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <div class="p-6">
                        <form id="quiz-edit-form" class="space-y-4" onsubmit="saveQuizEdit(event, ${quizId})">
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">질문</label>
                                <textarea id="edit-question" class="w-full px-4 py-2 border border-gray-300 rounded-lg" rows="3" required></textarea>
                            </div>
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">질문 이미지 URL (선택)</label>
                                <input type="url" id="edit-question-image" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="https://example.com/image.jpg">
                                <p class="text-sm text-gray-500 mt-1">이미지 URL을 입력하거나 비워두세요</p>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-700 font-semibold mb-2">선택지 A</label>
                                    <input type="text" id="edit-option-a" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                                    <input type="url" id="edit-option-a-image" class="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2" placeholder="이미지 URL (선택)">
                                </div>
                                <div>
                                    <label class="block text-gray-700 font-semibold mb-2">선택지 B</label>
                                    <input type="text" id="edit-option-b" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                                    <input type="url" id="edit-option-b-image" class="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2" placeholder="이미지 URL (선택)">
                                </div>
                                <div>
                                    <label class="block text-gray-700 font-semibold mb-2">선택지 C (선택)</label>
                                    <input type="text" id="edit-option-c" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                    <input type="url" id="edit-option-c-image" class="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2" placeholder="이미지 URL (선택)">
                                </div>
                                <div>
                                    <label class="block text-gray-700 font-semibold mb-2">선택지 D (선택)</label>
                                    <input type="text" id="edit-option-d" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                                    <input type="url" id="edit-option-d-image" class="w-full px-4 py-2 border border-gray-300 rounded-lg mt-2" placeholder="이미지 URL (선택)">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-gray-700 font-semibold mb-2">정답</label>
                                <select id="edit-correct-answer" class="w-full px-4 py-2 border border-gray-300 rounded-lg" required>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                </select>
                            </div>
                            
                            <input type="hidden" id="edit-process-id">
                            
                            <div class="flex space-x-3">
                                <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg">
                                    <i class="fas fa-save mr-2"></i>저장
                                </button>
                                <button type="button" onclick="closeEditModal()" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg">
                                    취소
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', editModalHTML);
        
        // 현재 데이터로 폼 채우기
        const response = await axios.get(`/api/quizzes/${quizId.toString().split('-')[0]}`);
        const allQuizzes = response.data;
        const currentQuiz = allQuizzes.find(q => q.id === quizId);
        
        if (currentQuiz) {
            document.getElementById('edit-question').value = currentQuiz.question;
            document.getElementById('edit-question-image').value = currentQuiz.question_image_url || '';
            document.getElementById('edit-option-a').value = currentQuiz.option_a;
            document.getElementById('edit-option-a-image').value = currentQuiz.option_a_image_url || '';
            document.getElementById('edit-option-b').value = currentQuiz.option_b;
            document.getElementById('edit-option-b-image').value = currentQuiz.option_b_image_url || '';
            document.getElementById('edit-option-c').value = currentQuiz.option_c || '';
            document.getElementById('edit-option-c-image').value = currentQuiz.option_c_image_url || '';
            document.getElementById('edit-option-d').value = currentQuiz.option_d || '';
            document.getElementById('edit-option-d-image').value = currentQuiz.option_d_image_url || '';
            document.getElementById('edit-correct-answer').value = currentQuiz.correct_answer;
            document.getElementById('edit-process-id').value = currentQuiz.process_id;
        }
    } catch (error) {
        console.error('Quiz 수정 폼 로드 실패:', error);
        alert('문제를 불러오는데 실패했습니다.');
    }
}

function closeEditModal(event) {
    if (!event || event.target.id === 'quiz-edit-modal') {
        const modal = document.getElementById('quiz-edit-modal');
        if (modal) modal.remove();
    }
}

async function saveQuizEdit(event, quizId) {
    event.preventDefault();
    
    try {
        const updatedQuiz = {
            process_id: parseInt(document.getElementById('edit-process-id').value),
            question: document.getElementById('edit-question').value,
            question_image_url: document.getElementById('edit-question-image').value || null,
            option_a: document.getElementById('edit-option-a').value,
            option_a_image_url: document.getElementById('edit-option-a-image').value || null,
            option_b: document.getElementById('edit-option-b').value,
            option_b_image_url: document.getElementById('edit-option-b-image').value || null,
            option_c: document.getElementById('edit-option-c').value || null,
            option_c_image_url: document.getElementById('edit-option-c-image').value || null,
            option_d: document.getElementById('edit-option-d').value || null,
            option_d_image_url: document.getElementById('edit-option-d-image').value || null,
            correct_answer: document.getElementById('edit-correct-answer').value
        };
        
        await axios.put(`/api/quizzes/${quizId}`, updatedQuiz);
        alert('문제가 수정되었습니다.');
        closeEditModal();
        closeQuizModal();
        await loadQuizStatus();
    } catch (error) {
        console.error('Quiz 수정 실패:', error);
        alert('문제 수정에 실패했습니다.');
    }
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
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
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
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <div class="flex gap-2">
                            <button onclick="showAssessmentManagement(null, '일반 항목 (공통)')" class="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded">
                                <i class="fas fa-cog mr-1"></i>관리
                            </button>
                            <button onclick="deleteAllAssessmentsByProcess(null, '일반 항목 (공통)', ${count})" class="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded">
                                <i class="fas fa-trash-alt mr-1"></i>전체 삭제
                            </button>
                        </div>
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
            
            const manageButtons = count > 0 
                ? `
                    <div class="flex gap-2">
                        <button onclick="showAssessmentManagement(${process.id}, '${process.name}')" class="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded">
                            <i class="fas fa-cog mr-1"></i>관리
                        </button>
                        <button onclick="deleteAllAssessmentsByProcess(${process.id}, '${process.name}', ${count})" class="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded">
                            <i class="fas fa-trash-alt mr-1"></i>전체 삭제
                        </button>
                    </div>
                  `
                : '-';
            
            tableHTML += `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${process.name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${count}개</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${categories}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${statusBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${manageButtons}</td>
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

// Assessment 관리 모달 표시
async function showAssessmentManagement(processId, processName) {
    try {
        const response = await axios.get('/api/assessment-items');
        const allItems = response.data;
        
        // processId가 null이면 일반 항목(공통), 아니면 해당 프로세스 항목만 필터링
        const items = allItems.filter(item => {
            if (processId === null) {
                return item.process_id === null;
            } else {
                return item.process_id === processId;
            }
        });
        
        const modalHTML = `
            <div id="assessment-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeAssessmentModal(event)">
                <div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                        <h3 class="text-2xl font-bold text-gray-800">
                            <i class="fas fa-clipboard-check mr-2"></i>
                            ${processName} - Assessment 항목 관리 (${items.length}개)
                        </h3>
                        <button onclick="closeAssessmentModal()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    <div class="p-6 space-y-4">
                        ${items.length === 0 ? '<p class="text-gray-500 text-center py-8">등록된 항목이 없습니다.</p>' : ''}
                        ${items.map((item, index) => `
                            <div class="border rounded-lg p-4 bg-gray-50" id="assessment-item-${item.id}">
                                <div class="flex justify-between items-start mb-3">
                                    <div class="flex-1">
                                        <h4 class="font-bold text-lg">${index + 1}. ${item.item_name}</h4>
                                        <span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mt-1">
                                            ${item.category}
                                        </span>
                                    </div>
                                    <button onclick="deleteAssessmentItem(${item.id}, ${processId}, '${processName}')" 
                                            class="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded">
                                        <i class="fas fa-trash mr-1"></i>삭제
                                    </button>
                                </div>
                                <div class="space-y-2">
                                    <div class="text-sm text-gray-700">
                                        <span class="font-semibold">설명:</span> ${item.description || '설명 없음'}
                                    </div>
                                    <div class="text-sm text-gray-500">
                                        등록일: ${new Date(item.created_at).toLocaleDateString('ko-KR')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    } catch (error) {
        console.error('Assessment 항목 로드 실패:', error);
        alert('Assessment 항목을 불러오는데 실패했습니다.');
    }
}

function closeAssessmentModal(event) {
    if (!event || event.target.id === 'assessment-modal') {
        const modal = document.getElementById('assessment-modal');
        if (modal) modal.remove();
    }
}

async function deleteAssessmentItem(itemId, processId, processName) {
    if (!confirm('이 평가 항목을 삭제하시겠습니까?\n\n※ 이 항목과 연결된 모든 평가 기록도 함께 삭제됩니다.')) return;
    
    try {
        await axios.delete(`/api/assessment-items/${itemId}`);
        alert('평가 항목이 삭제되었습니다.');
        closeAssessmentModal();
        await loadAssessmentStatus();
    } catch (error) {
        console.error('Assessment 항목 삭제 실패:', error);
        alert('평가 항목 삭제에 실패했습니다.');
    }
}

// Assessment 프로세스별 일괄 삭제
async function deleteAllAssessmentsByProcess(processId, processName, count) {
    const confirmMessage = `⚠️ 경고: ${processName}의 모든 Assessment 항목을 삭제하시겠습니까?\n\n삭제될 항목 수: ${count}개\n\n※ 이 항목들과 연결된 모든 평가 기록도 함께 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다!`;
    
    if (!confirm(confirmMessage)) return;
    if (!confirm(`정말로 ${processName}의 ${count}개 Assessment 항목을 모두 삭제하시겠습니까?`)) return;
    
    try {
        // processId가 null이면 'null' 문자열로 전송
        const processParam = processId === null ? 'null' : processId;
        const response = await axios.delete(`/api/assessment-items/process/${processParam}`);
        alert(`${processName}의 ${response.data.deletedCount}개 Assessment 항목이 삭제되었습니다.`);
        await loadAssessmentStatus();
    } catch (error) {
        console.error('Assessment 일괄 삭제 실패:', error);
        alert('Assessment 일괄 삭제에 실패했습니다.\n\n오류: ' + (error.response?.data?.error || error.message));
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

// ==================== Supervisor Assessment 시행 페이지 ====================

let assessmentItems = [];
let currentAssessmentIndex = 0;
let assessmentResults = [];

function getSupervisorAssessmentHTML() {
    return `
        <div class="bg-white rounded-lg shadow-md p-8">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-user-check mr-2"></i>
                Supervisor Assessment 시행
            </h2>
            
            <div id="assessment-selection" class="space-y-6">
                <!-- 법인 선택 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">법인 선택</label>
                    <select id="sa-entity-select" onchange="filterSAWorkersByEntity()" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">법인을 선택하세요</option>
                        <option value="CSVN">CSVN</option>
                        <option value="CSCN">CSCN</option>
                        <option value="CSTW">CSTW</option>
                    </select>
                </div>
                
                <!-- 작업자 선택 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">작업자 선택</label>
                    <select id="sa-worker-select" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">작업자를 선택하세요</option>
                    </select>
                </div>
                
                <!-- 프로세스 선택 -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">프로세스 선택</label>
                    <select id="sa-process-select" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">프로세스를 선택하세요</option>
                    </select>
                </div>
                
                <!-- 평가 시작 버튼 -->
                <button onclick="startAssessment()" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                    <i class="fas fa-play mr-2"></i>평가 시작
                </button>
            </div>
            
            <!-- 평가 진행 영역 -->
            <div id="assessment-progress" class="hidden">
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-700">진행률</span>
                        <span id="progress-text" class="text-sm font-medium text-blue-600">0 / 0</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div id="progress-bar" class="bg-blue-600 h-3 rounded-full transition-all" style="width: 0%"></div>
                    </div>
                </div>
                
                <div id="assessment-item-container" class="bg-gray-50 rounded-lg p-6 mb-6">
                    <!-- 평가 항목이 여기에 표시됩니다 -->
                </div>
                
                <div class="flex gap-4">
                    <button onclick="markAsSatisfied()" 
                            class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">
                        <i class="fas fa-check mr-2"></i>만족
                    </button>
                    <button onclick="markAsUnsatisfied()" 
                            class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition">
                        <i class="fas fa-times mr-2"></i>불만족
                    </button>
                </div>
            </div>
            
            <!-- 평가 완료 영역 -->
            <div id="assessment-complete" class="hidden">
                <div class="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
                    <h3 class="text-2xl font-bold text-green-800 mb-4">
                        <i class="fas fa-check-circle mr-2"></i>평가 완료!
                    </h3>
                    <div id="assessment-summary" class="space-y-3">
                        <!-- 평가 결과 요약이 여기에 표시됩니다 -->
                    </div>
                </div>
                
                <button onclick="showPage('supervisor-assessment')" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                    <i class="fas fa-redo mr-2"></i>새로운 평가 시작
                </button>
            </div>
        </div>
    `;
}

async function loadSupervisorAssessmentPage() {
    // 작업자 데이터가 없으면 로드
    if (!workers || workers.length === 0) {
        try {
            const response = await axios.get('/api/workers');
            workers = response.data;
        } catch (error) {
            console.error('작업자 데이터 로드 실패:', error);
            alert('작업자 데이터를 불러오는데 실패했습니다.');
            return;
        }
    }
    
    // 프로세스 목록 로드
    const processSelect = document.getElementById('sa-process-select');
    if (processSelect) {
        processSelect.innerHTML = '<option value="">프로세스를 선택하세요</option>';
        processes.forEach(process => {
            const option = document.createElement('option');
            option.value = process.id;
            option.textContent = process.name;
            processSelect.appendChild(option);
        });
    }
    
    console.log(`작업자 데이터 로드 완료: ${workers.length}명`);
}

// Supervisor Assessment 작업자 필터링 (Written Test와 동일한 방식)
function filterSAWorkersByEntity() {
    const entitySelect = document.getElementById('sa-entity-select');
    const workerSelect = document.getElementById('sa-worker-select');
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

async function startAssessment() {
    const workerId = document.getElementById('sa-worker-select').value;
    const processId = document.getElementById('sa-process-select').value;
    
    if (!workerId || !processId) {
        alert('작업자와 프로세스를 선택해주세요.');
        return;
    }
    
    try {
        // 해당 프로세스의 모든 assessment 항목 로드
        const response = await axios.get('/api/assessment-items');
        const allItems = response.data;
        
        // 선택한 프로세스의 항목만 필터링 (일반 항목 포함)
        assessmentItems = allItems.filter(item => 
            item.process_id === parseInt(processId) || item.process_id === null
        );
        
        if (assessmentItems.length === 0) {
            alert('해당 프로세스에 등록된 평가 항목이 없습니다.');
            return;
        }
        
        // 항목을 랜덤하게 섞기
        assessmentItems = shuffleArray(assessmentItems);
        
        // 평가 초기화
        currentAssessmentIndex = 0;
        assessmentResults = [];
        
        // UI 전환
        document.getElementById('assessment-selection').classList.add('hidden');
        document.getElementById('assessment-progress').classList.remove('hidden');
        
        // 첫 번째 항목 표시
        showAssessmentItem();
        
    } catch (error) {
        console.error('Assessment 시작 실패:', error);
        alert('평가를 시작하는데 실패했습니다.');
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function showAssessmentItem() {
    const item = assessmentItems[currentAssessmentIndex];
    const container = document.getElementById('assessment-item-container');
    
    // 진행률 업데이트
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const progress = ((currentAssessmentIndex) / assessmentItems.length) * 100;
    
    progressText.textContent = `${currentAssessmentIndex} / ${assessmentItems.length}`;
    progressBar.style.width = `${progress}%`;
    
    // 평가 항목 표시
    container.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-start gap-3">
                <span class="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    ${currentAssessmentIndex + 1}/${assessmentItems.length}
                </span>
                ${item.category ? `
                    <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        ${item.category}
                    </span>
                ` : ''}
            </div>
            <h3 class="text-2xl font-bold text-gray-800">${item.item_name}</h3>
            ${item.description ? `
                <p class="text-gray-600 text-lg leading-relaxed">${item.description}</p>
            ` : ''}
        </div>
    `;
}

function markAsSatisfied() {
    recordAssessment(true);
}

function markAsUnsatisfied() {
    recordAssessment(false);
}

function recordAssessment(satisfied) {
    const item = assessmentItems[currentAssessmentIndex];
    
    assessmentResults.push({
        item_id: item.id,
        item_name: item.item_name,
        category: item.category,
        satisfied: satisfied
    });
    
    currentAssessmentIndex++;
    
    if (currentAssessmentIndex < assessmentItems.length) {
        showAssessmentItem();
    } else {
        completeAssessment();
    }
}

async function completeAssessment() {
    const workerId = document.getElementById('sa-worker-select').value;
    const processId = document.getElementById('sa-process-select').value;
    
    // Level별로 결과 집계
    const levelResults = {};
    
    assessmentResults.forEach(result => {
        const category = result.category || '기타';
        
        // 카테고리에서 Level 추출 (예: "Level 2", "Level2", "L2" 등)
        let level = 'general';
        const levelMatch = category.match(/level\s*(\d+)/i) || category.match(/l(\d+)/i);
        if (levelMatch) {
            level = parseInt(levelMatch[1]);
        }
        
        if (!levelResults[level]) {
            levelResults[level] = {
                total: 0,
                satisfied: 0,
                items: []
            };
        }
        
        levelResults[level].total++;
        if (result.satisfied) {
            levelResults[level].satisfied++;
        }
        levelResults[level].items.push(result);
    });
    
    // 최종 레벨 결정
    let finalLevel = 1;
    
    // Level 2의 모든 항목을 만족하면 Level 2
    if (levelResults[2]) {
        if (levelResults[2].satisfied === levelResults[2].total) {
            finalLevel = 2;
            
            // Level 3 체크
            if (levelResults[3] && levelResults[3].satisfied === levelResults[3].total) {
                finalLevel = 3;
                
                // Level 4 체크
                if (levelResults[4] && levelResults[4].satisfied === levelResults[4].total) {
                    finalLevel = 4;
                }
            }
        }
    }
    
    // 서버에 결과 저장
    try {
        const assessmentData = assessmentResults.map(result => ({
            item_id: result.item_id,
            level: finalLevel
        }));
        
        await axios.post('/api/supervisor-assessment-results', {
            worker_id: workerId,
            process_id: processId,
            assessments: assessmentData,
            final_level: finalLevel
        });
        
        // 결과 표시
        showAssessmentComplete(levelResults, finalLevel);
        
    } catch (error) {
        console.error('Assessment 결과 저장 실패:', error);
        alert('평가 결과 저장에 실패했습니다.');
    }
}

function showAssessmentComplete(levelResults, finalLevel) {
    document.getElementById('assessment-progress').classList.add('hidden');
    document.getElementById('assessment-complete').classList.remove('hidden');
    
    const summaryDiv = document.getElementById('assessment-summary');
    
    let summaryHTML = `
        <div class="text-center mb-6">
            <div class="text-5xl font-bold text-green-600 mb-2">Level ${finalLevel}</div>
            <p class="text-gray-600">최종 평가 레벨</p>
        </div>
        <div class="border-t-2 border-gray-200 pt-4">
            <h4 class="font-bold text-gray-800 mb-3">Level별 평가 결과:</h4>
    `;
    
    Object.keys(levelResults).sort().forEach(level => {
        const result = levelResults[level];
        const percentage = ((result.satisfied / result.total) * 100).toFixed(1);
        const isAllSatisfied = result.satisfied === result.total;
        
        summaryHTML += `
            <div class="bg-white rounded-lg p-4 mb-3 border ${isAllSatisfied ? 'border-green-300' : 'border-gray-200'}">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-semibold ${isAllSatisfied ? 'text-green-700' : 'text-gray-700'}">
                        ${level === 'general' ? '일반 항목' : 'Level ' + level}
                    </span>
                    <span class="text-sm ${isAllSatisfied ? 'text-green-600' : 'text-gray-600'}">
                        ${result.satisfied} / ${result.total} (${percentage}%)
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-${isAllSatisfied ? 'green' : 'blue'}-600 h-2 rounded-full" 
                         style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    });
    
    summaryHTML += `</div>`;
    
    summaryDiv.innerHTML = summaryHTML;
}

// ==================== 결과 관리 페이지 ====================

function getResultManagementHTML() {
    return `
        <div class="bg-white rounded-lg shadow-md p-8">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-file-excel mr-2"></i>
                평가 결과 관리
            </h2>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Written Test 결과 관리 -->
                <div class="border border-gray-200 rounded-lg p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-pencil-alt mr-2"></i>
                        Written Test 결과
                    </h3>
                    
                    <div class="space-y-4">
                        <!-- 다운로드 섹션 -->
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-gray-700 mb-3">
                                <i class="fas fa-download mr-2"></i>결과 다운로드
                            </h4>
                            
                            <div class="space-y-2">
                                <select id="test-entity-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="">전체 법인</option>
                                    <option value="CSVN">CSVN</option>
                                    <option value="CSCN">CSCN</option>
                                    <option value="CSTW">CSTW</option>
                                </select>
                                
                                <select id="test-process-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="">전체 프로세스</option>
                                </select>
                                
                                <select id="test-download-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="summary">요약 (카테고리/평가항목/만족여부)</option>
                                    <option value="detailed">상세 (개별 문제별 답변)</option>
                                </select>
                                
                                <button onclick="downloadWrittenTestResults()" 
                                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <i class="fas fa-file-download mr-2"></i>엑셀 다운로드
                                </button>
                            </div>
                        </div>
                        
                        <!-- 업로드 섹션 -->
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-gray-700 mb-3">
                                <i class="fas fa-upload mr-2"></i>결과 업로드
                            </h4>
                            
                            <div class="space-y-2">
                                <input type="file" 
                                       id="test-result-file" 
                                       accept=".xlsx, .xls"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                
                                <button onclick="uploadWrittenTestResults()" 
                                        class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <i class="fas fa-file-upload mr-2"></i>엑셀 업로드
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Assessment 결과 관리 -->
                <div class="border border-gray-200 rounded-lg p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-clipboard-check mr-2"></i>
                        Supervisor Assessment 결과
                    </h3>
                    
                    <div class="space-y-4">
                        <!-- 다운로드 섹션 -->
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-gray-700 mb-3">
                                <i class="fas fa-download mr-2"></i>결과 다운로드
                            </h4>
                            
                            <div class="space-y-2">
                                <select id="assessment-entity-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="">전체 법인</option>
                                    <option value="CSVN">CSVN</option>
                                    <option value="CSCN">CSCN</option>
                                    <option value="CSTW">CSTW</option>
                                </select>
                                
                                <select id="assessment-process-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="">전체 프로세스</option>
                                </select>
                                
                                <select id="assessment-download-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="summary">요약 (카테고리별 평균)</option>
                                    <option value="detailed">상세 (개별 평가 항목별)</option>
                                </select>
                                
                                <button onclick="downloadAssessmentResults()" 
                                        class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <i class="fas fa-file-download mr-2"></i>엑셀 다운로드
                                </button>
                            </div>
                        </div>
                        
                        <!-- 업로드 섹션 -->
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-gray-700 mb-3">
                                <i class="fas fa-upload mr-2"></i>결과 업로드
                            </h4>
                            
                            <div class="space-y-2">
                                <input type="file" 
                                       id="assessment-result-file" 
                                       accept=".xlsx, .xls"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                
                                <button onclick="uploadAssessmentResults()" 
                                        class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <i class="fas fa-file-upload mr-2"></i>엑셀 업로드
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 안내 메시지 -->
            <div class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 class="font-semibold text-yellow-800 mb-2">
                    <i class="fas fa-info-circle mr-2"></i>사용 안내
                </h4>
                <ul class="text-sm text-yellow-700 space-y-1">
                    <li>• 다운로드: 법인과 프로세스를 선택하여 필터링된 결과를 엑셀로 다운로드할 수 있습니다.</li>
                    <li>• 업로드: 다운로드한 엑셀 파일과 동일한 양식으로 작성하여 업로드하면 결과가 일괄 등록됩니다.</li>
                    <li>• Written Test: 사번, 이름, 법인, 팀, 직급, 프로세스명, 점수, 합격여부, 시험일자</li>
                    <li>• Assessment: 사번, 이름, 법인, 팀, 직급, 카테고리, 평가항목, 레벨, 평가일자</li>
                </ul>
            </div>
        </div>
    `;
}

async function loadResultManagementPage() {
    // 프로세스 목록 로드
    const testProcessFilter = document.getElementById('test-process-filter');
    const assessmentProcessFilter = document.getElementById('assessment-process-filter');
    
    if (testProcessFilter && assessmentProcessFilter) {
        processes.forEach(process => {
            const option1 = document.createElement('option');
            option1.value = process.id;
            option1.textContent = process.name;
            testProcessFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = process.id;
            option2.textContent = process.name;
            assessmentProcessFilter.appendChild(option2);
        });
    }
}

// Written Test 결과 다운로드
async function downloadWrittenTestResults() {
    try {
        const entity = document.getElementById('test-entity-filter').value;
        const processId = document.getElementById('test-process-filter').value;
        const downloadType = document.getElementById('test-download-type').value;
        
        let url = downloadType === 'detailed' 
            ? '/api/results/written-test/detailed?' 
            : '/api/results/written-test?';
        
        if (entity) url += `entity=${entity}&`;
        if (processId) url += `processId=${processId}`;
        
        const response = await axios.get(url);
        const results = response.data;
        
        if (results.length === 0) {
            alert('다운로드할 결과가 없습니다.');
            return;
        }
        
        let excelData;
        let fileName;
        
        if (downloadType === 'detailed') {
            // 상세 양식 (개별 문제별)
            excelData = results.map((r, index) => ({
                'No.': index + 1,
                '사번': r.employee_id,
                '이름': r.name,
                '법인': r.entity,
                '팀': r.team,
                '직급': r.position,
                '프로세스': r.process_name,
                '문제': r.question,
                '선택답안': r.selected_answer,
                '정답': r.correct_answer,
                '정답여부': r.is_correct ? 'O' : 'X',
                '시험일자': new Date(r.test_date).toLocaleDateString('ko-KR')
            }));
            fileName = `Written_Test_Detailed_${entity || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
            // 요약 양식 (간단)
            excelData = results.map((r, index) => ({
                '카테고리': r.process_name,
                '평가 항목': 'Written Test',
                '만족 여부': r.passed ? '합격' : '불합격'
            }));
            fileName = `Written_Test_Summary_${entity || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        }
        
        // 워크시트 생성
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // 열 너비 설정
        if (downloadType === 'detailed') {
            ws['!cols'] = [
                { wch: 6 },   // No.
                { wch: 12 },  // 사번
                { wch: 15 },  // 이름
                { wch: 10 },  // 법인
                { wch: 20 },  // 팀
                { wch: 15 },  // 직급
                { wch: 15 },  // 프로세스
                { wch: 50 },  // 문제
                { wch: 10 },  // 선택답안
                { wch: 10 },  // 정답
                { wch: 10 },  // 정답여부
                { wch: 15 }   // 시험일자
            ];
        } else {
            ws['!cols'] = [
                { wch: 25 },  // 카테고리
                { wch: 25 },  // 평가 항목
                { wch: 15 }   // 만족 여부
            ];
        }
        
        // 헤더 스타일 적용 (노란색 배경)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddress]) continue;
            
            ws[cellAddress].s = {
                font: { bold: true, sz: 12 },
                fill: { fgColor: { rgb: "FFFF00" } },  // 노란색 배경
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };
        }
        
        // 데이터 셀 스타일 적용
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                if (!ws[cellAddress]) continue;
                
                ws[cellAddress].s = {
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "D3D3D3" } },
                        bottom: { style: "thin", color: { rgb: "D3D3D3" } },
                        left: { style: "thin", color: { rgb: "D3D3D3" } },
                        right: { style: "thin", color: { rgb: "D3D3D3" } }
                    }
                };
                
                // 조건부 색상 적용
                if (downloadType === 'detailed') {
                    // 정답여부 컬럼 (col 10)
                    if (col === 10) {
                        const value = ws[cellAddress].v;
                        if (value === 'O') {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "C6EFCE" } };
                            ws[cellAddress].s.font = { color: { rgb: "006100" }, bold: true };
                        } else if (value === 'X') {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "FFC7CE" } };
                            ws[cellAddress].s.font = { color: { rgb: "9C0006" }, bold: true };
                        }
                    }
                } else {
                    // 만족 여부 컬럼 (col 2)
                    if (col === 2) {
                        const value = ws[cellAddress].v;
                        if (value === '합격') {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "C6EFCE" } };
                            ws[cellAddress].s.font = { color: { rgb: "006100" }, bold: true };
                        } else if (value === '불합격') {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "FFC7CE" } };
                            ws[cellAddress].s.font = { color: { rgb: "9C0006" }, bold: true };
                        }
                    }
                }
            }
        }
        
        // 워크북 생성 및 시트 추가
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Written Test Results');
        
        // 다운로드
        XLSX.writeFile(wb, fileName);
        
        alert(`${results.length}건의 결과를 다운로드했습니다.`);
    } catch (error) {
        console.error('다운로드 실패:', error);
        alert('결과 다운로드에 실패했습니다.');
    }
}

// Assessment 결과 다운로드
async function downloadAssessmentResults() {
    try {
        const entity = document.getElementById('assessment-entity-filter').value;
        const processId = document.getElementById('assessment-process-filter').value;
        const downloadType = document.getElementById('assessment-download-type').value;
        
        let url = '/api/results/assessment?';
        if (entity) url += `entity=${entity}&`;
        if (processId) url += `processId=${processId}`;
        
        const response = await axios.get(url);
        const results = response.data;
        
        if (results.length === 0) {
            alert('다운로드할 결과가 없습니다.');
            return;
        }
        
        let excelData;
        let fileName;
        
        if (downloadType === 'summary') {
            // 요약 양식 (카테고리별 평균)
            const categoryMap = new Map();
            
            results.forEach(r => {
                const key = `${r.employee_id}_${r.category}`;
                if (!categoryMap.has(key)) {
                    categoryMap.set(key, {
                        employee_id: r.employee_id,
                        name: r.name,
                        entity: r.entity,
                        team: r.team,
                        position: r.position,
                        category: r.category,
                        levels: [],
                        assessment_date: r.assessment_date
                    });
                }
                categoryMap.get(key).levels.push(r.level);
            });
            
            excelData = Array.from(categoryMap.values()).map((item, index) => ({
                'No.': index + 1,
                '사번': item.employee_id,
                '이름': item.name,
                '법인': item.entity,
                '팀': item.team,
                '직급': item.position,
                '카테고리': item.category,
                '평균 레벨': (item.levels.reduce((a, b) => a + b, 0) / item.levels.length).toFixed(1),
                '평가일자': new Date(item.assessment_date).toLocaleDateString('ko-KR')
            }));
            
            fileName = `Assessment_Summary_${entity || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
            // 상세 양식 (개별 항목별) - 프로세스 정보 추가
            excelData = results.map((r, index) => {
                // level 값의 안전한 처리
                let evaluationResult = 'N/A';
                if (r.level !== null && r.level !== undefined) {
                    evaluationResult = r.level >= 3 ? '만족' : '불만족';
                }
                
                return {
                    'No.': index + 1,
                    '사번': r.employee_id,
                    '이름': r.name,
                    '법인': r.entity,
                    '팀': r.team,
                    '프로세스': r.position,  // 직급을 프로세스로 표시
                    'Lv 카테고리': r.category,
                    '평가항목': r.item_name,
                    '평가 결과': evaluationResult,
                    '평가일자': new Date(r.assessment_date).toLocaleDateString('ko-KR')
                };
            });
            
            fileName = `Assessment_Detailed_${entity || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        }
        
        // 워크시트 생성
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // 열 너비 설정
        if (downloadType === 'summary') {
            ws['!cols'] = [
                { wch: 6 },   // No.
                { wch: 12 },  // 사번
                { wch: 15 },  // 이름
                { wch: 10 },  // 법인
                { wch: 20 },  // 팀
                { wch: 15 },  // 직급
                { wch: 20 },  // 카테고리
                { wch: 12 },  // 평균 레벨
                { wch: 15 }   // 평가일자
            ];
        } else {
            ws['!cols'] = [
                { wch: 6 },   // No.
                { wch: 12 },  // 사번
                { wch: 15 },  // 이름
                { wch: 10 },  // 법인
                { wch: 20 },  // 팀
                { wch: 15 },  // 프로세스
                { wch: 15 },  // Lv 카테고리
                { wch: 50 },  // 평가항목
                { wch: 12 },  // 평가 결과
                { wch: 15 }   // 평가일자
            ];
        }
        
        // 헤더 스타일 적용 (첫 번째 행)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!ws[cellAddress]) continue;
            
            ws[cellAddress].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "70AD47" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };
        }
        
        // 데이터 셀 스타일 적용
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                if (!ws[cellAddress]) continue;
                
                ws[cellAddress].s = {
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "D3D3D3" } },
                        bottom: { style: "thin", color: { rgb: "D3D3D3" } },
                        left: { style: "thin", color: { rgb: "D3D3D3" } },
                        right: { style: "thin", color: { rgb: "D3D3D3" } }
                    }
                };
                
                // 결과별 색상 적용
                if (downloadType === 'summary') {
                    // 요약: 평균 레벨 컬럼 (col 7)
                    if (col === 7) {
                        const value = parseFloat(ws[cellAddress].v);
                        if (value >= 4.5) {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "C6EFCE" } };
                            ws[cellAddress].s.font = { color: { rgb: "006100" }, bold: true };
                        } else if (value >= 3.5) {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "C6E0B4" } };
                        } else if (value >= 2.5) {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "FFE699" } };
                        } else if (value >= 1.5) {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "FFC7CE" } };
                        } else {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "FFC7CE" } };
                            ws[cellAddress].s.font = { color: { rgb: "9C0006" }, bold: true };
                        }
                    }
                } else {
                    // 상세: 평가 결과 컬럼 (col 8)
                    if (col === 8) {
                        const value = ws[cellAddress].v;
                        if (value === '만족') {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "C6EFCE" } };
                            ws[cellAddress].s.font = { color: { rgb: "006100" }, bold: true };
                        } else if (value === '불만족') {
                            ws[cellAddress].s.fill = { fgColor: { rgb: "FFC7CE" } };
                            ws[cellAddress].s.font = { color: { rgb: "9C0006" }, bold: true };
                        }
                    }
                }
            }
        }
        
        // 워크북 생성 및 시트 추가
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Assessment Results');
        
        // 다운로드
        XLSX.writeFile(wb, fileName);
        
        alert(`${results.length}건의 결과를 다운로드했습니다.`);
    } catch (error) {
        console.error('다운로드 실패:', error);
        alert('결과 다운로드에 실패했습니다.');
    }
}

// Written Test 결과 업로드
async function uploadWrittenTestResults() {
    const fileInput = document.getElementById('test-result-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // 데이터 변환 (새 양식)
            const results = jsonData.map(row => ({
                process_name: row['카테고리'],
                passed: row['만족 여부'] === '합격'
            }));
            
            // 업로드 불가 안내
            alert('간단 양식은 조회 전용입니다.\n\n업로드를 원하시면 다음 컬럼을 포함한 엑셀 파일을 준비해주세요:\n- 사번\n- 프로세스명\n- 점수\n- 합격여부\n- 시험일자');
            fileInput.value = '';
        } catch (error) {
            console.error('업로드 실패:', error);
            alert('결과 업로드에 실패했습니다.\n\n파일 형식을 확인해주세요.');
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Assessment 결과 업로드
async function uploadAssessmentResults() {
    const fileInput = document.getElementById('assessment-result-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // 데이터 변환
            const results = jsonData.map(row => ({
                employee_id: row['사번'],
                category: row['카테고리'],
                item_name: row['평가항목'],
                level: parseInt(row['레벨']),
                assessment_date: row['평가일자'] ? new Date(row['평가일자']).toISOString() : new Date().toISOString()
            }));
            
            // 서버에 업로드
            const response = await axios.post('/api/results/assessment/bulk', results);
            
            alert(`${response.data.count}건의 결과를 업로드했습니다.`);
            fileInput.value = '';
        } catch (error) {
            console.error('업로드 실패:', error);
            alert('결과 업로드에 실패했습니다.\n\n파일 형식을 확인해주세요.');
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
    
    // 채점 및 답안 정보 수집
    let correctCount = 0;
    const answers = [];
    
    currentQuizzes.forEach(quiz => {
        const isCorrect = selectedAnswers[quiz.id] === quiz.correct_answer;
        if (isCorrect) {
            correctCount++;
        }
        
        answers.push({
            quiz_id: quiz.id,
            selected_answer: selectedAnswers[quiz.id],
            is_correct: isCorrect
        });
    });
    
    const score = (correctCount / currentQuizzes.length) * 100;
    const passed = score >= 60; // 60점 이상 합격
    
    try {
        await axios.post('/api/test-results', {
            worker_id: parseInt(workerId),
            process_id: parseInt(processId),
            score: score,
            passed: passed,
            answers: answers
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

// ==================== Analysis Page ====================

let categoryChart = null;
let assessmentChart = null;
let allWorkers = []; // 전역 변수로 선언

async function showAnalysisPage() {
    const html = `
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-2xl font-bold mb-6 flex items-center">
                <i class="fas fa-chart-line mr-2 text-blue-600"></i>
                평가 결과 분석
            </h2>
            
            <!-- 법인 및 작업자 선택 -->
            <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-building mr-1"></i>법인 선택
                    </label>
                    <select id="analysis-entity-select" class="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none">
                        <option value="">법인을 선택하세요</option>
                        <option value="CSVN">CSVN</option>
                        <option value="CSCN">CSCN</option>
                        <option value="CSTW">CSTW</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-user mr-1"></i>작업자 선택 (사번 또는 이름으로 검색)
                    </label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="analysis-worker-search" 
                            placeholder="법인을 먼저 선택하세요" 
                            class="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none" 
                            disabled
                            autocomplete="off"
                        />
                        <div 
                            id="analysis-worker-dropdown" 
                            class="hidden absolute z-10 w-full border-2 border-blue-400 rounded-lg mt-1 bg-white shadow-xl max-h-80 overflow-y-auto"
                            style="top: 100%;"
                        >
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 분석 결과 영역 -->
            <div id="analysis-results" class="hidden">
                <!-- 작업자 정보 -->
                <div id="worker-info" class="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500"></div>
                
                <!-- 평가 유형 선택 탭 -->
                <div class="mb-6 border-b border-gray-200">
                    <nav class="flex space-x-8" aria-label="Tabs">
                        <button id="tab-written-test" onclick="switchAnalysisTab('written-test')" 
                                class="analysis-tab border-b-2 border-blue-500 text-blue-600 py-4 px-1 font-medium">
                            <i class="fas fa-file-alt mr-2"></i>Written Test 결과
                        </button>
                        <button id="tab-assessment" onclick="switchAnalysisTab('assessment')" 
                                class="analysis-tab border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 py-4 px-1 font-medium">
                            <i class="fas fa-clipboard-check mr-2"></i>Supervisor Assessment
                        </button>
                    </nav>
                </div>
                
                <!-- Written Test 탭 내용 -->
                <div id="content-written-test" class="analysis-tab-content">
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Written Test 결과 목록</h3>
                        </div>
                        <div id="test-results-list" class="space-y-2"></div>
                    </div>
                    
                    <!-- Written Test 상세 분석 -->
                    <div id="test-analysis" class="hidden">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Written Test 상세 분석</h3>
                            <button onclick="closeTestAnalysis()" class="text-gray-600 hover:text-gray-800">
                                <i class="fas fa-times mr-1"></i>닫기
                            </button>
                        </div>
                        
                        <div class="bg-gray-50 rounded-lg p-6 space-y-6">
                            <!-- 평균 비교 차트 -->
                            <div>
                                <h4 class="text-lg font-semibold mb-3">법인 평균 대비 점수</h4>
                                <div class="max-w-2xl">
                                    <canvas id="comparison-chart"></canvas>
                                </div>
                            </div>
                            
                            <!-- 카테고리별 오각형 차트 -->
                            <div>
                                <h4 class="text-lg font-semibold mb-3">영역별 성취도 (카테고리 분석)</h4>
                                <div class="max-w-md mx-auto">
                                    <canvas id="category-chart"></canvas>
                                </div>
                            </div>
                            
                            <!-- 추천 교육 프로그램 -->
                            <div id="training-recommendations">
                                <h4 class="text-lg font-semibold mb-3">추천 교육 프로그램</h4>
                                <div id="training-list" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Supervisor Assessment 탭 내용 -->
                <div id="content-assessment" class="analysis-tab-content hidden">
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Supervisor Assessment 결과 목록</h3>
                        </div>
                        <div id="assessment-results-list" class="space-y-2"></div>
                    </div>
                    
                    <!-- Supervisor Assessment 상세 분석 -->
                    <div id="assessment-analysis" class="hidden">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-xl font-bold">Supervisor Assessment 상세 분석</h3>
                            <button onclick="closeAssessmentAnalysis()" class="text-gray-600 hover:text-gray-800">
                                <i class="fas fa-times mr-1"></i>닫기
                            </button>
                        </div>
                        
                        <div class="bg-gray-50 rounded-lg p-6 space-y-6">
                            <!-- 레벨 평가 카테고리 차트 -->
                            <div>
                                <h4 class="text-lg font-semibold mb-3">영역별 평가 수준 (카테고리 분석)</h4>
                                <div class="max-w-md mx-auto">
                                    <canvas id="assessment-radar-chart"></canvas>
                                </div>
                            </div>
                            
                            <!-- 잘하고 있는 부분 / 취약한 부분 -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <!-- 잘하고 있는 부분 -->
                                <div class="bg-white rounded-lg p-6 border-l-4 border-green-500">
                                    <h4 class="text-lg font-semibold mb-3">
                                        <i class="fas fa-thumbs-up mr-2 text-green-600"></i>잘하고 있는 부분
                                    </h4>
                                    <div id="assessment-strengths" class="space-y-2"></div>
                                </div>
                                
                                <!-- 취약한 부분 -->
                                <div class="bg-white rounded-lg p-6 border-l-4 border-red-500">
                                    <h4 class="text-lg font-semibold mb-3">
                                        <i class="fas fa-exclamation-triangle mr-2 text-red-600"></i>취약한 부분
                                    </h4>
                                    <div id="assessment-weaknesses" class="space-y-2"></div>
                                </div>
                            </div>
                            
                            <!-- 다음 레벨 달성을 위한 개선점 -->
                            <div id="assessment-next-level" class="bg-white rounded-lg p-6 border-l-4 border-yellow-500">
                                <h4 class="text-lg font-semibold mb-3">
                                    <i class="fas fa-arrow-up mr-2 text-yellow-600"></i>다음 레벨 달성을 위한 개선점
                                </h4>
                                <div id="assessment-improvement" class="space-y-3"></div>
                            </div>
                            
                            <!-- 추천 교육 프로그램 -->
                            <div id="assessment-training">
                                <h4 class="text-lg font-semibold mb-3">추천 교육 프로그램</h4>
                                <div id="assessment-training-list" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('app').innerHTML = html;
    
    // allWorkers 초기화
    allWorkers = [];
    
    // 이벤트 리스너 등록
    document.getElementById('analysis-entity-select').addEventListener('change', loadAnalysisWorkers);
    
    // 작업자 검색 기능 (아래로 열리는 드롭다운)
    const searchInput = document.getElementById('analysis-worker-search');
    const dropdown = document.getElementById('analysis-worker-dropdown');
    
    searchInput.addEventListener('focus', () => {
        console.log('Search input focused, allWorkers:', allWorkers.length);
        if (!searchInput.disabled && allWorkers.length > 0) {
            renderWorkerDropdown(allWorkers);
        }
    });
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        console.log('Search term:', searchTerm);
        if (searchTerm === '') {
            if (allWorkers.length > 0) {
                renderWorkerDropdown(allWorkers);
            }
        } else {
            const filtered = allWorkers.filter(w => 
                w.employee_id.toLowerCase().includes(searchTerm) || 
                w.name.toLowerCase().includes(searchTerm)
            );
            console.log('Filtered workers:', filtered.length);
            renderWorkerDropdown(filtered);
        }
    });
    
    // 외부 클릭 시 드롭다운 닫기
    const handleOutsideClick = (e) => {
        if (dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    };
    
    // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
    document.removeEventListener('click', handleOutsideClick);
    document.addEventListener('click', handleOutsideClick);
}

function renderWorkerDropdown(workers) {
    const dropdown = document.getElementById('analysis-worker-dropdown');
    
    if (!dropdown) {
        console.error('Dropdown element not found');
        return;
    }
    
    console.log('Rendering worker dropdown with', workers.length, 'workers');
    
    if (workers.length === 0) {
        dropdown.innerHTML = '<div class="px-4 py-2 text-gray-500">검색 결과가 없습니다.</div>';
        dropdown.classList.remove('hidden');
        return;
    }
    
    const html = workers.map(worker => `
        <div class="px-4 py-2 hover:bg-blue-50 cursor-pointer worker-option" 
             data-worker-id="${worker.id}"
             data-worker-name="[${worker.employee_id}] ${worker.name}">
            <div class="font-medium">[${worker.employee_id}] ${worker.name}</div>
            <div class="text-xs text-gray-500">${worker.team} | ${worker.position}</div>
        </div>
    `).join('');
    
    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
    console.log('Dropdown should now be visible');
    
    // 각 옵션에 클릭 이벤트 추가
    dropdown.querySelectorAll('.worker-option').forEach(option => {
        option.addEventListener('click', () => {
            const workerId = option.dataset.workerId;
            const workerName = option.dataset.workerName;
            console.log('Worker selected:', workerId, workerName);
            document.getElementById('analysis-worker-search').value = workerName;
            dropdown.classList.add('hidden');
            loadWorkerAnalysis(workerId);
        });
    });
}

// 탭 전환 함수
function switchAnalysisTab(tabName) {
    // 모든 탭 비활성화
    document.querySelectorAll('.analysis-tab').forEach(tab => {
        tab.classList.remove('border-blue-500', 'text-blue-600');
        tab.classList.add('border-transparent', 'text-gray-500');
    });
    
    // 모든 컨텐츠 숨기기
    document.querySelectorAll('.analysis-tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // 선택된 탭 활성화
    const selectedTab = document.getElementById(`tab-${tabName}`);
    selectedTab.classList.remove('border-transparent', 'text-gray-500');
    selectedTab.classList.add('border-blue-500', 'text-blue-600');
    
    // 선택된 컨텐츠 표시
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
}

// 분석 닫기 함수들
function closeTestAnalysis() {
    document.getElementById('test-analysis').classList.add('hidden');
    
    // 차트 파괴
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }
}

function closeAssessmentAnalysis() {
    document.getElementById('assessment-analysis').classList.add('hidden');
    
    // 차트 파괴
    if (assessmentChart) {
        assessmentChart.destroy();
        assessmentChart = null;
    }
}

async function loadAnalysisWorkers() {
    const entity = document.getElementById('analysis-entity-select').value;
    const dropdown = document.getElementById('analysis-worker-dropdown');
    const searchInput = document.getElementById('analysis-worker-search');
    
    if (!entity) {
        allWorkers = [];
        dropdown.innerHTML = '';
        dropdown.classList.add('hidden');
        searchInput.value = '';
        searchInput.placeholder = '법인을 먼저 선택하세요';
        searchInput.disabled = true;
        document.getElementById('analysis-results').classList.add('hidden');
        return;
    }
    
    try {
        const response = await axios.get(`/api/analysis/workers?entity=${entity}`);
        allWorkers = response.data;
        
        console.log('Loaded workers:', allWorkers.length, 'workers');
        
        searchInput.disabled = false;
        searchInput.value = '';
        searchInput.placeholder = '사번 또는 이름으로 검색하세요 (예: 4136 또는 Dương)';
        dropdown.classList.add('hidden');
        document.getElementById('analysis-results').classList.add('hidden');
        
        console.log('Worker search enabled with', allWorkers.length, 'workers');
    } catch (error) {
        console.error('작업자 목록 로드 실패:', error);
        alert('작업자 목록을 불러오는데 실패했습니다.');
    }
}

// 현재 선택된 작업자 정보 저장
let currentWorkerData = null;

async function loadWorkerAnalysis(workerId) {
    if (!workerId) {
        document.getElementById('analysis-results').classList.add('hidden');
        return;
    }
    
    console.log('Loading analysis for worker ID:', workerId);
    
    try {
        const response = await axios.get(`/api/analysis/worker/${workerId}`);
        const data = response.data;
        
        // 전역 변수에 저장
        currentWorkerData = data;
        
        // 작업자 정보 표시
        displayWorkerInfo(data.worker);
        
        // Written Test 결과 목록 표시
        displayTestResults(data.test_results);
        
        // Assessment 결과 목록 표시
        displayAssessmentResultsList(data.assessments, data.process_info);
        
        // 분석 결과 표시
        document.getElementById('analysis-results').classList.remove('hidden');
        
        // 기본적으로 Written Test 탭 선택
        switchAnalysisTab('written-test');
    } catch (error) {
        console.error('작업자 분석 데이터 로드 실패:', error);
        alert('작업자 분석 데이터를 불러오는데 실패했습니다.');
    }
}

function displayWorkerInfo(worker) {
    const html = `
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-xl font-bold">${worker.name}</h3>
                <p class="text-gray-600">사번: ${worker.employee_id} | 법인: ${worker.entity} | 팀: ${worker.team} | 직급: ${worker.position}</p>
            </div>
        </div>
    `;
    document.getElementById('worker-info').innerHTML = html;
}

function displayTestResults(testResults) {
    const container = document.getElementById('test-results-list');
    
    if (!testResults || testResults.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Written Test 결과가 없습니다.</p>';
        return;
    }
    
    const html = testResults.map((result, index) => `
        <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onclick="showTestAnalysis(${result.id}, '${result.process_name}', ${result.process_id}, ${result.score}, ${result.worker_id})">
            <div class="flex justify-between items-center">
                <div>
                    <span class="font-semibold">${result.process_name}</span>
                    <span class="ml-4 text-gray-600">점수: ${result.score.toFixed(1)}점</span>
                    <span class="ml-2 px-2 py-1 rounded text-sm ${result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${result.passed ? '합격' : '불합격'}
                    </span>
                </div>
                <button class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-chart-bar mr-1"></i>상세 분석
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function displayAssessmentResultsList(assessments, processInfo) {
    const container = document.getElementById('assessment-results-list');
    
    if (!assessments || assessments.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Supervisor Assessment 결과가 없습니다.</p>';
        return;
    }
    
    // 프로세스별로 그룹화
    const groupedByProcess = {};
    assessments.forEach(assessment => {
        const processId = assessment.process_id;
        if (!groupedByProcess[processId]) {
            groupedByProcess[processId] = [];
        }
        groupedByProcess[processId].push(assessment);
    });
    
    const html = Object.entries(groupedByProcess).map(([processId, items]) => {
        const processName = items[0].process_name || '일반 평가';
        const latestDate = new Date(Math.max(...items.map(i => new Date(i.latest_date))));
        const year = latestDate.getFullYear();
        const avgLevel = (items.reduce((sum, i) => sum + i.avg_level, 0) / items.length).toFixed(1);
        
        return `
            <div class="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" 
                 onclick="showAssessmentAnalysis(${processId}, '${processName}')">
                <div class="flex justify-between items-center">
                    <div>
                        <span class="font-semibold">${processName}</span>
                        <span class="ml-4 text-gray-600">${year}년 평가</span>
                        <span class="ml-4 text-gray-600">평균 레벨: ${avgLevel}</span>
                        <span class="ml-2 px-2 py-1 rounded text-sm bg-purple-100 text-purple-800">
                            ${items.length}개 카테고리
                        </span>
                    </div>
                    <button class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-chart-bar mr-1"></i>상세 분석
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

async function showAssessmentAnalysis(processId, processName) {
    const workerId = currentWorkerData.worker.id;
    
    // 해당 프로세스의 assessment 데이터 필터링
    const assessmentData = currentWorkerData.assessments.filter(a => a.process_id === processId);
    
    if (assessmentData.length === 0) {
        alert('평가 데이터를 찾을 수 없습니다.');
        return;
    }
    
    // 상세 분석 영역 표시
    document.getElementById('assessment-analysis').classList.remove('hidden');
    
    // 레이더 차트 그리기
    drawAssessmentRadarChart(assessmentData, processName);
    
    // 잘하는 부분과 취약한 부분 분석
    displayStrengthsAndWeaknesses(assessmentData);
    
    // 다음 레벨 달성을 위한 분석
    displayNextLevelAnalysis(assessmentData, processId, processName);
    
    // 추천 교육 프로그램
    await displayAssessmentTraining(assessmentData, processId);
}

function drawAssessmentRadarChart(assessmentData, processName) {
    const ctx = document.getElementById('assessment-radar-chart');
    
    // 기존 차트 파괴
    if (assessmentChart) {
        assessmentChart.destroy();
    }
    
    const labels = assessmentData.map(a => a.category);
    const data = assessmentData.map(a => a.avg_level);
    
    assessmentChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: processName + ' 평가',
                data: data,
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(139, 92, 246, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(139, 92, 246, 1)',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.2,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 5,
                    min: 0,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    },
                    pointLabels: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.r.toFixed(1) + ' / 5.0';
                        }
                    }
                }
            }
        }
    });
}

function displayStrengthsAndWeaknesses(assessmentData) {
    const strengthsContainer = document.getElementById('assessment-strengths');
    const weaknessesContainer = document.getElementById('assessment-weaknesses');
    
    // 평균 레벨 계산
    const avgLevel = assessmentData.reduce((sum, a) => sum + a.avg_level, 0) / assessmentData.length;
    
    // 잘하는 부분 (평균 이상 + 레벨 3.5 이상)
    const strengths = assessmentData
        .filter(a => a.avg_level >= 3.5 && a.avg_level >= avgLevel)
        .sort((a, b) => b.avg_level - a.avg_level)
        .slice(0, 5); // 상위 5개
    
    // 취약한 부분 (평균 이하 또는 레벨 3.0 미만)
    const weaknesses = assessmentData
        .filter(a => a.avg_level < avgLevel || a.avg_level < 3.0)
        .sort((a, b) => a.avg_level - b.avg_level)
        .slice(0, 5); // 하위 5개
    
    // 잘하는 부분 표시
    if (strengths.length === 0) {
        strengthsContainer.innerHTML = `
            <p class="text-gray-500 text-center py-4">
                <i class="fas fa-info-circle mr-2"></i>
                현재 우수한 카테고리가 없습니다.<br>
                전반적인 실력 향상이 필요합니다.
            </p>
        `;
    } else {
        const strengthsHtml = strengths.map((item, index) => `
            <div class="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    ${index + 1}
                </div>
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">${item.category}</div>
                    <div class="text-sm text-gray-600">${item.item_count}개 항목 평가</div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-bold text-green-600">${item.avg_level.toFixed(1)}</div>
                    <div class="text-xs text-gray-500">/ 5.0</div>
                </div>
            </div>
        `).join('');
        
        strengthsContainer.innerHTML = strengthsHtml;
    }
    
    // 취약한 부분 표시
    if (weaknesses.length === 0) {
        weaknessesContainer.innerHTML = `
            <p class="text-gray-500 text-center py-4">
                <i class="fas fa-check-circle mr-2 text-green-500"></i>
                모든 카테고리에서 우수한 성과를 보이고 있습니다!
            </p>
        `;
    } else {
        const weaknessesHtml = weaknesses.map((item, index) => `
            <div class="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">
                    ${index + 1}
                </div>
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">${item.category}</div>
                    <div class="text-sm text-gray-600">${item.item_count}개 항목 평가</div>
                </div>
                <div class="text-right">
                    <div class="text-xl font-bold text-red-600">${item.avg_level.toFixed(1)}</div>
                    <div class="text-xs text-gray-500">/ 5.0</div>
                </div>
            </div>
        `).join('');
        
        weaknessesContainer.innerHTML = weaknessesHtml;
    }
}

function displayNextLevelAnalysis(assessmentData, processId, processName) {
    const container = document.getElementById('assessment-improvement');
    
    // 평균 레벨 계산
    const avgLevel = assessmentData.reduce((sum, a) => sum + a.avg_level, 0) / assessmentData.length;
    const currentLevel = Math.floor(avgLevel);
    const nextLevel = currentLevel + 1;
    
    if (nextLevel > 5) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-trophy text-yellow-500 text-4xl mb-2"></i>
                <p class="text-lg font-semibold text-gray-800">최고 레벨에 도달했습니다!</p>
                <p class="text-gray-600 mt-2">현재 평균 레벨: ${avgLevel.toFixed(1)} / 5.0</p>
                <p class="text-gray-600">모든 영역에서 우수한 성과를 보이고 있습니다.</p>
            </div>
        `;
        return;
    }
    
    // 약한 카테고리 찾기 (평균보다 낮은 항목)
    const weakCategories = assessmentData
        .filter(a => a.avg_level < avgLevel)
        .sort((a, b) => a.avg_level - b.avg_level)
        .slice(0, 3);
    
    // 개선이 필요한 카테고리
    const needImprovement = assessmentData
        .filter(a => a.avg_level < nextLevel)
        .sort((a, b) => a.avg_level - b.avg_level);
    
    let html = `
        <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
                <span class="text-gray-700 font-medium">현재 평균 레벨:</span>
                <span class="text-2xl font-bold text-blue-600">${avgLevel.toFixed(1)} / 5.0</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-gray-700 font-medium">목표 레벨:</span>
                <span class="text-2xl font-bold text-green-600">Level ${nextLevel}</span>
            </div>
        </div>
        
        <div class="border-t pt-4">
            <h5 class="font-semibold text-gray-800 mb-3">
                <i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                개선이 필요한 영역 (${needImprovement.length}개)
            </h5>
            <div class="space-y-2">
    `;
    
    needImprovement.forEach(cat => {
        const gap = nextLevel - cat.avg_level;
        const percentage = (cat.avg_level / nextLevel) * 100;
        
        html += `
            <div class="bg-white p-3 rounded border">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-gray-800">${cat.category}</span>
                    <span class="text-sm text-gray-600">현재: ${cat.avg_level.toFixed(1)} / 목표: ${nextLevel}.0</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-yellow-500 h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>
                <p class="text-xs text-gray-600 mt-1">
                    <i class="fas fa-arrow-up text-green-500 mr-1"></i>
                    ${gap.toFixed(1)}점 향상 필요
                </p>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    if (weakCategories.length > 0) {
        html += `
            <div class="border-t pt-4 mt-4">
                <h5 class="font-semibold text-gray-800 mb-3">
                    <i class="fas fa-chart-line text-red-500 mr-2"></i>
                    상대적으로 약한 영역
                </h5>
                <ul class="space-y-2">
        `;
        
        weakCategories.forEach((cat, index) => {
            html += `
                <li class="flex items-center text-gray-700">
                    <span class="w-6 h-6 rounded-full bg-red-100 text-red-800 text-xs flex items-center justify-center mr-2">${index + 1}</span>
                    <span class="font-medium">${cat.category}</span>
                    <span class="ml-auto text-sm text-gray-600">${cat.avg_level.toFixed(1)} / 5.0</span>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

async function displayAssessmentTraining(assessmentData, processId) {
    const container = document.getElementById('assessment-training-list');
    
    // 약한 카테고리들 찾기
    const avgLevel = assessmentData.reduce((sum, a) => sum + a.avg_level, 0) / assessmentData.length;
    const weakCategories = assessmentData
        .filter(a => a.avg_level < avgLevel)
        .map(a => a.category);
    
    if (weakCategories.length === 0) {
        container.innerHTML = '<p class="text-gray-500 col-span-2">모든 영역에서 우수한 성과를 보이고 있습니다.</p>';
        return;
    }
    
    try {
        // 약한 카테고리들에 대한 교육 프로그램 조회
        const promises = weakCategories.map(category => 
            axios.get(`/api/analysis/training-recommendations?processId=${processId}&weakCategory=${encodeURIComponent(category)}`)
        );
        
        const responses = await Promise.all(promises);
        const allTrainings = responses.flatMap(r => r.data);
        
        // 중복 제거
        const uniqueTrainings = Array.from(new Map(allTrainings.map(t => [t.id, t])).values());
        
        if (uniqueTrainings.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-2">추천 교육 프로그램이 없습니다.</p>';
            return;
        }
        
        const html = uniqueTrainings.map(training => `
            <div class="border rounded-lg p-4 bg-white hover:shadow-md transition">
                <div class="flex items-start justify-between mb-2">
                    <h5 class="font-semibold text-gray-800">${training.title}</h5>
                    <span class="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">${training.duration_hours}시간</span>
                </div>
                <p class="text-sm text-gray-600 mb-2">${training.description || '설명 없음'}</p>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-500">
                        <i class="fas fa-bullseye mr-1"></i>${training.category}
                    </span>
                    <span class="text-blue-600">
                        <i class="fas fa-arrow-up mr-1"></i>${training.target_weakness}
                    </span>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    } catch (error) {
        console.error('교육 프로그램 조회 실패:', error);
        container.innerHTML = '<p class="text-red-500 col-span-2">교육 프로그램을 불러오는데 실패했습니다.</p>';
    }
}

async function showTestAnalysis(resultId, processName, processId, score, workerId) {
    // 작업자 정보에서 법인 가져오기
    const entity = currentWorkerData ? currentWorkerData.worker.entity : document.getElementById('analysis-entity-select').value;
    
    try {
        // 해당 법인, 해당 프로세스의 평균 점수 가져오기
        const avgResponse = await axios.get(`/api/analysis/entity-average?entity=${entity}&processId=${processId}`);
        const entityAverage = avgResponse.data.average_score;
        
        // 평균 비교 차트 그리기 (법인명과 프로세스명 포함)
        drawComparisonChart(processName, score, entityAverage, entity);
        
        // 카테고리별 점수 가져오기
        const categoryResponse = await axios.get(`/api/analysis/test-categories/${resultId}`);
        const categoryScores = categoryResponse.data;
        
        // 오각형 차트 그리기
        drawCategoryChart(categoryScores);
        
        // 가장 낮은 카테고리 찾기
        const weakestCategory = categoryScores.reduce((min, item) => 
            parseFloat(item.score) < parseFloat(min.score) ? item : min
        );
        
        // 추천 교육 프로그램 가져오기
        const trainingResponse = await axios.get(`/api/analysis/training-recommendations?processId=${processId}&weakCategory=${weakestCategory.category}`);
        const trainings = trainingResponse.data;
        
        // 추천 교육 표시
        displayTrainingRecommendations(trainings, weakestCategory.category);
        
        document.getElementById('test-analysis').classList.remove('hidden');
    } catch (error) {
        console.error('테스트 분석 데이터 로드 실패:', error);
        alert('테스트 분석 데이터를 불러오는데 실패했습니다.');
    }
}

function drawComparisonChart(processName, workerScore, entityAverage, entity) {
    const ctx = document.getElementById('comparison-chart');
    
    // 기존 차트 파괴
    if (window.comparisonChartInstance) {
        window.comparisonChartInstance.destroy();
    }
    
    window.comparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['내 점수', `${entity} ${processName} 평균`],
            datasets: [{
                label: processName + ' 점수',
                data: [workerScore, entityAverage],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(156, 163, 175, 0.8)'
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(156, 163, 175, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '점';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toFixed(1) + '점';
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    formatter: (value) => parseFloat(value).toFixed(1) + '점',
                    font: {
                        weight: 'bold'
                    }
                }
            }
        }
    });
}

function drawCategoryChart(categoryScores) {
    const ctx = document.getElementById('category-chart');
    
    // 기존 차트 파괴
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const categories = categoryScores.map(item => item.category);
    const scores = categoryScores.map(item => parseFloat(item.score));
    
    categoryChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: categories,
            datasets: [{
                label: '영역별 점수',
                data: scores,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.2,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) {
                            return value + '점';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.r.toFixed(1) + '점';
                        }
                    }
                }
            }
        }
    });
}

function displayTrainingRecommendations(trainings, weakCategory) {
    const container = document.getElementById('training-list');
    
    if (!trainings || trainings.length === 0) {
        container.innerHTML = '<p class="text-gray-500">추천 교육 프로그램이 없습니다.</p>';
        return;
    }
    
    const html = `
        <div class="col-span-full mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500">
            <p class="font-semibold text-yellow-800">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                "${weakCategory}" 영역이 가장 낮습니다. 다음 교육을 추천합니다:
            </p>
        </div>
        ${trainings.map(training => `
            <div class="border rounded-lg p-4 hover:shadow-md transition">
                <div class="flex items-start justify-between mb-2">
                    <h5 class="font-semibold text-lg">${training.title}</h5>
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">${training.category}</span>
                </div>
                <p class="text-gray-600 text-sm mb-2">${training.description || ''}</p>
                <div class="flex items-center text-sm text-gray-500">
                    <i class="fas fa-clock mr-1"></i>
                    ${training.duration_hours}시간
                </div>
            </div>
        `).join('')}
    `;
    
    container.innerHTML = html;
}

function displayAssessmentResults(assessments, processInfo) {
    if (!assessments || assessments.length === 0) {
        document.getElementById('assessment-analysis').classList.add('hidden');
        return;
    }
    
    console.log('Assessment data:', assessments);
    
    // 카테고리별 평균 레벨을 차트 데이터로 변환
    drawAssessmentChart(assessments);
    displayAssessmentTraining(assessments, processInfo);
    
    document.getElementById('assessment-analysis').classList.remove('hidden');
}

function drawAssessmentChart(assessments) {
    const ctx = document.getElementById('assessment-chart');
    
    // 기존 차트 파괴
    if (assessmentChart) {
        assessmentChart.destroy();
    }
    
    // 카테고리별 평균 레벨 데이터로 차트 생성
    // assessments는 [{category, avg_level, ...}, ...] 형식
    const categories = assessments.map(item => item.category);
    const scores = assessments.map(item => item.avg_level);
    
    assessmentChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Assessment 레벨',
                data: scores,
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(34, 197, 94, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.2,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Level ' + context.parsed.r.toFixed(1);
                        }
                    }
                }
            }
        }
    });
}

async function displayAssessmentTraining(assessments, processInfo) {
    const container = document.getElementById('assessment-training-list');
    
    if (!assessments || assessments.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Assessment 데이터가 없습니다.</p>';
        return;
    }
    
    // 가장 낮은 평균 레벨의 카테고리 찾기
    const weakest = assessments.reduce((min, item) => 
        item.avg_level < min.avg_level ? item : min
    );
    
    try {
        const processId = weakest.process_id || (processInfo ? processInfo.id : null);
        
        if (!processId) {
            container.innerHTML = '<p class="text-gray-500">프로세스 정보를 찾을 수 없습니다.</p>';
            return;
        }
        
        // 카테고리를 교육 프로그램 카테고리로 매핑
        let trainingCategory = weakest.category;
        if (weakest.category.includes('Level')) {
            // Level2, Level3, Level4 -> 기술로 매핑
            trainingCategory = '기술';
        }
        
        const response = await axios.get(`/api/analysis/training-recommendations?processId=${processId}&weakCategory=${trainingCategory}`);
        const trainings = response.data;
        
        const html = `
            <div class="col-span-full mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500">
                <p class="font-semibold text-yellow-800">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    "${weakest.category}" 영역이 가장 낮습니다 (평균 레벨 ${weakest.avg_level.toFixed(1)}). 다음 교육을 추천합니다:
                </p>
            </div>
            ${trainings.map(training => `
                <div class="border rounded-lg p-4 hover:shadow-md transition">
                    <div class="flex items-start justify-between mb-2">
                        <h5 class="font-semibold text-lg">${training.title}</h5>
                        <span class="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">${training.category}</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-2">${training.description || ''}</p>
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-clock mr-1"></i>
                        ${training.duration_hours}시간
                    </div>
                </div>
            `).join('')}
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Assessment 교육 추천 로드 실패:', error);
        container.innerHTML = '<p class="text-gray-500">교육 프로그램을 불러오는데 실패했습니다.</p>';
    }
}
