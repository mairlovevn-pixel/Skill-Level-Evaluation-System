import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-pages'
import type { Bindings, DashboardStats, Worker, WrittenTestQuiz, SupervisorAssessmentItem, Position, WrittenTestResult } from './types'

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
  const passThreshold = parseInt(c.req.query('passThreshold') || '70')
  
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

    // Written Test 합격자 수 (동적 합격 기준 점수 적용)
    let testPassedResult
    if (entity) {
      testPassedResult = await db.prepare(`
        SELECT COUNT(DISTINCT wtr.worker_id) as count 
        FROM written_test_results wtr
        JOIN workers w ON wtr.worker_id = w.id
        WHERE w.entity = ? AND wtr.score >= ?
      `).bind(entity, passThreshold).first()
    } else {
      testPassedResult = await db.prepare(
        'SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results WHERE score >= ?'
      ).bind(passThreshold).first()
    }
    const written_test_passed = (testPassedResult?.count as number) || 0

    // 프로세스별 Written Test 현황
    let testByProcessResult
    if (entity) {
      testByProcessResult = await db.prepare(`
        SELECT 
          p.name as process_name,
          COUNT(DISTINCT wtr.worker_id) as takers,
          COUNT(DISTINCT CASE WHEN wtr.score >= ? THEN wtr.worker_id END) as passed
        FROM positions p
        LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
        LEFT JOIN workers w ON wtr.worker_id = w.id
        WHERE w.entity = ? OR w.entity IS NULL
        GROUP BY p.id, p.name
        ORDER BY p.id
      `).bind(passThreshold, entity).all()
    } else {
      testByProcessResult = await db.prepare(`
        SELECT 
          p.name as process_name,
          COUNT(DISTINCT wtr.worker_id) as takers,
          COUNT(DISTINCT CASE WHEN wtr.score >= ? THEN wtr.worker_id END) as passed
        FROM positions p
        LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
        GROUP BY p.id, p.name
        ORDER BY p.id
      `).bind(passThreshold).all()
    }
    const written_test_by_process = testByProcessResult.results || []

    // 공통 쿼리 파라미터
    const processId = c.req.query('processId')
    const team = c.req.query('team')
    
    // 프로세스별 평균 점수 (법인별로 구분, 프로세스/팀 필터 추가)
    let avgScoreResult
    
    // 동적 쿼리 빌드 for avg_score - INCLUDE team in SELECT and GROUP BY
    let avgScoreQuery = `
      SELECT 
        p.name as process_name,
        w.entity,
        w.team,
        COALESCE(AVG(wtr.score), 0) as avg_score
      FROM positions p
      INNER JOIN written_test_results wtr ON p.id = wtr.process_id
      INNER JOIN workers w ON wtr.worker_id = w.id
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
      GROUP BY p.id, p.name, w.entity, w.team
      ORDER BY p.id, w.entity, w.team
    `
    
    avgScoreResult = await db.prepare(avgScoreQuery).bind(...avgScoreParams).all()
    const avg_score_by_process = avgScoreResult.results || []

    // Level별 법인 현황 (프로세스/팀 필터 추가)
    // IMPORTANT: Count unique workers, not assessment records
    // Each worker may have multiple assessment items, but should only be counted once per level
    let assessmentByLevelResult
    
    // 동적 쿼리 빌드 - DISTINCT worker_id로 직원별 1명만 카운트
    let levelQuery = `
      SELECT 
        sa.level,
        w.entity,
        COUNT(DISTINCT sa.worker_id) as count
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
    // 워딩 표준화: team, position, entity를 대문자로 변환
    const normalizedEntity = worker.entity.trim().toUpperCase()
    const normalizedTeam = worker.team.trim().toUpperCase()
    const normalizedPosition = worker.position.trim().toUpperCase()
    
    // Entity 표준화: VN -> CSVN, CN -> CSCN, TW -> CSTW
    let standardEntity = normalizedEntity
    if (normalizedEntity === 'VN') standardEntity = 'CSVN'
    else if (normalizedEntity === 'CN') standardEntity = 'CSCN'
    else if (normalizedEntity === 'TW') standardEntity = 'CSTW'
    
    // 기존 작업자 확인 (employee_id + entity 조합으로 검색)
    const existing = await db.prepare('SELECT id FROM workers WHERE employee_id = ? AND entity = ?')
      .bind(worker.employee_id, standardEntity).first()
    
    if (existing) {
      // 업데이트
      await db.prepare(`
        UPDATE workers 
        SET name = ?, team = ?, position = ?, start_to_work_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND entity = ?
      `).bind(
        worker.name,
        normalizedTeam,
        normalizedPosition,
        worker.start_to_work_date,
        worker.employee_id,
        standardEntity
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
        standardEntity,
        normalizedTeam,
        normalizedPosition,
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
app.get('/api/positions', errorHandler(async (c) => {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM positions ORDER BY id').all()
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
app.delete('/api/quizzes/position/:processId', errorHandler(async (c) => {
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
app.delete('/api/assessment-items/position/:processId', errorHandler(async (c) => {
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
    JOIN positions p ON wtr.process_id = p.id
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
      const position = await db.prepare('SELECT * FROM positions WHERE id = ?')
        .bind(firstAssessment.process_id).first()
      processInfo = position
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
    JOIN positions p ON wtr.process_id = p.id
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
    JOIN positions p ON wtr.process_id = p.id
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
  
  let successCount = 0
  let skippedCount = 0
  const skippedReasons: string[] = []
  
  for (const result of results) {
    // 작업자 찾기
    const worker = await db.prepare('SELECT id FROM workers WHERE employee_id = ?')
      .bind(result.employee_id).first()
    
    if (!worker) {
      console.log(`Worker not found: ${result.employee_id}`)
      skippedCount++
      skippedReasons.push(`Worker not found: ${result.employee_id}`)
      continue
    }
    
    // 프로세스 찾기
    const position = await db.prepare('SELECT id FROM positions WHERE name = ?')
      .bind(result.process_name).first()
    
    if (!position) {
      console.log(`Position not found: ${result.process_name}`)
      skippedCount++
      skippedReasons.push(`Position not found: ${result.process_name}`)
      continue
    }
    
    // 중복 체크
    const existing = await db.prepare(`
      SELECT id FROM written_test_results 
      WHERE worker_id = ? AND process_id = ?
    `).bind(worker.id, position.id).first()
    
    if (existing) {
      console.log(`Duplicate result: ${result.employee_id} - ${result.process_name}`)
      skippedCount++
      skippedReasons.push(`Duplicate: ${result.employee_id} - ${result.process_name}`)
      continue
    }
    
    try {
      // 결과 저장
      await db.prepare(`
        INSERT INTO written_test_results (worker_id, process_id, score, passed, test_date)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        worker.id,
        position.id,
        result.score,
        result.passed ? 1 : 0,
        result.test_date || new Date().toISOString()
      ).run()
      successCount++
    } catch (error) {
      console.error(`Error inserting result for ${result.employee_id}:`, error)
      skippedCount++
      skippedReasons.push(`Insert error: ${result.employee_id}`)
    }
  }
  
  console.log(`Written Test Bulk Upload: ${successCount} succeeded, ${skippedCount} skipped`)
  if (skippedCount > 0) {
    console.log('Skipped reasons:', skippedReasons.slice(0, 10)) // Log first 10 reasons
  }
  
  return c.json({ 
    success: true, 
    total: results.length,
    succeeded: successCount,
    skipped: skippedCount,
    skippedReasons: skippedReasons.slice(0, 10) // Return first 10 reasons
  })
}))

