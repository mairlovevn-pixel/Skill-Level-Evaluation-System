# 작업자 Skill Level 평가 대시보드

## 프로젝트 개요
- **이름**: Skill Level Assessment Dashboard
- **목표**: 작업자의 기술 수준을 평가하고 관리하는 종합 시스템
- **주요 기능**: Written Test 관리, Supervisor Assessment, 대시보드 리포팅

## 접속 URL
- **프로덕션**: https://webapp-5ki.pages.dev
- **개발 서버**: https://3000-ib4d8xeoiy2k1oqdjx8w8-d0b9e1e2.sandbox.novita.ai
- **API 베이스**: https://webapp-5ki.pages.dev/api

## 완성된 기능

### 1. 대시보드 페이지 (첫 번째 페이지)
- ✅ 전체 작업자 수 표시
- ✅ Written Test 응시자 수 표시
- ✅ Written Test 합격자 수 표시
- ✅ 프로세스별 Written Test 현황 (막대 그래프) - **데이터 레이블 표시**
  - 응시자 수와 합격자 수 비교
  - 막대 바깥쪽에 데이터 값 표시
- ✅ **WRITTEN TEST [평균점수]** (막대 그래프) - **데이터 레이블 표시**
  - **법인별 비교**: 각 프로세스마다 법인별 평균 점수 표시
  - CSVN (파란색), CSCN (녹색), CSTW (보라색)
  - 막대 바깥쪽에 점수 표시 (소수점 1자리)
  - 프로세스별 법인 간 성과 비교 가능
  - **계층적 필터**: 팀 선택 → 해당 팀의 프로세스만 표시
  - **동적 프로세스 목록**: 선택된 팀에 속한 프로세스만 드롭다운에 표시
  - **컴팩트 UI**: 작은 크기의 드롭다운으로 공간 효율적 배치
- ✅ **Level별 법인 현황** (Supervisor Assessment 막대 그래프) - **데이터 레이블 표시**
  - 막대 바깥쪽에 인원 수 표시
  - **계층적 필터**: 팀 선택 → 해당 팀의 프로세스만 표시 (NEW!)
  - **동적 프로세스 목록**: 선택된 팀에 속한 프로세스만 드롭다운에 표시
  - 법인/팀/프로세스 필터 조합 사용 가능 (3단계 필터링)

### 2. Written Test Quiz 등록 페이지 (두 번째 페이지)
- ✅ **등록 현황 테이블**: 프로세스별 Quiz 수, 최근 등록일, 상태 표시
- ✅ **Quiz 관리 기능**: 
  - 등록된 Quiz 조회 및 개별 삭제 (프로세스별 관리 모달)
  - **프로세스별 일괄 삭제** (2중 확인 메시지)
- ✅ 엑셀 파일 업로드 기능
- ✅ 템플릿 다운로드 기능
- ✅ 다중 형식 지원:
  - **형식 1**: Process ID, Question, Option A, Option B, Option C, Option D, Correct Answer
  - **형식 2**: 번호, 질문, 1), 2), 3), 4), 정답 (한국어 형식, 자동 변환)
- ✅ 프로세스 선택 기능 (형식 2 사용 시)
- ✅ 일괄 등록 기능
- ✅ 데이터 검증 및 오류 메시지
- ✅ 업로드 후 현황 자동 새로고침

### 3. Supervisor Assessment 항목 등록 페이지 (세 번째 페이지)
- ✅ **등록 현황 테이블**: 프로세스별 항목 수, 카테고리 분포, 최근 등록일, 상태 표시
- ✅ **Assessment 관리 기능**: 
  - 등록된 항목 조회 및 개별 삭제 (일반 항목 및 프로세스별 항목)
  - **프로세스별 일괄 삭제** (2중 확인 메시지, 연관된 평가 기록도 함께 삭제)
  - 일반 항목(공통) 일괄 삭제 지원
- ✅ 엑셀 파일 업로드 기능
- ✅ 템플릿 다운로드 기능
- ✅ 다중 형식 지원:
  - **형식 1**: Category, Item Name, Description
  - **형식 2**: Level2, Level3, Level4 컬럼 형식 (Cutting.xlsx, 자동 변환)
- ✅ 프로세스 선택 기능 (형식 2 사용 시)
- ✅ 프로세스별 평가 항목 관리
- ✅ 일괄 등록 기능
- ✅ 업로드 후 현황 자동 새로고침

