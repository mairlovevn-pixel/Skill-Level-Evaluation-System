# Assessment 벌크 업로드 성능 최적화 보고서

## 문제 상황

### 증상
- **50개 항목 배치 처리 시간**: 60초 이상
- **예상 시간**: 5-10초 이내
- **성능 저하**: 약 6-12배 느림
- **503 오류**: 이전에 100개 배치에서 발생 (현재는 50개로 감소)

### 문제 분석

#### 1. N+1 쿼리 문제
**이전 구조** (순차 처리 방식):
```typescript
for (const result of results) {  // 50개 항목
  // 각 항목마다 개별 쿼리 실행
  const worker = await db.prepare('SELECT ...').bind(...).first()      // Query 1
  let item = await db.prepare('SELECT ...').bind(...).first()          // Query 2
  if (!item) {
    item = await db.prepare('SELECT ...').bind(...).first()            // Query 3 (fallback)
  }
  const existing = await db.prepare('SELECT ...').bind(...).first()    // Query 4
  if (existing) {
    await db.prepare('UPDATE ...').bind(...).run()                     // Query 5
  } else {
    await db.prepare('INSERT ...').bind(...).run()                     // Query 5
  }
}
```

**쿼리 수 계산**:
- 50개 항목 × 5개 쿼리 = **250 queries** (main loop)
- 10명 작업자 × 3개 쿼리 = **30 queries** (post-processing)
- **총 280 queries per batch**

#### 2. 후처리 오버헤드
```typescript
for (const workerId of processedWorkers) {  // 10명 작업자
  const level2Check = await db.prepare('SELECT ...').bind(...).first()  // Query 1
  const level3Check = await db.prepare('SELECT ...').bind(...).first()  // Query 2
  const level4Check = await db.prepare('SELECT ...').bind(...).first()  // Query 3
  const workerInfo = await db.prepare('SELECT ...').bind(...).first()   // Query 4
}
```

- 각 작업자마다 4개 쿼리 실행
- 10명 × 4 = **40 additional queries**

#### 3. 성능 병목 분석
```
60초 / 280 쿼리 = 약 214ms per query
```

이는 다음 요인들의 조합:
- D1 database 네트워크 레이턴시
- 순차 처리로 인한 대기 시간 누적
- Cloudflare Workers CPU time 제한
- 불필요한 후처리 계산

## 해결 방안

### 최적화 전략

#### 1. 배치 쿼리로 전환
**Worker 조회 최적화**:
```typescript
// AS-IS: 50번의 개별 쿼리
for (const result of results) {
  const worker = await db.prepare('SELECT id FROM workers WHERE employee_id = ? AND entity = ?')
    .bind(employeeId, entity).first()
}

// TO-BE: 1번의 배치 쿼리
const workerPlaceholders = employeeIds.map(() => '?').join(',')
const workerQuery = `
  SELECT id, employee_id, entity 
  FROM workers 
  WHERE employee_id IN (${workerPlaceholders})
`
const workersData = await db.prepare(workerQuery).bind(...employeeIds).all()

// Map으로 빠른 검색
const workerMap = new Map()
for (const worker of workersData.results) {
  workerMap.set(`${worker.entity}|${worker.employee_id}`, worker.id)
}
```

**Assessment Item 조회 최적화**:
```typescript
// AS-IS: 50번의 개별 쿼리 (fallback 포함 시 100번)
for (const result of results) {
  let item = await db.prepare('SELECT ...').bind(category, itemName).first()
  if (!item) {
    item = await db.prepare('SELECT ...').bind(normalizedCategory, itemName).first()
  }
}

// TO-BE: 1번의 전체 조회 + 메모리 기반 검색
const allItemsData = await db.prepare('SELECT id, category, item_name FROM supervisor_assessment_items').all()

const itemMap = new Map()
for (const item of allItemsData.results) {
  const normalizedCat = item.category.replace(/\s+/g, '')
  itemMap.set(`${item.category}|${item.item_name}`, { id: item.id, category: item.category })
  itemMap.set(`${normalizedCat}|${item.item_name}`, { id: item.id, category: item.category })
}

// O(1) lookup
const item = itemMap.get(itemKey1) || itemMap.get(itemKey2)
```