// Assessment 결과 일괄 업로드
app.post('/api/results/assessment/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const results: any[] = await c.req.json()
  
  let successCount = 0
  let skippedCount = 0
  const skippedReasons: string[] = []
  
  for (const result of results) {
    // 작업자 찾기
    const worker = await db.prepare('SELECT id FROM workers WHERE employee_id = ?')
      .bind(result.employee_id).first()
    
    if (!worker) {
      console.log(`Worker not found: ${result.employee_id}`)
      skippedCount++
      skippedReasons.push(`Worker not found: ${result.employee_id}`)
      continue
    }
    
    // 평가 항목 찾기
    const item = await db.prepare('SELECT id FROM supervisor_assessment_items WHERE category = ? AND item_name = ?')
      .bind(result.category, result.item_name).first()
    
    if (!item) {
      console.log(`Assessment item not found: ${result.category} - ${result.item_name}`)
      skippedCount++
      skippedReasons.push(`Item not found: ${result.category} - ${result.item_name}`)
      continue
    }
    
    // 중복 체크
    const existing = await db.prepare(`
      SELECT id FROM supervisor_assessments 
      WHERE worker_id = ? AND item_id = ?
      ORDER BY assessment_date DESC LIMIT 1
    `).bind(worker.id, item.id).first()
    
    if (existing) {
      console.log(`Duplicate assessment: ${result.employee_id} - ${result.category} - ${result.item_name}`)
      skippedCount++
      skippedReasons.push(`Duplicate: ${result.employee_id} - ${result.item_name}`)
      continue
    }
    
    try {
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
      successCount++
    } catch (error) {
      console.error(`Error inserting assessment for ${result.employee_id}:`, error)
      skippedCount++
      skippedReasons.push(`Insert error: ${result.employee_id}`)
    }
  }
  
  console.log(`Assessment Bulk Upload: ${successCount} succeeded, ${skippedCount} skipped`)
  if (skippedCount > 0) {
    console.log('Skipped reasons:', skippedReasons.slice(0, 10)) // Log first 10 reasons
  }
  
  return c.json({ 
    success: true, 
    total: results.length,
    succeeded: successCount,
    skipped: skippedCount,
    skippedReasons: skippedReasons.slice(0, 10) // Return first 10 reasons
  })
}))

