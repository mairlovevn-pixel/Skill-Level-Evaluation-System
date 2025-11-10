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
  const entity = c.req.query('entity') // 법인 필터 파라미터
  
    // 전체 작업자 수
    let totalWorkersResult
    if (entity) {
      totalWorkersResult = await db.prepare('SELECT COUNT(*) as count FROM workers WHERE entity = ?')
        .bind(entity).first()
    } else {
      totalWorkersResult = await db.prepare('SELECT COUNT(*) as count FROM workers').first()
    }
    const total_workers = (totalWorkersResult?.count as number) || 0

    // Written Test 응시자 수 (중복 제거)
    let testTakersResult
    if (entity) {
      testTakersResult = await db.prepare(`
        SELECT COUNT(DISTINCT wtr.worker_id) as count 
        FROM written_test_results wtr
        JOIN workers w ON wtr.worker_id = w.id
        WHERE w.entity = ?
      `).bind(entity).first()
    } else {
      testTakersResult = await db.prepare(
        'SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results'
      ).first()
    }
    const written_test_takers = (testTakersResult?.count as number) || 0

    // Written Test 합격자 수 (중복 제거, passed=1)
    let testPassedResult
    if (entity) {
      testPassedResult = await db.prepare(`
        SELECT COUNT(DISTINCT wtr.worker_id) as count 
        FROM written_test_results wtr
        JOIN workers w ON wtr.worker_id = w.id
        WHERE w.entity = ? AND wtr.passed = 1
      `).bind(entity).first()
    } else {
      testPassedResult = await db.prepare(
        'SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results WHERE passed = 1'
      ).first()
    }
    const written_test_passed = (testPassedResult?.count as number) || 0

    // 프로세스별 Written Test 현황
    let testByProcessResult
    if (entity) {
      testByProcessResult = await db.prepare(`
        SELECT 
          p.name as process_name,
          COUNT(DISTINCT wtr.worker_id) as takers,
          COUNT(DISTINCT CASE WHEN wtr.passed = 1 THEN wtr.worker_id END) as passed
        FROM processes p
        LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
        LEFT JOIN workers w ON wtr.worker_id = w.id
        WHERE w.entity = ? OR w.entity IS NULL
        GROUP BY p.id, p.name
        ORDER BY p.id
      `).bind(entity).all()
    } else {
      testByProcessResult = await db.prepare(`
        SELECT 
          p.name as process_name,
          COUNT(DISTINCT wtr.worker_id) as takers,
          COUNT(DISTINCT CASE WHEN wtr.passed = 1 THEN wtr.worker_id END) as passed
        FROM processes p
        LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
        GROUP BY p.id, p.name
        ORDER BY p.id
      `).all()
    }
    const written_test_by_process = testByProcessResult.results || []

    // 공통 쿼리 파라미터
    const processId = c.req.query('processId')
    const team = c.req.query('team')
    
    // 프로세스별 평균 점수 (법인별로 구분, 프로세스/팀 필터 추가)
    let avgScoreResult
    
    // 동적 쿼리 빌드 for avg_score
    let avgScoreQuery = `
      SELECT 
        p.name as process_name,
        w.entity,
        COALESCE(AVG(wtr.score), 0) as avg_score
      FROM processes p
      LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
      LEFT JOIN workers w ON wtr.worker_id = w.id
      WHERE 1=1
    `
    const avgScoreParams: any[] = []
    
    if (entity) {
      avgScoreQuery += ' AND (w.entity = ? OR w.entity IS NULL)'
      avgScoreParams.push(entity)
    }
    
    if (team) {
      avgScoreQuery += ' AND w.team = ?'
      avgScoreParams.push(team)
    }
    
    if (processId) {
      avgScoreQuery += ' AND p.id = ?'
      avgScoreParams.push(processId)
    }
    
    avgScoreQuery += `
      GROUP BY p.id, p.name, w.entity
      ORDER BY p.id, w.entity
    `
    
    avgScoreResult = await db.prepare(avgScoreQuery).bind(...avgScoreParams).all()
    const avg_score_by_process = avgScoreResult.results || []

    // Level별 법인 현황 (프로세스/팀 필터 추가)
    let assessmentByLevelResult
    
    // 동적 쿼리 빌드
    let levelQuery = `
      SELECT 
        sa.level,
        w.entity,
        COUNT(*) as count
      FROM supervisor_assessments sa
      JOIN workers w ON sa.worker_id = w.id
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE 1=1
    `
    const params: any[] = []
    
    if (entity) {
      levelQuery += ' AND w.entity = ?'
      params.push(entity)
    }
    
    if (processId) {
      levelQuery += ' AND sai.process_id = ?'
      params.push(processId)
    }
    
    if (team) {
      levelQuery += ' AND w.team = ?'
      params.push(team)
    }
    
    levelQuery += `
      GROUP BY sa.level, w.entity
      ORDER BY sa.level, w.entity
    `
    
    assessmentByLevelResult = await db.prepare(levelQuery).bind(...params).all()
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
  
  let insertedCount = 0
  let updatedCount = 0
  
  for (const worker of workers) {
    // 기존 작업자 확인 (employee_id로 검색)
    const existing = await db.prepare('SELECT id FROM workers WHERE employee_id = ?')
      .bind(worker.employee_id).first()
    
    if (existing) {
      // 업데이트
      await db.prepare(`
        UPDATE workers 
        SET name = ?, entity = ?, team = ?, position = ?, start_to_work_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
      `).bind(
        worker.name,
        worker.entity,
        worker.team,
        worker.position,
        worker.start_to_work_date,
        worker.employee_id
      ).run()
      updatedCount++
    } else {
      // 새로 삽입
      await db.prepare(`
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
      insertedCount++
    }
  }

  return c.json({ 
    success: true, 
    count: workers.length,
    inserted: insertedCount,
    updated: updatedCount
  }, 201)
}))

// 작업자 수정
app.put('/api/workers/:id', errorHandler(async (c) => {
  const db = c.env.DB
  const workerId = c.req.param('id')
  const worker: Worker = await c.req.json()
  
  await db.prepare(`
    UPDATE workers 
    SET employee_id = ?, name = ?, entity = ?, team = ?, position = ?, start_to_work_date = ?
    WHERE id = ?
  `).bind(
    worker.employee_id,
    worker.name,
    worker.entity,
    worker.team,
    worker.position,
    worker.start_to_work_date,
    workerId
  ).run()

  return c.json({ success: true })
}))

// 작업자 삭제
app.delete('/api/workers/:id', errorHandler(async (c) => {
  const db = c.env.DB
  const workerId = c.req.param('id')
  
  // 관련된 데이터도 함께 삭제
  await db.prepare('DELETE FROM written_test_results WHERE worker_id = ?').bind(workerId).run()
  await db.prepare('DELETE FROM written_test_answers WHERE worker_id = ?').bind(workerId).run()
  await db.prepare('DELETE FROM supervisor_assessments WHERE worker_id = ?').bind(workerId).run()
  await db.prepare('DELETE FROM workers WHERE id = ?').bind(workerId).run()

  return c.json({ success: true })
}))

// ==================== Processes CRUD ====================

// 모든 프로세스 조회
app.get('/api/processes', errorHandler(async (c) => {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM processes ORDER BY id').all()
  return c.json(result.results)
}))

// 테스트 결과가 있는 팀 목록 조회
app.get('/api/teams', errorHandler(async (c) => {
  const db = c.env.DB
  const entity = c.req.query('entity') // 법인 필터 (선택사항)
  
  let query = `
    SELECT DISTINCT w.team
    FROM written_test_results wtr
    JOIN workers w ON wtr.worker_id = w.id
    WHERE w.team IS NOT NULL
  `
  
  const params: any[] = []
  if (entity) {
    query += ' AND w.entity = ?'
    params.push(entity)
  }
  
  query += ' ORDER BY w.team'
  
  const result = await db.prepare(query).bind(...params).all()
  const teams = (result.results || []).map((row: any) => row.team)
  return c.json(teams)
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

// 퀴즈 수정
app.put('/api/quizzes/:id', errorHandler(async (c) => {
  const db = c.env.DB
  const quizId = c.req.param('id')
  const quiz: WrittenTestQuiz = await c.req.json()
  
  await db.prepare(`
    UPDATE written_test_quizzes 
    SET process_id = ?, 
        question = ?, 
        question_image_url = ?,
        option_a = ?, 
        option_a_image_url = ?,
        option_b = ?, 
        option_b_image_url = ?,
        option_c = ?, 
        option_c_image_url = ?,
        option_d = ?,
        option_d_image_url = ?,
        correct_answer = ?
    WHERE id = ?
  `).bind(
    quiz.process_id,
    quiz.question,
    quiz.question_image_url || null,
    quiz.option_a,
    quiz.option_a_image_url || null,
    quiz.option_b,
    quiz.option_b_image_url || null,
    quiz.option_c || null,
    quiz.option_c_image_url || null,
    quiz.option_d || null,
    quiz.option_d_image_url || null,
    quiz.correct_answer,
    quizId
  ).run()

  return c.json({ success: true })
}))

// 퀴즈 삭제
app.delete('/api/quizzes/:id', errorHandler(async (c) => {
  const db = c.env.DB
  const quizId = c.req.param('id')
  
  await db.prepare('DELETE FROM written_test_quizzes WHERE id = ?')
    .bind(quizId)
    .run()

  return c.json({ success: true })
}))

// 프로세스별 Quiz 일괄 삭제
app.delete('/api/quizzes/process/:processId', errorHandler(async (c) => {
  const db = c.env.DB
  const processId = c.req.param('processId')
  
  // 해당 프로세스의 모든 quiz 삭제
  const result = await db.prepare('DELETE FROM written_test_quizzes WHERE process_id = ?')
    .bind(processId)
    .run()

  return c.json({ 
    success: true, 
    deletedCount: result.meta.changes 
  })
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

// Assessment Item 삭제
app.delete('/api/assessment-items/:id', errorHandler(async (c) => {
  const db = c.env.DB
  const itemId = c.req.param('id')
  
  // Foreign key constraint: supervisor_assessments 먼저 삭제
  await db.prepare('DELETE FROM supervisor_assessments WHERE item_id = ?')
    .bind(itemId)
    .run()
  
  // Assessment item 삭제
  await db.prepare('DELETE FROM supervisor_assessment_items WHERE id = ?')
    .bind(itemId)
    .run()

  return c.json({ success: true })
}))

// Assessment Item 프로세스별 일괄 삭제
app.delete('/api/assessment-items/process/:processId', errorHandler(async (c) => {
  const db = c.env.DB
  const processId = c.req.param('processId')
  
  // processId가 'null'인 경우 일반 항목 삭제
  const isGeneral = processId === 'null'
  
  // 해당 프로세스의 모든 item_id 조회
  let itemsResult
  if (isGeneral) {
    itemsResult = await db.prepare('SELECT id FROM supervisor_assessment_items WHERE process_id IS NULL').all()
  } else {
    itemsResult = await db.prepare('SELECT id FROM supervisor_assessment_items WHERE process_id = ?')
      .bind(processId)
      .all()
  }
  
  const itemIds = itemsResult.results.map((item: any) => item.id)
  
  // supervisor_assessments에서 해당 항목들 삭제
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => '?').join(',')
    await db.prepare(`DELETE FROM supervisor_assessments WHERE item_id IN (${placeholders})`)
      .bind(...itemIds)
      .run()
  }
  
  // Assessment items 삭제
  let result
  if (isGeneral) {
    result = await db.prepare('DELETE FROM supervisor_assessment_items WHERE process_id IS NULL').run()
  } else {
    result = await db.prepare('DELETE FROM supervisor_assessment_items WHERE process_id = ?')
      .bind(processId)
      .run()
  }

  return c.json({ 
    success: true, 
    deletedCount: result.meta.changes 
  })
}))

// ==================== Supervisor Assessment Results ====================

// Supervisor Assessment 결과 제출
// 작업자별 평가 이력 조회 (프로세스별)
app.get('/api/supervisor-assessment-history/:workerId/:processId', errorHandler(async (c) => {
  const db = c.env.DB
  const workerId = c.req.param('workerId')
  const processId = c.req.param('processId')
  
  // 해당 작업자의 프로세스별 평가 이력 조회 (최신순)
  const result = await db.prepare(`
    SELECT 
      sa.id,
      sa.assessment_date,
      COUNT(DISTINCT sa.item_id) as total_items,
      AVG(sa.level) as average_level,
      MAX(sa.level) as max_level,
      MIN(sa.level) as min_level
    FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = ? 
      AND (sai.process_id = ? OR sai.process_id IS NULL)
    GROUP BY DATE(sa.assessment_date)
    ORDER BY sa.assessment_date DESC
  `).bind(workerId, processId).all()
  
  return c.json(result.results)
}))

app.post('/api/supervisor-assessment-results', errorHandler(async (c) => {
  const db = c.env.DB
  const data: any = await c.req.json()
  
  // data: { worker_id, process_id, assessments: [{item_id, level, satisfied}] }
  
  if (!data.worker_id || !data.process_id || !data.assessments) {
    return c.json({ error: 'Missing required fields' }, 400)
  }
  
  // 각 평가 항목 저장
  for (const assessment of data.assessments) {
    await db.prepare(`
      INSERT INTO supervisor_assessments (worker_id, item_id, level, assessment_date)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(
      data.worker_id,
      assessment.item_id,
      assessment.level
    ).run()
  }
  
  return c.json({ 
    success: true,
    worker_id: data.worker_id,
    process_id: data.process_id,
    final_level: data.final_level
  })
}))

