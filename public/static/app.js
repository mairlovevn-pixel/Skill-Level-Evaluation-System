// 애플리케이션 상태 관리 객체
const AppState = {
    currentPage: 'dashboard',
    dashboardData: null,
    positions: [],
    workers: [],
    teamProcessMapping: {},
    charts: {
        testStatus: null,
        avgScore: null,
        assessment: null
    },
    
    // 상태 초기화 (테스트용)
    reset() {
        this.currentPage = 'dashboard';
        this.dashboardData = null;
        this.positions = [];
        this.workers = [];
        this.teamProcessMapping = {};
        this.passThreshold = 70;
        this.charts = {
            testStatus: null,
            avgScore: null,
            assessment: null
        };
    },
    
    // Getter 메서드
    getCurrentPage() { return this.currentPage; },
    getDashboardData() { return this.dashboardData; },
    getProcesses() { return this.positions; },
    getWorkers() { return this.workers; },
    getTeamProcessMapping() { return this.teamProcessMapping; },
    getPassThreshold() { return this.passThreshold; },
    getChart(name) { return this.charts[name]; },
    
    // Setter 메서드
    setCurrentPage(page) { this.currentPage = page; },
    setDashboardData(data) { this.dashboardData = data; },
    setProcesses(positions) { this.positions = positions; },
    setWorkers(workers) { this.workers = workers; },
    setTeamProcessMapping(mapping) { this.teamProcessMapping = mapping; },
    setPassThreshold(threshold) { this.passThreshold = threshold; },
    setChart(name, chart) { this.charts[name] = chart; }
};

// 하위 호환성을 위한 전역 변수 (점진적 마이그레이션용)
let currentPage = AppState.currentPage;
let dashboardData = AppState.dashboardData;
let positions = AppState.positions;
let workers = AppState.workers;

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

// Excel 유틸리티 함수
function convertLevelToResult(level) {
    if (level === null || level === undefined) {
        return 'N/A';
    }
    return level >= ASSESSMENT_LEVEL.SATISFACTORY_THRESHOLD ? '만족' : '불만족';
}

function applyExcelHeaderStyle(worksheet, useYellowBg = false) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const bgColor = useYellowBg ? EXCEL_COLORS.HEADER_BG_YELLOW : EXCEL_COLORS.HEADER_BG;
    const textColor = useYellowBg ? EXCEL_COLORS.HEADER_TEXT_BLACK : EXCEL_COLORS.HEADER_TEXT;
    
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
            font: { bold: true, color: { rgb: textColor }, sz: 12 },
            fill: { fgColor: { rgb: bgColor } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: EXCEL_COLORS.BORDER } },
                bottom: { style: "thin", color: { rgb: EXCEL_COLORS.BORDER } },
                left: { style: "thin", color: { rgb: EXCEL_COLORS.BORDER } },
                right: { style: "thin", color: { rgb: EXCEL_COLORS.BORDER } }
            }
        };
    }
}

function applyCellColorByValue(worksheet, rowIndex, colIndex, value, passKeyword, failKeyword) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
    if (!worksheet[cellAddress] || !worksheet[cellAddress].s) return;
    
    if (value === passKeyword) {
        worksheet[cellAddress].s.fill = { fgColor: { rgb: EXCEL_COLORS.PASS_BG } };
        worksheet[cellAddress].s.font = { color: { rgb: EXCEL_COLORS.PASS_TEXT }, bold: true };
    } else if (value === failKeyword) {
        worksheet[cellAddress].s.fill = { fgColor: { rgb: EXCEL_COLORS.FAIL_BG } };
        worksheet[cellAddress].s.font = { color: { rgb: EXCEL_COLORS.FAIL_TEXT }, bold: true };
    }
}

function createExcelWorkbook(data, sheetName, columnWidths) {
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = columnWidths;
    applyExcelHeaderStyle(ws);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return { workbook: wb, worksheet: ws };
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

// Excel 스타일 상수
const EXCEL_COLORS = {
    HEADER_BG: "70AD47",
    HEADER_BG_YELLOW: "FFFF00",
    HEADER_TEXT: "FFFFFF",
    HEADER_TEXT_BLACK: "000000",
    PASS_BG: "C6EFCE",
    PASS_TEXT: "006100",
    FAIL_BG: "FFC7CE",
    FAIL_TEXT: "9C0006",
    BORDER: "000000",
    BORDER_LIGHT: "D3D3D3"
};

const EXCEL_COLUMN_WIDTHS = {
    NO: 6,
    EMPLOYEE_ID: 12,
    NAME: 15,
    ENTITY: 10,
    TEAM: 20,
    POSITION: 15,
    CATEGORY: 20,
    LEVEL_CATEGORY: 15,
    ITEM_NAME: 50,
    ITEM_NAME_SHORT: 25,
    LEVEL: 12,
    RESULT: 12,
    DATE: 15
};

// 평가 레벨 임계값
const ASSESSMENT_LEVEL = {
    SATISFACTORY_THRESHOLD: 3  // level >= 3 이면 만족
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
        case 'chatbot':
            app.innerHTML = getChatbotHTML();
            initializeChatbot();
            break;
    }
}

