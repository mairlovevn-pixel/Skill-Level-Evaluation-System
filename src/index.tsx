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
  const passThreshold = parseInt(c.req.query('passThreshold') || '60')
  
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

    // 프로세스별 Written Test 현황 (team 정보 포함)
    let testByProcessResult
    if (entity) {
      testByProcessResult = await db.prepare(`
        SELECT 
          p.name as process_name,
          w.team,
          COUNT(DISTINCT wtr.worker_id) as takers,
          COUNT(DISTINCT CASE WHEN wtr.score >= ? THEN wtr.worker_id END) as passed
        FROM positions p
        LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
        LEFT JOIN workers w ON wtr.worker_id = w.id
        WHERE w.entity = ? OR w.entity IS NULL
        GROUP BY p.id, p.name, w.team
        ORDER BY p.id, w.team
      `).bind(passThreshold, entity).all()
    } else {
      testByProcessResult = await db.prepare(`
        SELECT 
          p.name as process_name,
          w.team,
          COUNT(DISTINCT wtr.worker_id) as takers,
          COUNT(DISTINCT CASE WHEN wtr.score >= ? THEN wtr.worker_id END) as passed
        FROM positions p
        LEFT JOIN written_test_results wtr ON p.id = wtr.process_id
        LEFT JOIN workers w ON wtr.worker_id = w.id
        GROUP BY p.id, p.name, w.team
        ORDER BY p.id, w.team
      `).bind(passThreshold).all()
    }
    const written_test_by_process = testByProcessResult.results || []

    // 공통 쿼리 파라미터
    const processId = c.req.query('processId')
    const team = c.req.query('team')
    const position = c.req.query('position')
    
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

    // Level별 법인 현황 - current_level 컬럼 사용 (성능 최적화)
    // current_level은 업로드 시 자동으로 계산되어 저장됨
    let levelQuery = `
      SELECT 
        w.id,
        w.entity,
        w.team,
        w.position,
        w.current_level as final_level,
        w.start_to_work_date as start_date
      FROM workers w
      WHERE 1=1
    `
    const params: any[] = []
    
    if (entity) {
      levelQuery += ' AND w.entity = ?'
      params.push(entity)
    }
    
    if (team) {
      levelQuery += ' AND w.team = ?'
      params.push(team)
    }
    
    if (position) {
      levelQuery += ' AND w.position = ?'
      params.push(position)
    }
    
    const workerLevelsResult = await db.prepare(levelQuery).bind(...params).all()
    const workerLevels = workerLevelsResult.results || []
    
    // Step 2: 필터링된 전체 작업자 수 조회 (평가받지 않은 작업자 계산용)
    let totalFilteredQuery = `SELECT COUNT(*) as count FROM workers w WHERE 1=1`
    const totalParams: any[] = []
    
    if (entity) {
      totalFilteredQuery += ' AND w.entity = ?'
      totalParams.push(entity)
    }
    
    if (team) {
      totalFilteredQuery += ' AND w.team = ?'
      totalParams.push(team)
    }
    
    if (position) {
      totalFilteredQuery += ' AND w.position = ?'
      totalParams.push(position)
    }
    
    const totalFilteredResult = await db.prepare(totalFilteredQuery).bind(...totalParams).first()
    const totalFiltered = (totalFilteredResult?.count as number) || 0
    
    // Step 3: 법인별, Level별 집계 (근속년수 포함)
    const levelCounts: Record<string, Record<number, number>> = {}
    const levelTenures: Record<number, { total: number, count: number, byEntity: Record<string, { total: number, count: number }> }> = {
      1: { total: 0, count: 0, byEntity: {} },
      2: { total: 0, count: 0, byEntity: {} },
      3: { total: 0, count: 0, byEntity: {} },
      4: { total: 0, count: 0, byEntity: {} }
    }
    const assessedWorkerIds = new Set<number>()
    
    // 평가받은 작업자 집계
    for (const worker of workerLevels) {
      const workerEntity = (worker as any).entity
      const workerTeam = (worker as any).team
      const workerPosition = (worker as any).position
      const workerId = (worker as any).id
      const finalLevel = (worker as any).final_level || 1
      const startDate = (worker as any).start_date
      
      assessedWorkerIds.add(workerId)
      
      if (!levelCounts[workerEntity]) {
        levelCounts[workerEntity] = { 1: 0, 2: 0, 3: 0, 4: 0 }
      }
      levelCounts[workerEntity][finalLevel]++
      
      // 근속년수 계산
      if (startDate) {
        try {
          const start = new Date(startDate)
          const now = new Date()
          // Invalid date 체크
          if (!isNaN(start.getTime())) {
            const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            
            levelTenures[finalLevel].total += years
            levelTenures[finalLevel].count++
            
            if (!levelTenures[finalLevel].byEntity[workerEntity]) {
              levelTenures[finalLevel].byEntity[workerEntity] = { total: 0, count: 0 }
            }
            levelTenures[finalLevel].byEntity[workerEntity].total += years
            levelTenures[finalLevel].byEntity[workerEntity].count++
          }
        } catch (e) {
          // Date parsing error, skip this worker
          console.log(`Invalid date for worker ${workerId}: ${startDate}`)
        }
      }
    }
    
    // Step 4: 평가받지 않은 작업자는 Level 1로 계산
    const unassessedCount = totalFiltered - assessedWorkerIds.size
    
    if (unassessedCount > 0) {
      // 단일 Entity 필터인 경우
      if (entity) {
        if (!levelCounts[entity]) {
          levelCounts[entity] = { 1: 0, 2: 0, 3: 0, 4: 0 }
        }
        levelCounts[entity][1] += unassessedCount
      } else {
        // Entity 필터 없는 경우, 평가받지 않은 작업자의 Entity별 분포 조회
        let unassessedQuery = `
          SELECT w.entity, COUNT(*) as count
          FROM workers w
          WHERE w.id NOT IN (
            SELECT DISTINCT sa.worker_id 
            FROM supervisor_assessments sa
          )
        `
        const unassessedParams: any[] = []
        
        if (team) {
          unassessedQuery += ' AND w.team = ?'
          unassessedParams.push(team)
        }
        
        if (position) {
          unassessedQuery += ' AND w.position = ?'
          unassessedParams.push(position)
        }
        
        unassessedQuery += ' GROUP BY w.entity'
        
        const unassessedResult = await db.prepare(unassessedQuery).bind(...unassessedParams).all()
        const unassessedByEntity = unassessedResult.results || []
        
        for (const row of unassessedByEntity) {
          const workerEntity = (row as any).entity
          const count = (row as any).count
          
          if (!levelCounts[workerEntity]) {
            levelCounts[workerEntity] = { 1: 0, 2: 0, 3: 0, 4: 0 }
          }
          levelCounts[workerEntity][1] += count
        }
      }
    }
    
    // 결과 포맷팅
    const supervisor_assessment_by_level: any[] = []
    for (const [entityKey, levels] of Object.entries(levelCounts)) {
      for (const [level, count] of Object.entries(levels)) {
        if (count > 0) {
          supervisor_assessment_by_level.push({
            level: parseInt(level),
            entity: entityKey,
            count: count
          })
        }
      }
    }
    
    // 근속년수 통계 계산
    const level_tenure_stats: any[] = []
    for (const [level, data] of Object.entries(levelTenures)) {
      const levelNum = parseInt(level)
      const totalCount = data.count
      const avgTenure = totalCount > 0 ? data.total / totalCount : 0
      
      const entityAvgs: Record<string, number> = {}
      for (const [entity, entityData] of Object.entries(data.byEntity)) {
        entityAvgs[entity] = entityData.count > 0 ? entityData.total / entityData.count : 0
      }
      
      level_tenure_stats.push({
        level: levelNum,
        total_count: totalCount,
        avg_tenure: avgTenure,
        entity_avgs: entityAvgs
      })
    }

    // Worker details for frontend filtering (only if no team/position filter applied)
    let worker_level_details: any[] = []
    if (!team && !position) {
      // Get all workers with their team, position, and level info
      let workerDetailsQuery = `
        SELECT 
          w.id,
          w.entity,
          w.team,
          w.position,
          w.current_level as level
        FROM workers w
        WHERE 1=1
      `
      const workerDetailsParams: any[] = []
      
      if (entity) {
        workerDetailsQuery += ' AND w.entity = ?'
        workerDetailsParams.push(entity)
      }
      
      const workerDetailsResult = await db.prepare(workerDetailsQuery).bind(...workerDetailsParams).all()
      worker_level_details = (workerDetailsResult.results || []) as any[]
    }

    const stats: DashboardStats = {
      total_workers,
      written_test_takers,
      written_test_passed,
      written_test_by_process: written_test_by_process as any,
      avg_score_by_process: avg_score_by_process as any,
      supervisor_assessment_by_level: supervisor_assessment_by_level as any,
      level_tenure_stats: level_tenure_stats as any,
      worker_level_details: worker_level_details as any
    }

    return c.json(stats)
}))

