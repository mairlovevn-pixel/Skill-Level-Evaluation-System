# 🔤 Worker 데이터 워딩 통일안

## 📊 현황 요약
- **Worker 엑셀 (Position)**: 54개의 고유값
- **DB (processes 테이블)**: 27개의 프로세스
- **Assessment 엑셀 (프로세스)**: 3개 (bevel, CNC Cutting, CS Welding)

---

## 🎯 워딩 통일 제안

### 📋 1. 컬럼명 통일

| 데이터 소스 | 현재 컬럼명 | 제안 표준명 |
|------------|-----------|-----------|
| Worker 엑셀 | Position | **Process** 또는 그대로 Position |
| Assessment 엑셀 | 프로세스 | **Process** |
| DB | name (processes 테이블) | **name** (유지) |

---

### 📋 2. Entity (법인) 워딩

| Worker 엑셀 | 제안 표준 | 비고 |
|------------|---------|------|
| VN (718건) | **CSVN** | DB에서는 CSVN 사용 |
| CN (239건) | **CSCN** | 중국 법인 |
| TW (130건) | **CSTW** | 대만 법인 |

**결정 필요**: 엑셀을 DB 형식(CSVN, CSCN, CSTW)으로 통일할지, DB를 엑셀 형식(VN, CN, TW)으로 통일할지?

---

### 📋 3. Team (팀명) 워딩

| Worker 엑셀 | DB/코드 | 제안 표준 | 인원 |
|------------|---------|---------|------|
| BLACK TOWER | black tower | **black tower** (소문자) | 542명 |
| WHITE TOWER | white tower | **white tower** (소문자) | 157명 |
| Internal Mounting | internal mounting | **internal mounting** (소문자) | 120명 |
| QM | qm | **qm** (소문자) | 133명 |
| WAREHOUSE | warehouse | **warehouse** (소문자) | 22명 |
| TRANSPORTATION | transportation | **transportation** (소문자) | 65명 |
| LEAN | lean | **lean** (소문자) | 3명 |
| MAINTENANCE | maintenance | **maintenance** (소문자) | 45명 |

**제안**: 모든 팀명을 **소문자**로 통일 (현재 DB/코드에서 사용 중)

---

### 📋 4. Process/Position 워딩 통일안 (핵심)

#### 🔧 Black Tower 관련 프로세스

| Worker 엑셀 (Position) | DB (processes) | Assessment | 제안 표준명 | 인원 |
|----------------------|---------------|------------|-----------|------|
| Cutting | Cutting | CNC Cutting | **Cutting** | 24명 |
| Bevelling | Beveling | bevel | **Beveling** | 39명 |
| Bending | Bending | - | **Bending** | 39명 |
| Material Handling | Material Handling | - | **Material Handling** | 40명 |
| LS Welding, LS welding | LS Welding | - | **LS Welding** | 58명 (47+11) |
| Fit-up | Fit Up | - | **Fit Up** | 70명 |
| CS Welding | CS Welding | CS Welding | **CS Welding** | 73명 |
| VT/MT | VTMT | - | **VTMT** | 98명 |
| Bracket FU | Bracket FU | - | **Bracket FU** | 22명 |
| Bracket WELD, Bracket Weld | Bracket Weld | - | **Bracket Weld** | 22명 (14+8) |
| UT repair, UT Repair | UT repair | - | **UT repair** | 36명 (23+13) |
| Door Frame FU | DF FU | - | **DF FU** | 4명 |
| Door Frame WELD | DF Weld | - | **DF Weld** | 5명 |
| Flatness Repair | Flatness | - | **Flatness** | 16명 |
| Drilling & Tapping | Drilling | - | **Drilling** | 2명 |

#### 🎨 White Tower 관련 프로세스

| Worker 엑셀 (Position) | DB (processes) | 제안 표준명 | 인원 |
|----------------------|---------------|-----------|------|
| Blasting | Blasting | **Blasting** | 50명 |
| Metalizing | Metalizing | **Metalizing** | 12명 |
| Painting, Painting Repair, Paint Repair, Paint Touch Up | Paint | **Paint** | 98명 (67+15+5+11) |
| Paint Ring, Fitting paint ring | Paint ring | **Paint ring** | 8명 (3+5) |

#### 🔩 Internal Mounting 관련 프로세스

| Worker 엑셀 (Position) | DB (processes) | 제안 표준명 | 인원 |
|----------------------|---------------|-----------|------|
| Assembler | - | **IM_Assembler** (신규) | 80명 |
| Material Handler-IM | Material Handler_IM | **Material Handler_IM** | 11명 |
| IM Cable | - | **IM_Cable** (신규) | 10명 |
| GT Cleaning | - | **IM_GT Cleaning** (신규) | 8명 |
| Paint Touch Up | (Paint에 포함?) | **Paint** 또는 **IM_Paint Touch Up** | 11명 |

