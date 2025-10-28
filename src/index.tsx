import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'
import type { Bindings, DashboardStats, Worker, WrittenTestQuiz, SupervisorAssessmentItem, Process, WrittenTestResult } from './types'

const app = new Hono<{ Bindings: Bindings }>()

// 에러 핸들러 미들웨어
const errorHandler = (fn: Function) => async (c: any) => {
  try {
    return await fn(c)
  } catch (error: any) {
    console.error('API Error:', error)
    return c.json({ error: error.message }, 500)
  }
}

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './' }))

// ==================== API Routes ====================

// 대시보드 통계 API
app.get('/api/dashboard/stats', errorHandler(async (c) => {
  const db = c.env.DB
    // 전체 작업자 수
    const totalWorkersResult = await db.prepare('SELECT COUNT(*) as count FROM workers').first()
    const total_workers = (totalWorkersResult?.count as number) || 0

    // Written Test 응시자 수 (중복 제거)
    const testTakersResult = await db.prepare(
      'SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results'
    ).first()
    const written_test_takers = (testTakersResult?.count as number) || 0

    // Written Test 합격자 수 (중복 제거, passed=1)
    const testPassedResult = await db.prepare(
      'SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results WHERE passed = 1'
    ).first()
    const written_test_passed = (testPassedResult?.count as number) || 0

    // 프로세스별 Written Test 현황
    const testByProcessResult = await db.prepare(`
      SELECT 
        p.name as process_name,
        COUNT(DISTINCT wtr.worker_id) as takers,
        COUNT(DISTINCT CASE WHEN wtr.passed = 1 THEN wtr.worker_id END) as passed
      FROM processes p
      LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
      GROUP BY p.id, p.name
      ORDER BY p.id
    `).all()
    const written_test_by_process = testByProcessResult.results || []

    // 프로세스별 평균 점수
    const avgScoreResult = await db.prepare(`
      SELECT 
        p.name as process_name,
        COALESCE(AVG(wtr.score), 0) as avg_score
      FROM processes p
      LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
      GROUP BY p.id, p.name
      ORDER BY p.id
    `).all()
    const avg_score_by_process = avgScoreResult.results || []

    // Level별 법인 현황
    const assessmentByLevelResult = await db.prepare(`
      SELECT 
        sa.level,
        w.entity,
        COUNT(*) as count
      FROM supervisor_assessments sa
      JOIN workers w ON sa.worker_id = w.id
      GROUP BY sa.level, w.entity
      ORDER BY sa.level, w.entity
    `).all()
    const supervisor_assessment_by_level = assessmentByLevelResult.results || []

    const stats: DashboardStats = {
      total_workers,
      written_test_takers,
      written_test_passed,
      written_test_by_process: written_test_by_process as any,
      avg_score_by_process: avg_score_by_process as any,
      supervisor_assessment_by_level: supervisor_assessment_by_level as any
    }

    return c.json(stats)
}))

// ==================== Workers CRUD ====================

// 모든 작업자 조회
app.get('/api/workers', errorHandler(async (c) => {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM workers ORDER BY id DESC').all()
  return c.json(result.results)
}))

// 작업자 등록 (단일)
app.post('/api/workers', errorHandler(async (c) => {
  const db = c.env.DB
  const worker: Worker = await c.req.json()
  const result = await db.prepare(`
    INSERT INTO workers (employee_id, name, entity, team, position, start_to_work_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    worker.employee_id,
    worker.name,
    worker.entity,
    worker.team,
    worker.position,
    worker.start_to_work_date
  ).run()

  return c.json({ success: true, id: result.meta.last_row_id }, 201)
}))

// 작업자 일괄 등록 (엑셀 업로드용)
app.post('/api/workers/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const workers: Worker[] = await c.req.json()
  
  for (const worker of workers) {
    await db.prepare(`
      INSERT OR REPLACE INTO workers (employee_id, name, entity, team, position, start_to_work_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      worker.employee_id,
      worker.name,
      worker.entity,
      worker.team,
      worker.position,
      worker.start_to_work_date
    ).run()
  }

  return c.json({ success: true, count: workers.length }, 201)
}))

