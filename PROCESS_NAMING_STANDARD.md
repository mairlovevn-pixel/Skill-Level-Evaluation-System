# 🔧 프로세스 명명 규칙 통일 작업

## 📊 현황 분석

### 1. DB의 processes 테이블 (마스터 데이터)
**총 27개의 표준 프로세스명**

| No. | 표준 프로세스명 | 비고 |
|-----|----------------|------|
| 1 | Bending | ✅ 표준 |
| 2 | Beveling | ✅ 표준 (⚠️ Excel: "bevel") |
| 3 | Blasting | ✅ 표준 |
| 4 | Bracket FU | ✅ 표준 |
| 5 | Bracket Weld | ✅ 표준 |
| 6 | CS Welding | ✅ 표준 |
| 7 | Cutting | ✅ 표준 (⚠️ Excel: "CNC Cutting") |
| 8 | DF FU | ✅ 표준 |
| 9 | DF Weld | ✅ 표준 |
| 10 | Drilling | ✅ 표준 |
| 11 | EHS | ✅ 표준 |
| 12 | Electrical | ✅ 표준 |
| 13 | Fit Up | ✅ 표준 |
| 14 | Flatness | ✅ 표준 |
| 15 | IM_Mounting Final (QIF) | ✅ 표준 |
| 16 | LS Welding | ✅ 표준 |
| 17 | MAINTENANCE | ✅ 표준 |
| 18 | Material Handler_IM | ✅ 표준 |
| 19 | Material Handling | ✅ 표준 |
| 20 | Mechanical | ✅ 표준 |
| 21 | Metalizing | ✅ 표준 |
| 22 | Paint | ✅ 표준 |
| 23 | Paint ring | ✅ 표준 |
| 24 | TRANSPORTATION | ✅ 표준 |
| 25 | UT repair | ✅ 표준 |
| 26 | VTMT | ✅ 표준 |
| 27 | WH_Kitset | ✅ 표준 |

---

### 2. 업로드된 Assessment 엑셀 파일
**총 3개의 프로세스명 발견**

| No. | Excel 프로세스명 | 표준명 | 상태 | 비고 |
|-----|-----------------|--------|------|------|
| 1 | **bevel** | Beveling | ❌ 불일치 | 소문자, "ing" 누락 |
| 2 | **CNC Cutting** | Cutting | ❌ 불일치 | "CNC" 접두어 추가됨 |
| 3 | **CS Welding** | CS Welding | ✅ 일치 | |

**⚠️ 문제점:**
- "bevel" → "Beveling" 매칭 실패 (9명만 등록된 이유)
- "CNC Cutting" → "Cutting" 매칭 실패

---

### 3. 데이터 사용 현황

| 테이블/기능 | 프로세스 데이터 | 매칭 방식 |
|-----------|----------------|-----------|
| **processes** | 27개 표준 프로세스명 | 마스터 테이블 |
| **written_test_quizzes** | 18개 프로세스 사용 | process_id로 참조 |
| **supervisor_assessment_items** | 23개 프로세스 사용 | process_id로 참조 |
| **written_test_results** | 1개 (Cutting) | process_id로 참조 |
| **supervisor_assessments** | 1개 (CS Welding) | process_id로 참조 |

---

## 🔍 발견된 명명 불일치 문제

### A. 대소문자 문제
```
Excel: "bevel"  ←→  DB: "Beveling"
```

### B. 접두어/축약어 문제
```
Excel: "CNC Cutting"  ←→  DB: "Cutting"
```

### C. 어미(-ing) 누락 문제
```
Excel: "bevel"  ←→  DB: "Beveling"
```

---

## 💡 해결 방안

### 옵션 1: DB 표준명 유지 + 업로드 시 자동 매핑 (✅ 권장)

**장점:**
- DB 데이터 무결성 유지
- 기존 데이터 영향 없음
- 유연한 엑셀 업로드 지원