#### 🏢 기타 팀 프로세스

| Worker 엑셀 (Position) | DB (processes) | 제안 표준명 | 팀 | 인원 |
|----------------------|---------------|-----------|-----|------|
| Lean / Kaizen | EHS | **EHS** | LEAN | 3명 |
| Electrician/Mechanic | Electrical, Mechanical | **MAINTENANCE** | MAINTENANCE | 45명 |
| Transport, H-Frame Installation, Storage Fit Installation, TEQ | TRANSPORTATION | **TRANSPORTATION** | TRANSPORTATION | 65명 |
| Warehouse-Kitset, Warehouse-IM, Warehouse BT/WT, Warehouse WT | WH_Kitset | **WH_Kitset** | WAREHOUSE | 22명 |

#### 👔 QM (Quality Management) 관련

| Worker 엑셀 (Position) | DB (processes) | 제안 표준명 | 인원 |
|----------------------|---------------|-----------|------|
| QC Inspector-IM Final (QIF) | IM_Mounting Final (QIF) | **IM_Mounting Final (QIF)** | 11명 |
| 나머지 QC Inspector 항목들 (12개) | - | **QM_Inspector** (통합) 또는 개별 유지 | 122명 |

**QM Position 상세 목록** (필요시 개별 프로세스로 등록):
- QC Inspector - BT MT/PT(QBLACK TOWER) (4명)
- QC Inspector - BT MT/PT(QBP) (7명)
- QC Inspector - BT UT/PAUT(QBU) (35명)
- QC Inspector - BT VT(QBV) (15명)
- QC Inspector - Delivery Inspector(QDI) (5명)
- QC Inspector - WT Matelizing(QMI) (6명)
- QC Inspector - WT Painting(QWP) (7명)
- QC Inspector - WT Washing&Blasting(QWM) (5명)
- QC inspector-BT Dimension(QBD) (18명)
- QC inspector-BT Fitup&Welding(QBF) (10명)
- QC inspector-BT incoming to bending (5명)
- QC inspector-BT Incoming(QBI) (1명)
- QC Inspector-IM Incoming(QII) (4명)

---

## 📝 워딩 규칙 제안

### 🎯 대소문자 규칙
1. **팀명**: 모두 소문자 (black tower, white tower, qm 등)
2. **프로세스명**: 
   - 약어는 대문자 (CS, LS, UT, DF, BT, WT, IM, VT, MT, QC 등)
   - 일반 단어는 첫 글자만 대문자 (Cutting, Bending, Welding 등)
   - 예: "LS Welding", "UT repair", "Material Handling"

### 🎯 구분자 규칙
1. **언더스코어 (_)**: 팀 접두사 구분 시 사용
   - 예: `Material Handler_IM`, `IM_Assembler`, `WH_Kitset`
2. **하이픈 (-)**: 사용하지 않음 (언더스코어로 통일)
3. **공백 ( )**: 일반 단어 구분 시 사용
   - 예: "Material Handling", "Paint ring"

### 🎯 약어 통일
- **Beveling** (not "Bevelling" or "bevel")
- **Fit Up** (not "Fit-up")
- **UT repair** (not "UT Repair" - 소문자 유지)
- **LS Welding** (not "LS welding")
- **VTMT** (not "VT/MT")
- **DF** = Door Frame
- **IM** = Internal Mounting
- **WH** = Warehouse
- **BT** = Black Tower
- **WT** = White Tower

---

## ✅ 다음 단계 제안

1. **Entity 워딩 결정**: VN vs CSVN 중 선택
2. **QM Position 처리 방안 결정**: 
   - 옵션 A: 13개 QC Inspector를 모두 개별 프로세스로 등록
   - 옵션 B: "QM_Inspector"로 통합
   - 옵션 C: 주요 3~5개만 프로세스로 등록, 나머지는 Position으로만 관리
3. **신규 프로세스 추가 여부 결정**:
   - IM_Assembler (80명)
   - IM_Cable (10명)
   - IM_GT Cleaning (8명)
4. **엑셀 데이터 일괄 변환**: 확정된 표준에 맞춰 Worker, Assessment 엑셀 수정
5. **DB 업데이트**: processes 테이블에 신규 프로세스 추가

---

## 📌 참고사항

- Worker 엑셀의 Position은 작업자의 실제 직무를 나타냄
- DB의 processes는 평가/테스트 대상 프로세스를 나타냄
- 모든 Worker Position이 processes에 있어야 하는 것은 아님 (예: QC Inspector, Transport 등)
- 평가 대상 프로세스만 processes 테이블에 등록하면 됨