// ==================== Written Test Results ====================

// 시험 결과 제출
app.post('/api/test-results', errorHandler(async (c) => {
  const db = c.env.DB
  const data: any = await c.req.json()
  
  // 시험 결과 저장
  const insertResult = await db.prepare(`
    INSERT INTO written_test_results (worker_id, process_id, score, passed)
    VALUES (?, ?, ?, ?)
  `).bind(
    data.worker_id,
    data.process_id,
    data.score,
    data.passed ? 1 : 0
  ).run()
  
  const resultId = insertResult.meta.last_row_id
  
  // 각 문제의 답안 저장
  if (data.answers && Array.isArray(data.answers)) {
    for (const answer of data.answers) {
      await db.prepare(`
        INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
        VALUES (?, ?, ?, ?)
      `).bind(
        resultId,
        answer.quiz_id,
        answer.selected_answer,
        answer.is_correct ? 1 : 0
      ).run()
    }
  }

  return c.json({ success: true, id: resultId }, 201)
}))

// Written Test 결과 일괄 업로드
app.post('/api/test-results/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const results: any[] = await c.req.json()
  
  if (!Array.isArray(results) || results.length === 0) {
    return c.json({ error: 'Results array is required and must not be empty' }, 400)
  }
  
  let successCount = 0
  let errorCount = 0
  
  for (const result of results) {
    try {
      // 작업자별, 프로세스별로 기존 결과가 있는지 확인
      const existing = await db.prepare(`
        SELECT id FROM written_test_results 
        WHERE worker_id = ? AND process_id = ?
      `).bind(result.worker_id, result.process_id).first()
      
      let resultId
      
      if (existing) {
        // 기존 결과 업데이트
        await db.prepare(`
          UPDATE written_test_results 
          SET test_date = ?
          WHERE id = ?
        `).bind(
          result.test_date || new Date().toISOString(),
          existing.id
        ).run()
        
        resultId = existing.id
      } else {
        // 새 결과 삽입 (점수와 합격 여부는 나중에 계산)
        const insertResult = await db.prepare(`
          INSERT INTO written_test_results (worker_id, process_id, score, passed, test_date)
          VALUES (?, ?, 0, 0, ?)
        `).bind(
          result.worker_id,
          result.process_id,
          result.test_date || new Date().toISOString()
        ).run()
        
        resultId = insertResult.meta.last_row_id
      }
      
      // Quiz 찾기 (문제 내용으로 매칭)
      const quiz = await db.prepare(`
        SELECT id FROM written_test_quizzes 
        WHERE process_id = ? AND question = ?
      `).bind(result.process_id, result.question).first()
      
      if (quiz) {
        // 답안 저장 (중복 체크)
        const existingAnswer = await db.prepare(`
          SELECT id FROM written_test_answers 
          WHERE result_id = ? AND quiz_id = ?
        `).bind(resultId, quiz.id).first()
        
        if (!existingAnswer) {
          await db.prepare(`
            INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct)
            VALUES (?, ?, ?, ?)
          `).bind(
            resultId,
            quiz.id,
            result.selected_answer,
            result.is_correct ? 1 : 0
          ).run()
        }
      }
      
      successCount++
    } catch (error) {
      console.error('결과 처리 실패:', error)
      errorCount++
    }
  }
  
  // 각 result_id별로 점수와 합격 여부 재계산
  const uniqueResultIds = await db.prepare(`
    SELECT DISTINCT result_id FROM written_test_answers
  `).all()
  
  for (const row of (uniqueResultIds.results || [])) {
    const resultId = (row as any).result_id
    
    // 총 문제 수와 정답 수 계산
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(is_correct) as correct
      FROM written_test_answers
      WHERE result_id = ?
    `).bind(resultId).first()
    
    if (stats && (stats as any).total > 0) {
      const total = (stats as any).total
      const correct = (stats as any).correct || 0
      const score = (correct / total) * 100
      const passed = score >= 60 ? 1 : 0
      
      await db.prepare(`
        UPDATE written_test_results
        SET score = ?, passed = ?
        WHERE id = ?
      `).bind(score, passed, resultId).run()
    }
  }
  
  return c.json({ 
    success: true, 
    count: results.length,
    successCount,
    errorCount
  }, 201)
}))

// ==================== Analysis APIs ====================

// 법인별 작업자 목록 조회
app.get('/api/analysis/workers', errorHandler(async (c) => {
  const db = c.env.DB
  const entity = c.req.query('entity')
  
  if (!entity) {
    return c.json({ error: 'Entity parameter is required' }, 400)
  }
  
  const result = await db.prepare(`
    SELECT 
      w.id,
      w.employee_id,
      w.name,
      w.entity,
      w.team,
      w.position,
      COUNT(DISTINCT wtr.id) as test_count,
      COUNT(DISTINCT sa.id) as assessment_count
    FROM workers w
    LEFT JOIN written_test_results wtr ON w.id = wtr.worker_id
    LEFT JOIN supervisor_assessments sa ON w.id = sa.worker_id
    WHERE w.entity = ?
    GROUP BY w.id
    ORDER BY w.name
  `).bind(entity).all()
  
  return c.json(result.results)
}))

// 작업자 상세 분석 데이터 조회
app.get('/api/analysis/worker/:workerId', errorHandler(async (c) => {
  const db = c.env.DB
  const workerId = c.req.param('workerId')
  
  // 작업자 기본 정보
  const workerResult = await db.prepare('SELECT * FROM workers WHERE id = ?').bind(workerId).first()
  
  if (!workerResult) {
    return c.json({ error: 'Worker not found' }, 404)
  }
  
  // Written Test 결과들
  const testResults = await db.prepare(`
    SELECT 
      wtr.*,
      p.name as process_name,
      p.id as process_id
    FROM written_test_results wtr
    JOIN processes p ON wtr.process_id = p.id
    WHERE wtr.worker_id = ?
    ORDER BY wtr.test_date DESC
  `).bind(workerId).all()
  
  // Supervisor Assessments - 카테고리별로 그룹화하여 평균 계산
  const assessments = await db.prepare(`
    SELECT 
      sai.category,
      sai.process_id,
      AVG(sa.level) as avg_level,
      COUNT(*) as item_count,
      MAX(sa.assessment_date) as latest_date
    FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = ?
    GROUP BY sai.category, sai.process_id
    ORDER BY latest_date DESC
  `).bind(workerId).all()
  
  // 프로세스 정보 가져오기 (첫 번째 assessment에서)
  let processInfo = null
  if (assessments.results && assessments.results.length > 0) {
    const firstAssessment = assessments.results[0] as any
    if (firstAssessment.process_id) {
      const process = await db.prepare('SELECT * FROM processes WHERE id = ?')
        .bind(firstAssessment.process_id).first()
      processInfo = process
    }
  }
  
  return c.json({
    worker: workerResult,
    test_results: testResults.results,
    assessments: assessments.results,
    process_info: processInfo
  })
}))

// 법인 평균 점수 조회 (프로세스별)
app.get('/api/analysis/entity-average', errorHandler(async (c) => {
  const db = c.env.DB
  const entity = c.req.query('entity')
  const processId = c.req.query('processId')
  
  if (!entity || !processId) {
    return c.json({ error: 'Entity and processId parameters are required' }, 400)
  }
  
  const result = await db.prepare(`
    SELECT 
      AVG(wtr.score) as average_score
    FROM written_test_results wtr
    JOIN workers w ON wtr.worker_id = w.id
    WHERE w.entity = ? AND wtr.process_id = ?
  `).bind(entity, processId).first()
  
  return c.json({ average_score: result?.average_score || 0 })
}))

// Written Test 카테고리별 점수 조회
app.get('/api/analysis/test-categories/:resultId', errorHandler(async (c) => {
  const db = c.env.DB
  const resultId = c.req.param('resultId')
  
  // 해당 시험 결과의 상세 답안 조회
  const answersResult = await db.prepare(`
    SELECT 
      wtq.category,
      COUNT(*) as total_questions,
      SUM(CASE WHEN wta.is_correct = 1 THEN 1 ELSE 0 END) as correct_count
    FROM written_test_answers wta
    JOIN written_test_quizzes wtq ON wta.quiz_id = wtq.id
    WHERE wta.result_id = ?
    GROUP BY wtq.category
  `).bind(resultId).all()
  
  // 카테고리별 점수 계산 (정답수 / 전체 문제수 * 100)
  const categoryScores = (answersResult.results as any[]).map(item => ({
    category: item.category,
    score: (item.correct_count / item.total_questions * 100).toFixed(1),
    correct: item.correct_count,
    total: item.total_questions
  }))
  
  return c.json(categoryScores)
}))

// 추천 교육 프로그램 조회
app.get('/api/analysis/training-recommendations', errorHandler(async (c) => {
  const db = c.env.DB
  const processId = c.req.query('processId')
  const weakCategory = c.req.query('weakCategory') // 가장 낮은 점수의 카테고리
  
  if (!processId) {
    return c.json({ error: 'ProcessId parameter is required' }, 400)
  }
  
  let query = 'SELECT * FROM training_programs WHERE process_id = ?'
  let params = [processId]
  
  // 약한 카테고리가 있으면 해당 카테고리 우선
  if (weakCategory) {
    query += ' AND category = ? ORDER BY duration_hours DESC LIMIT 5'
    params.push(weakCategory)
  } else {
    query += ' ORDER BY duration_hours DESC LIMIT 5'
  }
  
  const result = await db.prepare(query).bind(...params).all()
  
  return c.json(result.results)
}))

// ==================== Result Management APIs ====================

// Written Test 결과 조회 (법인, 프로세스 필터) - 요약
app.get('/api/results/written-test', errorHandler(async (c) => {
  const db = c.env.DB
  const entity = c.req.query('entity')
  const processId = c.req.query('processId')
  
  let query = `
    SELECT 
      w.employee_id,
      w.name,
      w.entity,
      w.team,
      w.position,
      p.name as process_name,
      wtr.score,
      wtr.passed,
      wtr.test_date
    FROM written_test_results wtr
    JOIN workers w ON wtr.worker_id = w.id
    JOIN processes p ON wtr.process_id = p.id
    WHERE 1=1
  `
  
  const params: any[] = []
  
  if (entity) {
    query += ' AND w.entity = ?'
    params.push(entity)
  }
  
  if (processId) {
    query += ' AND wtr.process_id = ?'
    params.push(processId)
  }
  
  query += ' ORDER BY w.entity, w.employee_id'
  
  const result = await db.prepare(query).bind(...params).all()
  return c.json(result.results)
}))

// Written Test 결과 조회 (개별 문제별) - 상세
app.get('/api/results/written-test/detailed', errorHandler(async (c) => {
  const db = c.env.DB
  const entity = c.req.query('entity')
  const processId = c.req.query('processId')
  
  let query = `
    SELECT 
      w.employee_id,
      w.name,
      w.entity,
      w.team,
      w.position,
      p.name as process_name,
      q.question,
      wta.selected_answer,
      q.correct_answer,
      wta.is_correct,
      wtr.test_date
    FROM written_test_answers wta
    JOIN written_test_results wtr ON wta.result_id = wtr.id
    JOIN written_test_quizzes q ON wta.quiz_id = q.id
    JOIN workers w ON wtr.worker_id = w.id
    JOIN processes p ON wtr.process_id = p.id
    WHERE 1=1
  `
  
  const params: any[] = []
  
  if (entity) {
    query += ' AND w.entity = ?'
    params.push(entity)
  }
  
  if (processId) {
    query += ' AND wtr.process_id = ?'
    params.push(processId)
  }
  
  query += ' ORDER BY w.entity, w.employee_id, q.id'
  
  const result = await db.prepare(query).bind(...params).all()
  return c.json(result.results)
}))

// Assessment 결과 조회 (법인, 프로세스 필터)
app.get('/api/results/assessment', errorHandler(async (c) => {
  const db = c.env.DB
  const entity = c.req.query('entity')
  const processId = c.req.query('processId')
  
  let query = `
    SELECT 
      w.employee_id,
      w.name,
      w.entity,
      w.team,
      w.position,
      sai.category,
      sai.item_name,
      sa.level,
      sa.assessment_date
    FROM supervisor_assessments sa
    JOIN workers w ON sa.worker_id = w.id
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE 1=1
  `
  
  const params: any[] = []
  
  if (entity) {
    query += ' AND w.entity = ?'
    params.push(entity)
  }
  
  if (processId) {
    query += ' AND sai.process_id = ?'
    params.push(processId)
  }
  
  query += ' ORDER BY w.entity, w.employee_id, sai.category'
  
  const result = await db.prepare(query).bind(...params).all()
  return c.json(result.results)
}))

// Written Test 결과 일괄 업로드
app.post('/api/results/written-test/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const results: any[] = await c.req.json()
  
  for (const result of results) {
    // 작업자 찾기
    const worker = await db.prepare('SELECT id FROM workers WHERE employee_id = ?')
      .bind(result.employee_id).first()
    
    if (!worker) {
      console.log(`Worker not found: ${result.employee_id}`)
      continue
    }
    
    // 프로세스 찾기
    const process = await db.prepare('SELECT id FROM processes WHERE name = ?')
      .bind(result.process_name).first()
    
    if (!process) {
      console.log(`Process not found: ${result.process_name}`)
      continue
    }
    
    // 결과 저장
    await db.prepare(`
      INSERT INTO written_test_results (worker_id, process_id, score, passed, test_date)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      worker.id,
      process.id,
      result.score,
      result.passed ? 1 : 0,
      result.test_date || new Date().toISOString()
    ).run()
  }
  
  return c.json({ success: true, count: results.length })
}))