// Load positions list
async function loadProcesses() {
    try {
        const response = await axios.get('/api/positions');
        positions = response.data;
        
        // 지정된 순서대로 정렬
        const order = [
            'Material Handling',
            'Cutting',
            'Beveling',
            'Bending',
            'LS Welding',
            'Fit Up',
            'CS Welding',
            'VTMT',
            'Bracket FU',
            'Bracket Weld',
            'UT repair',
            'DF FU',
            'DF Weld',
            'Flatness',
            'Drilling',
            'Blasting',
            'Metalizing',
            'Paint',
            'Mechanical',
            'Electrical',
            'Paint ring',
            'Material Handler_IM',
            'EHS',
            'IM_Mounting Final (QIF)',
            'WH_Kitset',
            'TRANSPORTATION',
            'MAINTENANCE'
        ];
        
        positions.sort((a, b) => {
            const indexA = order.indexOf(a.name);
            const indexB = order.indexOf(b.name);
            
            // 순서에 없는 항목은 맨 뒤로
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            
            return indexA - indexB;
        });
    } catch (error) {
        console.error('Failed to load positions:', error);
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
            
            <!-- Written Test 현황 차트 (전체 너비) -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-bold text-gray-800">
                        <i class="fas fa-chart-bar mr-2"></i>
                        Written Test Results
                    </h3>
                </div>
                
                <!-- Filters -->
                <div class="grid grid-cols-4 gap-3 mb-4">
                        <!-- Pass Score Threshold -->
                        <div class="relative">
                            <label class="block text-xs font-semibold text-gray-700 mb-1">
                                <i class="fas fa-trophy mr-1 text-yellow-500"></i>
                                Pass Score
                            </label>
                            <select id="pass-threshold-select" onchange="updatePassThreshold()" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500">
                                <option value="50">50점</option>
                                <option value="55">55점</option>
                                <option value="60">60점</option>
                                <option value="65">65점</option>
                                <option value="70" selected>70점 (기본)</option>
                                <option value="75">75점</option>
                                <option value="80">80점</option>
                                <option value="85">85점</option>
                                <option value="90">90점</option>
                                <option value="95">95점</option>
                                <option value="100">100점</option>
                            </select>
                        </div>
                        
                        <!-- Entity Filter -->
                        <div class="relative">
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Entity</label>
                            <button onclick="toggleDropdown('entity-filter')" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex justify-between items-center">
                                <span id="entity-filter-label">All</span>
                                <i class="fas fa-chevron-down text-xs"></i>
                            </button>
                            <div id="entity-filter-dropdown" class="hidden absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" value="ALL" checked onchange="updateTestStatusFilter('entity', this)" class="entity-filter-checkbox mr-2">
                                    <span class="text-sm">All</span>
                                </label>
                                <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" value="CSVN" checked onchange="updateTestStatusFilter('entity', this)" class="entity-filter-checkbox mr-2">
                                    <span class="text-sm">CSVN</span>
                                </label>
                                <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" value="CSCN" checked onchange="updateTestStatusFilter('entity', this)" class="entity-filter-checkbox mr-2">
                                    <span class="text-sm">CSCN</span>
                                </label>
                                <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                                    <input type="checkbox" value="CSTW" checked onchange="updateTestStatusFilter('entity', this)" class="entity-filter-checkbox mr-2">
                                    <span class="text-sm">CSTW</span>
                                </label>
                            </div>
                        </div>
                        
                        <!-- Team Filter -->
                        <div class="relative">
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Team</label>
                            <button onclick="toggleDropdown('team-filter')" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex justify-between items-center">
                                <span id="team-filter-label">All</span>
                                <i class="fas fa-chevron-down text-xs"></i>
                            </button>
                            <div id="team-filter-dropdown" class="hidden absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>
                        
                        <!-- Position Filter -->
                        <div class="relative">
                            <label class="block text-xs font-semibold text-gray-700 mb-1">Position</label>
                            <button onclick="toggleDropdown('position-filter')" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex justify-between items-center">
                                <span id="position-filter-label">All</span>
                                <i class="fas fa-chevron-down text-xs"></i>
                            </button>
                            <div id="position-filter-dropdown" class="hidden absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>
                    </div>
                    
                    <canvas id="test-status-chart"></canvas>
                </div>
            </div>
            
            <!-- Written Test Analysis (전체 너비) -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-magnifying-glass-chart mr-2"></i>
                    Written Test Analysis
                </h3>
                
                <!-- Analysis Mode Tabs -->
                <div class="flex gap-2 mb-6 border-b border-gray-200">
                    <button onclick="switchAnalysisMode('heatmap')" id="tab-heatmap" class="analysis-tab px-6 py-3 font-semibold text-blue-600 border-b-2 border-blue-600">
                        <i class="fas fa-table-cells mr-2"></i>Position Heatmap
                    </button>
                    <button onclick="switchAnalysisMode('weakness')" id="tab-weakness" class="analysis-tab px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
                        <i class="fas fa-triangle-exclamation mr-2"></i>Weakness Analysis
                    </button>
                    <button onclick="switchAnalysisMode('summary')" id="tab-summary" class="analysis-tab px-6 py-3 font-semibold text-gray-500 hover:text-gray-700">
                        <i class="fas fa-gauge-high mr-2"></i>Summary KPI
                    </button>
                </div>
                
                <!-- Filters (Dynamic based on mode) -->
                <div id="analysis-filters" class="mb-6">
                    <!-- Entity Filter -->
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Entity</label>
                        <div class="flex gap-4">
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="checkbox" value="CSVN" checked onchange="updateAnalysisFilter()" class="analysis-entity-checkbox w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mr-2">
                                <span class="text-sm">CSVN</span>
                            </label>
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="checkbox" value="CSCN" checked onchange="updateAnalysisFilter()" class="analysis-entity-checkbox w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mr-2">
                                <span class="text-sm">CSCN</span>
                            </label>
                            <label class="inline-flex items-center cursor-pointer">
                                <input type="checkbox" value="CSTW" checked onchange="updateAnalysisFilter()" class="analysis-entity-checkbox w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mr-2">
                                <span class="text-sm">CSTW</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Team Filter -->
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Team</label>
                        <div class="flex flex-wrap gap-4" id="analysis-team-checkboxes">
                            <!-- Will be populated dynamically -->
                        </div>
                    </div>
                    
                    <!-- Position Filter -->
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                        <div class="flex flex-wrap gap-4" id="analysis-position-checkboxes">
                            <!-- Will be populated dynamically -->
                        </div>
                    </div>
                </div>
                
                <!-- Chart Area -->
                <div id="analysis-chart-container">
                    <canvas id="analysis-chart"></canvas>
                </div>
                
                <!-- Additional Info Area (for tables, alerts, etc.) -->
                <div id="analysis-info-container" class="mt-6">
                    <!-- Dynamic content based on analysis mode -->
                </div>
            </div>
            
            <!-- Supervisor Assessment 현황 -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">
                        <i class="fas fa-star mr-2"></i>
                        Level별 법인 현황 (Supervisor Assessment)
                    </h3>
                    <div class="flex gap-2">
                        <div class="w-36">
                            <select id="assessment-team-select" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" onchange="onAssessmentTeamChange()">
                                <option value="">전체 팀</option>
                            </select>
                        </div>
                        <div class="w-36">
                            <select id="assessment-position-select" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" onchange="filterAssessmentChart()">
                                <option value="">All Positions</option>
                            </select>
                        </div>
                    </div>
                </div>
                <canvas id="assessment-chart"></canvas>
            </div>
        </div>
    `;
}

// 레거시 전역 변수 (AppState로 점진적 마이그레이션 예정)
let allDashboardData = null;
let currentTestStatusChart = null;
let currentAvgScoreChart = null;
let currentAssessmentChart = null;
let teamProcessMapping = {};

async function loadDashboard() {
    try {
        const passThreshold = AppState.getPassThreshold();
        const response = await axios.get(`/api/dashboard/stats?passThreshold=${passThreshold}`);
        allDashboardData = response.data;
        dashboardData = response.data;
        
        // 테스트 결과가 있는 팀 목록만 가져오기
        const teamsResponse = await axios.get('/api/teams');
        const teams = teamsResponse.data;
        
        // Get worker info for team-position mapping
        const workersResponse = await axios.get('/api/workers');
        const workers = workersResponse.data;
        
        // Create team-position mapping
        teamProcessMapping = {};
        workers.forEach(worker => {
            if (worker.team && worker.position) {
                if (!teamProcessMapping[worker.team]) {
                    teamProcessMapping[worker.team] = new Set();
                }
                // Map position to position name
                const processName = mapPositionToProcess(worker.position);
                if (processName) {
                    teamProcessMapping[worker.team].add(processName);
                }
            }
        });
        
        // Set을 배열로 변환
        Object.keys(teamProcessMapping).forEach(team => {
            teamProcessMapping[team] = Array.from(teamProcessMapping[team]);
        });
        
        // 팀 셀렉트 박스 채우기
        if (teams.length > 0) {
            populateTeamSelect('avg-score-team-select', teams);
            populateTeamSelect('assessment-team-select', teams);
        }
        
        // 초기 프로세스 셀렉트 박스 채우기 (전체 프로세스)
        updateProcessSelectForTeam('avg-score', null);
        updateProcessSelectForTeam('assessment', null);
        
        // 요약 카드 업데이트
        updateDashboardStats();
        
        // 필터 초기화
        populateTestStatusFilters();
        
        // 분석 탭 초기화
        initializeAnalysisTab();
        
        // 차트 렌더링
        renderTestStatusChart();
        renderAvgScoreChart();
        renderAssessmentChart();
        
        // 분석 탭 초기화
        initializeAnalysisTab();
    } catch (error) {
        console.error('대시보드 로드 실패:', error);
        alert('대시보드 데이터를 불러오는데 실패했습니다.');
    }
}

// ==================== Written Test Analysis Tab Functions ====================

let currentAnalysisMode = 'heatmap';
let analysisFilters = {
    entities: new Set(['CSVN', 'CSCN', 'CSTW']),
    teams: new Set(),
    positions: new Set()
};

function initializeAnalysisTab() {
    // Populate team checkboxes
    const teamContainer = document.getElementById('analysis-team-checkboxes');
    teamContainer.innerHTML = '';
    WRITTEN_TEST_TEAM_ORDER.forEach(team => {
        teamContainer.innerHTML += `
            <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" value="${team}" checked onchange="updateAnalysisFilter()" class="analysis-team-checkbox w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mr-2">
                <span class="text-sm">${team}</span>
            </label>
        `;
        analysisFilters.teams.add(team);
    });
    
    // Populate position checkboxes
    const positionContainer = document.getElementById('analysis-position-checkboxes');
    positionContainer.innerHTML = '';
    const allPositions = [];
    WRITTEN_TEST_TEAM_ORDER.forEach(team => {
        if (WRITTEN_TEST_TEAM_POSITIONS[team]) {
            WRITTEN_TEST_TEAM_POSITIONS[team].forEach(pos => {
                if (!allPositions.includes(pos)) {
                    allPositions.push(pos);
                }
            });
        }
    });
    
    allPositions.forEach(position => {
        positionContainer.innerHTML += `
            <label class="inline-flex items-center cursor-pointer">
                <input type="checkbox" value="${position}" checked onchange="updateAnalysisFilter()" class="analysis-position-checkbox w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mr-2">
                <span class="text-sm text-xs">${position}</span>
            </label>
        `;
        analysisFilters.positions.add(position);
    });
    
    // Load initial analysis
    switchAnalysisMode('heatmap');
}

function switchAnalysisMode(mode) {
    currentAnalysisMode = mode;
    
    // Update tab styles
    document.querySelectorAll('.analysis-tab').forEach(tab => {
        tab.classList.remove('text-blue-600', 'border-blue-600', 'border-b-2');
        tab.classList.add('text-gray-500');
    });
    
    const activeTab = document.getElementById(`tab-${mode}`);
    if (activeTab) {
        activeTab.classList.remove('text-gray-500');
        activeTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
    }
    
    // Render analysis based on mode
    renderAnalysis();
}

async function updateAnalysisFilter() {
    // Update entity filters
    const entityCheckboxes = document.querySelectorAll('.analysis-entity-checkbox');
    analysisFilters.entities = new Set();
    entityCheckboxes.forEach(cb => {
        if (cb.checked) analysisFilters.entities.add(cb.value);
    });
    
    // Update team filters
    const teamCheckboxes = document.querySelectorAll('.analysis-team-checkbox');
    analysisFilters.teams = new Set();
    teamCheckboxes.forEach(cb => {
        if (cb.checked) analysisFilters.teams.add(cb.value);
    });
    
    // Update position filters
    const positionCheckboxes = document.querySelectorAll('.analysis-position-checkbox');
    analysisFilters.positions = new Set();
    positionCheckboxes.forEach(cb => {
        if (cb.checked) analysisFilters.positions.add(cb.value);
    });
    
    // Reload data if entity filter changed (to get correct data from API)
    // Note: We don't use entity filter in API because frontend manages multi-entity selection
    // But if needed in future, we can add: ?entity=${Array.from(analysisFilters.entities).join(',')}
    
    // Re-render analysis with current dashboardData
    renderAnalysis();
}

function renderAnalysis() {
    switch(currentAnalysisMode) {
        case 'heatmap':
            renderHeatmapAnalysis();
            break;
        case 'weakness':
            renderWeaknessAnalysis();
            break;
        case 'summary':
            renderSummaryKPI();
            break;
    }
}

function renderHeatmapAnalysis() {
    const container = document.getElementById('analysis-chart-container');
    const infoContainer = document.getElementById('analysis-info-container');
    
    // Get filtered data
    const data = dashboardData.written_test_by_process;
    
    // Build heatmap data structure
    const entities = Array.from(analysisFilters.entities);
    const positions = Array.from(analysisFilters.positions);
    
    // Prepare data for line chart
    const chartData = {
        labels: positions,
        datasets: entities.map((entity, idx) => {
            const colors = ['rgb(59, 130, 246)', 'rgb(16, 185, 129)', 'rgb(239, 68, 68)'];
            const color = colors[idx % colors.length];
            
            return {
                label: entity,
                data: positions.map(pos => calculateAverageScore(entity, pos)),
                borderColor: color,
                backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7
            };
        })
    };
    
    // Create HTML with line chart and heatmap
    let heatmapHTML = `
        <div class="space-y-6">
            <!-- Line Chart Section -->
            <div class="bg-white rounded-lg p-4 border border-gray-200">
                <h4 class="text-lg font-semibold mb-3">
                    <i class="fas fa-chart-line mr-2"></i>
                    Entity-Position Performance Trends
                </h4>
                <p class="text-sm text-gray-600 mb-4">Compare average scores across positions by entity</p>
                <div style="position: relative; height: 400px;">
                    <canvas id="heatmap-line-chart"></canvas>
                </div>
            </div>
            
            <!-- Heatmap Table Section -->
            <div class="bg-white rounded-lg p-4 border border-gray-200">
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-lg font-semibold">
                        <i class="fas fa-th mr-2"></i>
                        Entity-Position Performance Heatmap (Detailed Numbers)
                    </h4>
                    <button onclick="toggleHeatmapTable()" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
                        <i id="heatmap-toggle-icon" class="fas fa-chevron-up mr-2"></i>
                        <span id="heatmap-toggle-text">Collapse Table</span>
                    </button>
                </div>
                <div id="heatmap-table-container">
                    <p class="text-sm text-gray-600 mb-4">Average scores by entity and position (higher scores = better performance)</p>
                    <div class="overflow-x-auto">
                        <table class="min-w-full border-collapse border border-gray-300">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Position</th>
    `;
    
    entities.forEach(entity => {
        heatmapHTML += `<th class="border border-gray-300 px-4 py-2 text-center font-semibold">${entity}</th>`;
    });
    heatmapHTML += `</tr></thead><tbody>`;
    
    // Add data rows
    positions.forEach(position => {
        heatmapHTML += `<tr><td class="border border-gray-300 px-4 py-2 font-medium">${position}</td>`;
        
        entities.forEach(entity => {
            // Calculate average score for this entity-position combination
            const score = calculateAverageScore(entity, position);
            const colorClass = getHeatmapColor(score);
            
            heatmapHTML += `
                <td class="border border-gray-300 px-4 py-2 text-center ${colorClass}">
                    <span class="font-bold">${score !== null ? score.toFixed(1) : 'N/A'}</span>
                </td>
            `;
        });
        
        heatmapHTML += `</tr>`;
    });
    
    heatmapHTML += `</tbody></table></div></div></div></div>`;
    
    container.innerHTML = heatmapHTML;
    
    // Create line chart
    const ctx = document.getElementById('heatmap-line-chart');
    if (ctx) {
        if (window.heatmapLineChart) {
            window.heatmapLineChart.destroy();
        }
        
        window.heatmapLineChart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + (context.parsed.y !== null ? context.parsed.y.toFixed(1) : 'N/A');
                            }
                        }
                    },
                    datalabels: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Average Score'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Position'
                        }
                    }
                }
            }
        });
    }
    
    infoContainer.innerHTML = `
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p class="text-sm text-blue-700">
                <i class="fas fa-info-circle mr-2"></i>
                <strong>How to read:</strong> Green cells indicate high performance (≥80), yellow is moderate (60-79), and red indicates improvement needed (<60).
            </p>
        </div>
    `;
}

// Toggle heatmap table visibility
function toggleHeatmapTable() {
    const tableContainer = document.getElementById('heatmap-table-container');
    const toggleIcon = document.getElementById('heatmap-toggle-icon');
    const toggleText = document.getElementById('heatmap-toggle-text');
    
    if (tableContainer.style.display === 'none') {
        // Show table
        tableContainer.style.display = 'block';
        toggleIcon.className = 'fas fa-chevron-up mr-2';
        toggleText.textContent = 'Collapse Table';
    } else {
        // Hide table
        tableContainer.style.display = 'none';
        toggleIcon.className = 'fas fa-chevron-down mr-2';
        toggleText.textContent = 'Expand Table';
    }
}

function calculateAverageScore(entity, position) {
    // Use avg_score_by_process data with team filtering
    const processData = dashboardData.avg_score_by_process || [];
    const matches = processData.filter(d => {
        // Match entity and position
        const entityMatch = d.entity === entity && d.process_name === position;
        
        // Apply team filter if teams are selected
        if (analysisFilters.teams.size > 0) {
            return entityMatch && analysisFilters.teams.has(d.team);
        }
        
        return entityMatch;
    });
    
    if (matches.length === 0) return null;
    
    const sum = matches.reduce((acc, d) => acc + parseFloat(d.avg_score || 0), 0);
    return sum / matches.length;
}

function getHeatmapColor(score) {
    if (score === null) return 'bg-gray-100 text-gray-400';
    if (score >= 80) return 'bg-green-200 text-green-900';
    if (score >= 60) return 'bg-yellow-200 text-yellow-900';
    return 'bg-red-200 text-red-900';
}

function renderWeaknessAnalysis() {
    const container = document.getElementById('analysis-chart-container');
    const infoContainer = document.getElementById('analysis-info-container');
    
    // Get filtered data
    const data = dashboardData.written_test_by_process || [];
    const filteredData = data.filter(d => 
        analysisFilters.positions.has(d.process_name)
    );
    
    // Calculate metrics for each position
    const metrics = filteredData.map(d => {
        const takers = parseInt(d.takers) || 0;
        const passed = parseInt(d.passed) || 0;
        const passRate = takers > 0 ? (passed / takers * 100) : 0;
        
        return {
            position: d.process_name,
            takers: takers,
            passed: passed,
            passRate: passRate.toFixed(1),
            priority: getPriorityLevel(takers, passRate)
        };
    }).filter(m => m.takers > 0);
    
    // Sort by priority first, then by pass rate (lowest first), then by volume (more takers = worse)
    metrics.sort((a, b) => {
        const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3, 'excellent': 4 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        
        // If different priority, sort by priority
        if (priorityDiff !== 0) {
            return priorityDiff;
        }
        
        // Same priority: sort by pass rate (lowest first)
        const passRateDiff = parseFloat(a.passRate) - parseFloat(b.passRate);
        
        // If different pass rate, sort by pass rate
        if (Math.abs(passRateDiff) >= 0.1) {
            return passRateDiff;
        }
        
        // Same pass rate (especially 0%): sort by volume (more takers = worse = higher priority)
        return b.takers - a.takers;
    });
    
    // Build weakness matrix table
    let tableHTML = `
        <h4 class="text-lg font-semibold mb-4">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            Weakness Priority Matrix
        </h4>
        <p class="text-sm text-gray-600 mb-4">Positions ranked by urgency (volume × pass rate)</p>
        <div class="overflow-x-auto">
            <table class="min-w-full border-collapse border border-gray-300">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="border border-gray-300 px-4 py-2 text-left">Priority</th>
                        <th class="border border-gray-300 px-4 py-2 text-left">Position</th>
                        <th class="border border-gray-300 px-4 py-2 text-center">Test Takers</th>
                        <th class="border border-gray-300 px-4 py-2 text-center">Passed</th>
                        <th class="border border-gray-300 px-4 py-2 text-center">Pass Rate</th>
                        <th class="border border-gray-300 px-4 py-2 text-left">Action</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    metrics.forEach(m => {
        const priorityBadge = getPriorityBadge(m.priority);
        const actionText = getActionText(m.priority);
        
        tableHTML += `
            <tr>
                <td class="border border-gray-300 px-4 py-2">${priorityBadge}</td>
                <td class="border border-gray-300 px-4 py-2 font-medium">${m.position}</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${m.takers}</td>
                <td class="border border-gray-300 px-4 py-2 text-center">${m.passed}</td>
                <td class="border border-gray-300 px-4 py-2 text-center font-bold">${m.passRate}%</td>
                <td class="border border-gray-300 px-4 py-2 text-sm">${actionText}</td>
            </tr>
        `;
    });
    
    tableHTML += `</tbody></table></div>`;
    container.innerHTML = tableHTML;
    
    // Priority legend
    infoContainer.innerHTML = `
        <div class="grid grid-cols-4 gap-4 mt-6">
            <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p class="font-semibold text-red-800">🔴 High Priority</p>
                <p class="text-sm text-gray-600">Many takers + Low pass rate</p>
                <p class="text-xs text-gray-500 mt-1">Urgent training needed</p>
            </div>
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p class="font-semibold text-yellow-800">🟡 Medium Priority</p>
                <p class="text-sm text-gray-600">Moderate performance</p>
                <p class="text-xs text-gray-500 mt-1">Monitor and improve</p>
            </div>
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p class="font-semibold text-blue-800">🔵 Low Priority</p>
                <p class="text-sm text-gray-600">Good performance</p>
                <p class="text-xs text-gray-500 mt-1">Maintain current level</p>
            </div>
            <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p class="font-semibold text-green-800">🟢 Excellent</p>
                <p class="text-sm text-gray-600">Outstanding results</p>
                <p class="text-xs text-gray-500 mt-1">Best practices</p>
            </div>
        </div>
    `;
}

function getPriorityLevel(takers, passRate) {
    // Excellent: 85%+ pass rate
    if (passRate >= 85) return 'excellent';
    
    // Low (Good): 60-85% pass rate
    if (passRate >= 60) return 'low';
    
    // High (Critical): < 30% pass rate - ALWAYS HIGH regardless of volume
    if (passRate < 30) return 'high';
    
    // Medium (Warning): 30-60% pass rate
    return 'medium';
}

function getPriorityBadge(priority) {
    const badges = {
        'high': '<span class="px-3 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold">🔴 HIGH</span>',
        'medium': '<span class="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold">🟡 MEDIUM</span>',
        'low': '<span class="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-bold">🔵 LOW</span>',
        'excellent': '<span class="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold">🟢 EXCELLENT</span>'
    };
    return badges[priority] || '';
}

function getActionText(priority) {
    const actions = {
        'high': '⚠️ Urgent: Increase training resources and review curriculum',
        'medium': '📊 Monitor: Track progress and provide additional support',
        'low': '✅ Maintain: Continue current training approach',
        'excellent': '⭐ Share: Document and share best practices'
    };
    return actions[priority] || '';
}

function renderSummaryKPI() {
    const container = document.getElementById('analysis-chart-container');
    const infoContainer = document.getElementById('analysis-info-container');
    
    // Get filtered data
    const data = dashboardData.written_test_by_process || [];
    const filteredData = data.filter(d => 
        analysisFilters.positions.has(d.process_name)
    );
    
    // Calculate KPIs from filtered data
    const totalTakers = filteredData.reduce((sum, d) => sum + (parseInt(d.takers) || 0), 0);
    const totalPassed = filteredData.reduce((sum, d) => sum + (parseInt(d.passed) || 0), 0);
    const passRate = totalTakers > 0 ? ((totalPassed / totalTakers) * 100).toFixed(1) : 0;
    const positionsCount = filteredData.length;
    
    // Find best and worst performing positions
    const positionsWithPassRate = filteredData.map(d => {
        const takers = parseInt(d.takers) || 0;
        const passed = parseInt(d.passed) || 0;
        return {
            position: d.process_name,
            passRate: takers > 0 ? (passed / takers * 100) : 0,
            takers: takers
        };
    }).filter(d => d.takers > 0);
    
    positionsWithPassRate.sort((a, b) => b.passRate - a.passRate);
    const bestPosition = positionsWithPassRate[0] || { position: 'N/A', passRate: 0 };
    const worstPosition = positionsWithPassRate[positionsWithPassRate.length - 1] || { position: 'N/A', passRate: 0 };
    
    // Entity comparison
    const avgScoreData = dashboardData.avg_score_by_process || [];
    const entityScores = {};
    Array.from(analysisFilters.entities).forEach(entity => {
        const entityData = avgScoreData.filter(d => 
            d.entity === entity && analysisFilters.positions.has(d.process_name)
        );
        if (entityData.length > 0) {
            const avgScore = entityData.reduce((sum, d) => sum + parseFloat(d.avg_score || 0), 0) / entityData.length;
            entityScores[entity] = avgScore.toFixed(1);
        }
    });
    
    container.innerHTML = `
        <h4 class="text-lg font-semibold mb-4">
            <i class="fas fa-tachometer-alt mr-2"></i>
            Key Performance Indicators
        </h4>
        
        <!-- Overall KPIs -->
        <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <p class="text-sm text-gray-600 mb-1">Total Test Takers</p>
                <p class="text-3xl font-bold text-blue-600">${totalTakers}</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <p class="text-sm text-gray-600 mb-1">Passed</p>
                <p class="text-3xl font-bold text-green-600">${totalPassed}</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                <p class="text-sm text-gray-600 mb-1">Pass Rate</p>
                <p class="text-3xl font-bold text-purple-600">${passRate}%</p>
            </div>
            <div class="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
                <p class="text-sm text-gray-600 mb-1">Positions Tested</p>
                <p class="text-3xl font-bold text-orange-600">${positionsCount}</p>
            </div>
        </div>
        
        <!-- Entity Comparison -->
        <div class="grid grid-cols-3 gap-4 mb-6">
            ${Object.keys(entityScores).map(entity => `
                <div class="bg-gray-50 rounded-lg p-4 border border-gray-300">
                    <p class="text-sm text-gray-600 mb-1">${entity} Avg Score</p>
                    <p class="text-2xl font-bold text-gray-800">${entityScores[entity]}</p>
                </div>
            `).join('')}
        </div>
        
        <!-- Best/Worst Performance -->
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                <p class="font-semibold text-green-800 mb-2">
                    <i class="fas fa-trophy mr-2"></i>Best Performing Position
                </p>
                <p class="text-lg font-bold text-green-900">${bestPosition.position}</p>
                <p class="text-sm text-green-700">Pass Rate: ${bestPosition.passRate.toFixed(1)}%</p>
            </div>
            <div class="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                <p class="font-semibold text-red-800 mb-2">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Needs Improvement
                </p>
                <p class="text-lg font-bold text-red-900">${worstPosition.position}</p>
                <p class="text-sm text-red-700">Pass Rate: ${worstPosition.passRate.toFixed(1)}%</p>
            </div>
        </div>
    `;
    
    // Alerts and recommendations
    const highPriorityPositions = positionsWithPassRate.filter(p => 
        p.takers >= 20 && p.passRate < 70
    );
    
    let alertsHTML = '';
    if (highPriorityPositions.length > 0) {
        alertsHTML = `
            <div class="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p class="font-semibold text-red-800 mb-2">
                    <i class="fas fa-bell mr-2"></i>
                    ⚠️ ${highPriorityPositions.length} Position(s) Need Urgent Attention
                </p>
                <ul class="list-disc list-inside text-sm text-red-700 space-y-1">
                    ${highPriorityPositions.slice(0, 3).map(p => 
                        `<li>${p.position}: ${p.passRate.toFixed(1)}% pass rate (${p.takers} takers)</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    } else {
        alertsHTML = `
            <div class="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p class="font-semibold text-green-800">
                    <i class="fas fa-check-circle mr-2"></i>
                    ✅ All positions are performing well!
                </p>
                <p class="text-sm text-green-700">No urgent issues detected. Keep up the good work!</p>
            </div>
        `;
    }
    
    infoContainer.innerHTML = alertsHTML;
}

// Position → Process 매핑 테이블 (확장 용이)
const POSITION_TO_PROCESS_MAP = [
    { keywords: ['cutting', 'cnc'], position: 'CUTTING' },
    { keywords: ['bevel'], position: 'BEVELING' },
    { keywords: ['bend'], position: 'BENDING' },
    { keywords: ['ls', 'weld'], position: 'LS WELDING', requireAll: true },
    { keywords: ['fit', 'up'], position: 'FIT UP', requireAll: true },
    { keywords: ['cs', 'weld'], position: 'CS WELDING', requireAll: true },
    { keywords: ['vtmt'], position: 'VTMT' },
    { keywords: ['bracket', 'fu'], position: 'BRACKET FU', requireAll: true },
    { keywords: ['bracket', 'weld'], position: 'BRACKET WELD', requireAll: true },
    { keywords: ['ut', 'repair'], position: 'UT REPAIR', requireAll: true },
    { keywords: ['df', 'fu'], position: 'DOOR FRAME FU', requireAll: true },
    { keywords: ['df', 'weld'], position: 'DOOR FRAME WELD', requireAll: true },
    { keywords: ['flatness'], position: 'FLATNESS' }
];

/**
 * Team-Position Mapping Table (based on Excel data)
 * List of positions available for each team
 */
// Positions for Assessment only (uppercase standardized)
// Quiz-only positions excluded: Blasting, Metalizing, Paint, Mechanical, Electrical
// Complete Position Order (48 positions for all operations)
const COMPLETE_POSITION_ORDER = [
    // BLACK TOWER (15)
    'MATERIAL HANDLING',
    'CUTTING',
    'BEVELING',
    'BENDING',
    'LS WELDING',
    'FIT UP',
    'CS WELDING',
    'VTMT',
    'BRACKET FU',
    'BRACKET WELD',
    'UT REPAIR',
    'DOOR FRAME FU',
    'DOOR FRAME WELD',
    'FLATNESS',
    'DRILLING & TAPPING',
    // WHITE TOWER (5)
    'BLASTING',
    'METALIZING',
    'PAINTING',
    'PAINTING REPAIR',
    'FITTING PAINT RING',
    // INTERNAL MOUNTING (6)
    'PRE ASSEMBLY',
    'ASSEMBLY',
    'IM CABLE',
    'GT CLEANING',
    'MATERIAL HANDLER-IM',
    'PAINT TOUCH UP',
    // QM (13)
    'QC INSPECTOR - BT MT/PT(QBP)',
    'QC INSPECTOR - BT UT/PAUT(QBU)',
    'QC INSPECTOR - BT VT(QBV)',
    'QC INSPECTOR - DELIVERY INSPECTOR(QDI)',
    'QC INSPECTOR-IM FINAL (QIF)',
    'QC INSPECTOR-IM INCOMING(QII)',
    'QC INSPECTOR - WT MATELIZING(QMI)',
    'QC INSPECTOR - WT WASHING&BLASTING(QWM)',
    'QC INSPECTOR - WT PAINTING(QWP)',
    'QC INSPECTOR-BT FITUP&WELDING(QBF)',
    'QC INSPECTOR-BT DIMENSION(QBD)',
    'QC INSPECTOR-BT INCOMING TO BENDING',
    'QC INSPECTOR-BT INCOMING(QBI)',
    // TRANSPORTATION (3)
    'TRANSPORTATION',
    'STORAGE FIT INSTALLATION',
    'H-FRAME INSTALLATION',
    // MAINTENANCE (1)
    'ELECTRICIAN/MECHANIC',
    // WAREHOUSE (3)
    'WAREHOUSE-KITSET',
    'WAREHOUSE BT/WT',
    'WAREHOUSE-IM',
    // LEAN (2)
    'KAIZEN',
    'EHS'
];

// Complete Team-Position mapping for Assessment (48 positions across 7 teams)
const TEAM_PROCESS_MAP = {
    'BLACK TOWER': [
        'MATERIAL HANDLING',
        'CUTTING',
        'BEVELING',
        'BENDING',
        'LS WELDING',
        'FIT UP',
        'CS WELDING',
        'VTMT',
        'BRACKET FU',
        'BRACKET WELD',
        'UT REPAIR',
        'DOOR FRAME FU',
        'DOOR FRAME WELD',
        'FLATNESS',
        'DRILLING & TAPPING'
    ],
    'WHITE TOWER': [
        'BLASTING',
        'METALIZING',
        'PAINTING',
        'PAINTING REPAIR',
        'FITTING PAINT RING'
    ],
    'INTERNAL MOUNTING': [
        'PRE ASSEMBLY',
        'ASSEMBLY',
        'IM CABLE',
        'GT CLEANING',
        'MATERIAL HANDLER-IM',
        'PAINT TOUCH UP'
    ],
    'QM': [
        'QC INSPECTOR - BT MT/PT(QBP)',
        'QC INSPECTOR - BT UT/PAUT(QBU)',
        'QC INSPECTOR - BT VT(QBV)',
        'QC INSPECTOR - DELIVERY INSPECTOR(QDI)',
        'QC INSPECTOR-IM FINAL (QIF)',
        'QC INSPECTOR-IM INCOMING(QII)',
        'QC INSPECTOR - WT MATELIZING(QMI)',
        'QC INSPECTOR - WT WASHING&BLASTING(QWM)',
        'QC INSPECTOR - WT PAINTING(QWP)',
        'QC INSPECTOR-BT FITUP&WELDING(QBF)',
        'QC INSPECTOR-BT DIMENSION(QBD)',
        'QC INSPECTOR-BT INCOMING TO BENDING',
        'QC INSPECTOR-BT INCOMING(QBI)'
    ],
    'TRANSPORTATION': [
        'TRANSPORTATION',
        'STORAGE FIT INSTALLATION',
        'H-FRAME INSTALLATION'
    ],
    'MAINTENANCE': [
        'ELECTRICIAN/MECHANIC'
    ],
    'WAREHOUSE': [
        'WAREHOUSE-KITSET',
        'WAREHOUSE BT/WT',
        'WAREHOUSE-IM'
    ],
    'LEAN': [
        'KAIZEN',
        'EHS'
    ]
};

/**
 * 표준 TEAM 순서
 */
const STANDARD_TEAM_ORDER = [
    'BLACK TOWER',
    'WHITE TOWER',
    'INTERNAL MOUNTING',
    'QM',
    'TRANSPORTATION',
    'MAINTENANCE',
    'WAREHOUSE',
    'LEAN'
];

/**
 * 표준 POSITION 순서 (팀별)
 */
const STANDARD_POSITION_ORDER = [
    // BLACK TOWER
    'MATERIAL HANDLING',
    'CUTTING',
    'BEVELING',
    'BENDING',
    'LS WELDING',
    'FIT UP',
    'CS WELDING',
    'VTMT',
    'BRACKET FU',
    'BRACKET WELD',
    'UT REPAIR',
    'DOOR FRAME FU',
    'DOOR FRAME WELD',
    'FLATNESS',
    'DRILLING & TAPPING',
    // WHITE TOWER
    'BLASTING',
    'METALIZING',
    'PAINTING',
    'PAINTING REPAIR',
    'FITTING PAINT RING',
    // INTERNAL MOUNTING
    'ASSEMBLY',
    'IM CABLE',
    'GT CLEANING',
    'MATERIAL HANDLER-IM',
    'PAINT TOUCH UP',
    // QM
    'QC INSPECTOR - BT MT/PT(QBP)',
    'QC INSPECTOR - BT UT/PAUT(QBU)',
    'QC INSPECTOR - BT VT(QBV)',
    'QC INSPECTOR - DELIVERY INSPECTOR(QDI)',
    'QC INSPECTOR-IM FINAL (QIF)',
    'QC INSPECTOR-IM INCOMING(QII)',
    'QC INSPECTOR - WT MATELIZING(QMI)',
    'QC INSPECTOR - WT WASHING&BLASTING(QWM)',
    'QC INSPECTOR - WT PAINTING(QWP)',
    'QC INSPECTOR-BT FITUP&WELDING(QBF)',
    'QC INSPECTOR-BT DIMENSION(QBD)',
    'QC INSPECTOR-BT INCOMING TO BENDING',
    'QC INSPECTOR-BT INCOMING(QBI)',
    'QC INSPECTOR - BT MT/PT(QBLACK TOWER)',
    // TRANSPORTATION
    'TRANSPORTATION',
    'STORAGE FIT INSTALLATION',
    'H-FRAME INSTALLATION',
    'TEQ',
    // MAINTENANCE
    'ELECTRICIAN/MECHANIC',
    // WAREHOUSE
    'WAREHOUSE-KITSET',
    'WAREHOUSE BT/WT',
    'WAREHOUSE-IM',
    // LEAN
    'KAIZEN',
    'EHS'
];

/**
 * Quiz용 POSITION 순서 (18개만)
 */
const QUIZ_POSITION_ORDER = [
    'CUTTING',
    'BEVELING',
    'BENDING',
    'LS WELDING',
    'FIT UP',
    'CS WELDING',
    'VTMT',
    'BRACKET FU',
    'BRACKET WELD',
    'UT REPAIR',
    'DOOR FRAME FU',
    'DOOR FRAME WELD',
    'FLATNESS',
    'BLASTING',
    'METALIZING',
    'PAINTING',
    'ASSEMBLY',
    'IM CABLE'
];

/**
 * 팀 이름 정규화 (대문자 + 공백 처리)
 * @param {string} team - 팀 이름
 * @returns {string} 정규화된 팀 이름
 */
function normalizeTeamName(team) {
    if (!team) return '';
    return team.toUpperCase().trim();
}

/**
 * 팀 이름을 보기 좋게 표시 (각 단어 첫 글자 대문자)
 * @param {string} team - 팀 이름
 * @returns {string} 포맷된 팀 이름
 */
function formatTeamName(team) {
    if (!team) return '';
    return team.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

/**
 * 특정 팀에서 사용 가능한 프로세스 목록 반환
 * @param {string} team - 팀 이름
 * @returns {string[]} 프로세스 목록
 */
function getProcessesForTeam(team) {
    const normalizedTeam = normalizeTeamName(team);
    const positions = TEAM_PROCESS_MAP[normalizedTeam] || [];
    console.log(`🔍 getProcessesForTeam("${team}") → normalized: "${normalizedTeam}" → positions: ${positions.length}개`, positions);
    return positions;
}

/**
 * position 문자열을 프로세스 이름으로 매핑 (하위 호환성 유지)
 * @param {string} position - 작업자 직책/위치
 * @returns {string|null} 매핑된 프로세스 이름 또는 null
 */
function mapPositionToProcess(position) {
    if (!position) return null;
    
    const positionLower = position.toLowerCase().trim();
    
    for (const mapping of POSITION_TO_PROCESS_MAP) {
        const { keywords, position, requireAll = false } = mapping;
        
        const matchFn = requireAll
            ? keywords.every(kw => positionLower.includes(kw))
            : keywords.some(kw => positionLower.includes(kw));
        
        if (matchFn) {
            return position;
        }
    }
    
    return null;
}

/**
 * 셀렉트 박스에 팀 옵션 채우기 (헬퍼 함수)
 * @param {string} selectId - 셀렉트 엘리먼트 ID
 * @param {string[]} teams - 팀 목록 배열
 */
function populateTeamSelect(selectId, teams) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">전체 팀</option>';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        selectElement.appendChild(option);
    });
}