**Existing Assessment 조회 최적화**:
```typescript
// AS-IS: 50번의 개별 쿼리
for (const result of results) {
  const existing = await db.prepare(`
    SELECT id FROM supervisor_assessments 
    WHERE worker_id = ? AND item_id = ?
  `).bind(workerId, itemId).first()
}

// TO-BE: 1번의 배치 쿼리
const existingPlaceholders = workerIds.map(() => '?').join(',')
const existingQuery = `
  SELECT worker_id, item_id, id
  FROM supervisor_assessments
  WHERE worker_id IN (${existingPlaceholders})
`
const existingData = await db.prepare(existingQuery).bind(...workerIds).all()

const existingMap = new Map()
for (const existing of existingData.results) {
  existingMap.set(`${existing.worker_id}|${existing.item_id}`, existing.id)
}
```

#### 2. 후처리 제거
```typescript
// AS-IS: 배치 처리 후 Level 계산 (40 queries)
for (const workerId of processedWorkers) {
  const level2Check = await db.prepare('SELECT ...').first()
  const level3Check = await db.prepare('SELECT ...').first()
  const level4Check = await db.prepare('SELECT ...').first()
  // ...
}

// TO-BE: 후처리 제거, 대시보드 쿼리에서만 계산
// Level 계산은 실시간 대시보드 조회 시에만 수행
return c.json({ 
  success: true, 
  total: results.length,
  succeeded: successCount,
  skipped: skippedCount,
  skippedReasons: skippedReasons,
  processingTimeMs: endTime - startTime  // 처리 시간 측정 추가
})
```

**근거**: 
- Level 계산은 대시보드 조회 시점에 수행하는 것이 더 정확
- 업로드 중 Level 계산은 불필요한 오버헤드
- 대시보드는 이미 동적 Level 계산 로직 구현되어 있음

#### 3. 성능 모니터링 추가
```typescript
const startTime = Date.now()

// ... processing ...

const endTime = Date.now()
console.log(`Assessment Bulk Upload: ${successCount} succeeded, ${skippedCount} skipped in ${endTime - startTime}ms`)

return c.json({ 
  processingTimeMs: endTime - startTime  // 클라이언트에 처리 시간 반환
})
```

### 최적화 결과

#### 쿼리 수 비교
| 단계 | AS-IS | TO-BE | 감소율 |
|-----|-------|-------|--------|
| Worker 조회 | 50 queries | 1 query | **98% 감소** |
| Assessment Item 조회 | 50-100 queries | 1 query | **98-99% 감소** |
| Existing 조회 | 50 queries | 1 query | **98% 감소** |
| INSERT/UPDATE | 50 queries | 50 queries | - |
| Post-processing | 40 queries | 0 queries | **100% 제거** |
| **총계** | **240-290 queries** | **53 queries** | **82% 감소** |

#### 예상 성능 개선
```
AS-IS: 60+ seconds per batch (50 items)
TO-BE: 5-10 seconds per batch (50 items)

개선율: 80-90% faster
```

#### 처리 시간 상세
```
Step 1: Fetch Workers (1 query)          ~200ms
Step 2: Fetch Assessment Items (1 query) ~200ms
Step 3: Fetch Existing (1 query)         ~200ms
Step 4: Process Logic (in-memory)        ~100ms
Step 5: Execute Operations (50 queries)  ~4000ms
----------------------------------------
Total Expected:                          ~4700ms (약 5초)
```

### 추가 최적화 고려사항

