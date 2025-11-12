-- 0006: 워딩 표준화 - 모든 프로세스명을 대문자로 통일

-- 기존 프로세스명 업데이트
UPDATE processes SET name = 'MATERIAL HANDLING' WHERE name = 'Material Handling';
UPDATE processes SET name = 'CUTTING' WHERE name = 'Cutting';
UPDATE processes SET name = 'BEVELING' WHERE name = 'Beveling';
UPDATE processes SET name = 'BENDING' WHERE name = 'Bending';
UPDATE processes SET name = 'LS WELDING' WHERE name = 'LS Welding';
UPDATE processes SET name = 'FIT UP' WHERE name = 'Fit Up';
UPDATE processes SET name = 'CS WELDING' WHERE name = 'CS Welding';
UPDATE processes SET name = 'VTMT' WHERE name = 'VTMT';
UPDATE processes SET name = 'BRACKET FU' WHERE name = 'Bracket FU';
UPDATE processes SET name = 'BRACKET WELD' WHERE name = 'Bracket Weld';
UPDATE processes SET name = 'UT REPAIR' WHERE name = 'UT repair';
UPDATE processes SET name = 'DOOR FRAME FU' WHERE name = 'DF FU';
UPDATE processes SET name = 'DOOR FRAME WELD' WHERE name = 'DF Weld';
UPDATE processes SET name = 'FLATNESS' WHERE name = 'Flatness';
UPDATE processes SET name = 'DRILLING' WHERE name = 'Drilling';
UPDATE processes SET name = 'BLASTING' WHERE name = 'Blasting';
UPDATE processes SET name = 'METALIZING' WHERE name = 'Metalizing';
UPDATE processes SET name = 'PAINT' WHERE name = 'Paint';
UPDATE processes SET name = 'PAINT RING' WHERE name = 'Paint ring';
UPDATE processes SET name = 'EHS' WHERE name = 'EHS';
UPDATE processes SET name = 'MATERIAL HANDLER-IM' WHERE name = 'Material Handler_IM';
UPDATE processes SET name = 'QC INSPECTOR-IM FINAL (QIF)' WHERE name = 'IM_Mounting Final (QIF)';
UPDATE processes SET name = 'WAREHOUSE-KITSET' WHERE name = 'WH_Kitset';
UPDATE processes SET name = 'TRANSPORTATION' WHERE name = 'TRANSPORTATION';
UPDATE processes SET name = 'MAINTENANCE' WHERE name = 'MAINTENANCE';
UPDATE processes SET name = 'ELECTRICAL' WHERE name = 'Electrical';
UPDATE processes SET name = 'MECHANICAL' WHERE name = 'Mechanical';

-- 신규 프로세스 추가 (누락된 Position들)
INSERT INTO processes (name, description, created_at) VALUES 
('DRILLING & TAPPING', 'Drilling and tapping operations', CURRENT_TIMESTAMP),
('PAINTING', 'Painting operations', CURRENT_TIMESTAMP),
('PAINTING REPAIR', 'Painting repair work', CURRENT_TIMESTAMP),
('FITTING PAINT RING', 'Fitting paint ring installation', CURRENT_TIMESTAMP),
('ASSEMBLY', 'Assembly operations', CURRENT_TIMESTAMP),
('IM CABLE', 'Internal mounting cable work', CURRENT_TIMESTAMP),
('GT CLEANING', 'GT cleaning operations', CURRENT_TIMESTAMP),
('PAINT TOUCH UP', 'Paint touch up work', CURRENT_TIMESTAMP),
('QC INSPECTOR - BT MT/PT(QBP)', 'QC Inspector - Black Tower MT/PT', CURRENT_TIMESTAMP),
('QC INSPECTOR - BT UT/PAUT(QBU)', 'QC Inspector - Black Tower UT/PAUT', CURRENT_TIMESTAMP),
('QC INSPECTOR - BT VT(QBV)', 'QC Inspector - Black Tower VT', CURRENT_TIMESTAMP),
('QC INSPECTOR - DELIVERY INSPECTOR(QDI)', 'QC Inspector - Delivery', CURRENT_TIMESTAMP),
('QC INSPECTOR-IM INCOMING(QII)', 'QC Inspector - IM Incoming', CURRENT_TIMESTAMP),
('QC INSPECTOR - WT MATELIZING(QMI)', 'QC Inspector - White Tower Metalizing', CURRENT_TIMESTAMP),
('QC INSPECTOR - WT WASHING&BLASTING(QWM)', 'QC Inspector - White Tower Washing & Blasting', CURRENT_TIMESTAMP),
('QC INSPECTOR - WT PAINTING(QWP)', 'QC Inspector - White Tower Painting', CURRENT_TIMESTAMP),
('QC INSPECTOR-BT FITUP&WELDING(QBF)', 'QC Inspector - Black Tower Fitup & Welding', CURRENT_TIMESTAMP),
('QC INSPECTOR-BT DIMENSION(QBD)', 'QC Inspector - Black Tower Dimension', CURRENT_TIMESTAMP),
('QC INSPECTOR-BT INCOMING TO BENDING', 'QC Inspector - Black Tower Incoming to Bending', CURRENT_TIMESTAMP),
('QC INSPECTOR-BT INCOMING(QBI)', 'QC Inspector - Black Tower Incoming', CURRENT_TIMESTAMP),
('QC INSPECTOR - BT MT/PT(QBLACK TOWER)', 'QC Inspector - Black Tower MT/PT', CURRENT_TIMESTAMP),
('STORAGE FIT INSTALLATION', 'Storage fit installation work', CURRENT_TIMESTAMP),
('H-FRAME INSTALLATION', 'H-Frame installation work', CURRENT_TIMESTAMP),
('TEQ', 'TEQ operations', CURRENT_TIMESTAMP),
('ELECTRICIAN/MECHANIC', 'Electrician and mechanic work', CURRENT_TIMESTAMP),
('WAREHOUSE BT/WT', 'Warehouse Black Tower / White Tower', CURRENT_TIMESTAMP),
('WAREHOUSE-IM', 'Warehouse Internal Mounting', CURRENT_TIMESTAMP),
('KAIZEN', 'Kaizen improvement activities', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Workers 테이블의 team과 entity를 대문자로 변환
UPDATE workers SET team = UPPER(team);
UPDATE workers SET entity = CASE 
    WHEN UPPER(entity) = 'VN' THEN 'CSVN'
    WHEN UPPER(entity) = 'CN' THEN 'CSCN'
    WHEN UPPER(entity) = 'TW' THEN 'CSTW'
    ELSE UPPER(entity)
END;