// ==================== Processes CRUD ====================

// 모든 프로세스 조회
app.get('/api/processes', errorHandler(async (c) => {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM processes ORDER BY id').all()
  return c.json(result.results)
}))

// ==================== Written Test Quizzes CRUD ====================

// 프로세스별 퀴즈 조회
app.get('/api/quizzes/:processId', errorHandler(async (c) => {
  const db = c.env.DB
  const processId = c.req.param('processId')
  const result = await db.prepare('SELECT * FROM written_test_quizzes WHERE process_id = ?')
    .bind(processId)
    .all()
  return c.json(result.results)
}))

// 퀴즈 일괄 등록 (엑셀 업로드용)
app.post('/api/quizzes/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const quizzes: WrittenTestQuiz[] = await c.req.json()
  
  for (const quiz of quizzes) {
    await db.prepare(`
      INSERT INTO written_test_quizzes (process_id, question, option_a, option_b, option_c, option_d, correct_answer)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      quiz.process_id,
      quiz.question,
      quiz.option_a,
      quiz.option_b,
      quiz.option_c || null,
      quiz.option_d || null,
      quiz.correct_answer
    ).run()
  }

  return c.json({ success: true, count: quizzes.length }, 201)
}))

// ==================== Supervisor Assessment Items CRUD ====================

// 모든 평가 항목 조회
app.get('/api/assessment-items', errorHandler(async (c) => {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM supervisor_assessment_items ORDER BY id').all()
  return c.json(result.results)
}))

// 평가 항목 일괄 등록 (엑셀 업로드용)
app.post('/api/assessment-items/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const items: SupervisorAssessmentItem[] = await c.req.json()
  
  for (const item of items) {
    await db.prepare(`
      INSERT INTO supervisor_assessment_items (process_id, category, item_name, description)
      VALUES (?, ?, ?, ?)
    `).bind(
      item.process_id || null,
      item.category,
      item.item_name,
      item.description || null
    ).run()
  }

  return c.json({ success: true, count: items.length }, 201)
}))

// ==================== Written Test Results ====================

// 시험 결과 제출
app.post('/api/test-results', errorHandler(async (c) => {
  const db = c.env.DB
  const result: WrittenTestResult = await c.req.json()
  const insertResult = await db.prepare(`
    INSERT INTO written_test_results (worker_id, process_id, score, passed)
    VALUES (?, ?, ?, ?)
  `).bind(
    result.worker_id,
    result.process_id,
    result.score,
    result.passed ? 1 : 0
  ).run()

  return c.json({ success: true, id: insertResult.meta.last_row_id }, 201)
}))

// ==================== Main Page ====================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>작업자 Skill Level 평가 대시보드</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
    </head>
    <body class="bg-gray-100">
        <!-- Navigation -->
        <nav class="bg-blue-600 text-white p-4 shadow-lg">
            <div class="container mx-auto flex justify-between items-center">
                <h1 class="text-2xl font-bold">
                    <i class="fas fa-chart-line mr-2"></i>
                    Skill Level 평가 시스템
                </h1>
                <div class="space-x-4">
                    <button onclick="showPage('dashboard')" class="hover:underline">
                        <i class="fas fa-home mr-1"></i>대시보드
                    </button>
                    <button onclick="showPage('quiz-upload')" class="hover:underline">
                        <i class="fas fa-question-circle mr-1"></i>Quiz 등록
                    </button>
                    <button onclick="showPage('assessment-upload')" class="hover:underline">
                        <i class="fas fa-clipboard-check mr-1"></i>Assessment 등록
                    </button>
                    <button onclick="showPage('worker-upload')" class="hover:underline">
                        <i class="fas fa-users mr-1"></i>작업자 등록
                    </button>
                    <button onclick="showPage('test-page')" class="hover:underline">
                        <i class="fas fa-pencil-alt mr-1"></i>시험 응시
                    </button>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div id="app" class="container mx-auto p-6">
            <!-- Pages will be loaded here -->
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