// Assessment Level 재계산 API - 작업자별로 Level 2/3/4의 모든 항목 만족 여부를 확인
app.post('/api/results/assessment/recalculate-levels', errorHandler(async (c) => {
  const db = c.env.DB
  
  // 모든 작업자 가져오기
  const workers = await db.prepare('SELECT id, employee_id FROM workers').all()
  let updatedCount = 0
  const results: any[] = []
  
  for (const worker of (workers.results || [])) {
    const workerId = (worker as any).id
    const employeeId = (worker as any).employee_id
    
    // Level 2 항목 체크
    const level2Items = await db.prepare(`
      SELECT COUNT(*) as total
      FROM supervisor_assessment_items
      WHERE category = 'Level 2'
    `).first()
    
    const level2Satisfied = await db.prepare(`
      SELECT COUNT(*) as count
      FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category = 'Level 2' AND sa.level >= 2
    `).bind(workerId).first()
    
    const hasAllLevel2 = level2Items && level2Satisfied && 
      (level2Items as any).total > 0 &&
      (level2Satisfied as any).count === (level2Items as any).total
    
    // Level 3 항목 체크
    const level3Items = await db.prepare(`
      SELECT COUNT(*) as total
      FROM supervisor_assessment_items
      WHERE category = 'Level 3'
    `).first()
    
    const level3Satisfied = await db.prepare(`
      SELECT COUNT(*) as count
      FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category = 'Level 3' AND sa.level >= 3
    `).bind(workerId).first()
    
    const hasAllLevel3 = hasAllLevel2 && level3Items && level3Satisfied && 
      (level3Items as any).total > 0 &&
      (level3Satisfied as any).count === (level3Items as any).total
    
    // Level 4 항목 체크
    const level4Items = await db.prepare(`
      SELECT COUNT(*) as total
      FROM supervisor_assessment_items
      WHERE category = 'Level 4'
    `).first()
    
    const level4Satisfied = await db.prepare(`
      SELECT COUNT(*) as count
      FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category = 'Level 4' AND sa.level >= 4
    `).bind(workerId).first()
    
    const hasAllLevel4 = hasAllLevel2 && hasAllLevel3 && level4Items && level4Satisfied && 
      (level4Items as any).total > 0 &&
      (level4Satisfied as any).count === (level4Items as any).total
    
    // 최종 Level 결정
    let finalLevel = 1
    if (hasAllLevel2) finalLevel = 2
    if (hasAllLevel3) finalLevel = 3
    if (hasAllLevel4) finalLevel = 4
    
    results.push({
      employee_id: employeeId,
      final_level: finalLevel,
      level2_count: (level2Satisfied as any)?.count || 0,
      level2_total: (level2Items as any)?.total || 0,
      level3_count: (level3Satisfied as any)?.count || 0,
      level3_total: (level3Items as any)?.total || 0,
      level4_count: (level4Satisfied as any)?.count || 0,
      level4_total: (level4Items as any)?.total || 0
    })
    
    console.log(`Worker ${employeeId}: Level ${finalLevel}`)
    updatedCount++
  }
  
  return c.json({ 
    success: true,
    message: `Calculated levels for ${updatedCount} workers`,
    updatedCount,
    results: results.slice(0, 20) // Return first 20 for debugging
  })
}))

// ==================== Main Page ====================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SKILL LEVEL SYSTEM</title>
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
                    SKILL LEVEL SYSTEM
                </h1>
                <div class="space-x-4">
                    <button onclick="showPage('dashboard')" class="hover:underline">
                        <i class="fas fa-home mr-1"></i>DASHBOARD
                    </button>
                    <button onclick="showPage('worker-upload')" class="hover:underline">
                        <i class="fas fa-users mr-1"></i>WORKER REGISTRATION
                    </button>
                    <button onclick="showPage('test-page')" class="hover:underline">
                        <i class="fas fa-pencil-alt mr-1"></i>WRITTEN TEST
                    </button>
                    <button onclick="showPage('supervisor-assessment')" class="hover:underline">
                        <i class="fas fa-user-check mr-1"></i>SUPERVISOR ASSESSMENT
                    </button>
                    <button onclick="showPage('quiz-upload')" class="hover:underline">
                        <i class="fas fa-question-circle mr-1"></i>QUIZ REGISTRATION
                    </button>
                    <button onclick="showPage('assessment-upload')" class="hover:underline">
                        <i class="fas fa-clipboard-check mr-1"></i>ASSESSMENT REGISTRATION
                    </button>
                    <button onclick="showPage('analysis-page')" class="hover:underline">
                        <i class="fas fa-chart-line mr-1"></i>RESULT ANALYSIS
                    </button>
                    <button onclick="showPage('result-management')" class="hover:underline">
                        <i class="fas fa-file-excel mr-1"></i>RESULT MANAGEMENT
                    </button>
                    <button onclick="showPage('chatbot')" class="hover:underline">
                        <i class="fas fa-comments mr-1"></i>CHATBOT
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

