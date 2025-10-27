# 작업자 Skill Level 평가 대시보드

## 프로젝트 개요
- **이름**: Skill Level Assessment Dashboard
- **목표**: 작업자의 기술 수준을 평가하고 관리하는 종합 시스템
- **주요 기능**: Written Test 관리, Supervisor Assessment, 대시보드 리포팅

## 접속 URL
- **개발 서버**: https://3000-ij9mph43upsb11fhzb0zo-82b888ba.sandbox.novita.ai
- **API 베이스**: https://3000-ij9mph43upsb11fhzb0zo-82b888ba.sandbox.novita.ai/api

## 완성된 기능

### 1. 대시보드 페이지 (첫 번째 페이지)
- ✅ 전체 작업자 수 표시
- ✅ Written Test 응시자 수 표시
- ✅ Written Test 합격자 수 표시
- ✅ 프로세스별 Written Test 현황 (막대 그래프)
  - 응시자 수와 합격자 수 비교
- ✅ 프로세스별 평균 점수 (막대 그래프)
- ✅ Level별 법인 현황 (Supervisor Assessment 막대 그래프)

### 2. Written Test Quiz 등록 페이지 (두 번째 페이지)
- ✅ 엑셀 파일 업로드 기능
- ✅ 템플릿 다운로드 기능
- ✅ 다중 형식 지원:
  - **형식 1**: Process ID, Question, Option A, Option B, Option C, Option D, Correct Answer
  - **형식 2**: 번호, 질문, 1), 2), 3), 4), 정답 (한국어 형식, 자동 변환)
- ✅ 프로세스 선택 기능 (형식 2 사용 시)
- ✅ 일괄 등록 기능
- ✅ 데이터 검증 및 오류 메시지

### 3. Supervisor Assessment 항목 등록 페이지 (세 번째 페이지)
- ✅ 엑셀 파일 업로드 기능
- ✅ 템플릿 다운로드 기능
- ✅ 필수 컬럼: Category, Item Name, Description
- ✅ 일괄 등록 기능

### 4. 작업자 현황 등록 페이지 (네 번째 페이지)
- ✅ 엑셀 파일 업로드 기능
- ✅ 템플릿 다운로드 기능
- ✅ 필수 컬럼: No, Entity, Name, Employee ID, Team, Position, Start to work date
- ✅ 필수 항목 검증
- ✅ 일괄 등록 기능

### 5. Written Test 응시 페이지 (다섯 번째 페이지)
- ✅ 작업자 선택 기능
- ✅ 프로세스 선택 기능
- ✅ 퀴즈 문제 표시 (객관식)
- ✅ 답안 제출 기능
- ✅ 자동 채점 (70점 이상 합격)
- ✅ 결과 저장

## 아직 구현되지 않은 기능
- ❌ 작업자별 상세 평가 이력 페이지
- ❌ 프로세스별 상세 통계 페이지
- ❌ 개별 작업자/퀴즈/평가 항목 수정/삭제 기능
- ❌ 사용자 인증 및 권한 관리
- ❌ 대시보드 데이터 엑셀 내보내기

## 추천 개발 방향

### 단기 개선 사항
1. **데이터 수정/삭제 기능**: 각 페이지에 CRUD 기능 완성
2. **데이터 검증 강화**: 엑셀 업로드 시 더욱 상세한 검증
3. **사용자 피드백 개선**: 로딩 스피너, 토스트 메시지 추가

### 중기 개선 사항
1. **사용자 인증**: 작업자와 관리자 구분
2. **상세 리포트**: 개별 작업자 프로필 및 이력
3. **필터링 및 검색**: 대시보드에 필터 기능 추가

### 장기 개선 사항
1. **알림 시스템**: 시험 만료, 평가 기한 알림
2. **모바일 최적화**: 반응형 디자인 개선
3. **다국어 지원**: 영어, 한국어 등

## 데이터 아키텍처

### 데이터 모델
1. **workers**: 작업자 정보
2. **processes**: 프로세스 목록
3. **written_test_quizzes**: 시험 문제
4. **written_test_results**: 시험 결과
5. **written_test_answers**: 답안 상세
6. **supervisor_assessment_items**: 평가 항목
7. **supervisor_assessments**: 평가 결과

### 스토리지 서비스
- **Cloudflare D1**: SQLite 기반 데이터베이스
- **로컬 개발**: `--local` 플래그로 로컬 SQLite 사용

### 데이터 플로우
1. 엑셀 파일 업로드 → 파싱 → API 전송
2. API에서 D1 데이터베이스에 저장
3. 대시보드 로드 시 통계 쿼리 실행
4. Chart.js로 차트 렌더링

## 사용자 가이드

### 초기 설정
1. 작업자 등록: 네 번째 페이지에서 엑셀 파일로 작업자 정보 업로드
2. 프로세스: 기본 5개 프로세스 제공 (Assembly, Testing, Packaging, Quality Control, CNC Plasma)
3. Quiz 등록: 두 번째 페이지에서 프로세스별 시험 문제 업로드
   - **형식 1**: 영문 컬럼명 사용 (Process ID 포함)
   - **형식 2**: 한국어 컬럼명 사용 (번호, 질문, 1), 2), 3), 4), 정답) - 프로세스 선택 필요
4. Assessment 항목 등록: 세 번째 페이지에서 평가 항목 업로드

### 시험 진행
1. 다섯 번째 페이지 접속
2. 작업자와 프로세스 선택
3. 퀴즈 응시
4. 제출 후 즉시 결과 확인

### 대시보드 확인
- 첫 번째 페이지에서 전체 통계 및 차트 확인
- 데이터가 자동으로 업데이트됨

## 기술 스택
- **백엔드**: Hono (Cloudflare Workers)
- **프론트엔드**: Vanilla JavaScript + TailwindCSS
- **차트**: Chart.js
- **엑셀 처리**: SheetJS (xlsx)
- **데이터베이스**: Cloudflare D1 (SQLite)
- **배포**: Cloudflare Pages

## 배포 상태
- **플랫폼**: Cloudflare Pages (로컬 개발 모드)
- **상태**: ✅ 활성
- **마지막 업데이트**: 2025-10-27

## 로컬 개발 명령어
```bash
# 데이터베이스 초기화
npm run db:migrate:local
npm run db:seed

# 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 서버 확인
curl http://localhost:3000

# PM2 로그 확인
pm2 logs webapp --nostream

# 포트 정리
npm run clean-port
```

## API 엔드포인트

### 대시보드
- `GET /api/dashboard/stats`: 대시보드 통계

### 작업자
- `GET /api/workers`: 모든 작업자 조회
- `POST /api/workers`: 작업자 등록
- `POST /api/workers/bulk`: 작업자 일괄 등록

### 프로세스
- `GET /api/processes`: 모든 프로세스 조회

### 퀴즈
- `GET /api/quizzes/:processId`: 프로세스별 퀴즈 조회
- `POST /api/quizzes/bulk`: 퀴즈 일괄 등록

### 평가 항목
- `GET /api/assessment-items`: 모든 평가 항목 조회
- `POST /api/assessment-items/bulk`: 평가 항목 일괄 등록

### 시험 결과
- `POST /api/test-results`: 시험 결과 제출