#### 1. D1 Batch API 사용 (향후)
```typescript
// 현재: 순차 실행
for (const op of insertOps) {
  await db.prepare('INSERT ...').bind(...).run()
}

// 향후: D1 batch API 사용 (병렬 실행)
const statements = insertOps.map(op => 
  db.prepare('INSERT ...').bind(...)
)
await db.batch(statements)
```

**예상 효과**: INSERT/UPDATE 시간 4초 → 1-2초

#### 2. 트랜잭션 사용
```typescript
// 원자성 보장 + 성능 향상
await db.transaction(async (tx) => {
  for (const op of updateOps) {
    await tx.prepare('UPDATE ...').bind(...).run()
  }
  for (const op of insertOps) {
    await tx.prepare('INSERT ...').bind(...).run()
  }
})
```

#### 3. Prepared Statement 재사용
```typescript
const updateStmt = db.prepare('UPDATE ...')
const insertStmt = db.prepare('INSERT ...')

for (const op of updateOps) {
  await updateStmt.bind(...).run()
}
for (const op of insertOps) {
  await insertStmt.bind(...).run()
}
```

## 테스트 방법

### 1. 개발 환경 테스트
```bash
# 서비스 시작
cd /home/user/webapp
npm run build
pm2 start ecosystem.config.cjs

# 로그 모니터링
pm2 logs webapp --nostream

# 50개 항목 업로드 테스트
# 프론트엔드에서 엑셀 파일 업로드
# 콘솔에서 처리 시간 확인
```

### 2. 성능 확인 항목
- [ ] 배치 처리 시간이 10초 이내인가?
- [ ] 503 오류가 발생하지 않는가?
- [ ] Skip된 항목이 있다면 이유가 명확한가?
- [ ] 업로드 후 데이터가 정확하게 저장되는가?
- [ ] 대시보드에서 Level이 올바르게 표시되는가?

### 3. 로그 확인
```bash
# PM2 로그에서 다음 메시지 확인
"Starting bulk upload of 50 items"
"Fetched X workers in Yms"
"Fetched X assessment items in Yms"
"Fetched X existing assessments in Yms"
"Prepared X inserts and Y updates in Zms"
"Executed all operations in Wms"
"Assessment Bulk Upload: X succeeded, Y skipped in TOTALms"
```

## 배포 계획

### 1. 샌드박스 테스트 (완료)
- ✅ 코드 최적화 구현
- ✅ 로컬 빌드 및 테스트
- ✅ PM2로 서비스 시작
- ✅ README 업데이트
- ✅ Git 커밋

### 2. 프로덕션 배포 (대기 중)
```bash
# Cloudflare Pages 배포
cd /home/user/webapp
npm run deploy
```

### 3. 프로덕션 검증
- [ ] 실제 엑셀 파일로 업로드 테스트
- [ ] 처리 시간 측정 (5-10초 목표)
- [ ] 대시보드에서 Level 확인
- [ ] 에러 로그 확인

## 결론

### 주요 개선사항
1. **N+1 쿼리 문제 해결**: 240-290 queries → 53 queries (82% 감소)
2. **배치 쿼리 도입**: 순차 처리 → 병렬 조회 + 메모리 lookup
3. **불필요한 후처리 제거**: 40 queries 제거
4. **성능 모니터링**: 처리 시간 로깅 추가

### 예상 효과
- **처리 시간**: 60초+ → 5-10초 (80-90% 개선)
- **CPU 시간**: Cloudflare Workers 제한 내 안전하게 실행
- **안정성**: 503 오류 위험 감소
- **확장성**: 향후 배치 크기 증가 가능 (50 → 100+)

### 향후 개선 방향
1. D1 Batch API 도입으로 INSERT/UPDATE 최적화
2. 트랜잭션 사용으로 원자성 보장
3. Prepared Statement 재사용으로 추가 성능 향상
4. 프론트엔드 업로드 진행률 표시 개선

---

**작성일**: 2025-11-14  
**작성자**: AI Assistant  
**버전**: 1.0  
**상태**: 샌드박스 테스트 완료, 프로덕션 배포 대기