// Supervisor Assessment 결과 배치 업로드 (Cloudflare Workers subrequest 제한 회피)
app.post('/api/supervisor-assessment-results/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  const { results, batchIndex, totalBatches } = body as {
    results: Array<{
      employee_id: string
      process_name: string
      category: string
      item_name: string
      is_satisfied: number
      assessment_date: string
    }>
    batchIndex: number
    totalBatches: number
  }
  
  let successCount = 0
  let skippedCount = 0
  const errors: string[] = []
  
  console.log(`Processing batch ${batchIndex + 1}/${totalBatches} with ${results.length} items`)
  
  for (const result of results) {
    try {
      // 1. 작업자 찾기
      const workerResult = await db.prepare(
        'SELECT id FROM workers WHERE employee_id = ?'
      ).bind(result.employee_id).first()
      
      if (!workerResult) {
        skippedCount++
        errors.push(`작업자 ${result.employee_id} 없음`)
        continue
      }
      const workerId = workerResult.id as number
      
      // 2. 프로세스 찾기 (대소문자 무시, 공백/특수문자 정규화)
      const normalizedProcessName = result.process_name.trim().toUpperCase()
      const processResult = await db.prepare(
        'SELECT id FROM positions WHERE UPPER(name) = ?'
      ).bind(normalizedProcessName).first()
      
      if (!processResult) {
        skippedCount++
        errors.push(`프로세스 "${result.process_name}" 없음`)
        continue
      }
      const processId = processResult.id as number
      
      // 3. Assessment 항목 찾기 또는 생성
      let itemResult = await db.prepare(
        'SELECT id FROM supervisor_assessment_items WHERE item_name = ? AND category = ? AND process_id = ?'
      ).bind(result.item_name, result.category, processId).first()
      
      let itemId: number
      
      if (!itemResult) {
        // Item doesn't exist - create it automatically
        const insertResult = await db.prepare(
          'INSERT INTO supervisor_assessment_items (process_id, category, item_name, created_at) VALUES (?, ?, ?, ?)'
        ).bind(processId, result.category, result.item_name, new Date().toISOString()).run()
        
        itemId = insertResult.meta.last_row_id as number
        console.log(`Auto-created assessment item: "${result.item_name}" (${result.category}) for process ${processId}`)
      } else {
        itemId = itemResult.id as number
      }
      
      // 4. 중복 체크 (동일 작업자, 항목, 날짜)
      const existingResult = await db.prepare(
        'SELECT id FROM supervisor_assessments WHERE worker_id = ? AND item_id = ? AND DATE(assessment_date) = DATE(?)'
      ).bind(workerId, itemId, result.assessment_date).first()
      
      if (existingResult) {
        // 기존 데이터 업데이트
        await db.prepare(
          'UPDATE supervisor_assessments SET is_satisfied = ?, process_id = ? WHERE id = ?'
        ).bind(result.is_satisfied, processId, existingResult.id).run()
      } else {
        // 새로운 데이터 삽입 (Level 1이 기본값 - 평가 없음)
        await db.prepare(
          'INSERT INTO supervisor_assessments (worker_id, item_id, level, assessed_by, assessment_date, is_satisfied, process_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          workerId,
          itemId,
          1, // Level 1이 기본값 (평가 없음), Level 계산 후 업데이트됨
          'System',
          result.assessment_date,
          result.is_satisfied,
          processId
        ).run()
      }
      
      successCount++
    } catch (error: any) {
      skippedCount++
      errors.push(`행 처리 실패: ${error.message}`)
      console.error('Error processing row:', result, error)
    }
  }
  
  // 5. Calculate levels for all affected workers (only on last batch)
  const isLastBatch = batchIndex === totalBatches - 1
  
  if (isLastBatch) {
    console.log('📊 Last batch completed. Calculating levels for all workers...')
    
    // Get all unique workers from ALL batches (not just current batch)
    const allWorkersResult = await db.prepare(
      'SELECT DISTINCT w.employee_id FROM supervisor_assessments sa JOIN workers w ON sa.worker_id = w.id'
    ).all()
    
    const affectedWorkers = allWorkersResult.results.map(r => r.employee_id as string)
  
    for (const employeeId of affectedWorkers) {
    try {
      // Get worker ID
      const workerResult = await db.prepare(
        'SELECT id FROM workers WHERE employee_id = ?'
      ).bind(employeeId).first()
      
      if (!workerResult) continue
      const workerId = workerResult.id as number
      
      // Calculate level for each position
      const positionsResult = await db.prepare(
        'SELECT DISTINCT process_id FROM supervisor_assessments WHERE worker_id = ?'
      ).bind(workerId).all()
      
      for (const posRow of positionsResult.results) {
        const processId = posRow.process_id as number
        
        // Get all assessment items for this position, grouped by category
        const categoryResults = await db.prepare(`
          SELECT 
            sai.category,
            COUNT(*) as total_items,
            SUM(CASE WHEN sa.is_satisfied = 1 THEN 1 ELSE 0 END) as satisfied_items
          FROM supervisor_assessment_items sai
          LEFT JOIN supervisor_assessments sa 
            ON sa.item_id = sai.id 
            AND sa.worker_id = ?
            AND sa.process_id = ?
          WHERE sai.process_id = ?
          GROUP BY sai.category
        `).bind(workerId, processId, processId).all()
        
        // Determine achieved level
        let achievedLevel = 0
        const categoryMap = new Map()
        
        for (const cat of categoryResults.results) {
          const category = cat.category as string
          const totalItems = cat.total_items as number
          const satisfiedItems = cat.satisfied_items as number
          
          // Category is fully satisfied only if ALL items are satisfied
          const isFullySatisfied = satisfiedItems === totalItems && totalItems > 0
          categoryMap.set(category, isFullySatisfied)
        }
        
        // IMPORTANT: Level achievement is cumulative!
        // Level 1 is the default (no assessment items)
        // To achieve Level N (N >= 2), worker must satisfy ALL items in Level 2 through Level N
        const level2Complete = categoryMap.get('Level2') === true
        const level3Complete = categoryMap.get('Level3') === true
        const level4Complete = categoryMap.get('Level4') === true
        
        // Check from highest to lowest with cumulative requirements
        if (level2Complete && level3Complete && level4Complete) {
          achievedLevel = 4  // Level 4 requires Level 2, 3, 4 all complete
        } else if (level2Complete && level3Complete) {
          achievedLevel = 3  // Level 3 requires Level 2, 3 complete
        } else if (level2Complete) {
          achievedLevel = 2  // Level 2 requires only Level 2 complete
        } else {
          achievedLevel = 1  // Level 1 is the default (no assessment required)
        }
        
        // Update all assessments for this worker-position with calculated level
        await db.prepare(
          'UPDATE supervisor_assessments SET level = ? WHERE worker_id = ? AND process_id = ?'
        ).bind(achievedLevel, workerId, processId).run()
      }
    } catch (error: any) {
      console.error(`Failed to calculate level for worker ${employeeId}:`, error)
    }
    }
    
    console.log(`✅ Level calculation completed for ${affectedWorkers.length} workers`)
  } else {
    console.log(`⏭️ Batch ${batchIndex + 1}/${totalBatches} completed. Level calculation will run after last batch.`)
  }
  
  return c.json({
    success: successCount,
    skipped: skippedCount,
    total: results.length,
    batchIndex,
    totalBatches,
    isLastBatch: batchIndex === totalBatches - 1,
    message: errors.length > 0 ? errors.slice(0, 5).join('\n') : `Batch ${batchIndex + 1}/${totalBatches} processed successfully`
  })
}))

