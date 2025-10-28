# Supervisor Assessment 항목 업로드 가이드

## 지원하는 엑셀 파일 형식

### 형식 1: 표준 형식
```
| Category | Item Name    | Description        |
|----------|-------------|--------------------|
| 기술 능력  | 작업 숙련도   | 작업 과정의 숙련 정도 |
| 안전      | 안전 수칙 준수 | 안전 규정 이행 수준   |
```

**컬럼 설명:**
- **Category**: 평가 카테고리 (필수)
- **Item Name**: 평가 항목 이름 (필수)
- **Description**: 평가 항목 설명 (선택)

**특징:**
- 프로세스와 독립적인 일반 평가 항목
- 모든 프로세스에 공통으로 적용 가능

### 형식 2: Level 형식 (Cutting.xlsx)
```
행 1: (비어있음)
행 2: ... | Level2 | Level2 | Level2 | Level3 | Level3 | Level4 | Level4 | ...
행 3: ... | Can She/He measure...? | Can She/He work...? | ... | If a defect occurs...? | ...
행 4: ID | Name | start to work | Division | Team | process | Years of service | ...
```

**특징:**
- 프로세스별 맞춤형 평가 항목
- Level2, Level3, Level4로 난이도 구분
- 각 레벨별로 세부 평가 질문 포함
- **프로세스 선택 필수**

**컬럼 구조:**
- **행 1**: 헤더 (무시됨)
- **행 2**: 레벨 정보 (Level2, Level3, Level4)
- **행 3**: 평가 질문 (영문)
- **행 4**: 작업자 정보 헤더 (ID, Name, 등)

## 레벨 설명

### Level2 (기본 수준)
- 기본적인 작업 수행 능력
- 안전 수칙 준수
- 지시에 따른 작업 수행
- 기본 장비 조작

**예시 질문:**
- Can She/He measure the dimensions of Steel Plate after CNC Cutting?
- Can She/He work according to the work instructions?
- Does She/He check the gas flow rate before starting work?

### Level3 (숙련 수준)
- 독립적인 작업 수행
- 문제 해결 능력
- 품질 관리
- 멘토링 능력

**예시 질문:**
- If a defect occurs during operation, can it be repaired?
- Can She/He analyze the cause of the defect that occurs?
- Can She/He serve as a mentor once or twice a year?

### Level4 (전문가 수준)
- 다기능 작업 수행
- 프로세스 개선
- 교육 및 훈련
- 표준화 및 문서화

**예시 질문:**
- Can She/He perform multi-skilling for Work in the BT process?
- Can She/He improve work procedures to standardize work?
- Can She/He lead the training by customizing the training materials?

## 업로드 방법

### 형식 1 사용 시 (표준 형식)
1. Assessment 항목 등록 페이지 접속
2. 엑셀 파일 선택
3. '평가 항목 업로드' 버튼 클릭

### 형식 2 사용 시 (Cutting.xlsx)
1. Assessment 항목 등록 페이지 접속
2. **프로세스 선택** (예: Cutting)
3. 엑셀 파일 선택
4. '평가 항목 업로드' 버튼 클릭

## 프로세스별 평가 항목

### 각 프로세스에 맞는 평가 항목 설정
- **Cutting**: 절단 작업 관련 평가 항목 (35개)
- **Beveling**: 베벨링 작업 관련 평가 항목
- **Bending**: 벤딩 작업 관련 평가 항목
- **LS Welding**: LS 용접 관련 평가 항목
- (기타 프로세스도 동일한 방식으로 설정 가능)

### 프로세스 선택의 이점
- 프로세스별로 특화된 평가 기준 적용
- 각 프로세스의 특성에 맞는 평가 항목 관리
- 레벨별 난이도 조정

## 예제 파일

### Cutting.xlsx
- 형식: Level2, Level3, Level4 컬럼
- 프로세스: Cutting 선택 필요
- 평가 항목: 35개 (Level2: 12개, Level3: 11개, Level4: 12개)
- 특징: CNC Cutting 작업에 특화된 평가 질문

## 데이터 구조

### 형식 2의 데이터 추출 방식
1. **행 2 읽기**: 레벨 정보 추출 (Level2, Level3, Level4)
2. **행 3 읽기**: 평가 질문 추출
3. **컬럼 H부터 시작**: 7번째 컬럼(H열)부터 질문 데이터
4. **자동 매핑**:
   - Category ← Level (Level2, Level3, Level4)
   - Item Name ← Question (평가 질문)
   - Process ID ← 선택한 프로세스

## 오류 해결

### "프로세스를 선택해주세요"
- 형식 2 파일 사용 시 프로세스 선택 필수
- 페이지 상단의 프로세스 선택 드롭다운에서 선택

### "지원하지 않는 엑셀 파일 형식입니다"
- 파일 형식이 형식 1, 2와 일치하지 않음
- Cutting.xlsx의 경우 행 2에 "Level2", "Level3", "Level4"가 있어야 함
- 컬럼 구조 확인 필요

### "평가 항목을 찾을 수 없습니다"
- 형식 2에서 행 2와 행 3에 데이터가 없음
- H열(8번째 컬럼)부터 데이터가 있는지 확인
- 레벨과 질문이 매칭되는지 확인

## 업로드 후 확인

1. API 응답에서 등록된 항목 수 확인
2. 데이터베이스에서 프로세스별 평가 항목 확인
3. Assessment 페이지에서 항목 목록 확인

## 주의사항

### 프로세스 연결
- 형식 2로 업로드한 항목은 선택한 프로세스와 연결됨
- 같은 파일을 다른 프로세스로 재업로드하면 별도 항목으로 등록됨

### 레벨 관리
- Level2, Level3, Level4가 Category로 저장됨
- 레벨별 난이도에 따라 평가 기준을 다르게 적용 가능

### 영문 질문
- 현재는 영문 질문만 지원
- 필요시 행 추가로 번역 지원 가능 (추후 개선)

## 활용 방법

### 평가 프로세스
1. 프로세스별 평가 항목 업로드
2. 작업자별 평가 실시
3. 레벨별 능력 측정
4. 교육 및 개선 계획 수립

### 레벨 기반 능력 평가
- Level2: 신입/초급 작업자 평가
- Level3: 중급 작업자 평가
- Level4: 고급/전문가 작업자 평가