**구현 방법:**
```javascript
// 프로세스명 매핑 테이블 추가
const PROCESS_NAME_MAPPING = {
  // 소문자 변형
  'bevel': 'Beveling',
  'beveling': 'Beveling',
  
  // 약어/접두어 변형
  'cnc cutting': 'Cutting',
  'cutting': 'Cutting',
  
  // 대소문자 무시 매핑
  'cs welding': 'CS Welding',
  'ls welding': 'LS Welding',
  
  // 기타 가능한 변형들
  'material handling': 'Material Handling',
  'material handler': 'Material Handling',
  'ut repair': 'UT repair',
  // ... 추가
};

// 업로드 시 자동 변환
function normalizeProcessName(rawName) {
  const cleaned = rawName.trim().toLowerCase();
  return PROCESS_NAME_MAPPING[cleaned] || rawName;
}
```

---

### 옵션 2: DB 업데이트 + 모든 엑셀 재가공

**단점:**
- 기존 데이터 대량 수정 필요
- 이미 업로드된 Quiz, Assessment Item 영향
- 프론트엔드 코드 수정 필요
- 위험도 높음

**❌ 권장하지 않음**

---

## 🎯 최종 권장 사항

### 1단계: 프로세스명 매핑 함수 추가
- `/home/user/webapp/public/static/app.js`에 `PROCESS_NAME_MAPPING` 추가
- 모든 업로드 함수에서 자동 변환 적용

### 2단계: 엑셀 업로드 검증 강화
- 업로드 전 프로세스명 매칭 확인
- 매칭되지 않는 프로세스명 경고 표시
- 사용자에게 수정 제안

### 3단계: 표준 프로세스명 가이드 제공
- 엑셀 템플릿에 표준 프로세스명 시트 추가
- 업로드 화면에 "지원되는 프로세스명" 표시

---

## 📋 필요 작업 리스트

- [ ] `PROCESS_NAME_MAPPING` 객체 생성 (모든 변형 포함)
- [ ] `normalizeProcessName()` 함수 구현
- [ ] `uploadAssessmentResults()` 함수에 매핑 적용
- [ ] `uploadWrittenTestResults()` 함수에 매핑 적용
- [ ] `registerWorker()` 함수에 매핑 적용 (필요시)
- [ ] 업로드 전 검증 UI 추가
- [ ] 에러 메시지 개선 ("프로세스 'bevel' 없음" → "프로세스 'bevel'을 'Beveling'으로 매핑했습니다")

---

## 📌 즉시 적용 가능한 매핑 테이블

```javascript
const PROCESS_NAME_MAPPING = {
  // Beveling 변형
  'bevel': 'Beveling',
  'beveling': 'Beveling',
  
  // Cutting 변형
  'cutting': 'Cutting',
  'cnc cutting': 'Cutting',
  
  // Welding 변형
  'cs welding': 'CS Welding',
  'ls welding': 'LS Welding',
  
  // Material Handling 변형
  'material handling': 'Material Handling',
  'material handler': 'Material Handling',
  'material handler_im': 'Material Handler_IM',
  
  // FU (Fit Up) 변형
  'fit up': 'Fit Up',
  'fitup': 'Fit Up',
  'bracket fu': 'Bracket FU',
  'df fu': 'DF FU',
  
  // Weld 변형
  'bracket weld': 'Bracket Weld',
  'df weld': 'DF Weld',
  
  // 기타
  'ut repair': 'UT repair',
  'vtmt': 'VTMT',
  'drilling': 'Drilling',
  'bending': 'Bending',
  'blasting': 'Blasting',
  'flatness': 'Flatness',
  'ehs': 'EHS',
  'electrical': 'Electrical',
  'mechanical': 'Mechanical',
  'metalizing': 'Metalizing',
  'paint': 'Paint',
  'paint ring': 'Paint ring',
  'maintenance': 'MAINTENANCE',
  'transportation': 'TRANSPORTATION',
  'wh_kitset': 'WH_Kitset',
  'im_mounting final (qif)': 'IM_Mounting Final (QIF)'
};
```

---

**생성일:** 2025-11-11  
**작성자:** AI Assistant  
**목적:** 프로세스 명명 규칙 통일 및 데이터 일관성 확보