### 4. 작업자 현황 등록 페이지 (네 번째 페이지) - **ENHANCED!**
- ✅ **등록 현황 테이블**: 법인별로 그룹화하여 표시, 입사일 기준 정렬 (최신순)
- ✅ **작업자 관리 기능** ⭐ NEW!:
  - **수정**: 사번, 이름, 법인, 팀, 직급(Process), 입사일 편집 가능
  - **삭제**: 작업자 삭제 시 연관된 모든 평가 기록 자동 삭제 (Written Test, Supervisor Assessment)
  - 2중 확인 메시지로 실수 방지
  - 모달 UI로 편집 화면 제공
- ✅ 엑셀 파일 업로드 기능
- ✅ **스마트 업로드**: 중복 확인 후 INSERT 또는 UPDATE (사번 기준)
- ✅ 템플릿 다운로드 기능
- ✅ 다중 형식 지원:
  - **형식 1**: No, Entity, Name, Employee ID, Team, Position, Start to work date
  - **형식 2**: Name, Employee ID, Company, Department, Position, start to work (자동 변환)
- ✅ 날짜 자동 변환 (Excel 날짜 형식 지원)
- ✅ 필수 항목 검증
- ✅ 일괄 등록 기능
- ✅ 업로드 후 현황 자동 새로고침

### 5. Supervisor Assessment 시행 페이지 (다섯 번째 페이지) - **MAJOR UPDATE!**
- ✅ **등록된 작업자 데이터 자동 로드**: DB에서 실제 작업자 정보를 불러와서 표시
- ✅ **4단계 계층적 선택 시스템** ⭐ NEW!:
  - **1단계: 법인 선택** (CSVN, CSCN, CSTW)
  - **2단계: 팀 선택** (선택된 법인에서 사용 가능한 팀만 표시)
  - **3단계: 프로세스 선택** (선택된 법인 + 팀에서 사용 가능한 프로세스만 표시)
  - **4단계: 작업자 선택** (선택된 법인 + 팀 + 프로세스에 매칭되는 작업자만 표시)
  - 각 단계마다 이전 단계 선택 전까지 비활성화
  - 단계별 번호 표시 (1, 2, 3, 4)로 사용자 가이드 강화
- ✅ **이전 평가 이력 확인** ⭐ NEW!:
  - 작업자 선택 시 자동으로 이전 평가 이력 표시
  - 총 평가 횟수, 최근 평가일, 평가 항목 수, 평균 레벨 표시
  - 평가 이력이 없으면 "첫 번째 평가" 안내 메시지
  - 노란색 알림 박스로 시각적 강조
- ✅ **재평가 이력 관리** ⭐ NEW!:
  - 새로운 평가 진행 시 기존 평가 데이터 보존
  - 모든 평가 이력이 타임스탬프와 함께 저장
  - 이력 조회 시 최신순으로 정렬하여 표시
- ✅ **스마트 필터링** (Team-Process 매핑 테이블 기반):
  - **법인 선택**: 해당 법인의 팀 목록 자동 추출
  - **팀 선택**: Team-Process 매핑 테이블에서 해당 팀의 정의된 프로세스 표시
  - **프로세스 선택**: 해당 법인 + 팀에 속한 모든 작업자 표시
  - **7개 팀 분류**: BLACK TOWER (14개 프로세스), WHITE TOWER (7개), INTERNAL MOUNTING (4개), MT (1개), TRANSPORATION (4개), IM QC (16개), WAREHOUSE (4개)
- ✅ **랜덤 평가 방식**: 모든 assessment 항목을 랜덤 순서로 표시
- ✅ **만족/불만족 평가**: 체크박스 방식으로 간편하게 평가
- ✅ **진행률 표시**: 실시간 평가 진행 상황 시각화
- ✅ **자동 Level 결정**:
  - Level 2의 모든 항목 만족 → Level 2
  - Level 2 중 하나라도 불만족 → Level 1
  - Level 3, 4도 동일한 방식으로 순차 평가
- ✅ **평가 결과 요약**: Level별 만족도 통계 및 최종 레벨 표시
- ✅ **결과 저장**: 평가 완료 시 자동으로 DB에 저장 (이력 보존)

### 6. Written Test 응시 페이지 (여섯 번째 페이지)
- ✅ 법인 선택 기능 (CSVN, CSCN, CSTW)
- ✅ 법인별 작업자 필터링
- ✅ 작업자 선택 기능
- ✅ 프로세스 선택 기능
- ✅ 퀴즈 문제 표시 (객관식)
- ✅ 답안 제출 기능
- ✅ 자동 채점 (**60점 이상 합격**)
- ✅ 결과 저장