// 작업자 테이블에 없지만 시험/평가 데이터에는 있는 작업자 조회
app.get('/api/workers/missing', errorHandler(async (c) => {
  const db = c.env.DB
  
  // Written Test 데이터에서 추출한 작업자 정보 (workers 테이블에 없는 경우)
  // 주의: written_test_results는 worker_id를 참조하므로, 
  // 이 테이블에는 이미 workers에 등록된 작업자만 있어야 함
  // 따라서 이 쿼리는 결과가 없어야 정상
  
  // Supervisor Assessments 데이터에서 추출한 작업자 정보
  // 마찬가지로 worker_id를 참조하므로 이미 등록된 작업자만 있어야 함
  
  // 실제로는 업로드 시 스킵된 데이터를 분석해야 함
  // 스킵 로그에서 "Worker not found" 메시지를 추출하는 방식
  
  // 대신, 모든 테이블의 데이터 일관성을 확인하는 쿼리 제공
  const result = await db.prepare(`
    SELECT 
      'All data is consistent' as status,
      (SELECT COUNT(*) FROM workers) as total_workers,
      (SELECT COUNT(DISTINCT worker_id) FROM written_test_results) as workers_with_written_test,
      (SELECT COUNT(DISTINCT worker_id) FROM supervisor_assessments) as workers_with_assessment
  `).first()
  
  return c.json({
    message: "현재 DB 구조상 모든 시험/평가 데이터는 이미 등록된 작업자만 참조 가능합니다.",
    note: "업로드 시 스킵된 작업자를 찾으려면 업로드 응답의 skippedReasons를 확인하세요.",
    consistency_check: result
  })
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
  
  // Validate quiz data
  if (!quiz.question || !quiz.option_a || !quiz.option_b || !quiz.correct_answer) {
    return c.json({ error: 'Missing required fields: question, option_a, option_b, correct_answer' }, 400)
  }
  
  if (!['A', 'B', 'C', 'D'].includes(quiz.correct_answer)) {
    return c.json({ error: `Invalid correct_answer: ${quiz.correct_answer}. Must be A, B, C, or D` }, 400)
  }
  
  // Check if quiz exists
  const existing = await db.prepare('SELECT id FROM written_test_quizzes WHERE id = ?')
    .bind(quizId)
    .first()
  
  if (!existing) {
    return c.json({ error: `Quiz ID ${quizId} not found` }, 404)
  }
  
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
  
  // 1. 먼저 해당 퀴즈를 참조하는 모든 답변 삭제
  await db.prepare('DELETE FROM written_test_answers WHERE quiz_id = ?')
    .bind(quizId)
    .run()
  
  // 2. 그 다음 퀴즈 삭제
  await db.prepare('DELETE FROM written_test_quizzes WHERE id = ?')
    .bind(quizId)
    .run()

  return c.json({ success: true })
}))