// Assessment 결과 일괄 업로드
app.post('/api/results/assessment/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const results: any[] = await c.req.json()
  
  for (const result of results) {
    // 작업자 찾기
    const worker = await db.prepare('SELECT id FROM workers WHERE employee_id = ?')
      .bind(result.employee_id).first()
    
    if (!worker) {
      console.log(`Worker not found: ${result.employee_id}`)
      continue
    }
    
    // 평가 항목 찾기
    const item = await db.prepare('SELECT id FROM supervisor_assessment_items WHERE category = ? AND item_name = ?')
      .bind(result.category, result.item_name).first()
    
    if (!item) {
      console.log(`Assessment item not found: ${result.category} - ${result.item_name}`)
      continue
    }
    
    // 결과 저장
    await db.prepare(`
      INSERT INTO supervisor_assessments (worker_id, item_id, level, assessed_by, assessment_date, comments)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      worker.id,
      item.id,
      result.level,
      result.assessed_by || 'Supervisor',
      result.assessment_date || new Date().toISOString(),
      result.comments || ''
    ).run()
  }
  
  return c.json({ success: true, count: results.length })
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
        <link href="/static/styles.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0"></script>
        <script>
            // Register datalabels plugin globally
            if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
                Chart.register(ChartDataLabels);
            }
        </script>
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
                    <button onclick="showPage('worker-upload')" class="hover:underline">
                        <i class="fas fa-users mr-1"></i>작업자 등록
                    </button>
                    <button onclick="showPage('dashboard')" class="hover:underline">
                        <i class="fas fa-home mr-1"></i>대시보드
                    </button>
                    <button onclick="showPage('quiz-upload')" class="hover:underline">
                        <i class="fas fa-question-circle mr-1"></i>Quiz 등록
                    </button>
                    <button onclick="showPage('assessment-upload')" class="hover:underline">
                        <i class="fas fa-clipboard-check mr-1"></i>Assessment 등록
                    </button>
                    <button onclick="showPage('supervisor-assessment')" class="hover:underline">
                        <i class="fas fa-user-check mr-1"></i>Supervisor Assessment 시행
                    </button>
                    <button onclick="showPage('test-page')" class="hover:underline">
                        <i class="fas fa-pencil-alt mr-1"></i>Written Test 응시
                    </button>
                    <button onclick="showPage('analysis-page')" class="hover:underline">
                        <i class="fas fa-chart-line mr-1"></i>평가 결과 분석
                    </button>
                    <button onclick="showPage('result-management')" class="hover:underline">
                        <i class="fas fa-file-excel mr-1"></i>결과 관리
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