// 팀 선택에 따라 프로세스 셀렉트 업데이트
function updateProcessSelectForTeam(chartType, selectedTeam) {
    const processSelectId = chartType === 'avg-score' ? 'avg-score-position-select' : 'assessment-position-select';
    const processSelect = document.getElementById(processSelectId);
    
    if (!processSelect) return;
    
    processSelect.innerHTML = '<option value="">전체 프로세스</option>';
    
    if (selectedTeam && teamProcessMapping[selectedTeam]) {
        // 선택된 팀의 프로세스만 표시
        const teamProcesses = teamProcessMapping[selectedTeam];
        positions.forEach(position => {
            if (teamProcesses.includes(position.name)) {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = position.name;
                processSelect.appendChild(option);
            }
        });
    } else {
        // 전체 프로세스 표시
        positions.forEach(position => {
            const option = document.createElement('option');
            option.value = position.id;
            option.textContent = position.name;
            processSelect.appendChild(option);
        });
    }
}

// 평균 점수 차트 팀 변경 핸들러
function onAvgScoreTeamChange() {
    const teamSelect = document.getElementById('avg-score-team-select');
    const selectedTeam = teamSelect.value;
    
    // 프로세스 셀렉트 업데이트
    updateProcessSelectForTeam('avg-score', selectedTeam);
    
    // 차트 필터링
    filterAvgScoreChart();
}

// Assessment 차트 팀 변경 핸들러
function onAssessmentTeamChange() {
    const teamSelect = document.getElementById('assessment-team-select');
    const selectedTeam = teamSelect.value;
    
    // 프로세스 셀렉트 업데이트
    updateProcessSelectForTeam('assessment', selectedTeam);
    
    // 차트 필터링
    filterAssessmentChart();
}

function updateDashboardStats() {
    const totalWorkersEl = document.getElementById('total-workers');
    const testTakersEl = document.getElementById('test-takers');
    const testPassedEl = document.getElementById('test-passed');
    
    if (totalWorkersEl) totalWorkersEl.textContent = dashboardData.total_workers;
    if (testTakersEl) testTakersEl.textContent = dashboardData.written_test_takers;
    if (testPassedEl) testPassedEl.textContent = dashboardData.written_test_passed;
}