### 7. 평가 결과 분석 페이지 (일곱 번째 페이지)
- ✅ **작업자 검색**: 아래로 열리는 드롭다운 방식, 사번/이름 검색 지원
- ✅ **탭 기반 분석**: Written Test와 Supervisor Assessment 분리
- ✅ **Written Test 분석**:
  - 결과 목록 (프로세스별)
  - 상세 분석 (법인 평균 비교 막대 그래프 - **데이터 레이블 포함**, 카테고리별 레이더 차트, 추천 교육)
  - 분석 닫기 기능
- ✅ **Supervisor Assessment 분석**:
  - 결과 목록 (프로세스별, 년도 표시)
  - **영역별 평가 수준**: 레이더 차트로 카테고리별 성과 시각화 (0-5점 스케일)
  - **잘하고 있는 부분**: 평균 이상 + 3.5 이상 카테고리 TOP 5
  - **취약한 부분**: 평균 이하 또는 3.0 미만 카테고리 하위 5개
  - **다음 레벨 달성 분석**: 개선 필요 영역, 목표 진척도, 상대적 약점
  - 추천 교육 프로그램 (약한 카테고리 기반)
  - 분석 닫기 기능

### 8. 결과 관리 페이지 (여덟 번째 페이지) - **ENHANCED!**
- ✅ **Written Test 결과 관리**:
  - **다운로드 유형 선택**:
    - **요약 양식**: 카테고리/평가항목/만족여부 (3컬럼, 노란색 헤더)
    - **상세 양식**: 개별 문제별 답변 (No., 사번, 이름, 법인, 팀, 직급, 프로세스, 문제, 선택답안, 정답, 정답여부, 시험일자)
  - **필터링**: 법인별, 프로세스별 선택 가능
  - **색상 코딩**: 
    - 요약: 합격(녹색), 불합격(빨간색)
    - 상세: 정답 O(녹색), 오답 X(빨간색)
  - **업로드**: 현재 조회 전용 (향후 업로드 기능 추가 예정)
- ✅ **Supervisor Assessment 결과 관리**:
  - **다운로드 유형 선택**:
    - **요약 양식**: 카테고리별 평균 레벨 (No., 사번, 이름, 법인, 팀, 직급, 카테고리, 평균 레벨, 평가일자)
    - **상세 양식**: 개별 평가 항목별 (No., 사번, 이름, 법인, 팀, 직급, 카테고리, 평가항목, 레벨, 평가일자)
  - **필터링**: 법인별, 프로세스별 선택 가능
  - **레벨별 색상 코딩**: 4.5+(진한 녹색), 3.5+(연한 녹색), 2.5+(노란색), 1.5+(빨간색), ~1.5(진한 빨간색)
  - **업로드**: 동일한 양식의 엑셀 파일로 결과 일괄 업로드
- ✅ **Excel 포맷팅**: 노란색/녹색 헤더, 테두리, 중앙 정렬, 조건부 색상 적용, 최적화된 열 너비

## 아직 구현되지 않은 기능
- ❌ 프로세스별 상세 통계 페이지
- ❌ Quiz 및 Assessment 수정 기능 (삭제 기능은 완료 ✅, 작업자 수정/삭제는 완료 ✅)
- ❌ 사용자 인증 및 권한 관리
- ❌ 평가 이력 타임라인 기능

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
2. **processes**: 프로세스 목록 (13개 제조/용접 프로세스)
   - Cutting, Beveling, Bending, LS Welding, Fit Up, CS Welding, VTMT
   - Bracket FU, Bracket Weld, UT repair, DF FU, DF Weld, Flatness
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
2. 프로세스: 기본 13개 제조/용접 프로세스 제공
   - Cutting, Beveling, Bending, LS Welding, Fit Up, CS Welding, VTMT
   - Bracket FU, Bracket Weld, UT repair, DF FU, DF Weld, Flatness
3. Quiz 등록: 두 번째 페이지에서 프로세스별 시험 문제 업로드
   - **형식 1**: 영문 컬럼명 (Process ID 포함)
   - **형식 2**: 한국어 컬럼명 (번호, 질문, 1), 2), 3), 4), 정답) - 프로세스 선택
4. Assessment 항목 등록: 세 번째 페이지에서 평가 항목 업로드
   - **형식 1**: 표준 형식 (Category, Item Name, Description)
   - **형식 2**: Level 형식 (Level2, Level3, Level4 컬럼) - 프로세스 선택

### 시험 진행
1. 다섯 번째 페이지 접속
2. 작업자와 프로세스 선택
3. 퀴즈 응시
4. 제출 후 즉시 결과 확인