// ==================== WRITTEN TEST RESULTS BULK UPLOAD ====================

/**
 * Bulk upload Written Test results
 * POST /api/written-test-results/bulk
 * 
 * Request Body: Array of results
 * [
 *   {
 *     employee_id: string,
 *     entity: string,
 *     team: string, 
 *     position: string,
 *     question: string,
 *     selected_answer: string,
 *     correct_answer: string,
 *     is_correct: 0|1,
 *     test_date: string (YYYY-MM-DD)
 *   }
 * ]
 */
app.post('/api/written-test-results/bulk', errorHandler(async (c) => {
  const { DB } = c.env
  const db = DB as D1Database
  const results = await c.req.json() as Array<{
    employee_id: string
    entity: string
    team: string
    position: string
    question: string
    selected_answer: string
    correct_answer: string
    is_correct: number
    test_date: string
  }>
  
  let successCount = 0
  let skippedCount = 0
  const errors: string[] = []
  
  // 🚀 OPTIMIZATION: Pre-load all lookup data to avoid repeated queries
  console.log('[BULK UPLOAD] Loading lookup data...')
  
  // Load all workers (with entity for unique identification)
  const workersResult = await db.prepare('SELECT id, employee_id, name, entity FROM workers').all()
  const workerMap = new Map<string, { id: number, name: string, entity: string }>()
  for (const worker of workersResult.results) {
    // Use employee_id + entity as composite key to handle duplicate employee_ids across entities
    const compositeKey = `${worker.employee_id}-${worker.entity}`
    workerMap.set(compositeKey, { 
      id: worker.id as number, 
      name: worker.name as string,
      entity: worker.entity as string
    })
  }
  console.log(`[BULK UPLOAD] Loaded ${workerMap.size} workers`)
  
  // Load all positions
  const positionsResult = await db.prepare('SELECT id, name FROM positions').all()
  const positionMap = new Map<string, number>()
  for (const position of positionsResult.results) {
    const normalizedName = (position.name as string).trim().toUpperCase()
    positionMap.set(normalizedName, position.id as number)
  }
  console.log(`[BULK UPLOAD] Loaded ${positionMap.size} positions`)
  
  // Load all quizzes
  const quizzesResult = await db.prepare('SELECT id, process_id, question, correct_answer FROM written_test_quizzes').all()
  const quizMap = new Map<string, { id: number, correct_answer: string }>()
  for (const quiz of quizzesResult.results) {
    const key = `${quiz.process_id}-${(quiz.question as string).trim()}`
    quizMap.set(key, { id: quiz.id as number, correct_answer: quiz.correct_answer as string })
  }
  console.log(`[BULK UPLOAD] Loaded ${quizMap.size} quizzes`)
  
  // Group results by worker + position + test_date
  const groupedResults = new Map<string, {
    worker_id: number
    process_id: number
    test_date: string
    answers: Array<{
      quiz_id: number
      selected_answer: string
      is_correct: number
    }>
  }>()
  
  // First pass: validate and group data using cached lookups
  console.log(`[BULK UPLOAD] Processing ${results.length} results...`)
  for (const result of results) {
    try {
      // 1. Find worker from cache using composite key (employee_id + entity)
      const compositeKey = `${result.employee_id}-${result.entity}`
      const worker = workerMap.get(compositeKey)
      if (!worker) {
        errors.push(`❌ Worker not found: ${result.employee_id} (${result.entity})`)
        skippedCount++
        continue
      }
      
      // 2. Find position from cache
      const normalizedPosition = result.position.trim().toUpperCase()
      const positionId = positionMap.get(normalizedPosition)
      if (!positionId) {
        errors.push(`❌ Position not found: ${result.position}`)
        skippedCount++
        continue
      }
      
      // 3. Find quiz from cache
      const quizKey = `${positionId}-${result.question.trim()}`
      const quiz = quizMap.get(quizKey)
      if (!quiz) {
        errors.push(`❌ Quiz not found for position ${result.position}: "${result.question.substring(0, 50)}..."`)
        skippedCount++
        continue
      }
      
      // 4. Group by worker + position + test_date
      const groupKey = `${worker.id}-${positionId}-${result.test_date}`
      
      if (!groupedResults.has(groupKey)) {
        groupedResults.set(groupKey, {
          worker_id: worker.id,
          process_id: positionId,
          test_date: result.test_date,
          answers: []
        })
      }
      
      const group = groupedResults.get(groupKey)!
      group.answers.push({
        quiz_id: quiz.id,
        selected_answer: result.selected_answer,
        is_correct: result.is_correct
      })
      
      successCount++
    } catch (error: any) {
      console.error('Error processing result:', error)
      errors.push(`❌ Error: ${result.employee_id} - ${error.message}`)
      skippedCount++
    }
  }
  
  console.log(`[BULK UPLOAD] Validation complete: ${successCount} succeeded, ${skippedCount} skipped`)
  
  // Second pass: insert test results and answers
  for (const [groupKey, group] of groupedResults.entries()) {
    try {
      // Calculate score (percentage)
      const totalQuestions = group.answers.length
      const correctAnswers = group.answers.filter(a => a.is_correct === 1).length
      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
      const passed = score >= 80 // 80% passing threshold
      
      // Check if test result already exists
      const existingResult = await db.prepare(
        'SELECT id FROM written_test_results WHERE worker_id = ? AND process_id = ? AND test_date = ?'
      ).bind(group.worker_id, group.process_id, group.test_date).first()
      
      let resultId: number
      
      if (existingResult) {
        // Update existing result
        resultId = existingResult.id as number
        await db.prepare(
          'UPDATE written_test_results SET score = ?, passed = ? WHERE id = ?'
        ).bind(score, passed ? 1 : 0, resultId).run()
        
        // Delete old answers
        await db.prepare(
          'DELETE FROM written_test_answers WHERE result_id = ?'
        ).bind(resultId).run()
      } else {
        // Insert new result
        const insertResult = await db.prepare(
          'INSERT INTO written_test_results (worker_id, process_id, score, passed, test_date) VALUES (?, ?, ?, ?, ?)'
        ).bind(group.worker_id, group.process_id, score, passed ? 1 : 0, group.test_date).run()
        
        resultId = insertResult.meta.last_row_id as number
      }
      
      // Insert answers
      for (const answer of group.answers) {
        await db.prepare(
          'INSERT INTO written_test_answers (result_id, quiz_id, selected_answer, is_correct) VALUES (?, ?, ?, ?)'
        ).bind(resultId, answer.quiz_id, answer.selected_answer, answer.is_correct).run()
      }
    } catch (error: any) {
      console.error('Error inserting test result:', error)
      errors.push(`❌ Error inserting test result for group ${groupKey}: ${error.message}`)
    }
  }
  
  return c.json({
    success: successCount,
    skipped: skippedCount,
    total: results.length,
    message: errors.length > 0 ? errors.slice(0, 10).join('\n') : 'All results uploaded successfully'
  })
}))