// 법인 필터 (전체 대시보드에 영향)
async function filterDashboardByEntity() {
    const entitySelect = document.getElementById('dashboard-entity-select');
    const selectedEntity = entitySelect.value;
    
    try {
        // 법인 필터만 적용
        let url = '/api/dashboard/stats';
        if (selectedEntity) {
            url += `?entity=${selectedEntity}`;
        }
        
        const response = await axios.get(url);
        dashboardData = response.data;
        
        // 법인에 따른 팀 목록 업데이트
        let teamsUrl = '/api/teams';
        if (selectedEntity) {
            teamsUrl += `?entity=${selectedEntity}`;
        }
        const teamsResponse = await axios.get(teamsUrl);
        const teams = teamsResponse.data;
        
        // 팀 셀렉트 박스 업데이트
        populateTeamSelect('avg-score-team-select', teams);
        populateTeamSelect('assessment-team-select', teams);
        
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
        console.error('필터링 실패:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// 평균 점수 차트 팀/프로세스 필터
async function filterAvgScoreChart() {
    const entitySelect = document.getElementById('dashboard-entity-select');
    const teamSelect = document.getElementById('avg-score-team-select');
    const processSelect = document.getElementById('avg-score-position-select');
    const selectedEntity = entitySelect.value;
    const selectedTeam = teamSelect.value;
    const selectedProcess = processSelect.value;
    
    try {
        let url = '/api/dashboard/stats?';
        const params = [];
        
        if (selectedEntity) {
            params.push(`entity=${selectedEntity}`);
        }
        if (selectedTeam) {
            params.push(`team=${encodeURIComponent(selectedTeam)}`);
        }
        if (selectedProcess) {
            params.push(`processId=${selectedProcess}`);
        }
        
        url += params.join('&');
        
        const response = await axios.get(url);
        const filteredData = response.data;
        
        // 평균 점수 차트만 업데이트
        if (currentAvgScoreChart) {
            currentAvgScoreChart.destroy();
        }
        
        // 임시로 데이터 교체
        const originalData = dashboardData;
        dashboardData = filteredData;
        renderAvgScoreChart();
        dashboardData = originalData;
    } catch (error) {
        console.error('평균 점수 차트 필터링 실패:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// Assessment 차트 프로세스/팀 필터
async function filterAssessmentChart() {
    const entitySelect = document.getElementById('dashboard-entity-select');
    const processSelect = document.getElementById('assessment-position-select');
    const teamSelect = document.getElementById('assessment-team-select');
    const selectedEntity = entitySelect.value;
    const selectedProcess = processSelect.value;
    const selectedTeam = teamSelect.value;
    
    try {
        let url = '/api/dashboard/stats?';
        const params = [];
        
        if (selectedEntity) {
            params.push(`entity=${selectedEntity}`);
        }
        if (selectedProcess) {
            params.push(`processId=${selectedProcess}`);
        }
        if (selectedTeam) {
            params.push(`team=${encodeURIComponent(selectedTeam)}`);
        }
        
        url += params.join('&');
        
        const response = await axios.get(url);
        const filteredData = response.data;
        
        // Assessment 차트만 업데이트
        if (currentAssessmentChart) {
            currentAssessmentChart.destroy();
        }
        
        // 임시로 데이터 교체
        const originalData = dashboardData;
        dashboardData = filteredData;
        renderAssessmentChart();
        dashboardData = originalData;
    } catch (error) {
        console.error('Assessment 차트 필터링 실패:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
}

// Test Status Chart Filters State
let testStatusFilters = {
    entities: new Set(['CSVN', 'CSCN', 'CSTW']),
    teams: new Set(),
    positions: new Set()
};

// Written Test Team-Position Mapping (Fixed Order)
const WRITTEN_TEST_TEAM_POSITIONS = {
    'BLACK TOWER': [
        'CUTTING',
        'BEVELING',
        'BENDING',
        'LS WELDING',
        'FIT UP',
        'CS WELDING',
        'VTMT',
        'BRACKET FU',
        'BRACKET WELD',
        'UT REPAIR',
        'DOOR FRAME FU',
        'DOOR FRAME WELD',
        'FLATNESS'
    ],
    'WHITE TOWER': [
        'BLASTING',
        'METALIZING',
        'PAINTING'
    ],
    'INTERNAL MOUNTING': [
        'ASSEMBLY',
        'IM CABLE'
    ]
};

// Team order for Written Test
const WRITTEN_TEST_TEAM_ORDER = ['BLACK TOWER', 'WHITE TOWER', 'INTERNAL MOUNTING'];

function toggleDropdown(filterId) {
    const dropdown = document.getElementById(`${filterId}-dropdown`);
    
    // Close all other dropdowns
    ['entity-filter', 'team-filter', 'position-filter'].forEach(id => {
        if (id !== filterId) {
            const otherDropdown = document.getElementById(`${id}-dropdown`);
            if (otherDropdown) otherDropdown.classList.add('hidden');
        }
    });
    
    // Toggle current dropdown
    dropdown.classList.toggle('hidden');
}

// Close dropdowns when clicking outside (but not when clicking inside dropdown)
document.addEventListener('click', function(event) {
    const clickedInsideDropdown = event.target.closest('[id$="-filter-dropdown"]');
    const clickedButton = event.target.closest('button[onclick^="toggleDropdown"]');
    
    if (!clickedInsideDropdown && !clickedButton) {
        ['entity-filter', 'team-filter', 'position-filter'].forEach(id => {
            const dropdown = document.getElementById(`${id}-dropdown`);
            if (dropdown) dropdown.classList.add('hidden');
        });
    }
});

function updateTestStatusFilter(filterType, clickedCheckbox) {
    // Prevent event propagation
    event.stopPropagation();
    
    const checkboxes = document.querySelectorAll(`.${filterType}-filter-checkbox`);
    const allCheckbox = Array.from(checkboxes).find(cb => cb.value === 'ALL');
    const otherCheckboxes = Array.from(checkboxes).filter(cb => cb.value !== 'ALL');
    
    // Handle "All" checkbox click
    if (clickedCheckbox && clickedCheckbox.value === 'ALL') {
        const shouldCheckAll = clickedCheckbox.checked;
        otherCheckboxes.forEach(cb => cb.checked = shouldCheckAll);
    } else {
        // Individual checkbox clicked - update "All" checkbox state
        if (allCheckbox) {
            allCheckbox.checked = otherCheckboxes.every(cb => cb.checked);
        }
    }
    
    // Update filter state
    const selectedValues = otherCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
    
    if (filterType === 'entity') {
        testStatusFilters.entities = new Set(selectedValues.length > 0 ? selectedValues : ['CSVN', 'CSCN', 'CSTW']);
        // When entity changes, update team dropdown
        updateTeamDropdown();
    } else if (filterType === 'team') {
        testStatusFilters.teams = new Set(selectedValues);
        // When team changes, update position dropdown
        updatePositionDropdown();
    } else if (filterType === 'position') {
        testStatusFilters.positions = new Set(selectedValues);
    }
    
    // Update label
    updateFilterLabel(filterType);
    
    // Re-render chart
    renderTestStatusChart();
}

function updateTeamDropdown() {
    // Get workers by selected entities
    axios.get('/api/workers').then(response => {
        const workers = response.data;
        
        // Filter workers by selected entities
        const selectedEntities = Array.from(testStatusFilters.entities);
        const filteredWorkers = workers.filter(w => selectedEntities.includes(w.entity));
        
        // Get unique teams that have Written Test positions
        const teams = new Set();
        filteredWorkers.forEach(worker => {
            if (worker.team && WRITTEN_TEST_TEAM_POSITIONS[worker.team]) {
                teams.add(worker.team);
            }
        });
        
        // Sort teams by defined order
        const sortedTeams = WRITTEN_TEST_TEAM_ORDER.filter(team => teams.has(team));
        
        // Repopulate team dropdown
        const teamDropdown = document.getElementById('team-filter-dropdown');
        teamDropdown.innerHTML = `
            <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="ALL" checked onchange="updateTestStatusFilter('team', this)" class="team-filter-checkbox mr-2">
                <span class="text-sm">All</span>
            </label>
        `;
        
        sortedTeams.forEach(team => {
            teamDropdown.innerHTML += `
                <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" value="${team}" checked onchange="updateTestStatusFilter('team', this)" class="team-filter-checkbox mr-2">
                    <span class="text-sm">${team}</span>
                </label>
            `;
        });
        
        // Update teams filter state
        testStatusFilters.teams = new Set(sortedTeams);
        updateFilterLabel('team');
        
        // Update position dropdown based on new teams
        updatePositionDropdown();
    });
}

function updatePositionDropdown() {
    // Get positions for selected teams
    const selectedTeams = Array.from(testStatusFilters.teams);
    const positions = new Set();
    
    selectedTeams.forEach(team => {
        if (WRITTEN_TEST_TEAM_POSITIONS[team]) {
            WRITTEN_TEST_TEAM_POSITIONS[team].forEach(pos => positions.add(pos));
        }
    });
    
    // Keep order from team definitions
    const orderedPositions = [];
    selectedTeams.forEach(team => {
        if (WRITTEN_TEST_TEAM_POSITIONS[team]) {
            WRITTEN_TEST_TEAM_POSITIONS[team].forEach(pos => {
                if (!orderedPositions.includes(pos)) {
                    orderedPositions.push(pos);
                }
            });
        }
    });
    
    // Repopulate position dropdown
    const positionDropdown = document.getElementById('position-filter-dropdown');
    positionDropdown.innerHTML = `
        <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" value="ALL" checked onchange="updateTestStatusFilter('position', this)" class="position-filter-checkbox mr-2">
            <span class="text-sm">All</span>
        </label>
    `;
    
    orderedPositions.forEach(position => {
        positionDropdown.innerHTML += `
            <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="${position}" checked onchange="updateTestStatusFilter('position', this)" class="position-filter-checkbox mr-2">
                <span class="text-sm">${position}</span>
            </label>
        `;
    });
    
    // Update positions filter state
    testStatusFilters.positions = new Set(orderedPositions);
    updateFilterLabel('position');
}

function updateFilterLabel(filterType) {
    const checkboxes = document.querySelectorAll(`.${filterType}-filter-checkbox`);
    const selected = Array.from(checkboxes).filter(cb => cb.checked && cb.value !== 'ALL');
    const label = document.getElementById(`${filterType}-filter-label`);
    
    if (selected.length === 0) {
        label.textContent = 'None';
    } else if (selected.length === checkboxes.length - 1 || selected.length > 3) {
        label.textContent = 'All';
    } else {
        label.textContent = `${selected.length} selected`;
    }
}

function populateTestStatusFilters() {
    // Initialize with all Written Test teams
    const teamDropdown = document.getElementById('team-filter-dropdown');
    teamDropdown.innerHTML = `
        <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" value="ALL" checked onchange="updateTestStatusFilter('team', this)" class="team-filter-checkbox mr-2">
            <span class="text-sm">All</span>
        </label>
    `;
    
    WRITTEN_TEST_TEAM_ORDER.forEach(team => {
        teamDropdown.innerHTML += `
            <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="${team}" checked onchange="updateTestStatusFilter('team', this)" class="team-filter-checkbox mr-2">
                <span class="text-sm">${team}</span>
            </label>
        `;
        testStatusFilters.teams.add(team);
    });
    
    // Initialize with all positions from all teams (in order)
    const positionDropdown = document.getElementById('position-filter-dropdown');
    positionDropdown.innerHTML = `
        <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" value="ALL" checked onchange="updateTestStatusFilter('position', this)" class="position-filter-checkbox mr-2">
            <span class="text-sm">All</span>
        </label>
    `;
    
    const allPositions = [];
    WRITTEN_TEST_TEAM_ORDER.forEach(team => {
        if (WRITTEN_TEST_TEAM_POSITIONS[team]) {
            WRITTEN_TEST_TEAM_POSITIONS[team].forEach(pos => {
                if (!allPositions.includes(pos)) {
                    allPositions.push(pos);
                }
            });
        }
    });
    
    allPositions.forEach(position => {
        positionDropdown.innerHTML += `
            <label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" value="${position}" checked onchange="updateTestStatusFilter('position', this)" class="position-filter-checkbox mr-2">
                <span class="text-sm">${position}</span>
            </label>
        `;
        testStatusFilters.positions.add(position);
    });
}

// Update pass threshold and recalculate all data
async function updatePassThreshold() {
    const select = document.getElementById('pass-threshold-select');
    const threshold = parseInt(select.value);
    AppState.setPassThreshold(threshold);
    
    console.log(`✅ Pass threshold updated to ${threshold} points`);
    
    // Reload dashboard data with new threshold
    await loadDashboard();
}

async function renderTestStatusChart() {
    const ctx = document.getElementById('test-status-chart');
    if (!ctx) return; // Canvas element not found
    
    // Destroy existing chart
    if (currentTestStatusChart) {
        currentTestStatusChart.destroy();
    }
    
    // Get filtered data
    let data = dashboardData.written_test_by_process;
    
    // Apply filters
    if (testStatusFilters.positions.size > 0) {
        data = data.filter(d => testStatusFilters.positions.has(d.process_name));
    }
    
    // Sort by defined position order (not alphabetically)
    const selectedPositions = Array.from(testStatusFilters.positions);
    const orderedPositions = [];
    WRITTEN_TEST_TEAM_ORDER.forEach(team => {
        if (WRITTEN_TEST_TEAM_POSITIONS[team]) {
            WRITTEN_TEST_TEAM_POSITIONS[team].forEach(pos => {
                if (selectedPositions.includes(pos) && !orderedPositions.includes(pos)) {
                    orderedPositions.push(pos);
                }
            });
        }
    });
    
    // Reorder data based on position order
    data = orderedPositions.map(pos => {
        return data.find(d => d.process_name === pos);
    }).filter(d => d); // Remove undefined items
    
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
                        weight: 'bold',
                        size: 10
                    }
                }
            }
        }
    });
}

function renderAvgScoreChart() {
    const ctx = document.getElementById('avg-score-chart');
    if (!ctx) return; // Canvas element not found
    
    // Destroy existing chart first
    if (currentAvgScoreChart) {
        currentAvgScoreChart.destroy();
        currentAvgScoreChart = null;
    }
    
    const data = dashboardData.avg_score_by_process;
    
    // 법인별로 데이터 그룹화
    const entityColors = {
        'CSVN': { bg: 'rgba(59, 130, 246, 0.6)', border: 'rgba(59, 130, 246, 1)' },
        'CSCN': { bg: 'rgba(34, 197, 94, 0.6)', border: 'rgba(34, 197, 94, 1)' },
        'CSTW': { bg: 'rgba(168, 85, 247, 0.6)', border: 'rgba(168, 85, 247, 1)' }
    };
    
    // 프로세스 목록 추출 (중복 제거)
    const processNames = [...new Set(data.map(d => d.process_name))];
    
    // 법인별 데이터셋 생성
    const entities = [...new Set(data.map(d => d.entity).filter(e => e))];
    const datasets = entities.map(entity => {
        const entityData = processNames.map(processName => {
            const item = data.find(d => d.process_name === processName && d.entity === entity);
            return item ? parseFloat(item.avg_score) : 0;
        });
        
        return {
            label: entity,
            data: entityData,
            backgroundColor: entityColors[entity]?.bg || 'rgba(156, 163, 175, 0.6)',
            borderColor: entityColors[entity]?.border || 'rgba(156, 163, 175, 1)',
            borderWidth: 1
        };
    });
    
    currentAvgScoreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: processNames,
            datasets: datasets
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
    if (!ctx) return; // Canvas element not found
    
    // Destroy existing chart first
    if (currentAssessmentChart) {
        currentAssessmentChart.destroy();
        currentAssessmentChart = null;
    }
    
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
    // Load positions from API first
    if (!positions || positions.length === 0) {
        try {
            const response = await axios.get('/api/positions');
            positions = response.data;
            AppState.setProcesses(positions);
        } catch (error) {
            console.error('Failed to load positions:', error);
            return;
        }
    }
    
    // Load position list for quiz (only 18 positions in specified order)
    const processSelect = document.getElementById('quiz-position-select');
    if (processSelect) {
        processSelect.innerHTML = '<option value="">Select Position</option>';
        
        // Filter and sort positions according to QUIZ_POSITION_ORDER
        QUIZ_POSITION_ORDER.forEach(positionName => {
            const position = positions.find(p => p.name === positionName);
            if (position) {
                const option = document.createElement('option');
                option.value = position.id;
                option.textContent = position.name;
                processSelect.appendChild(option);
            }
        });
    }
    
    // Load Registered Quiz Status
    await loadQuizStatus();
}

async function loadQuizStatus() {
    try {
        const statusDiv = document.getElementById('quiz-status-table');
        
        // Team-Position mapping (using QUIZ_POSITION_ORDER for consistency)
        const teamPositions = {
            'BLACK TOWER': ['CUTTING', 'BEVELING', 'BENDING', 'LS WELDING', 'FIT UP', 'CS WELDING', 'VTMT', 'BRACKET FU', 'BRACKET WELD', 'UT REPAIR', 'DOOR FRAME FU', 'DOOR FRAME WELD', 'FLATNESS'],
            'WHITE TOWER': ['BLASTING', 'METALIZING', 'PAINTING'],
            'INTERNAL MOUNTING': ['ASSEMBLY', 'IM CABLE']
        };
        
        // 프로세스별 Quiz 개수 조회
        const quizCounts = {};
        const latestDates = {};
        
        for (const position of positions) {
            const response = await axios.get(`/api/quizzes/${position.id}`);
            const quizzes = response.data;
            quizCounts[position.id] = quizzes.length;
            
            if (quizzes.length > 0) {
                // 가장 최근 등록일 찾기
                const dates = quizzes.map(q => new Date(q.created_at));
                latestDates[position.id] = new Date(Math.max(...dates));
            }
        }
        
        // 팀별 섹션 생성
        let html = '<div class="space-y-4">';
        
        Object.entries(teamPositions).forEach(([teamName, positionNames]) => {
            const teamId = teamName.replace(/\s+/g, '-').toLowerCase();
            
            // 팀별 통계
            const teamPositionList = positions.filter(p => positionNames.includes(p.name));
            const totalPositions = teamPositionList.length;
            const registeredCount = teamPositionList.filter(p => quizCounts[p.id] > 0).length;
            
            html += `
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <!-- 팀 헤더 (토글 버튼) -->
                    <button onclick="toggleTeamSection('${teamId}')" 
                            class="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 flex items-center justify-between transition-colors">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-users text-blue-600"></i>
                            <h4 class="text-lg font-bold text-gray-800">${teamName}</h4>
                            <span class="text-sm text-gray-600">
                                (${registeredCount}/${totalPositions} Positions Registered)
                            </span>
                        </div>
                        <i id="${teamId}-icon" class="fas fa-chevron-down text-blue-600 transition-transform"></i>
                    </button>
                    
                    <!-- Team Process List (Toggleable) -->
                    <div id="${teamId}-content" class="overflow-hidden transition-all duration-300">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POSITION</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QUIZ COUNT</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LAST REGISTERED</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
            `;
            
            // Iterate in the order defined in positionNames array
            positionNames.forEach(positionName => {
                const position = positions.find(p => p.name === positionName);
                if (!position) return;
                
                const count = quizCounts[position.id] || 0;
                const latestDate = latestDates[position.id];
                const dateStr = latestDate ? latestDate.toLocaleDateString('en-US') : '-';
                const statusBadge = count > 0 
                    ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Registered</span>'
                    : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Not Registered</span>';
                
                const manageButtons = count > 0 
                    ? `
                        <div class="flex gap-2">
                            <button onclick="showQuizManagement(${position.id}, '${position.name}')" 
                                    class="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded">
                                <i class="fas fa-cog mr-1"></i>Manage
                            </button>
                            <button onclick="deleteAllQuizzesByProcess(${position.id}, '${position.name}', ${count})" 
                                    class="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded">
                                <i class="fas fa-trash-alt mr-1"></i>Delete All
                            </button>
                        </div>
                      `
                    : '-';
                
                html += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${position.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${count}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${statusBadge}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${manageButtons}</td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        statusDiv.innerHTML = html;
    } catch (error) {
        console.error('Failed to load quiz status:', error);
        document.getElementById('quiz-status-table').innerHTML = 
            '<p class="text-red-500">Failed to load quiz status.</p>';
    }
}

// 팀 섹션 토글 함수
function toggleTeamSection(teamId) {
    const content = document.getElementById(`${teamId}-content`);
    const icon = document.getElementById(`${teamId}-icon`);
    
    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        // 닫기
        content.style.maxHeight = '0px';
        icon.style.transform = 'rotate(0deg)';
    } else {
        // 열기
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
    }
}

function getQuizUploadHTML() {
    return `
        <div class="space-y-6">
            <!-- Registered Quiz Status -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-list-check mr-2"></i>
                    Registered Quiz Status
                </h3>
                <div id="quiz-status-table" class="overflow-x-auto">
                    <p class="text-gray-500">Loading...</p>
                </div>
            </div>
            
            <!-- Upload Section -->
            <div class="bg-white rounded-lg shadow-md p-8">
                <h2 class="text-3xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-question-circle mr-2"></i>
                    Written Test Quiz Registration
                </h2>
                
                <div class="mb-6">
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                        <p class="text-sm text-blue-700 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Supported Format 1:</strong> POSITION, NO, QUESTION, 1), 2), 3), 4), ANSWER, SCORE
                        </p>
                        <p class="text-sm text-blue-700">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Supported Format 2:</strong> NO, QUESTION, 1), 2), 3), 4), ANSWER, SCORE (POSITION selection required)
                        </p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-semibold mb-2">
                            Select Position (Required for Format 2)
                        </label>
                        <select id="quiz-position-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Position</option>
                        </select>
                    </div>
                    
                    <label class="block text-gray-700 font-semibold mb-2">
                        Select Excel File
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
            
            // 형식 1: POSITION, NO, QUESTION, 1), 2), 3), 4), ANSWER, SCORE
            if (firstRow.hasOwnProperty('POSITION') && firstRow.hasOwnProperty('QUESTION')) {
                // POSITION name to ID mapping
                const positionIdMap = {};
                positions.forEach(p => {
                    const upperName = p.name.toUpperCase();
                    positionIdMap[upperName] = p.id;
                });
                
                quizzes = rows.map(row => {
                    // Get position name and convert to ID
                    const positionName = (row['POSITION'] || '').toString().trim().toUpperCase();
                    const positionId = positionIdMap[positionName];
                    
                    // Convert answer number to letter (1->A, 2->B, 3->C, 4->D)
                    let correctAnswer = (row['ANSWER'] || '').toString().trim();
                    if (['1', '2', '3', '4'].includes(correctAnswer)) {
                        correctAnswer = String.fromCharCode(64 + parseInt(correctAnswer)); // 1->A, 2->B, etc.
                    }
                    
                    return {
                        process_id: positionId,
                        question: (row['QUESTION'] || '').toString().trim(),
                        option_a: (row['1)'] || '').toString().trim(),
                        option_b: (row['2)'] || '').toString().trim(),
                        option_c: (row['3)'] || '').toString().trim(),
                        option_d: (row['4)'] || '').toString().trim(),
                        correct_answer: correctAnswer.toUpperCase()
                    };
                });
            }
            // 형식 2: 프로세스, 번호, 질문, 1), 2), 3), 4), 정답
            else if (firstRow.hasOwnProperty('프로세스') && firstRow.hasOwnProperty('질문')) {
                // 프로세스 이름 매핑 (축약형 -> 전체 이름)
                const processNameMap = {
                    'MATERIAL HANDLING': 'Material Handling',
                    'CUTTING': 'Cutting',
                    'BEVELING': 'Beveling',
                    'BENDING': 'Bending',
                    'LS WELDING': 'LS Welding',
                    'FIT UP': 'Fit Up',
                    'CS WELDING': 'CS Welding',
                    'VTMT': 'VTMT',
                    'BRACKET FU': 'Bracket FU',
                    'BRK FU': 'Bracket FU',  // 축약형 지원
                    'BRACKET WELD': 'Bracket Weld',
                    'BRK WELD': 'Bracket Weld',  // 축약형 지원
                    'UT REPAIR': 'UT repair',
                    'DF FU': 'DF FU',
                    'DF WELD': 'DF Weld',
                    'FLATNESS': 'Flatness',
                    'DRILLING': 'Drilling'
                };
                
                // 프로세스 ID 매핑 생성
                const processIdMap = {};
                positions.forEach(p => {
                    const upperName = p.name.toUpperCase();
                    processIdMap[upperName] = p.id;
                });
                
                quizzes = rows.map(row => {
                    // 프로세스 이름 가져오기 및 정규화
                    let processName = (row['프로세스'] || '').toString().trim().toUpperCase();
                    
                    // 매핑 테이블에서 전체 이름 찾기
                    if (processNameMap[processName]) {
                        processName = processNameMap[processName].toUpperCase();
                    }
                    
                    const processId = processIdMap[processName];
                    
                    if (!processId) {
                        console.warn(`프로세스를 찾을 수 없음: ${row['프로세스']}`);
                    }
                    
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
                        process_id: processId,
                        question: (row['질문'] || '').toString().trim(),
                        option_a: (row['1)'] || '').toString().trim(),
                        option_b: (row['2)'] || '').toString().trim(),
                        option_c: (row['3)'] || '').toString().trim(),
                        option_d: (row['4)'] || '').toString().trim(),
                        correct_answer: correctAnswer
                    };
                }).filter(q => q.process_id); // process_id가 없는 것은 제외
            }
            // 형식 2: NO, QUESTION, 1), 2), 3), 4), ANSWER, SCORE (POSITION selection required)
            else if (firstRow.hasOwnProperty('NO') && firstRow.hasOwnProperty('QUESTION')) {
                const processSelect = document.getElementById('quiz-position-select');
                const processId = processSelect.value;
                
                if (!processId) {
                    alert('Please select a POSITION first. (Required for Format 2)');
                    return;
                }
                
                quizzes = rows.map(row => {
                    // Convert answer number to letter (1->A, 2->B, 3->C, 4->D)
                    let correctAnswer = (row['ANSWER'] || '').toString().trim();
                    if (['1', '2', '3', '4'].includes(correctAnswer)) {
                        correctAnswer = String.fromCharCode(64 + parseInt(correctAnswer)); // 1->A, 2->B, etc.
                    }
                    
                    return {
                        process_id: parseInt(processId),
                        question: (row['QUESTION'] || '').toString().trim(),
                        option_a: (row['1)'] || '').toString().trim(),
                        option_b: (row['2)'] || '').toString().trim(),
                        option_c: (row['3)'] || '').toString().trim(),
                        option_d: (row['4)'] || '').toString().trim(),
                        correct_answer: correctAnswer.toUpperCase()
                    };
                });
            } else {
                alert('Unsupported Excel file format.\n\nSupported formats:\n1. POSITION, NO, QUESTION, 1), 2), 3), 4), ANSWER, SCORE\n2. NO, QUESTION, 1), 2), 3), 4), ANSWER, SCORE (POSITION selection required)\n3. POSITION, QUESTION, 1), 2), 3), 4), ANSWER (legacy format)');
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
            if (document.getElementById('quiz-position-select')) {
                document.getElementById('quiz-position-select').value = '';
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
        const response = await axios.delete(`/api/quizzes/position/${processId}`);
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
                            
                            <input type="hidden" id="edit-position-id">
                            
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
            document.getElementById('edit-position-id').value = currentQuiz.process_id;
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
            process_id: parseInt(document.getElementById('edit-position-id').value),
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
    // Load positions from API first if not loaded
    if (!positions || positions.length === 0) {
        try {
            const response = await axios.get('/api/positions');
            positions = response.data;
            AppState.setProcesses(positions);
        } catch (error) {
            console.error('Failed to load positions:', error);
            return;
        }
    }
    
    // Load position dropdown in TEAM_PROCESS_MAP order (58 positions)
    const processSelect = document.getElementById('assessment-position-select');
    if (processSelect) {
        processSelect.innerHTML = '<option value="">Select Position</option>';
        
        // Iterate through teams in standard order
        STANDARD_TEAM_ORDER.forEach(teamName => {
            const positionNames = TEAM_PROCESS_MAP[teamName];
            if (!positionNames) return;
            
            // Add team separator (optgroup)
            const optgroup = document.createElement('optgroup');
            optgroup.label = teamName;
            
            // Add positions for this team
            positionNames.forEach(positionName => {
                const position = positions.find(p => p.name === positionName);
                if (position) {
                    const option = document.createElement('option');
                    option.value = position.id;
                    option.textContent = position.name;
                    optgroup.appendChild(option);
                }
            });
            
            processSelect.appendChild(optgroup);
        });
    }
    
    // Load registered Assessment items status
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
        
        // 팀별 섹션만 표시 (테이블 헤더 제거)
        
        // Generate team sections
        let teamHTML = '<div class="space-y-4">';
        
        STANDARD_TEAM_ORDER.forEach(teamName => {
            const positionNames = TEAM_PROCESS_MAP[teamName];
            if (!positionNames) return;
            
            const teamId = teamName.replace(/\s+/g, '-').toLowerCase();
            
            // Calculate team statistics
            const teamPositionList = positions.filter(p => positionNames.includes(p.name));
            const totalPositions = teamPositionList.length;
            const registeredCount = teamPositionList.filter(p => (itemCounts[p.id] || 0) > 0).length;
            
            teamHTML += `
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <!-- Team Header (Toggle Button) -->
                    <button onclick="toggleTeamSection('assessment-${teamId}')" 
                            class="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 flex items-center justify-between transition-colors">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-users text-blue-600"></i>
                            <h4 class="text-lg font-bold text-gray-800">${teamName}</h4>
                            <span class="text-sm text-gray-600">
                                (${registeredCount}/${totalPositions} Positions Registered)
                            </span>
                        </div>
                        <i id="assessment-${teamId}-icon" class="fas fa-chevron-down text-blue-600 transition-transform"></i>
                    </button>
                    
                    <!-- Team Position List (Toggleable) -->
                    <div id="assessment-${teamId}-content" class="overflow-hidden transition-all duration-300">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POSITION</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ITEMS</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CATEGORIES</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LAST REGISTERED</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
            `;
            
            // Iterate in the order defined in TEAM_PROCESS_MAP
            positionNames.forEach(positionName => {
                const position = positions.find(p => p.name === positionName);
                if (!position) return;
                
                const count = itemCounts[position.id] || 0;
                const latestDate = latestDates[position.id];
                const dateStr = latestDate ? latestDate.toLocaleDateString('en-US') : '-';
                const categories = categoryBreakdown[position.id] 
                    ? Object.entries(categoryBreakdown[position.id])
                        .map(([cat, cnt]) => `${cat}(${cnt})`)
                        .join(', ')
                    : '-';
                const statusBadge = count > 0 
                    ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Registered</span>'
                    : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Not Registered</span>';
                
                const manageButtons = count > 0 
                    ? `
                        <div class="flex gap-2">
                            <button onclick="showAssessmentManagement(${position.id}, '${position.name}')" class="bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded">
                                <i class="fas fa-cog mr-1"></i>Manage
                            </button>
                            <button onclick="deleteAllAssessmentsByProcess(${position.id}, '${position.name}', ${count})" class="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded">
                                <i class="fas fa-trash-alt mr-1"></i>Delete All
                            </button>
                        </div>
                      `
                    : '-';
                
                teamHTML += `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${position.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${count}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">${categories}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dateStr}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${statusBadge}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">${manageButtons}</td>
                    </tr>
                `;
            });
            
            teamHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
        
        teamHTML += '</div>';
        
        statusDiv.innerHTML = teamHTML;
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
        const response = await axios.delete(`/api/assessment-items/position/${processParam}`);
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
                    Registered Assessment Items Status
                </h3>
                <div id="assessment-status-table" class="overflow-x-auto">
                    <p class="text-gray-500">로딩 중...</p>
                </div>
            </div>
            
            <!-- 업로드 섹션 -->
            <div class="bg-white rounded-lg shadow-md p-8">
                <h2 class="text-3xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-clipboard-check mr-2"></i>
                    Supervisor Assessment Item Registration
                </h2>
                
                <div class="mb-6">
                    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                        <p class="text-sm text-blue-700 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Supported Format 1:</strong> No., TEAM, POSITION, LV CATEGORY, Assessment Item
                        </p>
                        <p class="text-sm text-blue-700 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Supported Format 2:</strong> Category, Item Name, Description (common items, no position)
                        </p>
                        <p class="text-sm text-blue-700">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Supported Format 3:</strong> Level2, Level3, Level4 columns (auto-converted, position selection required)
                        </p>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-gray-700 font-semibold mb-2">
                            Position Selection (Required for Format 3)
                        </label>
                        <select id="assessment-position-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Position</option>
                        </select>
                    </div>
                    
                    <label class="block text-gray-700 font-semibold mb-2">
                        Select Excel File
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
                        Download Template
                    </button>
                </div>
                
                <button onclick="uploadAssessmentItems()" 
                        class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                    <i class="fas fa-upload mr-2"></i>
                    Upload Assessment Items
                </button>
            </div>
        </div>
    `;
}

function downloadAssessmentTemplate() {
    const wb = XLSX.utils.book_new();
    
    // Format 1: Position-specific template
    const ws1_data = [
        ['No.', 'TEAM', 'POSITION', 'LV CATEGORY', 'Assessment Item', 'Description'],
        [1, 'BLACK TOWER', 'BEVELING', 'Level2', 'Can She/He verify the preparation of WIP?', 'Check work in progress preparation']
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1_data);
    XLSX.utils.book_append_sheet(wb, ws1, 'Format1-Position');
    
    // Format 2: Common items template
    const ws2_data = [
        ['Category', 'Item Name', 'Description'],
        ['Technical Ability', 'Work Proficiency', 'Level of proficiency in work process']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(ws2_data);
    XLSX.utils.book_append_sheet(wb, ws2, 'Format2-Common');
    
    XLSX.writeFile(wb, 'assessment_template.xlsx');
}

async function uploadAssessmentItems() {
    const fileInput = document.getElementById('assessment-file');
    if (!fileInput.files.length) {
        alert('파일을 선택해주세요.');
        return;
    }
    
    const file = fileInput.files[0];
    console.log(`📁 선택된 파일: ${file.name}, 크기: ${file.size} bytes`);
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            
            // 헤더 없이 전체 데이터를 가져옴 (range 사용)
            const sheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            console.log('📋 엑셀 헤더:', sheetData[0]);
            console.log('📋 첫 번째 데이터 행:', sheetData[1]);
            
            let items = [];
            
            // Format 1: No., TEAM, POSITION, LV CATEGORY, Assessment Item
            const hasNoOrPosition = sheetData[0] && (sheetData[0].includes('No.') || sheetData[0].includes('POSITION'));
            const hasLvCategory = sheetData[0] && sheetData[0].includes('LV CATEGORY');
            console.log('🔍 Format 1 check:', { hasNoOrPosition, hasLvCategory });
            
            if (hasNoOrPosition && hasLvCategory) {
                console.log('✅ Format 1 detected: Position-specific format');
                // Load positions list
                const positionsResponse = await axios.get('/api/positions');
                const positions = positionsResponse.data;
                
                // Position name mapping (case-insensitive)
                const positionMap = {};
                positions.forEach(p => {
                    const normalizedName = p.name.toUpperCase().trim();
                    positionMap[normalizedName] = p.id;
                    // Add space/underscore variations
                    positionMap[normalizedName.replace(/\s+/g, '_')] = p.id;
                    positionMap[normalizedName.replace(/_/g, ' ')] = p.id;
                    // Add variations without parentheses
                    positionMap[normalizedName.replace(/\([^)]*\)/g, '').trim()] = p.id;
                });
                
                console.log('📋 Position mapping table:', positionMap);
                
                const rows = XLSX.utils.sheet_to_json(firstSheet);
                
                console.log(`📊 Total ${rows.length} rows found`);
                
                // Check first row fields
                if (rows.length > 0) {
                    console.log('🔍 First row data:', rows[0]);
                    console.log('   - No.:', rows[0]['No.']);
                    console.log('   - TEAM:', rows[0]['TEAM']);
                    console.log('   - POSITION:', rows[0]['POSITION']);
                    console.log('   - LV CATEGORY:', rows[0]['LV CATEGORY']);
                    console.log('   - Assessment Item:', rows[0]['Assessment Item']);
                }
                
                let successCount = 0;
                let skipCount = 0;
                
                for (const row of rows) {
                    const rawPositionName = (row['POSITION'] || '').toString().trim();
                    const positionName = rawPositionName.toUpperCase();
                    let positionId = positionMap[positionName];
                    
                    // Try space/underscore variations
                    if (!positionId) {
                        positionId = positionMap[positionName.replace(/\s+/g, '_')] || positionMap[positionName.replace(/_/g, ' ')];
                    }
                    
                    // Try without parentheses
                    if (!positionId) {
                        positionId = positionMap[positionName.replace(/\([^)]*\)/g, '').trim()];
                    }
                    
                    if (!positionId) {
                        console.warn(`⚠️ Position not found: "${rawPositionName}" (normalized: "${positionName}")`);
                        console.warn('   Available positions:', Object.keys(positionMap));
                        skipCount++;
                        continue;
                    }
                    
                    const category = row['LV CATEGORY'] || row['Category'] || '';
                    const itemName = row['Assessment Item'] || row['Item Name'] || '';
                    
                    if (!category || !itemName) {
                        console.warn(`⚠️ Missing required fields - Category: "${category}", Item: "${itemName}"`);
                        skipCount++;
                        continue;
                    }
                    
                    items.push({
                        process_id: positionId,
                        category: category,
                        item_name: itemName,
                        description: row['Description'] || ''
                    });
                    successCount++;
                }
                
                console.log(`✅ Success: ${successCount} items, ⚠️ Skipped: ${skipCount} items`);
            }
            // 형식 2: Category, Item Name, Description (일반적인 형식)
            else if (sheetData[0] && sheetData[0].includes('Category')) {
                console.log('✅ 형식 2 감지: Category 형식');
                const rows = XLSX.utils.sheet_to_json(firstSheet);
                items = rows.map(row => ({
                    process_id: null,
                    category: row['Category'],
                    item_name: row['Item Name'],
                    description: row['Description'] || ''
                }));
            }
            // 형식 3: Level2, Level3, Level4 형식 (Cutting.xlsx)
            else if (sheetData[1] && (sheetData[1].includes('Level2') || sheetData[1].includes('Level3') || sheetData[1].includes('Level4'))) {
                console.log('✅ 형식 3 감지: Level 컬럼 형식');
                const processSelect = document.getElementById('assessment-position-select');
                const processId = processSelect.value;
                
                if (!processId) {
                    alert('프로세스를 선택해주세요. (형식 3 사용 시 필수)');
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
                alert('지원하지 않는 엑셀 파일 형식입니다.\n\n지원 형식:\n1. No., 팀, 프로세스, Lv 카테고리, 평가항목\n2. Category, Item Name, Description\n3. Level2, Level3, Level4 컬럼 형식');
                return;
            }
            
            if (items.length === 0) {
                alert('평가 항목을 찾을 수 없습니다.');
                return;
            }
            
            const response = await axios.post('/api/assessment-items/bulk', items);
            alert(`${response.data.count}개의 평가 항목이 성공적으로 등록되었습니다.`);
            
            // 파일 input 강제 초기화
            fileInput.value = '';
            fileInput.type = '';
            fileInput.type = 'file';
            
            if (document.getElementById('assessment-position-select')) {
                document.getElementById('assessment-position-select').value = '';
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
    // DB에서 최신 작업자 목록 조회
    try {
        const response = await axios.get('/api/workers');
        workers = response.data; // 전역 workers 변수 갱신
        console.log(`✅ 작업자 목록 로드 완료: ${workers.length}명`);
    } catch (error) {
        console.error('❌ 작업자 목록 로드 실패:', error);
        workers = []; // 오류 시 빈 배열로 초기화
    }
    
    // 등록된 작업자 현황 표시
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
            <div class="space-y-4">
        `;
        
        // 법인별로 테이블 생성
        Object.keys(byEntity).sort().forEach(entity => {
            const entityWorkers = byEntity[entity];
            const entityId = entity.replace(/\s+/g, '-'); // 공백을 하이픈으로 변경하여 ID 생성
            
            // 해당 법인의 고유한 팀/직책 목록 추출
            const workerTeams = [...new Set(entityWorkers.map(w => w.team))];
            const workerPositions = [...new Set(entityWorkers.map(w => w.position))];
            
            // 표준 순서에 따라 정렬 (존재하는 것만)
            const uniqueTeams = STANDARD_TEAM_ORDER.filter(team => workerTeams.includes(team));
            const uniquePositions = STANDARD_POSITION_ORDER.filter(pos => workerPositions.includes(pos));
            
            tableHTML += `
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                    <!-- 클릭 가능한 헤더 -->
                    <div class="bg-blue-50 px-6 py-3 border-b border-gray-200 cursor-pointer hover:bg-blue-100 transition" 
                         onclick="toggleEntityList('${entityId}')">
                        <div class="flex items-center justify-between">
                            <h4 class="text-lg font-bold text-gray-800">
                                <i class="fas fa-building mr-2"></i>
                                ${entity} (${entityWorkers.length}명)
                            </h4>
                            <i id="chevron-${entityId}" class="fas fa-chevron-down text-gray-600 transition-transform"></i>
                        </div>
                    </div>
                    
                    <!-- 접을 수 있는 테이블 컨텐츠 -->
                    <div id="entity-${entityId}" class="entity-content">
                        <!-- 필터 영역 -->
                        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                <!-- Team Filter -->
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-1">TEAM</label>
                                    <select id="filter-team-${entityId}" onchange="applyWorkerFilter('${entityId}')"
                                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="">All</option>
                                        ${uniqueTeams.map(team => `<option value="${team}">${team}</option>`).join('')}
                                    </select>
                                </div>
                                
                                <!-- Position Filter -->
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-1">POSITION</label>
                                    <select id="filter-position-${entityId}" onchange="applyWorkerFilter('${entityId}')"
                                            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="">All</option>
                                        ${uniquePositions.map(pos => `<option value="${pos}">${pos}</option>`).join('')}
                                    </select>
                                </div>
                                
                                <!-- Start Date -->
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-1">START DATE (From)</label>
                                    <input type="date" id="filter-date-start-${entityId}" onchange="applyWorkerFilter('${entityId}')"
                                           class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <!-- End Date -->
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-1">START DATE (To)</label>
                                    <input type="date" id="filter-date-end-${entityId}" onchange="applyWorkerFilter('${entityId}')"
                                           class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <!-- Search -->
                                <div>
                                    <label class="block text-xs font-medium text-gray-700 mb-1">NAME/EMPLOYEE ID</label>
                                    <input type="text" id="filter-search-${entityId}" oninput="applyWorkerFilter('${entityId}')"
                                           placeholder="Search"
                                           class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                            
                            <!-- Reset Filter Button -->
                            <div class="mt-3 text-right">
                                <button onclick="resetWorkerFilter('${entityId}')" 
                                        class="px-4 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                                    <i class="fas fa-redo mr-1"></i>Reset Filters
                                </button>
                            </div>
                        </div>
                        
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NAME</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMPLOYEE ID</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TEAM</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POSITION</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">START DATE</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
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
                    <tr class="worker-row" 
                        data-entity-id="${entityId}"
                        data-team="${worker.team}" 
                        data-position="${worker.position}" 
                        data-date="${worker.start_to_work_date}"
                        data-name="${worker.name.toLowerCase()}"
                        data-employee-id="${worker.employee_id.toLowerCase()}">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${worker.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${worker.employee_id}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${worker.team}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${worker.position}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${startDate}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <button onclick="editWorker(${worker.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                                <i class="fas fa-edit"></i> 수정
                            </button>
                            <button onclick="deleteWorker(${worker.id}, '${worker.name}')" class="text-red-600 hover:text-red-900">
                                <i class="fas fa-trash"></i> 삭제
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += `
                            </tbody>
                        </table>
                    </div>
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

// 법인별 리스트 열기/닫기 토글 함수
function toggleEntityList(entityId) {
    const contentDiv = document.getElementById(`entity-${entityId}`);
    const chevron = document.getElementById(`chevron-${entityId}`);
    
    if (contentDiv.style.display === 'none') {
        contentDiv.style.display = 'block';
        chevron.classList.remove('fa-chevron-right');
        chevron.classList.add('fa-chevron-down');
    } else {
        contentDiv.style.display = 'none';
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-right');
    }
}

// 작업자 필터 적용 함수
function applyWorkerFilter(entityId) {
    // 필터 값 가져오기
    const teamFilter = document.getElementById(`filter-team-${entityId}`).value.toLowerCase();
    const positionFilter = document.getElementById(`filter-position-${entityId}`).value.toLowerCase();
    const dateStartFilter = document.getElementById(`filter-date-start-${entityId}`).value;
    const dateEndFilter = document.getElementById(`filter-date-end-${entityId}`).value;
    const searchFilter = document.getElementById(`filter-search-${entityId}`).value.toLowerCase();
    
    // 해당 법인의 모든 작업자 행 가져오기
    const rows = document.querySelectorAll(`tr.worker-row[data-entity-id="${entityId}"]`);
    
    let visibleCount = 0;
    
    rows.forEach(row => {
        const team = row.dataset.team.toLowerCase();
        const position = row.dataset.position.toLowerCase();
        const date = row.dataset.date;
        const name = row.dataset.name;
        const employeeId = row.dataset.employeeId;
        
        // 각 필터 조건 확인
        const teamMatch = !teamFilter || team === teamFilter;
        const positionMatch = !positionFilter || position === positionFilter;
        const searchMatch = !searchFilter || name.includes(searchFilter) || employeeId.includes(searchFilter);
        
        // 날짜 범위 확인
        let dateMatch = true;
        if (dateStartFilter || dateEndFilter) {
            const workerDate = new Date(date);
            if (dateStartFilter) {
                const startDate = new Date(dateStartFilter);
                if (workerDate < startDate) dateMatch = false;
            }
            if (dateEndFilter) {
                const endDate = new Date(dateEndFilter);
                if (workerDate > endDate) dateMatch = false;
            }
        }
        
        // 모든 조건을 만족하면 표시, 아니면 숨김
        if (teamMatch && positionMatch && dateMatch && searchMatch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    console.log(`필터 적용 완료: ${visibleCount}명 표시 (법인: ${entityId})`);
}

// 작업자 필터 초기화 함수
function resetWorkerFilter(entityId) {
    // 필터 값 초기화
    document.getElementById(`filter-team-${entityId}`).value = '';
    document.getElementById(`filter-position-${entityId}`).value = '';
    document.getElementById(`filter-date-start-${entityId}`).value = '';
    document.getElementById(`filter-date-end-${entityId}`).value = '';
    document.getElementById(`filter-search-${entityId}`).value = '';
    
    // 필터 적용 (모든 행 표시)
    applyWorkerFilter(entityId);
}

// 작업자 수정 함수
async function editWorker(workerId) {
    try {
        // 해당 작업자 정보 찾기
        const worker = workers.find(w => w.id === workerId);
        if (!worker) {
            alert('작업자 정보를 찾을 수 없습니다.');
            return;
        }
        
        // 모달 HTML 생성
        const modalHTML = `
            <div id="edit-worker-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onclick="closeEditWorkerModal(event)">
                <div class="relative top-20 mx-auto p-8 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-lg bg-white" onclick="event.stopPropagation()">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-bold text-gray-900">
                            <i class="fas fa-user-edit mr-2"></i>
                            작업자 정보 수정
                        </h3>
                        <button onclick="closeEditWorkerModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">사번</label>
                            <input type="text" id="edit-employee-id" value="${worker.employee_id}" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">이름</label>
                            <input type="text" id="edit-name" value="${worker.name}" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">법인</label>
                            <select id="edit-entity" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="CSVN" ${worker.entity === 'CSVN' ? 'selected' : ''}>CSVN</option>
                                <option value="CSCN" ${worker.entity === 'CSCN' ? 'selected' : ''}>CSCN</option>
                                <option value="CSTW" ${worker.entity === 'CSTW' ? 'selected' : ''}>CSTW</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">팀</label>
                            <input type="text" id="edit-team" value="${worker.team}" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">직책 (Position)</label>
                            <select id="edit-position" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="Cutting" ${worker.position === 'Cutting' ? 'selected' : ''}>Cutting</option>
                                <option value="Beveling" ${worker.position === 'Beveling' ? 'selected' : ''}>Beveling</option>
                                <option value="Bending" ${worker.position === 'Bending' ? 'selected' : ''}>Bending</option>
                                <option value="LS Welding" ${worker.position === 'LS Welding' ? 'selected' : ''}>LS Welding</option>
                                <option value="Fit Up" ${worker.position === 'Fit Up' || worker.position === 'Fit-up' ? 'selected' : ''}>Fit Up</option>
                                <option value="CS Welding" ${worker.position === 'CS Welding' ? 'selected' : ''}>CS Welding</option>
                                <option value="VTMT" ${worker.position === 'VTMT' ? 'selected' : ''}>VTMT</option>
                                <option value="Bracket FU" ${worker.position === 'Bracket FU' ? 'selected' : ''}>Bracket FU</option>
                                <option value="Bracket Weld" ${worker.position === 'Bracket Weld' ? 'selected' : ''}>Bracket Weld</option>
                                <option value="UT repair" ${worker.position === 'UT repair' ? 'selected' : ''}>UT repair</option>
                                <option value="DF FU" ${worker.position === 'DF FU' ? 'selected' : ''}>DF FU</option>
                                <option value="DF Weld" ${worker.position === 'DF Weld' ? 'selected' : ''}>DF Weld</option>
                                <option value="Flatness" ${worker.position === 'Flatness' ? 'selected' : ''}>Flatness</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">입사일</label>
                            <input type="date" id="edit-start-date" value="${worker.start_to_work_date}" 
                                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    
                    <div class="flex justify-end space-x-3 mt-6">
                        <button onclick="closeEditWorkerModal()" 
                                class="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition">
                            취소
                        </button>
                        <button onclick="saveWorkerEdit(${workerId})" 
                                class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition">
                            <i class="fas fa-save mr-2"></i>저장
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // 모달 추가
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
    } catch (error) {
        console.error('작업자 수정 모달 열기 실패:', error);
        alert('작업자 정보를 불러오는데 실패했습니다.');
    }
}

// 수정 모달 닫기
function closeEditWorkerModal(event) {
    if (event && event.target.id !== 'edit-worker-modal') return;
    const modal = document.getElementById('edit-worker-modal');
    if (modal) {
        modal.remove();
    }
}

// 작업자 수정 저장
async function saveWorkerEdit(workerId) {
    try {
        const updatedWorker = {
            employee_id: document.getElementById('edit-employee-id').value.trim(),
            name: document.getElementById('edit-name').value.trim(),
            entity: document.getElementById('edit-entity').value,
            team: document.getElementById('edit-team').value.trim().toLowerCase(),
            position: document.getElementById('edit-position').value,
            start_to_work_date: document.getElementById('edit-start-date').value
        };
        
        // 필수 항목 검증
        if (!updatedWorker.employee_id || !updatedWorker.name || !updatedWorker.team || !updatedWorker.start_to_work_date) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }
        
        const response = await axios.put(`/api/workers/${workerId}`, updatedWorker);
        
        if (response.data.success) {
            alert('✅ 작업자 정보가 수정되었습니다.');
            closeEditWorkerModal();
            await loadWorkers();
            await loadWorkerStatus();
        }
    } catch (error) {
        console.error('작업자 수정 실패:', error);
        alert('작업자 수정에 실패했습니다.\n\n오류: ' + (error.response?.data?.error || error.message));
    }
}

// 작업자 삭제
async function deleteWorker(workerId, workerName) {
    if (!confirm(`⚠️ "${workerName}" 작업자를 삭제하시겠습니까?\n\n이 작업자와 관련된 모든 시험 결과 및 평가 기록도 함께 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    // 2차 확인
    if (!confirm(`정말로 "${workerName}" 작업자를 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        const response = await axios.delete(`/api/workers/${workerId}`);
        
        if (response.data.success) {
            alert(`✅ "${workerName}" 작업자가 삭제되었습니다.`);
            await loadWorkers();
            await loadWorkerStatus();
        }
    } catch (error) {
        console.error('작업자 삭제 실패:', error);
        alert('작업자 삭제에 실패했습니다.\n\n오류: ' + (error.response?.data?.error || error.message));
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
            
            <!-- Upload Section -->
            <div class="bg-white rounded-lg shadow-md p-8">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-users mr-2"></i>
                Worker Registration
            </h2>
            
            <div class="mb-6">
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p class="text-sm text-blue-700 mb-2">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>Supported Format 1:</strong> No, Entity, Name, Employee ID, Team, Position, Start to work date
                    </p>
                    <p class="text-sm text-blue-700">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>Supported Format 2:</strong> Name, Employee ID, Company, Department, Position, start to work (auto-converted)
                    </p>
                </div>
                
                <label class="block text-gray-700 font-semibold mb-2">
                    Select Excel File
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
                    Download Template
                </button>
            </div>
            
            <button onclick="uploadWorkers()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                <i class="fas fa-upload mr-2"></i>
                Upload Workers
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
            console.log('📂 파일 읽기 시작...');
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet);
            
            console.log(`📊 읽은 행 수: ${rows.length}개`);
            
            if (rows.length === 0) {
                alert('엑셀 파일에 데이터가 없습니다.');
                return;
            }
            
            // 첫 번째 행의 컬럼 확인하여 형식 감지
            const firstRow = rows[0];
            console.log('🔍 첫 번째 행 컬럼:', Object.keys(firstRow));
            console.log('🔍 첫 번째 데이터 샘플:', firstRow);
            
            // 컬럼명을 대소문자 무시하고 찾는 헬퍼 함수
            const findColumn = (row, ...possibleNames) => {
                for (const name of possibleNames) {
                    const key = Object.keys(row).find(k => k.toUpperCase() === name.toUpperCase());
                    if (key) return row[key];
                }
                return null;
            };
            
            let workers = [];
            
            // 형식 1: No, Entity, Name, Employee ID, Team, Position, Start to work date
            const hasEntity = findColumn(firstRow, 'Entity') !== null;
            const hasTeam = findColumn(firstRow, 'Team') !== null;
            
            if (hasEntity && hasTeam) {
                console.log('✅ 형식 1 감지 (Entity, Team 컬럼 존재)');
                workers = rows.map((row, idx) => {
                    const worker = {
                        employee_id: String(findColumn(row, 'Employee ID') || '').trim(),
                        name: String(findColumn(row, 'Name') || '').trim(),
                        entity: String(findColumn(row, 'Entity') || '').trim(),
                        team: String(findColumn(row, 'Team') || '').trim(),
                        position: String(findColumn(row, 'Position') || '').trim(),
                        start_to_work_date: convertExcelDate(findColumn(row, 'Start to work date', 'Start to work', 'Start Date'))
                    };
                    
                    // 처음 3개 데이터 디버깅
                    if (idx < 3) {
                        console.log(`📋 행 ${idx + 2} 변환 결과:`, worker);
                    }
                    
                    return worker;
                });
            }
            // 형식 2: Name, Employee ID, Company, Department, Position, start to work
            else if (findColumn(firstRow, 'Company') !== null && findColumn(firstRow, 'Department') !== null) {
                console.log('✅ 형식 2 감지 (Company, Department 컬럼 존재)');
                workers = rows.map((row, idx) => {
                    const worker = {
                        employee_id: String(findColumn(row, 'Employee ID') || '').trim(),
                        name: String(findColumn(row, 'Name') || '').trim(),
                        entity: String(findColumn(row, 'Company') || '').trim(),
                        team: String(findColumn(row, 'Department') || '').trim(),
                        position: String(findColumn(row, 'Position') || '').trim(),
                        start_to_work_date: convertExcelDate(findColumn(row, 'start to work', 'Start Date'))
                    };
                    
                    if (idx < 3) {
                        console.log(`📋 행 ${idx + 2} 변환 결과:`, worker);
                    }
                    
                    return worker;
                });
            } else {
                const availableColumns = Object.keys(firstRow).join(', ');
                console.error('❌ 지원하지 않는 형식. 발견된 컬럼:', availableColumns);
                alert(`지원하지 않는 엑셀 파일 형식입니다.\n\n발견된 컬럼: ${availableColumns}\n\n지원 형식:\n1. No, Entity, Name, Employee ID, Team, Position, Start to work date\n2. Name, Employee ID, Company, Department, Position, start to work`);
                return;
            }
            
            console.log(`✅ 총 ${workers.length}개 데이터 변환 완료`);
            
            // 필수 항목 검증
            for (let i = 0; i < workers.length; i++) {
                const worker = workers[i];
                const missingFields = [];
                
                if (!worker.employee_id) missingFields.push('사번');
                if (!worker.name) missingFields.push('이름');
                if (!worker.entity) missingFields.push('법인');
                if (!worker.team) missingFields.push('팀');
                if (!worker.position) missingFields.push('직책');
                if (!worker.start_to_work_date) missingFields.push('입사일');
                
                if (missingFields.length > 0) {
                    console.error(`❌ 행 ${i + 2} 검증 실패:`, worker);
                    alert(`${i + 2}번째 행에 필수 항목이 누락되었습니다.\n\n누락된 항목: ${missingFields.join(', ')}\n\n해당 행 데이터:\n사번: ${worker.employee_id}\n이름: ${worker.name}\n법인: ${worker.entity}\n팀: ${worker.team}\n직책: ${worker.position}\n입사일: ${worker.start_to_work_date}`);
                    return;
                }
            }
            
            console.log('✅ 필수 항목 검증 통과');
            console.log('📤 API 전송 시작... (총 ' + workers.length + '명)');
            
            // BATCH PROCESSING: 100개씩 나눠서 업로드
            const BATCH_SIZE = 100;
            let totalInserted = 0;
            let totalUpdated = 0;
            
            for (let i = 0; i < workers.length; i += BATCH_SIZE) {
                const batch = workers.slice(i, i + BATCH_SIZE);
                const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(workers.length / BATCH_SIZE);
                
                console.log(`📤 Uploading batch ${batchNumber}/${totalBatches} (${batch.length} workers)...`);
                
                try {
                    const response = await axios.post('/api/workers/bulk', batch);
                    totalInserted += response.data.inserted || 0;
                    totalUpdated += response.data.updated || 0;
                    
                    console.log(`✅ Batch ${batchNumber}/${totalBatches} complete: ${response.data.inserted} inserted, ${response.data.updated} updated`);
                } catch (error) {
                    console.error(`❌ Batch ${batchNumber}/${totalBatches} failed:`, error);
                    alert(`❌ Batch ${batchNumber}/${totalBatches} upload failed.\n\nError: ${error.response?.data?.error || error.message}\n\nPlease try again.`);
                    return;
                }
                
                // 500ms delay between batches to avoid overwhelming the server
                if (i + BATCH_SIZE < workers.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            console.log('🎉 All batches uploaded successfully');
            alert(`✅ Upload complete!\n\n📊 New workers: ${totalInserted}\n🔄 Updated workers: ${totalUpdated}\n📈 Total: ${totalInserted + totalUpdated}`);
            
            fileInput.value = '';
            await loadWorkers();
            await loadWorkerStatus();
        } catch (error) {
            console.error('❌ 작업자 업로드 실패:', error);
            console.error('에러 상세:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            
            let errorMessage = '작업자 업로드에 실패했습니다.\n\n';
            
            if (error.response?.status === 500) {
                errorMessage += '서버 오류가 발생했습니다.\n';
                errorMessage += `상세: ${error.response.data?.error || '알 수 없는 오류'}`;
            } else if (error.response?.status === 400) {
                errorMessage += '잘못된 데이터 형식입니다.\n';
                errorMessage += `상세: ${error.response.data?.error || '데이터 형식을 확인해주세요'}`;
            } else {
                errorMessage += `오류: ${error.message}`;
            }
            
            alert(errorMessage);
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
                Supervisor Assessment Execution
            </h2>
            
            <div id="assessment-selection" class="space-y-6">
                <!-- Step 1: Select Entity -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <span class="bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs mr-2">1</span>
                        ENTITY
                    </label>
                    <select id="sa-entity-select" onchange="onSAEntityChange()" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Entity</option>
                        <option value="CSVN">CSVN</option>
                        <option value="CSCN">CSCN</option>
                        <option value="CSTW">CSTW</option>
                    </select>
                </div>
                
                <!-- Step 2: Select Team -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <span class="bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs mr-2">2</span>
                        TEAM
                    </label>
                    <select id="sa-team-select" onchange="onSATeamChange()" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled>
                        <option value="">Select Entity first</option>
                    </select>
                </div>
                
                <!-- Step 3: Select Position -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <span class="bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs mr-2">3</span>
                        POSITION
                    </label>
                    <select id="sa-position-select" onchange="onSAProcessChange()" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled>
                        <option value="">Select Team first</option>
                    </select>
                </div>
                
                <!-- Step 4: Select Worker -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <span class="bg-blue-500 text-white rounded-full px-2 py-0.5 text-xs mr-2">4</span>
                        WORKER
                    </label>
                    <select id="sa-worker-select" onchange="onSAWorkerChange()"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" disabled>
                        <option value="">Select Position first</option>
                    </select>
                </div>
                
                <!-- Previous Assessment History Display -->
                <div id="sa-history-container" class="hidden">
                    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                        <div class="flex items-start">
                            <i class="fas fa-history text-yellow-600 mt-1 mr-3"></i>
                            <div class="flex-1">
                                <h4 class="text-sm font-semibold text-yellow-800 mb-2">
                                    Previous Assessment History
                                </h4>
                                <div id="sa-history-content" class="text-sm text-yellow-700">
                                    <!-- Assessment history will be displayed here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Start Assessment Button -->
                <button onclick="startAssessment()" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                    <i class="fas fa-play mr-2"></i>Start Assessment
                </button>
            </div>
            
            <!-- Assessment Progress Area -->
            <div id="assessment-progress" class="hidden">
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-700">Progress</span>
                        <span id="progress-text" class="text-sm font-medium text-blue-600">0 / 0</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div id="progress-bar" class="bg-blue-600 h-3 rounded-full transition-all" style="width: 0%"></div>
                    </div>
                </div>
                
                <div id="assessment-item-container" class="bg-gray-50 rounded-lg p-6 mb-6">
                    <!-- Assessment items will be displayed here -->
                </div>
                
                <div class="flex gap-4">
                    <button onclick="markAsSatisfied()" 
                            class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">
                        <i class="fas fa-check mr-2"></i>Satisfactory
                    </button>
                    <button onclick="markAsUnsatisfied()" 
                            class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition">
                        <i class="fas fa-times mr-2"></i>Unsatisfactory
                    </button>
                </div>
            </div>
            
            <!-- Assessment Complete Area -->
            <div id="assessment-complete" class="hidden">
                <div class="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-6">
                    <h3 class="text-2xl font-bold text-green-800 mb-4">
                        <i class="fas fa-check-circle mr-2"></i>Assessment Complete!
                    </h3>
                    <div id="assessment-summary" class="space-y-3">
                        <!-- Assessment result summary will be displayed here -->
                    </div>
                </div>
                
                <button onclick="showPage('supervisor-assessment')" 
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition">
                    <i class="fas fa-redo mr-2"></i>Start New Assessment
                </button>
            </div>
        </div>
        
        <!-- Supervisor Assessment Result Upload Section -->
        <div class="bg-white rounded-lg shadow-md p-8 mt-6">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-file-excel mr-2"></i>
                Supervisor Assessment Result Upload
            </h2>
            
            <div class="mb-6">
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p class="text-sm text-blue-700 mb-2">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>Excel File Format:</strong> No., Employee ID, Name, Entity, Team, Position, LV Category, Assessment Item, Result, Assessment Date
                    </p>
                    <p class="text-sm text-blue-700">
                        <i class="fas fa-lightbulb mr-2"></i>
                        You can bulk upload previously conducted Supervisor Assessment results.
                    </p>
                </div>
                
                <label class="block text-gray-700 font-semibold mb-2">
                    Select Excel File
                </label>
                <input type="file" id="assessment-result-file" accept=".xlsx,.xls" 
                       class="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-semibold
                              file:bg-green-50 file:text-green-700
                              hover:file:bg-green-100
                              cursor-pointer">
            </div>
            
            <button onclick="uploadAssessmentResults()" 
                    class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                <i class="fas fa-upload mr-2"></i>
                Upload Results
            </button>
        </div>
    `;
}

async function loadSupervisorAssessmentPage() {
    // Load worker data if not available
    if (!workers || workers.length === 0) {
        try {
            const response = await axios.get('/api/workers');
            workers = response.data;
        } catch (error) {
            console.error('Worker data loading failed:', error);
            alert('Failed to load worker data.');
            return;
        }
    }
    
    console.log(`Worker data loaded: ${workers.length} workers`);
}

// Step 1: Entity selection - Filter teams
function onSAEntityChange() {
    const entitySelect = document.getElementById('sa-entity-select');
    const teamSelect = document.getElementById('sa-team-select');
    const processSelect = document.getElementById('sa-position-select');
    const workerSelect = document.getElementById('sa-worker-select');
    const selectedEntity = entitySelect.value;
    
    // Reset team, position, worker selections
    teamSelect.innerHTML = '<option value="">Select Team</option>';
    processSelect.innerHTML = '<option value="">Select Team first</option>';
    workerSelect.innerHTML = '<option value="">Select Position first</option>';
    processSelect.disabled = true;
    workerSelect.disabled = true;
    
    if (!selectedEntity) {
        teamSelect.disabled = true;
        teamSelect.innerHTML = '<option value="">Select Entity first</option>';
        return;
    }
    
    // Extract team list for selected entity
    const entityWorkers = workers.filter(w => w.entity === selectedEntity);
    const workerTeams = new Set(entityWorkers.map(w => w.team).filter(t => t));
    
    // Filter and sort teams by STANDARD_TEAM_ORDER
    const sortedTeams = STANDARD_TEAM_ORDER.filter(team => workerTeams.has(team));
    
    sortedTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team; // Display in UPPERCASE (as defined in STANDARD_TEAM_ORDER)
        teamSelect.appendChild(option);
    });
    
    // Enable team selection
    teamSelect.disabled = false;
    
    console.log(`Entity "${selectedEntity}" selected. Available teams: ${sortedTeams.length}`);
}

// Step 2: Team selection - Filter positions (using Team-Position mapping table)
function onSATeamChange() {
    const entitySelect = document.getElementById('sa-entity-select');
    const teamSelect = document.getElementById('sa-team-select');
    const processSelect = document.getElementById('sa-position-select');
    const workerSelect = document.getElementById('sa-worker-select');
    const selectedEntity = entitySelect.value;
    const selectedTeam = teamSelect.value;
    
    // Reset position and worker selections
    processSelect.innerHTML = '<option value="">Select Position</option>';
    workerSelect.innerHTML = '<option value="">Select Position first</option>';
    workerSelect.disabled = true;
    
    if (!selectedTeam) {
        processSelect.disabled = true;
        processSelect.innerHTML = '<option value="">Select Team first</option>';
        return;
    }
    
    // Get positions for the team from Team-Position mapping table
    const availableProcesses = getProcessesForTeam(selectedTeam);
    
    if (availableProcesses.length === 0) {
        processSelect.innerHTML = '<option value="">No positions registered for this team</option>';
        processSelect.disabled = true;
        console.warn(`No positions registered for team "${selectedTeam}"`);
        return;
    }
    
    // Fill position dropdown (in defined order)
    availableProcesses.forEach(processName => {
        const option = document.createElement('option');
        option.value = processName;
        option.textContent = processName;
        processSelect.appendChild(option);
    });
    
    // Enable position selection
    processSelect.disabled = false;
    
    console.log(`Team "${selectedTeam}" selected. Available positions: ${availableProcesses.length}`);
}

// Step 3: Position selection - Filter workers
function onSAProcessChange() {
    const entitySelect = document.getElementById('sa-entity-select');
    const teamSelect = document.getElementById('sa-team-select');
    const processSelect = document.getElementById('sa-position-select');
    const workerSelect = document.getElementById('sa-worker-select');
    const selectedEntity = entitySelect.value;
    const selectedTeam = teamSelect.value;
    const selectedProcess = processSelect.value;
    
    // Reset worker selection
    workerSelect.innerHTML = '<option value="">Select Worker</option>';
    
    if (!selectedProcess) {
        workerSelect.disabled = true;
        workerSelect.innerHTML = '<option value="">Select Position first</option>';
        return;
    }
    
    // Filter workers by Entity + Team + Position (triple filter)
    const filteredWorkers = workers.filter(worker => {
        if (worker.entity !== selectedEntity) return false;
        if (worker.team !== selectedTeam) return false;
        if (worker.position !== selectedProcess) return false; // Position filter added!
        return true;
    });
    
    // Sort workers by name
    filteredWorkers.sort((a, b) => a.name.localeCompare(b.name));
    
    filteredWorkers.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.id;
        option.textContent = `${worker.name} (${worker.employee_id})`;
        workerSelect.appendChild(option);
    });
    
    // Enable worker selection
    workerSelect.disabled = false;
    
    if (filteredWorkers.length === 0) {
        workerSelect.innerHTML += '<option value="" disabled>No workers registered for this position</option>';
    }
    
    console.log(`Position "${selectedProcess}" selected. Filtered workers: ${filteredWorkers.length}`);
}

// 4단계: 작업자 선택 시 - 이전 평가 이력 표시
async function onSAWorkerChange() {
    const workerSelect = document.getElementById('sa-worker-select');
    const processSelect = document.getElementById('sa-position-select');
    const historyContainer = document.getElementById('sa-history-container');
    const historyContent = document.getElementById('sa-history-content');
    
    const workerId = workerSelect.value;
    const processName = processSelect.value;
    
    if (!workerId || !processName) {
        historyContainer.classList.add('hidden');
        return;
    }
    
    // 프로세스 이름으로 프로세스 ID 찾기
    const position = positions.find(p => p.name === processName);
    if (!position) {
        historyContainer.classList.add('hidden');
        return;
    }
    
    try {
        // 이전 평가 이력 조회
        const response = await axios.get(`/api/supervisor-assessment-history/${workerId}/${position.id}`);
        const history = response.data;
        
        if (history.length === 0) {
            historyContent.innerHTML = '<p>No previous assessment history. Please proceed with the first assessment.</p>';
            historyContainer.classList.remove('hidden');
        } else {
            // Display latest assessment information
            const latest = history[0];
            const assessmentDate = new Date(latest.assessment_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            historyContent.innerHTML = `
                <div class="space-y-2">
                    <p><strong>Total Assessments:</strong> ${history.length} times</p>
                    <p><strong>Latest Assessment Date:</strong> ${assessmentDate}</p>
                    <p><strong>Latest Assessment Items:</strong> ${latest.total_items} items</p>
                    <p><strong>Latest Average Level:</strong> ${parseFloat(latest.average_level).toFixed(2)}</p>
                    <p class="mt-3 text-xs text-yellow-600">
                        <i class="fas fa-info-circle mr-1"></i>
                        Previous history will be preserved and the new assessment will be added.
                    </p>
                </div>
            `;
            historyContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to retrieve assessment history:', error);
        historyContainer.classList.add('hidden');
    }
}

async function startAssessment() {
    const workerId = document.getElementById('sa-worker-select').value;
    const processName = document.getElementById('sa-position-select').value;
    
    if (!workerId || !processName) {
        alert('Please select a worker and position.');
        return;
    }
    
    // Find position ID by position name
    const position = positions.find(p => p.name === processName);
    if (!position) {
        alert('Selected position not found.');
        return;
    }
    const processId = position.id;
    
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
    const processId = document.getElementById('sa-position-select').value;
    
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
                Assessment Results Management
            </h2>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Written Test Results Management -->
                <div class="border border-gray-200 rounded-lg p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-pencil-alt mr-2"></i>
                        Written Test Results
                    </h3>
                    
                    <div class="space-y-4">
                        <!-- Download Section -->
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-gray-700 mb-3">
                                <i class="fas fa-download mr-2"></i>Download Results
                            </h4>
                            
                            <div class="space-y-2">
                                <select id="test-entity-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="">All Entities</option>
                                    <option value="CSVN">CSVN</option>
                                    <option value="CSCN">CSCN</option>
                                    <option value="CSTW">CSTW</option>
                                </select>
                                
                                <select id="test-position-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="">All Positions</option>
                                </select>
                                
                                <select id="test-download-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="summary">Summary (Category/Item/Pass)</option>
                                    <option value="detailed">Detailed (Individual Questions)</option>
                                </select>
                                
                                <button onclick="downloadWrittenTestResults()" 
                                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <i class="fas fa-file-download mr-2"></i>Download Excel
                                </button>
                            </div>
                        </div>
                        
                        <!-- 업로드 섹션 -->
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-gray-700 mb-3">
                                <i class="fas fa-upload mr-2"></i>Upload Results
                            </h4>
                            
                            <div class="space-y-2">
                                <input type="file" 
                                       id="test-result-file" 
                                       accept=".xlsx, .xls"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                
                                <button onclick="uploadWrittenTestResults()" 
                                        class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <i class="fas fa-file-upload mr-2"></i>Upload Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Assessment Results Management -->
                <div class="border border-gray-200 rounded-lg p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">
                        <i class="fas fa-clipboard-check mr-2"></i>
                        Supervisor Assessment Results
                    </h3>
                    
                    <div class="space-y-4">
                        <!-- Download Section -->
                        <div class="bg-purple-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-gray-700 mb-3">
                                <i class="fas fa-download mr-2"></i>Download Results
                            </h4>
                            
                            <div class="space-y-2">
                                <select id="assessment-entity-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="">All Entities</option>
                                    <option value="CSVN">CSVN</option>
                                    <option value="CSCN">CSCN</option>
                                    <option value="CSTW">CSTW</option>
                                </select>
                                
                                <select id="assessment-position-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="">All Positions</option>
                                </select>
                                
                                <select id="assessment-download-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                    <option value="summary">Summary (Category Average)</option>
                                    <option value="detailed">Detailed (Individual Items)</option>
                                </select>
                                
                                <button onclick="downloadAssessmentResults()" 
                                        class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <i class="fas fa-file-download mr-2"></i>Download Excel
                                </button>
                            </div>
                        </div>
                        
                        <!-- 업로드 섹션 -->
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h4 class="font-semibold text-gray-700 mb-3">
                                <i class="fas fa-upload mr-2"></i>Upload Results
                            </h4>
                            
                            <div class="space-y-2">
                                <input type="file" 
                                       id="assessment-result-file" 
                                       accept=".xlsx, .xls"
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                                
                                <button onclick="uploadAssessmentResults()" 
                                        class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition">
                                    <i class="fas fa-file-upload mr-2"></i>Upload Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- User Guide -->
            <div class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 class="font-semibold text-yellow-800 mb-2">
                    <i class="fas fa-info-circle mr-2"></i>User Guide
                </h4>
                <ul class="text-sm text-yellow-700 space-y-1">
                    <li>• Download: Select entity and position to download filtered results as Excel</li>
                    <li>• Upload: Upload Excel file in the same format as downloaded to bulk register results</li>
                    <li>• Written Test: Employee ID, Name, Entity, Team, Position, Position Name, Score, Pass/Fail, Test Date</li>
                    <li>• Assessment: Employee ID, Name, Entity, Team, Position, Category, Assessment Item, Level, Assessment Date</li>
                </ul>
            </div>
        </div>
    `;
}

async function loadResultManagementPage() {
    // 프로세스 목록 로드
    const testProcessFilter = document.getElementById('test-position-filter');
    const assessmentProcessFilter = document.getElementById('assessment-position-filter');
    
    if (testProcessFilter && assessmentProcessFilter) {
        positions.forEach(position => {
            const option1 = document.createElement('option');
            option1.value = position.id;
            option1.textContent = position.name;
            testProcessFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = position.id;
            option2.textContent = position.name;
            assessmentProcessFilter.appendChild(option2);
        });
    }
}

// Written Test 결과 다운로드
async function downloadWrittenTestResults() {
    try {
        const entity = document.getElementById('test-entity-filter').value;
        const processId = document.getElementById('test-position-filter').value;
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
        applyExcelHeaderStyle(ws, true);
        const range = XLSX.utils.decode_range(ws['!ref']);
        
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
                        applyCellColorByValue(ws, row, col, ws[cellAddress].v, 'O', 'X');
                    }
                } else {
                    // 만족 여부 컬럼 (col 2)
                    if (col === 2) {
                        applyCellColorByValue(ws, row, col, ws[cellAddress].v, '합격', '불합격');
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
        const processId = document.getElementById('assessment-position-filter').value;
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
                // 데이터 검증
                const evaluationResult = convertLevelToResult(r.level);
                
                // 디버깅: level이 null/undefined인 경우 콘솔에 경고
                if (!evaluationResult || evaluationResult === 'N/A') {
                    console.warn(`Row ${index + 1}: Missing or invalid level`, {
                        employee_id: r.employee_id,
                        name: r.name,
                        item: r.item_name,
                        level: r.level
                    });
                }
                
                return {
                    'No.': index + 1,
                    '사번': r.employee_id || '',
                    '이름': r.name || '',
                    '법인': r.entity || '',
                    '팀': r.team || '',
                    '프로세스': r.position || '',
                    'Lv 카테고리': r.category || '',
                    '평가항목': r.item_name || '',
                    '평가 결과': evaluationResult,
                    '평가일자': r.assessment_date ? new Date(r.assessment_date).toLocaleDateString('ko-KR') : ''
                };
            });
            
            fileName = `Assessment_Detailed_${entity || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        }
        
        // 워크시트 생성
        const ws = XLSX.utils.json_to_sheet(excelData);
        
        // 열 너비 설정
        const columnWidths = downloadType === 'summary' 
            ? [
                { wch: EXCEL_COLUMN_WIDTHS.NO },
                { wch: EXCEL_COLUMN_WIDTHS.EMPLOYEE_ID },
                { wch: EXCEL_COLUMN_WIDTHS.NAME },
                { wch: EXCEL_COLUMN_WIDTHS.ENTITY },
                { wch: EXCEL_COLUMN_WIDTHS.TEAM },
                { wch: EXCEL_COLUMN_WIDTHS.POSITION },
                { wch: EXCEL_COLUMN_WIDTHS.CATEGORY },
                { wch: EXCEL_COLUMN_WIDTHS.LEVEL },
                { wch: EXCEL_COLUMN_WIDTHS.DATE }
            ]
            : [
                { wch: EXCEL_COLUMN_WIDTHS.NO },
                { wch: EXCEL_COLUMN_WIDTHS.EMPLOYEE_ID },
                { wch: EXCEL_COLUMN_WIDTHS.NAME },
                { wch: EXCEL_COLUMN_WIDTHS.ENTITY },
                { wch: EXCEL_COLUMN_WIDTHS.TEAM },
                { wch: EXCEL_COLUMN_WIDTHS.POSITION },
                { wch: EXCEL_COLUMN_WIDTHS.LEVEL_CATEGORY },
                { wch: EXCEL_COLUMN_WIDTHS.ITEM_NAME },
                { wch: EXCEL_COLUMN_WIDTHS.RESULT },
                { wch: EXCEL_COLUMN_WIDTHS.DATE }
            ];
        
        ws['!cols'] = columnWidths;
        
        // 헤더 스타일 적용
        applyExcelHeaderStyle(ws);
        const range = XLSX.utils.decode_range(ws['!ref']);
        
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
                        applyCellColorByValue(ws, row, col, ws[cellAddress].v, '만족', '불만족');
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
        alert('Please select a file.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            console.log(`📁 Excel file read complete: ${jsonData.length} rows`);
            console.log('📋 First row:', jsonData[0]);
            
            // Data conversion
            const results = jsonData.map((row, index) => {
                // Parse TEST DATE (safe parsing)
                let testDate = new Date().toISOString().split('T')[0]; // Default: today
                const dateStr = row['TEST DATE'];
                
                if (dateStr) {
                    try {
                        if (typeof dateStr === 'number') {
                            // Excel number date
                            const excelEpoch = new Date(1900, 0, 1);
                            const daysOffset = dateStr - 2;
                            const jsDate = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
                            if (!isNaN(jsDate.getTime())) {
                                testDate = jsDate.toISOString().split('T')[0];
                            }
                        } else {
                            // String date "2025. 10. 28."
                            let cleanDate = String(dateStr).trim();
                            cleanDate = cleanDate.replace(/\./g, '-').replace(/\s+/g, '');
                            if (cleanDate.endsWith('-')) {
                                cleanDate = cleanDate.slice(0, -1);
                            }
                            const parsedDate = new Date(cleanDate);
                            if (!isNaN(parsedDate.getTime())) {
                                testDate = parsedDate.toISOString().split('T')[0];
                            }
                        }
                    } catch (error) {
                        console.warn(`Date parsing failed for row ${index + 2}:`, error);
                    }
                }
                
                // Parse "whether it is correct" (O/X or correct/incorrect)
                const correctnessStr = String(row['whether it is correct'] || '').trim().toUpperCase();
                const isCorrect = correctnessStr === 'O' || correctnessStr === 'CORRECT' || correctnessStr === 'TRUE';
                
                return {
                    employee_id: String(row['EMPLOYEE ID'] || '').trim(),
                    entity: String(row['ENTITY'] || '').trim().toUpperCase(),
                    team: String(row['TEAM'] || '').trim().toUpperCase(),
                    position: String(row['POSITION'] || '').trim().toUpperCase(),
                    question: String(row['QUESTION'] || '').trim(),
                    selected_answer: String(row['SELECTED ANSWER'] || '').trim(),
                    correct_answer: String(row['CORRECT ANSWER'] || '').trim(),
                    is_correct: isCorrect ? 1 : 0,
                    test_date: testDate
                };
            });
            
            console.log(`🔄 Conversion complete: ${results.length} items`);
            console.log('📊 First converted data:', results[0]);
            
            // Upload to server in batches (100 items per batch to avoid D1 timeout)
            const BATCH_SIZE = 100;
            let totalSuccess = 0;
            let totalSkipped = 0;
            const allMessages = [];
            
            for (let i = 0; i < results.length; i += BATCH_SIZE) {
                const batch = results.slice(i, i + BATCH_SIZE);
                const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
                const totalBatches = Math.ceil(results.length / BATCH_SIZE);
                
                console.log(`📤 Uploading batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);
                
                try {
                    const response = await axios.post('/api/written-test-results/bulk', batch);
                    totalSuccess += response.data.success || 0;
                    totalSkipped += response.data.skipped || 0;
                    
                    if (response.data.message) {
                        allMessages.push(`Batch ${batchNumber}: ${response.data.message}`);
                    }
                    
                    console.log(`✅ Batch ${batchNumber}/${totalBatches} complete: ${response.data.success} succeeded, ${response.data.skipped} skipped`);
                } catch (error) {
                    console.error(`❌ Batch ${batchNumber}/${totalBatches} failed:`, error);
                    allMessages.push(`❌ Batch ${batchNumber} failed: ${error.response?.data?.error || error.message}`);
                }
                
                // Small delay between batches to avoid overwhelming the database
                if (i + BATCH_SIZE < results.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            const messageDetail = allMessages.length > 0 ? '\n\nDetails:\n' + allMessages.slice(0, 5).join('\n') : '';
            alert(`✅ ${totalSuccess} succeeded\n⚠️ ${totalSkipped} skipped${messageDetail}`);
            fileInput.value = '';
            
            // Refresh page to update dashboard
            if (totalSuccess > 0) {
                setTimeout(() => {
                    location.reload();
                }, 1500);
            }
        } catch (error) {
            console.error('❌ Upload failed:', error);
            alert(`Written Test results upload failed.\n\nError: ${error.response?.data?.error || error.message}\n\nPlease check the file format.`);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Assessment 결과 업로드
async function uploadAssessmentResults() {
    const fileInput = document.getElementById('assessment-result-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            console.log(`📁 Excel file read complete: ${jsonData.length} rows`);
            console.log('📋 First row:', jsonData[0]);
            console.log('📅 TEST DATE original value:', jsonData[0]['TEST DATE'], 'type:', typeof jsonData[0]['TEST DATE']);
            
            // Data conversion
            const results = jsonData.map((row, index) => {
                // Parse TEST DATE (safe parsing)
                let assessmentDate = new Date().toISOString().split('T')[0]; // Default: today
                const dateStr = row['TEST DATE'];
                
                if (dateStr) {
                    try {
                        // When date comes as number from Excel (e.g., 45600)
                        if (typeof dateStr === 'number') {
                            console.log(`📅 Number date detected (row ${index + 2}):`, dateStr);
                            // Convert Excel date format to JavaScript Date
                            const excelEpoch = new Date(1900, 0, 1);
                            const daysOffset = dateStr - 2;
                            const jsDate = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);
                            
                            // Validate and convert
                            if (!isNaN(jsDate.getTime())) {
                                assessmentDate = jsDate.toISOString().split('T')[0];
                                console.log(`✅ Conversion complete:`, assessmentDate);
                            } else {
                                console.warn(`⚠️ Number date conversion failed (row ${index + 2}):`, dateStr);
                            }
                        } else {
                            // When date comes as string
                            console.log(`📅 String date detected (row ${index + 2}):`, dateStr);
                            let cleanDate = String(dateStr).trim();
                            
                            // Handle "2025. 10. 28." format
                            cleanDate = cleanDate.replace(/\./g, '-').replace(/\s+/g, '');
                            
                            // Remove trailing hyphen
                            if (cleanDate.endsWith('-')) {
                                cleanDate = cleanDate.slice(0, -1);
                            }
                            
                            console.log(`🔄 Cleaned date string:`, cleanDate);
                            
                            // Parse date
                            const parsedDate = new Date(cleanDate);
                            
                            if (!isNaN(parsedDate.getTime())) {
                                assessmentDate = parsedDate.toISOString().split('T')[0];
                                console.log(`✅ Conversion complete:`, assessmentDate);
                            } else {
                                console.warn(`⚠️ String date parsing failed (row ${index + 2}): "${dateStr}" → Using today's date`);
                            }
                        }
                    } catch (error) {
                        console.warn(`⚠️ Date parsing exception (row ${index + 2}): "${dateStr}" →`, error.message);
                    }
                }
                
                return {
                    employee_id: String(row['EMPLOYEE ID'] || '').trim(),
                    entity: String(row['ENTITY'] || '').trim().toUpperCase(),
                    team: String(row['TEAM'] || '').trim().toUpperCase(),
                    process_name: String(row['POSITION'] || '').trim().toUpperCase(),
                    category: String(row['LV CATEGORY'] || '').trim(),
                    item_name: String(row['ASSESSMENT ITEM'] || '').trim(),
                    is_satisfied: String(row['RESULT'] || '').trim().toUpperCase() === 'SATISFACTORY' ? 1 : 0,
                    assessment_date: assessmentDate
                };
            });
            
            console.log(`🔄 Conversion complete: ${results.length} items`);
            console.log('📊 First converted data:', results[0]);
            
            // Upload to server
            const response = await axios.post('/api/supervisor-assessment-results/bulk', results);
            
            alert(`✅ ${response.data.success} succeeded\n⚠️ ${response.data.skipped} skipped\n\nDetails:\n${response.data.message || ''}`);
            fileInput.value = '';
            
            // Refresh page to update dashboard
            if (response.data.success > 0) {
                setTimeout(() => {
                    location.reload();
                }, 1500);
            }
        } catch (error) {
            console.error('❌ Upload failed:', error);
            alert(`Assessment results upload failed.\n\nError: ${error.response?.data?.error || error.message}\n\nPlease check the file format.`);
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
                Written Test Execution
            </h2>
            
            <div id="test-selection" class="space-y-4">
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">ENTITY</label>
                    <select id="entity-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="filterTeamsByEntity()">
                        <option value="">Select Entity</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">TEAM</label>
                    <select id="team-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="filterPositionsByTeam()">
                        <option value="">Select Team</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">POSITION</label>
                    <select id="position-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" onchange="filterWorkersByFilters()">
                        <option value="">Select Position</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-gray-700 font-semibold mb-2">WORKER</label>
                    <select id="worker-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Select Worker</option>
                    </select>
                </div>
                
                <button onclick="startTest()" 
                        class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                    <i class="fas fa-play mr-2"></i>
                    Start Test
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
        
        <!-- Written Test Results Registration Section -->
        <div class="bg-white rounded-lg shadow-md p-8 mt-6">
            <h2 class="text-3xl font-bold text-gray-800 mb-6">
                <i class="fas fa-file-excel mr-2"></i>
                Register Written Test Results
            </h2>
            
            <div class="mb-6">
                <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p class="text-sm text-blue-700 mb-2">
                        <i class="fas fa-info-circle mr-2"></i>
                        <strong>Excel File Format:</strong> No, EMPLOYEE ID, NAME, ENTITY, TEAM, POSITION, QUESTION, SELECTED ANSWER, CORRECT ANSWER, whether it is correct, TEST DATE
                    </p>
                    <p class="text-sm text-blue-700">
                        <i class="fas fa-lightbulb mr-2"></i>
                        You can batch register past Written Test results.
                    </p>
                </div>
                
                <label class="block text-gray-700 font-semibold mb-2">
                    Select Excel File
                </label>
                <input type="file" id="test-result-file" accept=".xlsx,.xls" 
                       class="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-semibold
                              file:bg-green-50 file:text-green-700
                              hover:file:bg-green-100
                              cursor-pointer">
            </div>
            
            <button onclick="uploadWrittenTestResults()" 
                    class="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition">
                <i class="fas fa-upload mr-2"></i>
                Upload Results
            </button>
        </div>
    `;
}

let currentQuizzes = [];
let selectedAnswers = {};

async function loadTestPage() {
    // Load entity list (extract unique entities from workers DB)
    const entitySelect = document.getElementById('entity-select');
    if (entitySelect && workers.length > 0) {
        const uniqueEntities = [...new Set(workers.map(w => w.entity))].sort();
        
        uniqueEntities.forEach(entity => {
            const option = document.createElement('option');
            option.value = entity;
            option.textContent = entity;
            entitySelect.appendChild(option);
        });
    }
}

function filterTeamsByEntity() {
    const entitySelect = document.getElementById('entity-select');
    const teamSelect = document.getElementById('team-select');
    const positionSelect = document.getElementById('position-select');
    const workerSelect = document.getElementById('worker-select');
    const selectedEntity = entitySelect.value;
    
    // Reset team, position, and worker selections
    teamSelect.innerHTML = '<option value="">Select Team</option>';
    positionSelect.innerHTML = '<option value="">Select Position</option>';
    workerSelect.innerHTML = '<option value="">Select Worker</option>';
    
    if (!selectedEntity) {
        return;
    }
    
    // Get unique teams for this entity's workers (in STANDARD_TEAM_ORDER)
    const entityWorkers = workers.filter(w => w.entity === selectedEntity);
    const workerTeams = new Set(entityWorkers.map(w => w.team));
    
    // Filter and sort teams by STANDARD_TEAM_ORDER
    const availableTeams = STANDARD_TEAM_ORDER.filter(team => workerTeams.has(team));
    
    availableTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
    });
    
    if (availableTeams.length === 0) {
        teamSelect.innerHTML += '<option value="" disabled>No teams available</option>';
    }
}

async function filterPositionsByTeam() {
    const entitySelect = document.getElementById('entity-select');
    const teamSelect = document.getElementById('team-select');
    const positionSelect = document.getElementById('position-select');
    const workerSelect = document.getElementById('worker-select');
    const selectedEntity = entitySelect.value;
    const selectedTeam = teamSelect.value;
    
    // Reset position and worker selections
    positionSelect.innerHTML = '<option value="">Select Position</option>';
    workerSelect.innerHTML = '<option value="">Select Worker</option>';
    
    if (!selectedEntity || !selectedTeam) {
        return;
    }
    
    // Get positions for this team from TEAM_PROCESS_MAP
    const teamPositionNames = TEAM_PROCESS_MAP[selectedTeam] || [];
    
    // Filter by entity + team workers' positions
    const filteredWorkers = workers.filter(w => 
        w.entity === selectedEntity && 
        w.team === selectedTeam
    );
    const workerPositions = new Set(filteredWorkers.map(w => w.position));
    
    // Check which positions have quizzes
    const positionsWithQuiz = [];
    
    for (const positionName of teamPositionNames) {
        if (!workerPositions.has(positionName)) continue;
        
        const position = positions.find(p => p.name === positionName);
        if (!position) continue;
        
        try {
            const response = await axios.get(`/api/quizzes/${position.id}`);
            if (response.data.length > 0) {
                positionsWithQuiz.push(position);
            }
        } catch (error) {
            console.error(`Position ${position.name} Quiz check failed:`, error);
        }
    }
    
    positionsWithQuiz.forEach(position => {
        const option = document.createElement('option');
        option.value = position.id;
        option.textContent = position.name;
        positionSelect.appendChild(option);
    });
    
    if (positionsWithQuiz.length === 0) {
        positionSelect.innerHTML += '<option value="" disabled>No Quiz registered</option>';
    }
}

function filterWorkersByFilters() {
    const entitySelect = document.getElementById('entity-select');
    const teamSelect = document.getElementById('team-select');
    const positionSelect = document.getElementById('position-select');
    const workerSelect = document.getElementById('worker-select');
    
    const selectedEntity = entitySelect.value;
    const selectedTeam = teamSelect.value;
    const selectedPositionId = positionSelect.value;
    
    // Reset worker selection
    workerSelect.innerHTML = '<option value="">Select Worker</option>';
    
    if (!selectedEntity || !selectedTeam || !selectedPositionId) {
        return;
    }
    
    // Find selected position name
    const selectedPosition = positions.find(p => p.id == selectedPositionId);
    if (!selectedPosition) return;
    
    // Filter workers by entity + team + position
    const filteredWorkers = workers.filter(worker => 
        worker.entity === selectedEntity && 
        worker.team === selectedTeam &&
        worker.position === selectedPosition.name
    );
    
    // Sort workers by name
    filteredWorkers.sort((a, b) => a.name.localeCompare(b.name));
    
    filteredWorkers.forEach(worker => {
        const option = document.createElement('option');
        option.value = worker.id;
        option.textContent = `${worker.name} (${worker.employee_id})`;
        workerSelect.appendChild(option);
    });
    
    if (filteredWorkers.length === 0) {
        workerSelect.innerHTML += '<option value="" disabled>No workers match the selected filters</option>';
    }
}

async function startTest() {
    const entityId = document.getElementById('entity-select').value;
    const workerId = document.getElementById('worker-select').value;
    const processId = document.getElementById('position-select').value;
    
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
    const processId = document.getElementById('position-select').value;
    
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
        document.getElementById('position-select').value = '';
    } catch (error) {
        console.error('시험 결과 제출 실패:', error);
        alert('시험 결과 제출에 실패했습니다.');
    }
}

// Written Test 결과 일괄 업로드
async function uploadTestResults() {
    const fileInput = document.getElementById('test-result-file');
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
            
            console.log('📊 업로드된 행 수:', rows.length);
            console.log('📄 첫 번째 행:', rows[0]);
            
            if (rows.length === 0) {
                alert('엑셀 파일에 데이터가 없습니다.');
                return;
            }
            
            // 프로세스 매핑 (대소문자 구분 없이)
            const processesResponse = await axios.get('/api/positions');
            const processMap = {};
            processesResponse.data.forEach(p => {
                processMap[p.name.toUpperCase().trim()] = p.id;
            });
            
            // 작업자 매핑 (법인 + 사번 기준)
            const workersResponse = await axios.get('/api/workers');
            const workerMap = {};
            workersResponse.data.forEach(w => {
                // 법인 + 사번을 키로 사용
                const key = `${w.entity}-${w.employee_id.toString()}`;
                workerMap[key] = w.id;
            });
            
            console.log('👥 작업자 매핑 샘플:', Object.keys(workerMap).slice(0, 5));
            
            // 결과 데이터 변환
            const results = rows.map(row => {
                const employeeId = row['사번']?.toString();
                const entity = row['법인']?.toString().trim();
                const processName = (row['프로세스'] || '').toString().trim().toUpperCase();
                
                // 법인 + 사번으로 작업자 찾기
                const workerKey = `${entity}-${employeeId}`;
                const workerId = workerMap[workerKey];
                const processId = processMap[processName];
                
                if (!workerId) {
                    console.warn(`❌ 작업자를 찾을 수 없음: ${entity} - 사번 ${employeeId}`);
                }
                if (!processId) {
                    console.warn(`❌ 프로세스를 찾을 수 없음: ${row['프로세스']}`);
                }
                
                return {
                    worker_id: workerId,
                    process_id: processId,
                    question: row['문제'],
                    selected_answer: row['선택답안'],
                    correct_answer: row['정답'],
                    is_correct: row['정답여부'] === 'O',
                    test_date: row['시험일자'] ? new Date(row['시험일자']).toISOString() : new Date().toISOString()
                };
            }).filter(r => r.worker_id && r.process_id); // worker_id와 process_id가 있는 것만
            
            console.log('✅ 변환된 결과 수:', results.length);
            
            if (results.length === 0) {
                alert('유효한 데이터가 없습니다.\n\n작업자 사번과 프로세스 이름을 확인해주세요.');
                return;
            }
            
            // 서버에 업로드
            const response = await axios.post('/api/test-results/bulk', results);
            
            alert(`✅ ${response.data.count}건의 결과를 업로드했습니다.`);
            fileInput.value = '';
            
        } catch (error) {
            console.error('업로드 실패:', error);
            let errorMessage = '결과 업로드에 실패했습니다.\n\n';
            
            if (error.response?.data?.error) {
                errorMessage += `오류: ${error.response.data.error}`;
            } else {
                errorMessage += `오류: ${error.message}`;
            }
            
            alert(errorMessage);
        }
    };
    
    reader.readAsArrayBuffer(file);
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
    if (!ctx) return; // Canvas element not found
    
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
    if (!ctx) return; // Canvas element not found
    
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
    if (!ctx) return; // Canvas element not found
    
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
    if (!ctx) return; // Canvas element not found
    
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

// ==================== 챗봇 페이지 ====================

// 챗봇 상태 관리
const ChatbotState = {
    messages: [],
    isLoading: false
};

// 챗봇 HTML 생성
function getChatbotHTML() {
    return `
        <div class="max-w-5xl mx-auto">
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                <!-- 챗봇 헤더 -->
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold flex items-center">
                                <i class="fas fa-robot mr-3"></i>
                                Skill Level 평가 시스템 챗봇
                            </h2>
                            <p class="text-blue-100 mt-2 text-sm">
                                등록된 데이터를 기반으로 질문해보세요. 작업자, Written Test, 프로세스 정보를 조회할 수 있습니다.
                            </p>
                        </div>
                        <button onclick="clearChatHistory()" 
                                class="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-semibold">
                            <i class="fas fa-trash-alt mr-1"></i>
                            Clear
                        </button>
                    </div>
                </div>

                <!-- 빠른 질문 버튼 -->
                <div class="p-4 bg-gray-50 border-b">
                    <p class="text-xs font-semibold text-gray-600 mb-2">
                        <i class="fas fa-bolt mr-1"></i>빠른 질문:
                    </p>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="sendQuickQuestion('작업자는 몇 명이야?')" 
                                class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">
                            👥 작업자 수
                        </button>
                        <button onclick="sendQuickQuestion('Written Test 합격률은?')" 
                                class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">
                            📊 합격률
                        </button>
                        <button onclick="sendQuickQuestion('평균 점수는?')" 
                                class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">
                            📈 평균 점수
                        </button>
                        <button onclick="sendQuickQuestion('취약 프로세스는?')" 
                                class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">
                            ⚠️ 취약 프로세스
                        </button>
                        <button onclick="sendQuickQuestion('최고 성적자는?')" 
                                class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">
                            🏆 최고 성적
                        </button>
                        <button onclick="sendQuickQuestion('프로세스별 통계')" 
                                class="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition">
                            📋 통계
                        </button>
                        <button onclick="sendQuickQuestion('도움말')" 
                                class="px-3 py-1 text-sm bg-blue-100 border border-blue-300 text-blue-700 rounded-full hover:bg-blue-200 transition">
                            ❓ 도움말
                        </button>
                    </div>
                </div>

                <!-- 채팅 메시지 영역 -->
                <div id="chat-messages" class="h-96 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                    <!-- 초기 환영 메시지 -->
                    <div class="flex items-start space-x-3">
                        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                <p class="text-gray-800">
                                    안녕하세요! 👋 Skill Level 평가 시스템 챗봇입니다.
                                </p>
                                <p class="text-gray-600 text-sm mt-2">
                                    작업자 정보, Written Test 결과, 프로세스 통계 등을 조회할 수 있습니다.<br>
                                    위의 빠른 질문 버튼을 클릭하거나 직접 질문을 입력해보세요.
                                </p>
                            </div>
                            <span class="text-xs text-gray-400 mt-1 block">방금 전</span>
                        </div>
                    </div>
                </div>

                <!-- 입력 영역 -->
                <div class="p-4 bg-white border-t">
                    <div class="flex space-x-3">
                        <input 
                            type="text" 
                            id="chat-input" 
                            placeholder="질문을 입력하세요... (예: CSVN 작업자는 몇 명이야?)"
                            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onkeypress="if(event.key === 'Enter') sendChatMessage()"
                        />
                        <button 
                            onclick="sendChatMessage()" 
                            id="send-button"
                            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed">
                            <i class="fas fa-paper-plane mr-2"></i>전송
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>
                        현재는 등록된 DB 데이터만 조회 가능합니다. Assessment 데이터는 추후 지원 예정입니다.
                    </p>
                </div>
            </div>
        </div>
    `;
}

// 챗봇 초기화
function initializeChatbot() {
    ChatbotState.messages = [];
    ChatbotState.isLoading = false;
    console.log('✅ Chatbot initialized');
}

// 채팅 메시지 전송
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const question = input.value.trim();
    
    if (!question) return;
    
    // 사용자 메시지 추가
    addMessageToChat('user', question);
    input.value = '';
    
    // 전송 버튼 비활성화
    const sendButton = document.getElementById('send-button');
    sendButton.disabled = true;
    
    // 로딩 메시지 추가
    addMessageToChat('bot', '답변을 생성하고 있습니다...', true);
    
    try {
        const response = await axios.post('/api/chatbot/query', { question });
        
        // 로딩 메시지 제거
        removeLoadingMessage();
        
        if (response.data.success) {
            addMessageToChat('bot', response.data.response);
        } else {
            addMessageToChat('bot', '죄송합니다. 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('Chatbot query error:', error);
        removeLoadingMessage();
        addMessageToChat('bot', '죄송합니다. 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
        sendButton.disabled = false;
        input.focus();
    }
}

// 빠른 질문 전송
function sendQuickQuestion(question) {
    const input = document.getElementById('chat-input');
    input.value = question;
    sendChatMessage();
}

// 채팅에 메시지 추가
function addMessageToChat(sender, message, isLoading = false) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-3';
    
    if (sender === 'user') {
        messageDiv.classList.add('flex-row-reverse', 'space-x-reverse');
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                <i class="fas fa-user"></i>
            </div>
            <div class="flex-1 max-w-xl">
                <div class="bg-blue-600 text-white rounded-lg p-4 shadow-sm">
                    <p>${escapeHtml(message)}</p>
                </div>
                <span class="text-xs text-gray-400 mt-1 block text-right">방금 전</span>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <i class="fas fa-robot"></i>
            </div>
            <div class="flex-1">
                <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${isLoading ? 'chatbot-loading' : ''}">
                    <p class="text-gray-800 whitespace-pre-wrap">${escapeHtml(message)}</p>
                </div>
                <span class="text-xs text-gray-400 mt-1 block">방금 전</span>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 로딩 메시지 제거
function removeLoadingMessage() {
    const messagesContainer = document.getElementById('chat-messages');
    const loadingMessages = messagesContainer.querySelectorAll('.chatbot-loading');
    loadingMessages.forEach(msg => msg.closest('.flex').remove());
}

// 채팅 히스토리 초기화
function clearChatHistory() {
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <i class="fas fa-robot"></i>
            </div>
            <div class="flex-1">
                <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p class="text-gray-800">
                        안녕하세요! 👋 Skill Level 평가 시스템 챗봇입니다.
                    </p>
                    <p class="text-gray-600 text-sm mt-2">
                        작업자 정보, Written Test 결과, 프로세스 통계 등을 조회할 수 있습니다.<br>
                        위의 빠른 질문 버튼을 클릭하거나 직접 질문을 입력해보세요.
                    </p>
                </div>
                <span class="text-xs text-gray-400 mt-1 block">방금 전</span>
            </div>
        </div>
    `;
    ChatbotState.messages = [];
    console.log('✅ Chat history cleared');
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