### 대시보드 확인
- 첫 번째 페이지에서 전체 통계 및 차트 확인
- **법인 선택 기능** (상단): 드롭다운에서 특정 법인 선택 시 모든 차트가 해당 법인 데이터로 필터링
- **차트별 계층적 필터** (NEW!):
  - **프로세스별 Written Test 평균 점수**: 
    - 1단계: 팀 선택 (전체 팀 또는 특정 팀)
    - 2단계: 프로세스 선택 (선택된 팀의 프로세스만 표시)
  - **Level별 법인 현황**: 
    - 1단계: 팀 선택 (전체 팀 또는 특정 팀)
    - 2단계: 프로세스 선택 (선택된 팀의 프로세스만 표시)
  - 각 차트의 필터는 독립적으로 작동
- **스마트 필터링**:
  - 팀을 선택하면 해당 팀에서 사용하는 프로세스만 프로세스 드롭다운에 표시
  - 예: "black tower" 선택 → "Cutting", "Beveling"만 표시
  - "전체 팀" 선택 → 모든 프로세스 표시
- **다단계 필터 조합**:
  - 법인(상단) + 팀(차트) + 프로세스(차트) 3단계 필터링
- 데이터가 자동으로 업데이트됨

## 기술 스택
- **백엔드**: Hono (Cloudflare Workers)
- **프론트엔드**: Vanilla JavaScript + TailwindCSS
- **차트**: Chart.js + chartjs-plugin-datalabels (데이터 레이블 표시)
- **엑셀 처리**: SheetJS (xlsx)
- **데이터베이스**: Cloudflare D1 (SQLite)
- **배포**: Cloudflare Pages

## 현재 데이터 상태

### 작업자 (총 68명)
- **CSVN**: 49명 (베트남 법인)
- **CSCN**: 13명 (중국 법인)
- **CSTW**: 6명 (대만 법인)

### Written Test 결과
- **전체 응시자**: 68명 (100%)
- **합격자**: 48명 (70.6%)
- **불합격자**: 20명 (29.4%)
- **합격 기준**: 60점 이상

### 프로세스별 시험 현황
| 프로세스 | 응시자 | 합격자 | 합격률 | 평균 점수 |
|---------|--------|--------|--------|-----------|
| Cutting | 34명 | 24명 | 70.6% | 70.7점 |
| Beveling | 34명 | 24명 | 70.6% | 69.9점 |

### Supervisor Assessment 현황
- **총 평가 완료**: 48명 (모든 합격자)
- **레벨 분포** (Written Test 점수 기반):
  - **Level 4** (85점 이상): 7명 (14.6%) - 최상위
  - **Level 3** (70-84점): 29명 (60.4%) - 상위
  - **Level 2** (60-69점): 12명 (25.0%) - 중위

### 법인별 레벨 분포
| 법인 | Level 4 | Level 3 | Level 2 | 합계 |
|------|---------|---------|---------|------|
| **CSVN** | 6명 | 20명 | 9명 | 35명 |
| **CSCN** | 1명 | 6명 | 2명 | 9명 |
| **CSTW** | 0명 | 3명 | 1명 | 4명 |

### Quiz 등록 현황
- **Cutting**: 30개 문제
- **Beveling**: 30개 문제

### Assessment 항목 현황
- **Level 2**: 36개 항목
- **Level 3**: 33개 항목
- **Level 4**: 36개 항목
- **기타**: 7개 항목 (기술 능력, 안전, 태도, 효율성)