// ==================== Chatbot API ====================
app.post('/api/chatbot/query', errorHandler(async (c) => {
  const db = c.env.DB
  const { question } = await c.req.json()
  
  if (!question || typeof question !== 'string') {
    return c.json({ error: 'Invalid question' }, 400)
  }

  const query = question.toLowerCase().trim()
  let response = ''
  let data: any = null

  try {
    // 1. 작업자 수 관련 질문
    if (query.includes('작업자') && (query.includes('몇') || query.includes('수') || query.includes('명'))) {
      if (query.includes('csvn')) {
        const result = await db.prepare("SELECT COUNT(*) as count FROM workers WHERE entity = 'CSVN'").first()
        response = `CSVN 소속 작업자는 총 ${result?.count || 0}명입니다.`
        data = { entity: 'CSVN', count: result?.count || 0 }
      } else if (query.includes('cscn')) {
        const result = await db.prepare("SELECT COUNT(*) as count FROM workers WHERE entity = 'CSCN'").first()
        response = `CSCN 소속 작업자는 총 ${result?.count || 0}명입니다.`
        data = { entity: 'CSCN', count: result?.count || 0 }
      } else if (query.includes('cstw')) {
        const result = await db.prepare("SELECT COUNT(*) as count FROM workers WHERE entity = 'CSTW'").first()
        response = `CSTW 소속 작업자는 총 ${result?.count || 0}명입니다.`
        data = { entity: 'CSTW', count: result?.count || 0 }
      } else {
        const result = await db.prepare('SELECT COUNT(*) as count FROM workers').first()
        response = `전체 작업자는 총 ${result?.count || 0}명입니다.`
        data = { total: result?.count || 0 }
      }
    }
    
    // 2. 프로세스/포지션 수 질문
    else if (query.includes('프로세스') || query.includes('포지션') || query.includes('공정')) {
      const result = await db.prepare('SELECT COUNT(*) as count FROM positions').first()
      response = `전체 프로세스는 총 ${result?.count || 0}개입니다.`
      data = { processCount: result?.count || 0 }
    }
    
    // 3. Written Test 합격률 질문
    else if (query.includes('합격률') || query.includes('통과율')) {
      const entity = query.includes('csvn') ? 'CSVN' : query.includes('cscn') ? 'CSCN' : query.includes('cstw') ? 'CSTW' : null
      
      let totalQuery, passedQuery
      if (entity) {
        totalQuery = await db.prepare(`
          SELECT COUNT(DISTINCT wtr.worker_id) as count 
          FROM written_test_results wtr
          JOIN workers w ON wtr.worker_id = w.id
          WHERE w.entity = ?
        `).bind(entity).first()
        
        passedQuery = await db.prepare(`
          SELECT COUNT(DISTINCT wtr.worker_id) as count 
          FROM written_test_results wtr
          JOIN workers w ON wtr.worker_id = w.id
          WHERE w.entity = ? AND wtr.score >= 70
        `).bind(entity).first()
        
        const total = totalQuery?.count || 0
        const passed = passedQuery?.count || 0
        const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0'
        
        response = `${entity} 소속 작업자의 Written Test 합격률은 ${rate}%입니다. (${passed}명/${total}명)`
        data = { entity, total, passed, rate: parseFloat(rate) }
      } else {
        totalQuery = await db.prepare('SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results').first()
        passedQuery = await db.prepare('SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results WHERE score >= 70').first()
        
        const total = totalQuery?.count || 0
        const passed = passedQuery?.count || 0
        const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0'
        
        response = `전체 작업자의 Written Test 합격률은 ${rate}%입니다. (${passed}명/${total}명)`
        data = { total, passed, rate: parseFloat(rate) }
      }
    }
    
    // 4. Written Test 응시자 수 질문
    else if ((query.includes('written test') || query.includes('필기') || query.includes('시험')) && 
             (query.includes('응시') || query.includes('참여'))) {
      const entity = query.includes('csvn') ? 'CSVN' : query.includes('cscn') ? 'CSCN' : query.includes('cstw') ? 'CSTW' : null
      
      if (entity) {
        const result = await db.prepare(`
          SELECT COUNT(DISTINCT wtr.worker_id) as count 
          FROM written_test_results wtr
          JOIN workers w ON wtr.worker_id = w.id
          WHERE w.entity = ?
        `).bind(entity).first()
        
        response = `${entity} 소속 작업자 중 Written Test 응시자는 ${result?.count || 0}명입니다.`
        data = { entity, takers: result?.count || 0 }
      } else {
        const result = await db.prepare('SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results').first()
        response = `전체 Written Test 응시자는 ${result?.count || 0}명입니다.`
        data = { takers: result?.count || 0 }
      }
    }
    
    // 5. 평균 점수 질문
    else if (query.includes('평균') && (query.includes('점수') || query.includes('성적'))) {
      const entity = query.includes('csvn') ? 'CSVN' : query.includes('cscn') ? 'CSCN' : query.includes('cstw') ? 'CSTW' : null
      
      if (entity) {
        const result = await db.prepare(`
          SELECT AVG(wtr.score) as avg_score
          FROM written_test_results wtr
          JOIN workers w ON wtr.worker_id = w.id
          WHERE w.entity = ?
        `).bind(entity).first()
        
        const avgScore = result?.avg_score ? (result.avg_score as number).toFixed(1) : '0.0'
        response = `${entity} 소속 작업자의 평균 점수는 ${avgScore}점입니다.`
        data = { entity, avgScore: parseFloat(avgScore) }
      } else {
        const result = await db.prepare('SELECT AVG(score) as avg_score FROM written_test_results').first()
        const avgScore = result?.avg_score ? (result.avg_score as number).toFixed(1) : '0.0'
        response = `전체 작업자의 평균 점수는 ${avgScore}점입니다.`
        data = { avgScore: parseFloat(avgScore) }
      }
    }
    
    // 6. 프로세스별 통계 질문
    else if (query.includes('프로세스별') || query.includes('공정별')) {
      const results = await db.prepare(`
        SELECT 
          p.name as process_name,
          COUNT(DISTINCT wtr.worker_id) as takers,
          COUNT(DISTINCT CASE WHEN wtr.score >= 70 THEN wtr.worker_id END) as passed,
          AVG(wtr.score) as avg_score
        FROM positions p
        LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
        GROUP BY p.id, p.name
        ORDER BY takers DESC
        LIMIT 10
      `).all()
      
      if (results.results.length > 0) {
        response = '프로세스별 상위 10개 통계입니다:\n\n'
        results.results.forEach((row: any, idx: number) => {
          const passRate = row.takers > 0 ? ((row.passed / row.takers) * 100).toFixed(1) : '0.0'
          const avgScore = row.avg_score ? row.avg_score.toFixed(1) : '0.0'
          response += `${idx + 1}. ${row.process_name}: 응시 ${row.takers}명, 합격률 ${passRate}%, 평균 ${avgScore}점\n`
        })
        data = results.results
      } else {
        response = '프로세스별 통계 데이터가 없습니다.'
      }
    }
    
    // 7. 최고 성적자 질문
    else if (query.includes('최고') || query.includes('1등') || query.includes('top')) {
      const result = await db.prepare(`
        SELECT 
          w.employee_id,
          w.name,
          w.entity,
          p.name as process_name,
          wtr.score,
          wtr.test_date
        FROM written_test_results wtr
        JOIN workers w ON wtr.worker_id = w.id
        JOIN positions p ON wtr.process_id = p.id
        ORDER BY wtr.score DESC
        LIMIT 5
      `).all()
      
      if (result.results.length > 0) {
        response = 'Written Test 최고 성적 Top 5:\n\n'
        result.results.forEach((row: any, idx: number) => {
          response += `${idx + 1}. ${row.name} (${row.employee_id}, ${row.entity}) - ${row.process_name}: ${row.score}점\n`
        })
        data = result.results
      } else {
        response = '성적 데이터가 없습니다.'
      }
    }
    
    // 8. 취약 프로세스 질문 (합격률 낮은 순)
    else if (query.includes('취약') || query.includes('낮은') || query.includes('부진')) {
      const results = await db.prepare(`
        SELECT 
          p.name as process_name,
          COUNT(DISTINCT wtr.worker_id) as takers,
          COUNT(DISTINCT CASE WHEN wtr.score >= 70 THEN wtr.worker_id END) as passed,
          AVG(wtr.score) as avg_score
        FROM positions p
        LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
        WHERE wtr.worker_id IS NOT NULL
        GROUP BY p.id, p.name
        HAVING takers >= 5
        ORDER BY (CAST(passed AS REAL) / CAST(takers AS REAL)) ASC
        LIMIT 10
      `).all()
      
      if (results.results.length > 0) {
        response = '취약 프로세스 Top 10 (응시자 5명 이상):\n\n'
        results.results.forEach((row: any, idx: number) => {
          const passRate = row.takers > 0 ? ((row.passed / row.takers) * 100).toFixed(1) : '0.0'
          const avgScore = row.avg_score ? row.avg_score.toFixed(1) : '0.0'
          response += `${idx + 1}. ${row.process_name}: 합격률 ${passRate}% (${row.passed}/${row.takers}명), 평균 ${avgScore}점\n`
        })
        data = results.results
      } else {
        response = '취약 프로세스 데이터가 없습니다.'
      }
    }
    
    // 9. 도움말
    else if (query.includes('도움') || query.includes('help') || query.includes('?') || query.includes('무엇')) {
      response = `다음과 같은 질문을 할 수 있습니다:

📊 작업자 정보:
- "작업자는 몇 명이야?"
- "CSVN 작업자 수는?"

📝 Written Test 통계:
- "Written Test 합격률은?"
- "평균 점수는 얼마야?"
- "응시자는 몇 명이야?"

🏆 성적 분석:
- "최고 성적자는?"
- "취약 프로세스는?"
- "프로세스별 통계 보여줘"

📋 기타:
- "프로세스는 몇 개야?"

궁금한 점을 자유롭게 물어보세요!`
      data = { type: 'help' }
    }
    
    // 10. 기본 응답
    else {
      response = '죄송합니다. 질문을 이해하지 못했습니다. "도움말"을 입력하시면 사용 가능한 질문 목록을 확인하실 수 있습니다.'
      data = { type: 'unknown' }
    }

    return c.json({ 
      success: true, 
      response, 
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Chatbot query error:', error)
    return c.json({ 
      success: false, 
      response: '데이터를 조회하는 중 오류가 발생했습니다.',
      error: error.message 
    }, 500)
  }
}))

export default app