// 프로세스별 Quiz 일괄 삭제
app.delete('/api/quizzes/position/:processId', errorHandler(async (c) => {
  const db = c.env.DB
  const processId = c.req.param('processId')
  
  // 1. 먼저 해당 프로세스 퀴즈를 참조하는 모든 답변 삭제
  await db.prepare(`
    DELETE FROM written_test_answers 
    WHERE quiz_id IN (
      SELECT id FROM written_test_quizzes WHERE process_id = ?
    )
  `).bind(processId).run()
  
  // 2. 그 다음 해당 프로세스의 모든 quiz 삭제
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
  
  // Written Test 결과들 (worker_id로 정확히 매칭 - 이미 올바름)
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
  
  // Supervisor Assessments - 레벨별로 그룹화하여 달성 여부 확인
  // 작업자의 실제 포지션 기준으로 평가 조회
  const workerPosition = await db.prepare('SELECT id FROM positions WHERE name = ?')
    .bind(workerResult.position).first()
  
  const assessments = await db.prepare(`
    SELECT 
      sai.category,
      sai.item_name,
      MAX(CASE WHEN sa.level >= 2 THEN 1 ELSE 0 END) as is_satisfied,
      MAX(sa.assessment_date) as latest_date
    FROM supervisor_assessments sa
    JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
    WHERE sa.worker_id = ?
    GROUP BY sai.category, sai.item_name
    ORDER BY sai.category
  `).bind(workerId).all()
  
  // 레벨별로 모든 항목이 만족되었는지 확인
  const levelResults = assessments.results as any[]
  const levelSatisfaction: { [key: string]: { total: number, satisfied: number } } = {}
  
  levelResults.forEach(item => {
    const category = item.category
    if (!levelSatisfaction[category]) {
      levelSatisfaction[category] = { total: 0, satisfied: 0 }
    }
    levelSatisfaction[category].total++
    if (item.is_satisfied === 1 || item.is_satisfied === true) {
      levelSatisfaction[category].satisfied++
    }
  })
  
  // 최종 레벨 계산: 모든 항목이 만족된 가장 높은 레벨
  let finalLevel = 1
  for (let level = 2; level <= 4; level++) {
    const levelKey = `Level${level}`
    const levelKey2 = `Level ${level}`
    
    const stats = levelSatisfaction[levelKey] || levelSatisfaction[levelKey2]
    if (stats && stats.satisfied === stats.total && stats.total > 0) {
      finalLevel = level
    } else {
      break // 이 레벨이 완료되지 않았으면 더 높은 레벨도 달성 불가
    }
  }
  
  // 최신 평가 날짜
  const latestDate = levelResults.length > 0 ? levelResults[0].latest_date : null
  
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
    assessment_summary: {
      final_level: finalLevel,
      latest_date: latestDate,
      position: workerResult.position,
      level_details: levelSatisfaction
    },
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

// 전법인 평균 점수 조회
app.get('/api/analysis/all-entities-average', errorHandler(async (c) => {
  const db = c.env.DB
  const processId = c.req.query('processId')
  
  if (!processId) {
    return c.json({ error: 'ProcessId parameter is required' }, 400)
  }
  
  const result = await db.prepare(`
    SELECT 
      AVG(wtr.score) as average_score
    FROM written_test_results wtr
    WHERE wtr.process_id = ?
  `).bind(processId).first()
  
  return c.json({ average_score: result?.average_score || 0 })
}))

// 틀린 문제 목록 조회
app.get('/api/analysis/wrong-answers/:resultId', errorHandler(async (c) => {
  const db = c.env.DB
  const resultId = c.req.param('resultId')
  
  // 틀린 문제만 조회
  const wrongAnswersResult = await db.prepare(`
    SELECT 
      wtq.id as quiz_id,
      wtq.category,
      wtq.question,
      wta.selected_answer,
      wtq.correct_answer
    FROM written_test_answers wta
    JOIN written_test_quizzes wtq ON wta.quiz_id = wtq.id
    WHERE wta.result_id = ? AND wta.is_correct = 0
    ORDER BY wta.id
  `).bind(resultId).all()
  
  return c.json(wrongAnswersResult.results)
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

// Assessment 결과 일괄 업로드 - RESULT 컬럼 기반 자동 Level 계산
app.post('/api/results/assessment/bulk', errorHandler(async (c) => {
  const db = c.env.DB
  const results: any[] = await c.req.json()
  
  console.log(`Starting bulk upload of ${results.length} items`)
  const startTime = Date.now()
  
  let successCount = 0
  let skippedCount = 0
  const skippedReasons: string[] = []
  const processedWorkers = new Set<number>()
  
  // Step 1: 배치로 모든 필요한 worker 조회 (1 query)
  const workerKeys = results.map(r => {
    const entity = r.entity || r.ENTITY || r['ENTITY']
    const empId = r.employee_id || r['EMPLOYEE ID']
    return `${entity}|${empId}`
  })
  const uniqueWorkerKeys = [...new Set(workerKeys)]
  
  const employeeIds = uniqueWorkerKeys.map(k => k.split('|')[1])
  const entities = uniqueWorkerKeys.map(k => k.split('|')[0])
  
  const workerPlaceholders = employeeIds.map(() => '?').join(',')
  const workerQuery = `
    SELECT id, employee_id, entity 
    FROM workers 
    WHERE employee_id IN (${workerPlaceholders})
  `
  const workersData = await db.prepare(workerQuery).bind(...employeeIds).all()
  
  // Worker lookup map 생성
  const workerMap = new Map<string, number>()
  for (const worker of (workersData.results || [])) {
    const key = `${(worker as any).entity}|${(worker as any).employee_id}`
    workerMap.set(key, (worker as any).id)
  }
  
  console.log(`Fetched ${workerMap.size} workers in ${Date.now() - startTime}ms`)
  
  // Step 2: 배치로 모든 필요한 assessment items 조회 (1 query)
  const itemKeys = results.map(r => {
    const cat = r.lv_category || r.category || r['LV CATEGORY']
    const name = r.assessment_item || r.item_name || r['ASSESSMENT ITEM']
    return `${cat}|${name}`
  })
  const uniqueItemKeys = [...new Set(itemKeys)]
  
  // 모든 assessment items 가져오기
  const allItemsData = await db.prepare('SELECT id, category, item_name FROM supervisor_assessment_items').all()
  
  // Item lookup map 생성 (정규화된 키로)
  const itemMap = new Map<string, { id: number, category: string }>()
  for (const item of (allItemsData.results || [])) {
    const normalizedCat = ((item as any).category || '').replace(/\s+/g, '')
    const key1 = `${(item as any).category}|${(item as any).item_name}`
    const key2 = `${normalizedCat}|${(item as any).item_name}`
    
    const value = { id: (item as any).id, category: (item as any).category }
    itemMap.set(key1, value)
    itemMap.set(key2, value)
  }
  
  console.log(`Fetched ${allItemsData.results?.length || 0} assessment items in ${Date.now() - startTime}ms`)
  
  // Step 3: 기존 assessments 조회 (1 query)
  const workerIds = [...workerMap.values()]
  const itemIds = [...new Set([...itemMap.values()].map(v => v.id))]
  
  const existingPlaceholders = workerIds.map(() => '?').join(',')
  const existingQuery = `
    SELECT worker_id, item_id, id
    FROM supervisor_assessments
    WHERE worker_id IN (${existingPlaceholders})
  `
  const existingData = await db.prepare(existingQuery).bind(...workerIds).all()
  
  // Existing assessments lookup map
  const existingMap = new Map<string, number>()
  for (const existing of (existingData.results || [])) {
    const key = `${(existing as any).worker_id}|${(existing as any).item_id}`
    existingMap.set(key, (existing as any).id)
  }
  
  console.log(`Fetched ${existingMap.size} existing assessments in ${Date.now() - startTime}ms`)
  
  // Step 4: Prepare all operations
  const insertOps: any[] = []
  const updateOps: any[] = []
  
  for (const result of results) {
    const entityValue = result.entity || result.ENTITY || result['ENTITY']
    const employeeIdValue = result.employee_id || result['EMPLOYEE ID']
    const workerKey = `${entityValue}|${employeeIdValue}`
    
    const workerId = workerMap.get(workerKey)
    if (!workerId) {
      skippedCount++
      skippedReasons.push(`Worker not found: ${entityValue} - ${employeeIdValue}`)
      continue
    }
    
    const category = result.lv_category || result.category || result['LV CATEGORY']
    const itemName = result.assessment_item || result.item_name || result['ASSESSMENT ITEM']
    const normalizedCategory = (category || '').replace(/\s+/g, '')
    
    const itemKey1 = `${category}|${itemName}`
    const itemKey2 = `${normalizedCategory}|${itemName}`
    
    const item = itemMap.get(itemKey1) || itemMap.get(itemKey2)
    if (!item) {
      skippedCount++
      skippedReasons.push(`Item not found: ${category} - ${itemName}`)
      continue
    }
    
    // RESULT 파싱
    const resultValue = result.result || result['RESULT']
    const isSatisfied = resultValue === true || resultValue === 'TRUE' || resultValue === 'true' || resultValue === 1
    
    // Level parsing: support "Level2", "Level 2", "level2", "LEVEL 2" etc.
    let levelValue = 1
    if (isSatisfied) {
      const normalizedCategory = (item.category || '').toLowerCase().replace(/\s+/g, '')
      if (normalizedCategory === 'level2') levelValue = 2
      else if (normalizedCategory === 'level3') levelValue = 3
      else if (normalizedCategory === 'level4') levelValue = 4
    }
    
    // is_satisfied 값: TRUE면 1, FALSE면 0
    const isSatisfiedValue = isSatisfied ? 1 : 0
    
    const assessedBy = result.assessed_by || 'Supervisor'
    const assessmentDate = result.assessment_date || new Date().toISOString()
    const comments = result.comments || ''
    
    const existingKey = `${workerId}|${item.id}`
    const existingId = existingMap.get(existingKey)
    
    if (existingId) {
      updateOps.push({ id: existingId, levelValue, isSatisfiedValue, assessedBy, assessmentDate, comments })
    } else {
      insertOps.push({ workerId, itemId: item.id, levelValue, isSatisfiedValue, assessedBy, assessmentDate, comments })
    }
    
    processedWorkers.add(workerId)
    successCount++
  }
  
  console.log(`Prepared ${insertOps.length} inserts and ${updateOps.length} updates in ${Date.now() - startTime}ms`)
  
  // Step 5: Execute batch operations
  try {
    // Batch updates
    for (const op of updateOps) {
      await db.prepare(`
        UPDATE supervisor_assessments 
        SET level = ?, is_satisfied = ?, assessed_by = ?, assessment_date = ?, comments = ?
        WHERE id = ?
      `).bind(op.levelValue, op.isSatisfiedValue, op.assessedBy, op.assessmentDate, op.comments, op.id).run()
    }
    
    // Batch inserts
    for (const op of insertOps) {
      await db.prepare(`
        INSERT INTO supervisor_assessments (worker_id, item_id, level, is_satisfied, assessed_by, assessment_date, comments)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(op.workerId, op.itemId, op.levelValue, op.isSatisfiedValue, op.assessedBy, op.assessmentDate, op.comments).run()
    }
    
    console.log(`Executed all operations in ${Date.now() - startTime}ms`)
  } catch (error) {
    console.error('Error during batch operations:', error)
    throw error
  }
  
  const endTime = Date.now()
  console.log(`Assessment Bulk Upload: ${successCount} succeeded, ${skippedCount} skipped in ${endTime - startTime}ms`)
  if (skippedCount > 0) {
    console.log('Skipped reasons:', skippedReasons.slice(0, 10))
  }
  
  // Step 6: 처리된 작업자들의 current_level 업데이트
  const levelUpdateStart = Date.now()
  const uniqueWorkerIds = [...processedWorkers]
  
  for (const workerId of uniqueWorkerIds) {
    // 작업자의 최종 Level 계산
    const level2Total = await db.prepare(`
      SELECT COUNT(DISTINCT sai.id) as count FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category IN ('Level2', 'Level 2')
    `).bind(workerId).first()
    
    const level2Satisfied = await db.prepare(`
      SELECT COUNT(DISTINCT sai.id) as count FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category IN ('Level2', 'Level 2') AND sa.level >= 2
    `).bind(workerId).first()
    
    const level3Total = await db.prepare(`
      SELECT COUNT(DISTINCT sai.id) as count FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category IN ('Level3', 'Level 3')
    `).bind(workerId).first()
    
    const level3Satisfied = await db.prepare(`
      SELECT COUNT(DISTINCT sai.id) as count FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category IN ('Level3', 'Level 3') AND sa.level >= 3
    `).bind(workerId).first()
    
    const level4Total = await db.prepare(`
      SELECT COUNT(DISTINCT sai.id) as count FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category IN ('Level4', 'Level 4')
    `).bind(workerId).first()
    
    const level4Satisfied = await db.prepare(`
      SELECT COUNT(DISTINCT sai.id) as count FROM supervisor_assessments sa
      JOIN supervisor_assessment_items sai ON sa.item_id = sai.id
      WHERE sa.worker_id = ? AND sai.category IN ('Level4', 'Level 4') AND sa.level >= 4
    `).bind(workerId).first()
    
    // 최종 Level 결정
    let finalLevel = 1
    
    const hasLevel2 = (level2Total as any)?.count > 0 && (level2Satisfied as any)?.count === (level2Total as any)?.count
    const hasLevel3 = (level3Total as any)?.count > 0 && (level3Satisfied as any)?.count === (level3Total as any)?.count
    const hasLevel4 = (level4Total as any)?.count > 0 && (level4Satisfied as any)?.count === (level4Total as any)?.count
    
    if (hasLevel2) finalLevel = 2
    if (hasLevel2 && hasLevel3) finalLevel = 3
    if (hasLevel2 && hasLevel3 && hasLevel4) finalLevel = 4
    
    // current_level 업데이트
    await db.prepare(`
      UPDATE workers SET current_level = ? WHERE id = ?
    `).bind(finalLevel, workerId).run()
  }
  
  console.log(`Updated current_level for ${uniqueWorkerIds.length} workers in ${Date.now() - levelUpdateStart}ms`)
  
  return c.json({ 
    success: true, 
    total: results.length,
    succeeded: successCount,
    skipped: skippedCount,
    skippedReasons: skippedReasons,
    processingTimeMs: endTime - startTime,
    levelUpdateTimeMs: Date.now() - levelUpdateStart
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

// ==================== Fix Scores API ====================

// Quiz 텍스트 일괄 업데이트 API (Excel 파일 기반)
app.post('/api/admin/update-quiz-text', errorHandler(async (c) => {
  const db = c.env.DB
  
  try {
    const body = await c.req.json()
    const quizzes = body.quizzes as Array<{
      position: string
      no: number
      question: string
      category?: string
    }>
    
    if (!quizzes || quizzes.length === 0) {
      return c.json({ success: false, error: 'No quizzes provided' }, 400)
    }
    
    console.log(`[UPDATE QUIZ] Received ${quizzes.length} quizzes`)
    
    // Position ID 매핑 로드
    const positionsResult = await db.prepare('SELECT id, name FROM positions').all()
    const positionMap = new Map<string, number>()
    for (const pos of positionsResult.results) {
      const normalizedName = (pos.name as string).trim().toUpperCase()
      positionMap.set(normalizedName, pos.id as number)
    }
    
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []
    
    // Position별로 그룹화
    const quizzesByPosition = new Map<string, typeof quizzes>()
    for (const quiz of quizzes) {
      const pos = quiz.position.toUpperCase()
      if (!quizzesByPosition.has(pos)) {
        quizzesByPosition.set(pos, [])
      }
      quizzesByPosition.get(pos)!.push(quiz)
    }
    
    // 각 Position별로 처리
    for (const [position, posQuizzes] of quizzesByPosition.entries()) {
      const positionId = positionMap.get(position)
      
      if (!positionId) {
        errors.push(`❌ Position not found: ${position}`)
        skippedCount += posQuizzes.length
        continue
      }
      
      // 해당 Position의 기존 Quiz들을 순서대로 조회
      const existingQuizzes = await db.prepare(`
        SELECT id, question 
        FROM written_test_quizzes 
        WHERE process_id = ? 
        ORDER BY id
      `).bind(positionId).all()
      
      // NO 기준으로 정렬
      posQuizzes.sort((a, b) => a.no - b.no)
      
      // 순서대로 매칭해서 업데이트
      for (let i = 0; i < posQuizzes.length; i++) {
        const newQuiz = posQuizzes[i]
        
        if (i >= existingQuizzes.results.length) {
          errors.push(`⚠️ ${position} #${newQuiz.no}: DB에 해당 순번 Quiz 없음`)
          skippedCount++
          continue
        }
        
        const existingQuiz = existingQuizzes.results[i]
        const quizId = existingQuiz.id as number
        const oldQuestion = existingQuiz.question as string
        
        // 텍스트가 다르면 업데이트
        if (oldQuestion !== newQuiz.question) {
          await db.prepare(`
            UPDATE written_test_quizzes 
            SET question = ? 
            WHERE id = ?
          `).bind(newQuiz.question, quizId).run()
          
          updatedCount++
          
          console.log(`✅ ${position} #${newQuiz.no}: Updated`)
        } else {
          skippedCount++
        }
      }
    }
    
    return c.json({
      success: true,
      message: `Updated ${updatedCount} quizzes`,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.slice(0, 10) // 처음 10개만
    })
    
  } catch (error) {
    console.error('Quiz update failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}))

// Check for duplicate test results (debugging)
app.get('/api/admin/check-duplicates', errorHandler(async (c) => {
  const db = c.env.DB
  const { employee_id } = c.req.query()
  
  try {
    let query = `
      SELECT 
        w.id as worker_db_id,
        w.employee_id,
        w.name,
        w.entity,
        w.position,
        wtr.id as result_id,
        wtr.score,
        wtr.test_date,
        (SELECT COUNT(*) FROM written_test_answers WHERE result_id = wtr.id) as answer_count
      FROM workers w
      LEFT JOIN written_test_results wtr ON w.id = wtr.worker_id
    `
    
    let params: any[] = []
    
    if (employee_id) {
      query += ` WHERE w.employee_id = ?`
      params.push(employee_id)
    }
    
    query += ` ORDER BY w.employee_id, wtr.test_date`
    
    const stmt = db.prepare(query)
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all()
    
    // Group by employee_id to find duplicates
    const grouped = new Map<string, any[]>()
    for (const row of result.results) {
      const empId = row.employee_id as string
      if (!grouped.has(empId)) {
        grouped.set(empId, [])
      }
      if (row.result_id) {  // Only if they have test results
        grouped.get(empId)!.push(row)
      }
    }
    
    // Find employees with multiple test results
    const duplicates: any[] = []
    for (const [empId, results] of grouped.entries()) {
      if (results.length > 1) {
        duplicates.push({
          employee_id: empId,
          name: results[0].name,
          position: results[0].position,
          result_count: results.length,
          results: results.map(r => ({
            result_id: r.result_id,
            score: r.score,
            test_date: r.test_date,
            answer_count: r.answer_count,
            worker_db_id: r.worker_db_id,
            entity: r.entity
          }))
        })
      }
    }
    
    return c.json({
      success: true,
      total_workers_checked: grouped.size,
      duplicates_found: duplicates.length,
      duplicates: employee_id ? duplicates : duplicates.slice(0, 20)
    })
    
  } catch (error) {
    console.error('Check duplicates failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}))

// Fix specific quiz by position and order
app.post('/api/admin/fix-quiz-by-order', errorHandler(async (c) => {
  const db = c.env.DB
  
  try {
    const body = await c.req.json()
    const { position_name, quiz_order, new_choices, new_correct_answer } = body
    
    // Get position ID
    const positionResult = await db.prepare(
      'SELECT id FROM positions WHERE name = ?'
    ).bind(position_name).first()
    
    if (!positionResult) {
      return c.json({ success: false, error: 'Position not found' }, 404)
    }
    
    const positionId = positionResult.id as number
    
    // Get quiz at this position and order (1-indexed)
    const quizzesResult = await db.prepare(`
      SELECT id, question, option_a, option_b, option_c, option_d, correct_answer
      FROM written_test_quizzes
      WHERE process_id = ?
      ORDER BY id
    `).bind(positionId).all()
    
    if (quiz_order < 1 || quiz_order > quizzesResult.results.length) {
      return c.json({ 
        success: false, 
        error: `Quiz order ${quiz_order} out of range (1-${quizzesResult.results.length})` 
      }, 400)
    }
    
    const targetQuiz = quizzesResult.results[quiz_order - 1]
    const quizId = targetQuiz.id as number
    const oldQuestion = targetQuiz.question as string
    const oldChoices = {
      A: targetQuiz.option_a,
      B: targetQuiz.option_b,
      C: targetQuiz.option_c,
      D: targetQuiz.option_d
    }
    const oldAnswer = targetQuiz.correct_answer as string
    
    // Update quiz
    await db.prepare(`
      UPDATE written_test_quizzes
      SET option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ?
      WHERE id = ?
    `).bind(
      new_choices.A,
      new_choices.B,
      new_choices.C,
      new_choices.D,
      new_correct_answer,
      quizId
    ).run()
    
    // Now re-evaluate all answers for this quiz
    const answersResult = await db.prepare(`
      SELECT wta.id, wta.result_id, wta.selected_answer, wta.is_correct
      FROM written_test_answers wta
      WHERE wta.quiz_id = ?
    `).bind(quizId).all()
    
    let updatedAnswers = 0
    const changedWorkers: number[] = []
    
    for (const answer of answersResult.results) {
      const answerId = answer.id as number
      const resultId = answer.result_id as number
      const selectedAnswer = answer.selected_answer as string
      const oldIsCorrect = answer.is_correct as number
      
      // Re-evaluate: is this answer correct with new correct_answer?
      const newIsCorrect = selectedAnswer === new_correct_answer ? 1 : 0
      
      if (oldIsCorrect !== newIsCorrect) {
        await db.prepare(`
          UPDATE written_test_answers
          SET is_correct = ?
          WHERE id = ?
        `).bind(newIsCorrect, answerId).run()
        
        updatedAnswers++
        changedWorkers.push(resultId)
      }
    }
    
    // Recalculate scores for affected test results
    const uniqueResultIds = [...new Set(changedWorkers)]
    let recalculatedScores = 0
    
    for (const resultId of uniqueResultIds) {
      // Get all answers for this result
      const resultAnswers = await db.prepare(`
        SELECT COUNT(*) as total, SUM(is_correct) as correct
        FROM written_test_answers
        WHERE result_id = ?
      `).bind(resultId).first()
      
      const total = resultAnswers?.total as number || 0
      const correct = resultAnswers?.correct as number || 0
      
      if (total > 0) {
        const newScore = Math.round((correct / total) * 100)
        const passed = newScore >= 80 ? 1 : 0
        
        await db.prepare(`
          UPDATE written_test_results
          SET score = ?, passed = ?
          WHERE id = ?
        `).bind(newScore, passed, resultId).run()
        
        recalculatedScores++
      }
    }
    
    return c.json({
      success: true,
      quiz_id: quizId,
      question: oldQuestion,
      old_choices: oldChoices,
      new_choices: new_choices,
      old_correct_answer: oldAnswer,
      new_correct_answer: new_correct_answer,
      answers_updated: updatedAnswers,
      workers_affected: recalculatedScores
    })
    
  } catch (error) {
    console.error('Fix quiz failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}))

// Normalize test dates and remove duplicates
app.post('/api/admin/fix-duplicate-test-dates', errorHandler(async (c) => {
  const db = c.env.DB
  
  try {
    // Step 1: Normalize all test dates to YYYY-MM-DD format
    const resultsQuery = await db.prepare(`
      SELECT id, test_date
      FROM written_test_results
      WHERE test_date LIKE '%.%'
    `).all()
    
    let normalizedCount = 0
    
    for (const result of resultsQuery.results) {
      const resultId = result.id as number
      const originalDate = result.test_date as string
      
      // Convert "2025. 10. 28." to "2025-10-28"
      const normalized = originalDate
        .replace(/\s+/g, '')  // Remove spaces: "2025.10.28."
        .replace(/\./g, '-')  // Replace dots with dashes: "2025-10-28-"
        .replace(/-+$/, '')   // Remove trailing dashes: "2025-10-28"
      
      await db.prepare(`
        UPDATE written_test_results
        SET test_date = ?
        WHERE id = ?
      `).bind(normalized, resultId).run()
      
      normalizedCount++
    }
    
    // Step 2: Now find and delete duplicates (same worker_id, process_id, test_date)
    const duplicatesQuery = await db.prepare(`
      SELECT worker_id, process_id, test_date, COUNT(*) as count
      FROM written_test_results
      GROUP BY worker_id, process_id, test_date
      HAVING COUNT(*) > 1
    `).all()
    
    let deletedCount = 0
    
    for (const dup of duplicatesQuery.results) {
      const workerId = dup.worker_id as number
      const processId = dup.process_id as number
      const testDate = dup.test_date as string
      
      // Get all matching results, ordered by answer count (keep the one with most answers)
      const matchingResults = await db.prepare(`
        SELECT 
          wtr.id as result_id,
          (SELECT COUNT(*) FROM written_test_answers WHERE result_id = wtr.id) as answer_count
        FROM written_test_results wtr
        WHERE wtr.worker_id = ? AND wtr.process_id = ? AND wtr.test_date = ?
        ORDER BY answer_count DESC, wtr.id DESC
      `).bind(workerId, processId, testDate).all()
      
      // Keep first, delete rest
      for (let i = 1; i < matchingResults.results.length; i++) {
        const resultId = matchingResults.results[i].result_id as number
        
        await db.prepare(`DELETE FROM written_test_answers WHERE result_id = ?`).bind(resultId).run()
        await db.prepare(`DELETE FROM written_test_results WHERE id = ?`).bind(resultId).run()
        
        deletedCount++
      }
    }
    
    return c.json({
      success: true,
      message: `Normalized ${normalizedCount} dates, deleted ${deletedCount} duplicates`,
      normalized: normalizedCount,
      deleted: deletedCount
    })
    
  } catch (error) {
    console.error('Fix duplicates failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}))

// Round floating point scores to nearest integer
app.post('/api/admin/round-scores', errorHandler(async (c) => {
  const db = c.env.DB
  
  try {
    // Find all scores with decimal values
    const resultsQuery = await db.prepare(`
      SELECT id, score
      FROM written_test_results
      WHERE score != ROUND(score)
    `).all()
    
    let updatedCount = 0
    const updates: any[] = []
    
    for (const result of resultsQuery.results) {
      const resultId = result.id as number
      const oldScore = result.score as number
      const newScore = Math.round(oldScore)
      
      await db.prepare(`
        UPDATE written_test_results
        SET score = ?
        WHERE id = ?
      `).bind(newScore, resultId).run()
      
      updatedCount++
      
      if (updates.length < 20) {
        updates.push({
          id: resultId,
          old: oldScore,
          new: newScore,
          diff: Math.abs(newScore - oldScore)
        })
      }
    }
    
    return c.json({
      success: true,
      message: `Rounded ${updatedCount} scores`,
      updated: updatedCount,
      samples: updates
    })
    
  } catch (error) {
    console.error('Round scores failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}))

// Written Test 점수 재계산 API (19개 문제 → 20개 문제로 수정)
app.post('/api/admin/recalculate-scores', errorHandler(async (c) => {
  const db = c.env.DB
  
  try {
    // 1. 모든 written_test_results 조회
    const resultsQuery = await db.prepare(`
      SELECT wtr.id, wtr.worker_id, wtr.process_id, wtr.score
      FROM written_test_results wtr
    `).all()
    
    let updatedCount = 0
    let skippedCount = 0
    const details: any[] = []
    
    // 2. 각 결과에 대해 실제 답변 개수로 점수 재계산
    for (const result of resultsQuery.results) {
      const resultId = result.id as number
      
      // 실제 답변 데이터 조회
      const answersQuery = await db.prepare(`
        SELECT COUNT(*) as total, SUM(is_correct) as correct
        FROM written_test_answers
        WHERE result_id = ?
      `).bind(resultId).first()
      
      const total = answersQuery?.total as number || 0
      const correct = answersQuery?.correct as number || 0
      
      if (total === 0) {
        skippedCount++
        continue
      }
      
      // 새 점수 계산
      const newScore = (correct / total) * 100
      const oldScore = result.score as number
      
      // 점수가 변경되었으면 업데이트
      if (Math.abs(newScore - oldScore) > 0.01) {
        await db.prepare(`
          UPDATE written_test_results
          SET score = ?, passed = ?
          WHERE id = ?
        `).bind(newScore, newScore >= 80 ? 1 : 0, resultId).run()
        
        updatedCount++
        
        // 처음 10개만 상세 정보 저장
        if (details.length < 10) {
          details.push({
            result_id: resultId,
            worker_id: result.worker_id,
            old_score: oldScore,
            new_score: newScore,
            total_questions: total,
            correct_answers: correct
          })
        }
      } else {
        skippedCount++
      }
    }
    
    return c.json({
      success: true,
      message: `Recalculated ${updatedCount} scores`,
      updated: updatedCount,
      skipped: skippedCount,
      total: resultsQuery.results.length,
      sample_details: details
    })
    
  } catch (error) {
    console.error('Score recalculation failed:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}))

// ==================== Export API ====================

// 종합평가 추출 API
app.get('/api/export/comprehensive-evaluation', async (c) => {
  const db = c.env.DB
  const { entity, team, position } = c.req.query()
  
  try {
    // WHERE 조건 동적 생성
    let whereConditions = []
    let params = []
    
    if (entity) {
      whereConditions.push('w.entity = ?')
      params.push(entity)
    }
    
    if (team) {
      whereConditions.push('w.team = ?')
      params.push(team)
    }
    
    if (position) {
      whereConditions.push('w.position = ?')
      params.push(position)
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''
    
    // 작업자 데이터 조회 (Written Test 점수 + Supervisor Assessment Level + Final Level 계산)
    const query = `
      SELECT 
        w.id,
        w.employee_id,
        w.name,
        w.entity,
        w.team,
        w.position,
        w.start_to_work_date as start_date,
        w.current_level as supervisor_assessment_level,
        (
          SELECT wtr.score
          FROM written_test_results wtr
          WHERE wtr.worker_id = w.id
          ORDER BY wtr.test_date DESC
          LIMIT 1
        ) as written_test_score
      FROM workers w
      ${whereClause}
      ORDER BY w.entity, w.team, w.employee_id
    `
    
    const stmt = db.prepare(query)
    const result = params.length > 0 
      ? await stmt.bind(...params).all()
      : await stmt.all()
    
    // Positions that require both Written Test + Supervisor Assessment
    const bothTestPositions = new Set([
      'CUTTING', 'BEVELING', 'BENDING', 'LS WELDING', 'FIT UP', 'CS WELDING', 
      'VTMT', 'BRACKET FU', 'BRACKET WELD', 'UT REPAIR', 'DOOR FRAME FU', 
      'DOOR FRAME WELD', 'FLATNESS', 'BLASTING', 'METALIZING', 'PAINTING', 
      'ASSEMBLY', 'IM CABLE'
    ])
    
    // Final Level 계산 로직:
    // 1. 둘 다 치는 포지션 (Written Test + Supervisor Assessment):
    //    - Written Test >= 60: Final Level = Supervisor Assessment Level
    //    - Written Test < 60: Final Level = 1
    // 2. Assessment만 치는 포지션:
    //    - Final Level = Supervisor Assessment Level (Written Test 무관)
    const workers = (result.results || []).map((w: any) => {
      const writtenTestScore = w.written_test_score !== null ? w.written_test_score : 0
      const supervisorLevel = w.supervisor_assessment_level || 1
      const position = w.position || ''
      
      let finalLevel: number
      
      if (bothTestPositions.has(position)) {
        // 둘 다 치는 포지션: Written Test 60점 기준 적용
        finalLevel = writtenTestScore >= 60 ? supervisorLevel : 1
      } else {
        // Assessment만 치는 포지션: Supervisor Assessment Result = Final Level
        finalLevel = supervisorLevel
      }
      
      return {
        ...w,
        written_test_score: w.written_test_score !== null ? w.written_test_score : null,
        supervisor_assessment_level: supervisorLevel,
        final_level: finalLevel,
        start_date: w.start_date || ''
      }
    })
    
    return c.json({
      success: true,
      workers
    })
    
  } catch (error) {
    console.error('종합평가 추출 실패:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '데이터 조회 실패'
    }, 500)
  }
})

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
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
        <script>
            // Register plugins globally
            if (typeof Chart !== 'undefined' && typeof ChartDataLabels !== 'undefined') {
                Chart.register(ChartDataLabels);
            }
            if (typeof Chart !== 'undefined' && typeof window.ChartAnnotation !== 'undefined') {
                Chart.register(window.ChartAnnotation);
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
                    <button onclick="showPage('test-page')" class="hover:underline">
                        <i class="fas fa-pencil-alt mr-1"></i>WRITTEN TEST
                    </button>
                    <button onclick="showPage('supervisor-assessment')" class="hover:underline">
                        <i class="fas fa-user-check mr-1"></i>SUPERVISOR ASSESSMENT
                    </button>
                    <button onclick="showPage('analysis-page')" class="hover:underline">
                        <i class="fas fa-user-chart mr-1"></i>INDIVIDUAL REPORT
                    </button>
                    <button onclick="showPage('registration')" class="hover:underline">
                        <i class="fas fa-folder-plus mr-1"></i>REGISTRATION
                    </button>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <div id="app" class="container mx-auto p-6">
            <!-- Pages will be loaded here -->
        </div>

        <!-- Floating Chatbot -->
        <div id="floating-chatbot" class="fixed bottom-6 right-6 z-50">
            <!-- Chatbot Toggle Button -->
            <button id="chatbot-toggle-btn" onclick="toggleFloatingChatbot()" 
                    class="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full w-14 h-14 shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center">
                <i class="fas fa-robot text-xl"></i>
            </button>
            
            <!-- Chatbot Window (Hidden by default) -->
            <div id="chatbot-window" class="hidden absolute bottom-20 right-0 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
                <!-- Chatbot Header -->
                <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <i class="fas fa-robot mr-2"></i>
                            <h3 class="font-bold text-sm">AI ASSISTANT</h3>
                        </div>
                        <button onclick="toggleFloatingChatbot()" class="text-white hover:text-gray-200">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="p-3 bg-gray-50 border-b">
                    <div class="flex flex-wrap gap-1">
                        <button onclick="sendQuickQuestion('Total workers?')" 
                                class="px-2 py-1 text-xs bg-white border border-gray-300 rounded-full hover:bg-gray-100">
                            👥 Workers
                        </button>
                        <button onclick="sendQuickQuestion('Pass rate?')" 
                                class="px-2 py-1 text-xs bg-white border border-gray-300 rounded-full hover:bg-gray-100">
                            📊 Pass Rate
                        </button>
                        <button onclick="sendQuickQuestion('Average score?')" 
                                class="px-2 py-1 text-xs bg-white border border-gray-300 rounded-full hover:bg-gray-100">
                            📈 Avg Score
                        </button>
                    </div>
                </div>
                
                <!-- Chat Messages -->
                <div id="chat-messages-float" class="h-80 overflow-y-auto p-4 space-y-3 bg-white">
                    <div class="flex items-start space-x-2">
                        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="flex-1">
                            <div class="bg-gray-100 rounded-lg p-3 text-sm">
                                <p class="text-gray-800">Hi! 👋 I'm your AI assistant.</p>
                                <p class="text-gray-600 text-xs mt-1">Ask me about workers, test results, or statistics.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div class="p-3 bg-white border-t">
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            id="chat-input-float" 
                            placeholder="Ask a question..."
                            class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onkeypress="if(event.key === 'Enter') sendFloatingChatMessage()"
                        />
                        <button 
                            onclick="sendFloatingChatMessage()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
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
  
  // Helper function to normalize question text for matching
  const normalizeQuestion = (text: string): string => {
    return text
      .trim()
      .toLowerCase()
      // Remove ALL types of quotes to avoid matching issues
      .replace(/['"''""`´«»‹›「」『』''""]/g, '')  // Remove all quote types including smart quotes
      .replace(/\s+/g, ' ')  // Multiple spaces to single space
      .replace(/[?？]+$/, '')  // Remove trailing question marks
      .replace(/무엇인가요\?*$/, '')  // Remove "무엇인가요?" suffix
      .replace(/무엇입니까\?*$/, '')  // Remove "무엇입니까?" suffix
      .trim()
  }
  
  // Load all quizzes
  const quizzesResult = await db.prepare('SELECT id, process_id, question, correct_answer FROM written_test_quizzes').all()
  const quizMap = new Map<string, { id: number, correct_answer: string }>()
  for (const quiz of quizzesResult.results) {
    const normalizedQuestion = normalizeQuestion(quiz.question as string)
    const key = `${quiz.process_id}-${normalizedQuestion}`
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
      
      // 3. Find quiz from cache using normalized question text
      const normalizedQuestion = normalizeQuestion(result.question)
      const quizKey = `${positionId}-${normalizedQuestion}`
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
      
      // VALIDATION: Score must be multiple of 4 (25q) or 5 (20q)
      const validScores_20q = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
      const validScores_25q = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100]
      const isValidScore = validScores_20q.includes(score) || validScores_25q.includes(score)
      
      if (!isValidScore) {
        console.warn(`⚠️ INVALID SCORE DETECTED: Worker ${group.worker_id}, Process ${group.process_id}, Score ${score} (${correctAnswers}/${totalQuestions})`)
        console.warn(`   Answers:`, group.answers.map(a => `Q${a.quiz_id}:${a.is_correct}`).join(', '))
      }
      
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
          WHERE w.entity = ? AND wtr.score >= 60
        `).bind(entity).first()
        
        const total = totalQuery?.count || 0
        const passed = passedQuery?.count || 0
        const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0'
        
        response = `${entity} 소속 작업자의 Written Test 합격률은 ${rate}%입니다. (${passed}명/${total}명)`
        data = { entity, total, passed, rate: parseFloat(rate) }
      } else {
        totalQuery = await db.prepare('SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results').first()
        passedQuery = await db.prepare('SELECT COUNT(DISTINCT worker_id) as count FROM written_test_results WHERE score >= 60').first()
        
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
          COUNT(DISTINCT CASE WHEN wtr.score >= 60 THEN wtr.worker_id END) as passed,
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
          COUNT(DISTINCT CASE WHEN wtr.score >= 60 THEN wtr.worker_id END) as passed,
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