## 배포 상태
- **플랫폼**: Cloudflare Pages
- **프로덕션 URL**: https://webapp-5ki.pages.dev
- **프로젝트 이름**: webapp
- **D1 Database**: webapp-production-v2
- **상태**: ✅ 활성
- **마지막 업데이트**: 2025-01-19
- **최근 변경사항**: 
  - **📊 Entity Comparison Chart 개선** (2025-01-19)
    - **총합 라벨 제거**: Headcount 차트에서 막대 위쪽의 총합 표시 제거
    - **라벨 단순화**: 각 Level별 개별 값만 표시하도록 변경
    - **코드 간소화**: 총합 계산 로직 제거로 성능 개선
  - **🎯 Individual Assessment Report 필터 시스템 개선** ⭐⭐⭐⭐⭐ (2025-01-19)
    - **4단계 Cascading Filter System 구현**:
      - **Level 1**: Entity (법인) 선택
      - **Level 2**: Team (팀) 선택 (Entity 선택 후 활성화)
      - **Level 3**: Position (포지션) 선택 (Team 선택 후 활성화)
      - **Level 4**: Worker (작업자) 검색 (Position 선택 후 활성화)
    - **2x2 그리드 레이아웃**: Tailwind CSS로 깔끔한 필터 UI 구현
    - **Backend API 개선**: `/api/analysis/workers` 엔드포인트가 team 및 position 필터 지원
    - **사용자 경험 개선**: 
      - 상위 필터 변경 시 하위 필터 자동 초기화 및 비활성화
      - 각 필터마다 FontAwesome 아이콘 추가
      - 직관적인 placeholder 메시지 ("Select entity first", "Select team first" 등)
    - **🐛 버그 수정**: 
      - `allDashboardWorkers is not defined` 오류 해결: API를 통한 동적 필터 데이터 로드로 변경
      - `favicon.ico 404` 오류 해결: SVG favicon 추가 및 serveStatic 라우트 설정
      - 모든 필터 함수를 `async/await` 패턴으로 변경하여 API 호출 처리
  - **🎯 Individual Assessment Report Export 개선** ⭐⭐⭐⭐⭐ (2025-01-19)
    - **헤더 영문화**: 모든 컬럼 헤더를 한글에서 영어로 변경
      - NO → No, 법인 → Entity, 이름 → Name, 사번 → Employee ID
      - 팀 → Team, 직책 → Position, 입사일 → Start Date
      - Written Test → Written Test Score
      - 최종 레벨 → Supervisor Assessment Result (새 컬럼: Final Level 추가)
    - **합격 기준 변경**: Written Test 합격 기준 70점 → **60점**
    - **Final Level 계산 로직 (포지션별 차별화)** ⭐ NEW!:
      - **둘 다 치는 포지션** (18개: CUTTING, BEVELING, BENDING, LS WELDING, FIT UP, CS WELDING, VTMT, BRACKET FU, BRACKET WELD, UT REPAIR, DOOR FRAME FU, DOOR FRAME WELD, FLATNESS, BLASTING, METALIZING, PAINTING, ASSEMBLY, IM CABLE):
        - Written Test ≥ 60점: Final Level = Supervisor Assessment Result
        - Written Test < 60점: Final Level = 1
      - **Assessment만 치는 포지션** (32개: MATERIAL HANDLING, DRILLING & TAPPING, PAINTING REPAIR, FITTING PAINT RING, GT CLEANING, MATERIAL HANDLER-IM, PAINT TOUCH UP, QC INSPECTOR 시리즈, TRANSPORTATION 시리즈, MAINTENANCE, WAREHOUSE 시리즈, LEAN 시리즈 등):
        - Final Level = Supervisor Assessment Result (Written Test 무관)
    - **테이블 UI 개선**: 
      - Supervisor Assessment Result 컬럼 추가 (기존 최종 레벨)
      - Final Level 컬럼 추가 (새로운 최종 평가)
      - 3개 컬럼으로 명확한 평가 흐름 표시
    - **Backend API 수정**: 
      - `/api/export/comprehensive-evaluation` 엔드포인트에서 포지션별 Final Level 자동 계산
      - **Dashboard API (`/api/dashboard/stats`)** ⭐ CRITICAL!:
        - 기존: `workers.current_level` 직접 사용 (Supervisor Assessment Result만 반영)
        - 개선: Written Test 점수를 조회하여 포지션별 Final Level 재계산
        - 영향: Position Analysis, Entity Comparison, Supervisor Assessment 차트 모두 Final Level 기준으로 표시
        - 약 80명의 60점 미만 작업자가 Level 1로 재분류되어 차트에 반영됨
      - Dashboard API 합격자 수 계산 기준 60점으로 변경
    - **Chatbot 응답 업데이트**: 합격률 질의 시 60점 기준 적용 
  - **🐛 Quiz 삭제 및 수정 기능 수정** ⭐⭐⭐⭐⭐ CRITICAL! (2025-01-19)
    - **버그 1**: Quiz 삭제 시 Foreign Key 제약조건으로 500 에러 발생
    - **원인**: `written_test_answers` 테이블이 quiz를 참조하고 있어 CASCADE DELETE 없음
    - **수정**: 삭제 API에서 답변 먼저 삭제 → 퀴즈 삭제 순서로 변경
    - **영향**: Quiz 삭제 및 프로세스별 일괄 삭제 모두 정상 작동
    - **버그 2**: Quiz 수정 시 에러 메시지가 불명확
    - **수정**: 
      - Backend: 데이터 검증 강화 (필수 필드, 정답 값, quiz 존재 여부)
      - Frontend: 서버 에러 메시지 표시, 디버깅 로그 추가
    - **개선**: 404/400 상태 코드별 명확한 에러 메시지 제공
  - **✨ Excel Export 기능 개선** (2025-01-19)
    - **추가**: showToast 유틸리티 함수 구현
    - **기능**: 4가지 타입 (success, error, warning, info), 애니메이션, 자동 제거
    - **위치**: 화면 우측 상단, 다중 토스트 지원
    - **사용**: Excel 다운로드 완료 시 시각적 피드백 제공
  - **🔧 소수점 점수 문제 해결 (지속적 업데이트)** ⭐⭐⭐⭐⭐ (2025-01-19)
    - **핵심 원인**: Quiz 질문에 스마트 따옴표(U+2018/U+2019/U+201C/U+201D)가 있어서 Excel 문항과 매칭 실패
    - **증상**: 전체 25개 문항 중 일부만 매칭되어 소수점 점수 발생 (예: 23/25 = 92%)
    - **해결 패턴**: 
      1. DB Quiz 질문에서 따옴표 제거 (SQL UPDATE)
      2. 영향받은 작업자 데이터 재업로드 (Excel)
      3. 소수점 점수 → 정수 점수로 정상화
    
    - **Case 1: CSCN VTMT Workers** (2025-01-19)
      - 문제: 25명 작업자 소수점 점수 (82.61%, 78.26% 등)
      - 원인: quiz_id 235, 242 스마트 따옴표 문제
      - 해결: SQL로 따옴표 제거 후 25명 데이터 재업로드 (625 records)
      - 결과: ✅ 모두 정수 점수로 정상화
    
    - **Case 2: CSTW Workers** (2025-01-19)
      - 문제: 4명 작업자 소수점 점수 (33.33%, 53.33%, 93.33%)
      - 원인: 업로드 당시 15개 답변만 저장됨 (정상: 20/25개)
      - 조사: Excel 파일과 DB 퀴즈는 정상, 답변 데이터만 부족
      - 해결: 4명 작업자(9452, 9473, 9395, 9487) 데이터 재업로드 (90 records)
      - 결과: ✅ 모두 정수 점수로 정상화
    
    - **Case 3: 0점 작업자들** (2025-01-19)
      - 문제: 14명 작업자가 답변은 있는데 점수가 0점
      - 원인: Score 계산은 되었으나 저장되지 않음
      - 해결: SQL UPDATE로 점수 재계산 및 저장
      - 결과: ✅ 13명 정상 점수 복구 (26%-70%), 1명(9467)은 답변 0개로 재업로드 필요
    
    - **Case 4: Workers 9468 & 3449** (2025-01-19) ✅ **완료**
      - 문제: 2명 작업자 소수점 점수
        - 9468 (LS WELDING): 53.06% (답변 0개 → 재업로드 후 60%)
        - 3449 (PAINTING): 26.67% (답변 15개 → 재업로드 후 92%)
      - 발견: Worker 3449는 직급이 PAINTING REPAIR이지만 시험은 PAINTING으로 응시
      - 준비: `/home/user/Workers_9468_3449_Reupload.xlsx` (50 records)
      - 결과: 사용자가 Excel 업로드로 2명 정상화 완료
    
    - **Case 5: 부동소수점 오차 제거** (2025-01-19) ✅ **완료**
      - 문제: 17명 작업자의 점수에 부동소수점 오차 존재
        - 예: 56.00000000000001, 55.00000000000001, 28.000000000000004
      - 원인: JavaScript/SQLite 부동소수점 연산의 정밀도 오차
      - 해결: SQL ROUND 함수로 모든 점수를 정수로 반올림
      - 영향: 17명 작업자 (3080, 3471, 3590, 3752, 9371, 9435, 9449, 9473, CN1494, CS0478, CS1481, NY6091, NY6115, NY6502, NY6505, NY6506, NY6550)
      - 결과: ✅ 모든 점수가 깔끔한 정수로 변환됨
  - **🐛 Assessment 업로드 버그 수정** ⭐⭐⭐⭐⭐ CRITICAL! (2025-11-16)
    - **버그**: FALSE 값이 DB에 TRUE로 저장되는 문제
    - **원인**: INSERT/UPDATE 구문에서 `is_satisfied` 컬럼 누락
    - **수정**: `is_satisfied` 값 (0/1) 계산 및 DB 저장 로직 추가
    - **영향**: 잘못된 데이터로 인해 최종 레벨이 부정확하게 계산됨 (Level 2 → Level 4)
    - **테스트**: Worker 227 (Employee ID 1412) 데이터로 검증
    - **조치**: 프로덕션 DB의 Worker 227 평가 데이터 초기화 완료
    - **필요 작업**: 사용자가 원본 엑셀 파일 재업로드 필요
  - **UI 개선**: "평균 레벨" → "최종 레벨" 텍스트 변경 (Worker Detail 페이지)
  - **UI 개선**: Assessment 결과 목록에서 "카테고리" 텍스트 제거 
  - **Assessment 벌크 업로드 대폭 최적화** ⭐⭐⭐⭐⭐ NEW! (2025-11-14)
    - **성능 개선**: N+1 쿼리 문제 해결, 280 queries → 5-10 queries per batch
    - **배치 쿼리**: 모든 worker와 assessment item을 한 번에 조회
    - **메모리 기반 처리**: Map 자료구조로 고속 lookup 구현
    - **처리 시간 측정**: 로그에 실행 시간(ms) 표시
    - **후처리 제거**: Level 계산은 대시보드 쿼리에서만 수행하도록 변경
    - **예상 성능**: 50개 항목 처리 시간 60초+ → 5-10초로 약 80-90% 단축
  - **Team-Process 매핑 테이블 기반 필터링** ⭐⭐⭐⭐ NEW!
    - **엑셀 기반 정의**: TEAM PROCESS.xlsx 파일을 기반으로 팀-프로세스 매핑
    - **7개 팀 정의**: BLACK TOWER, WHITE TOWER, INTERNAL MOUNTING, MT, TRANSPORATION, IM QC, WAREHOUSE
    - **70개 이상 프로세스**: 각 팀별로 세부 프로세스 정의
    - **정확한 필터링**: 기존 position 키워드 매칭 방식에서 명확한 테이블 기반 매핑으로 변경
    - 팀 선택 시 해당 팀의 정의된 프로세스만 표시
    - 작업자 필터링 시 팀 기준으로 정확하게 필터링
  - **Supervisor Assessment 대폭 개선** ⭐⭐⭐
    - **4단계 계층적 필터**: 법인 → 팀 → 프로세스 → 작업자
    - **이전 평가 이력 확인**: 작업자 선택 시 자동으로 평가 이력 표시
    - **재평가 이력 관리**: 새 평가 시 기존 이력 보존, 모든 평가 타임스탬프 기록
    - 단계별 번호 표시 (1️⃣, 2️⃣, 3️⃣, 4️⃣)로 사용자 가이드 강화
    - 이전 단계 선택 전까지 다음 단계 비활성화
  - **백엔드 API 추가**:
    - `GET /api/supervisor-assessment-history/:workerId/:processId`: 작업자별 평가 이력 조회
    - 평가 횟수, 최근 평가일, 평균 레벨 등 통계 제공
  - **작업자 편집/삭제 기능 추가** ⭐
    - 등록된 작업자 정보 수정 기능 (모달 UI)
    - 작업자 삭제 기능 (연관된 모든 평가 기록 함께 삭제)
    - 2중 확인 메시지로 실수 방지
  - **작업자 업로드 디버깅 강화**
    - 브라우저 콘솔에 상세한 업로드 과정 로그 추가
    - 파일 형식 감지, 데이터 변환, 필수 항목 검증 단계별 로그
    - 실패 시 정확한 원인과 해당 행 데이터 표시
    - 누락된 필드 이름을 한글로 명확히 표시
    - API 에러 상세 정보 제공 (400/500 상태 코드별 메시지)
    - 📄 상세 문서: `UPLOAD_TROUBLESHOOTING_KR.md` 참조
  - **코드 리팩토링** (유지보수성 개선)
    - AppState 객체로 전역 상태 캡슐화
    - Position → Process 매핑을 선언적 테이블로 변경 (13개 if-else 제거)
    - 중복 코드 제거 (팀 셀렉트 생성 로직)
    - JSDoc 주석 추가로 코드 문서화
  - **네비게이션 순서 변경**: "작업자 등록" 페이지를 최상단으로 이동 (첫 번째 메뉴)
  - **법인별 리스트 접기/펼치기 기능 추가**: 작업자 현황에서 법인별로 리스트를 열고 닫을 수 있는 아코디언 UI 구현
  - **작업자 업로드 개선**: Team 이름 자동 소문자 변환 및 공백 제거 (대소문자 구분 없이 업로드 가능)
  - **데이터 정리 강화**: 모든 필드에 trim() 적용하여 공백 문제 해결
  - **차트 제목 업데이트**: "프로세스별 Written Test 평균 점수" → "WRITTEN TEST [평균점수]"
  - **UI 개선**: 드롭다운 박스 크기 최적화 (w-48 → w-36, text-sm → text-xs, py-2 → py-1.5)
  - **컴팩트 레이아웃**: gap-3 → gap-2, 더 작은 패딩으로 공간 효율성 향상
  - **계층적 필터 구조**: 팀 선택 → 프로세스 선택 순서로 필터링
  - **동적 프로세스 목록**: 선택된 팀의 프로세스만 드롭다운에 표시
  - **두 차트 모두 팀 필터 추가**: 평균 점수 차트와 Level별 법인 현황 차트에 팀 선택 기능
  - **스마트 매핑**: Workers의 position을 프로세스 이름으로 자동 매핑 (예: "CNC Cutting" → "Cutting")
  - **3단계 필터링 지원**: 법인 + 팀 + 프로세스 조합 필터 가능
  - **차트별 독립 필터**: 각 차트 우측에 독립적인 필터 드롭다운 추가
  - **상단 프로세스 필터 제거**: 공통 프로세스 필터 대신 차트별 독립 필터로 변경
  - **필터 구조 개선**: 법인 필터(상단, 전체 영향) + 차트별 독립 필터(팀→프로세스)
  - **차트 제목 변경**: "프로세스별 평균 점수" → "프로세스별 Written Test 평균 점수"
  - **프로세스별 평균 점수 법인별 비교** (각 프로세스마다 CSVN/CSCN/CSTW 비교 표시)
  - **Assessment 엑셀 다운로드 검증 강화** (데이터 검증, 디버깅 로직, 안전 장치 추가)
  - **Excel 유틸리티 리팩토링** (상수 추출, 함수 모듈화, 중복 코드 제거)
  - **결과 관리 페이지 개선** (요약/상세 다운로드 유형 선택 추가)
  - **Written Test 상세 다운로드** (개별 문제별 답변, 정답여부 확인 가능)
  - **Assessment 요약 다운로드** (카테고리별 평균 레벨 계산)
  - **결과 관리 페이지 추가** (엑셀 다운로드/업로드, 법인/프로세스 필터링)
  - Supervisor Assessment 시행 페이지 추가 (랜덤 평가, 자동 Level 결정, 결과 저장)
  - Quiz 및 Assessment 삭제 기능 추가
  - Quiz 프로세스별 일괄 삭제 기능 추가 (2중 확인)
  - Assessment 프로세스별 일괄 삭제 기능 추가 (일반 항목 포함, 2중 확인, 연관 평가 기록 함께 삭제)
  - 평가 결과 분석 페이지 대폭 개선 (드롭다운, 탭 분리, 다음 레벨 분석)
  - Assessment 분석 레이더 차트 추가 (Written Test와 동일한 형태)
  - Chart.js Datalabels 플러그인 추가: 모든 막대 그래프에 데이터 레이블 표시 (막대 바깥쪽)

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
- `GET /api/dashboard/stats`: 대시보드 통계 (쿼리 파라미터: `entity`, `processId`, `team`)

### 작업자
- `GET /api/workers`: 모든 작업자 조회
- `POST /api/workers`: 작업자 등록
- `POST /api/workers/bulk`: 작업자 일괄 등록 (중복 시 UPDATE, 신규 시 INSERT)
- `PUT /api/workers/:id`: 작업자 정보 수정
- `DELETE /api/workers/:id`: 작업자 삭제 (연관된 평가 기록 함께 삭제)

### 프로세스
- `GET /api/processes`: 모든 프로세스 조회

### 퀴즈
- `GET /api/quizzes/:processId`: 프로세스별 퀴즈 조회
- `POST /api/quizzes/bulk`: 퀴즈 일괄 등록
- `DELETE /api/quizzes/:id`: 퀴즈 개별 삭제
- `DELETE /api/quizzes/process/:processId`: 프로세스별 퀴즈 일괄 삭제

### 평가 항목
- `GET /api/assessment-items`: 모든 평가 항목 조회
- `POST /api/assessment-items/bulk`: 평가 항목 일괄 등록
- `DELETE /api/assessment-items/:id`: 평가 항목 개별 삭제 (연관된 평가 기록도 함께 삭제)
- `DELETE /api/assessment-items/process/:processId`: 프로세스별 평가 항목 일괄 삭제 (processId가 'null'이면 일반 항목 삭제)

### Supervisor Assessment 결과
- `GET /api/supervisor-assessment-history/:workerId/:processId`: 작업자별 프로세스별 평가 이력 조회 (최신순)
- `POST /api/supervisor-assessment-results`: Supervisor Assessment 결과 제출 및 저장

### 시험 결과
- `POST /api/test-results`: 시험 결과 제출

### 결과 관리
- `GET /api/results/written-test`: Written Test 결과 조회 - 요약 (entity, processId 필터 지원)
- `GET /api/results/written-test/detailed`: Written Test 결과 조회 - 상세 (개별 문제별, entity, processId 필터 지원)
- `GET /api/results/assessment`: Assessment 결과 조회 - 상세 (개별 항목별, entity, processId 필터 지원)
- `POST /api/results/written-test/bulk`: Written Test 결과 일괄 업로드
- `POST /api/results/assessment/bulk`: Assessment 결과 일괄 업로드
