-- Seed data for local testing

-- Insert workers with different entities, teams, positions, and levels
-- start_to_work_date calculated from tenure years (approximately)
INSERT INTO workers (employee_id, name, entity, team, position, start_to_work_date, current_level) VALUES
-- BLACK TOWER - CSVN
('VN001', 'Nguyen Van A', 'CSVN', 'BLACK TOWER', 'CUTTING', date('now', '-3 years', '-6 months'), 1),
('VN002', 'Tran Thi B', 'CSVN', 'BLACK TOWER', 'CUTTING', date('now', '-5 years', '-2 months'), 2),
('VN003', 'Le Van C', 'CSVN', 'BLACK TOWER', 'BEVELING', date('now', '-4 years', '-10 months'), 2),
('VN004', 'Pham Thi D', 'CSVN', 'BLACK TOWER', 'BENDING', date('now', '-6 years', '-4 months'), 3),
('VN005', 'Hoang Van E', 'CSVN', 'BLACK TOWER', 'LS WELDING', date('now', '-7 years', '-1 month'), 3),
('VN006', 'Nguyen Thi F', 'CSVN', 'BLACK TOWER', 'FIT UP', date('now', '-8 years', '-6 months'), 4),
('VN007', 'Tran Van G', 'CSVN', 'BLACK TOWER', 'CS WELDING', date('now', '-2 years', '-4 months'), 1),
('VN008', 'Le Thi H', 'CSVN', 'BLACK TOWER', 'VTMT', date('now', '-4 years', '-1 month'), 2),
('VN009', 'Pham Van I', 'CSVN', 'BLACK TOWER', 'BRACKET FU', date('now', '-5 years', '-8 months'), 3),
('VN010', 'Hoang Thi J', 'CSVN', 'BLACK TOWER', 'BRACKET WELD', date('now', '-6 years', '-11 months'), 3),

-- BLACK TOWER - CSCN
('CN001', 'Wang Wei', 'CSCN', 'BLACK TOWER', 'CUTTING', date('now', '-4 years', '-2 months'), 2),
('CN002', 'Li Ming', 'CSCN', 'BLACK TOWER', 'BEVELING', date('now', '-5 years', '-10 months'), 3),
('CN003', 'Zhang San', 'CSCN', 'BLACK TOWER', 'BENDING', date('now', '-3 years', '-11 months'), 2),
('CN004', 'Liu Si', 'CSCN', 'BLACK TOWER', 'LS WELDING', date('now', '-7 years', '-6 months'), 4),
('CN005', 'Chen Wu', 'CSCN', 'BLACK TOWER', 'FIT UP', date('now', '-6 years', '-2 months'), 3),
('CN006', 'Yang Liu', 'CSCN', 'BLACK TOWER', 'CS WELDING', date('now', '-4 years', '-7 months'), 2),
('CN007', 'Zhao Qi', 'CSCN', 'BLACK TOWER', 'VTMT', date('now', '-5 years', '-4 months'), 3),
('CN008', 'Sun Ba', 'CSCN', 'BLACK TOWER', 'BRACKET FU', date('now', '-3 years', '-1 month'), 1),
('CN009', 'Zhou Jiu', 'CSCN', 'BLACK TOWER', 'BRACKET WELD', date('now', '-6 years', '-10 months'), 3),
('CN010', 'Wu Shi', 'CSCN', 'BLACK TOWER', 'UT REPAIR', date('now', '-7 years', '-11 months'), 4),

-- BLACK TOWER - CSTW
('TW001', 'Lin Yu', 'CSTW', 'BLACK TOWER', 'CUTTING', date('now', '-3 years', '-8 months'), 2),
('TW002', 'Chen Hui', 'CSTW', 'BLACK TOWER', 'BEVELING', date('now', '-4 years', '-5 months'), 2),
('TW003', 'Huang Jie', 'CSTW', 'BLACK TOWER', 'BENDING', date('now', '-5 years', '-7 months'), 3),
('TW004', 'Wu Ming', 'CSTW', 'BLACK TOWER', 'LS WELDING', date('now', '-6 years', '-1 month'), 3),
('TW005', 'Zheng Li', 'CSTW', 'BLACK TOWER', 'FIT UP', date('now', '-7 years', '-4 months'), 4),
('TW006', 'Cai Qiang', 'CSTW', 'BLACK TOWER', 'CS WELDING', date('now', '-2 years', '-10 months'), 1),
('TW007', 'Xu Fang', 'CSTW', 'BLACK TOWER', 'VTMT', date('now', '-4 years', '-11 months'), 2),
('TW008', 'Luo Jun', 'CSTW', 'BLACK TOWER', 'BRACKET FU', date('now', '-5 years', '-6 months'), 3),
('TW009', 'Xie Bin', 'CSTW', 'BLACK TOWER', 'BRACKET WELD', date('now', '-6 years', '-8 months'), 3),
('TW010', 'Guo Xin', 'CSTW', 'BLACK TOWER', 'DOOR FRAME FU', date('now', '-8 years', '-2 months'), 4),

-- WHITE TOWER - CSVN
('VN011', 'Do Van K', 'CSVN', 'WHITE TOWER', 'BLASTING', date('now', '-3 years', '-2 months'), 1),
('VN012', 'Bui Thi L', 'CSVN', 'WHITE TOWER', 'BLASTING', date('now', '-4 years', '-8 months'), 2),
('VN013', 'Vo Van M', 'CSVN', 'WHITE TOWER', 'METALIZING', date('now', '-5 years', '-11 months'), 3),
('VN014', 'Dang Thi N', 'CSVN', 'WHITE TOWER', 'PAINTING', date('now', '-6 years', '-5 months'), 3),
('VN015', 'Ngo Van O', 'CSVN', 'WHITE TOWER', 'PAINTING', date('now', '-7 years', '-10 months'), 4),

-- WHITE TOWER - CSCN
('CN011', 'Gao Ren', 'CSCN', 'WHITE TOWER', 'BLASTING', date('now', '-4 years', '-1 month'), 2),
('CN012', 'Qian Shen', 'CSCN', 'WHITE TOWER', 'METALIZING', date('now', '-5 years', '-6 months'), 3),
('CN013', 'Kong Tang', 'CSCN', 'WHITE TOWER', 'PAINTING', date('now', '-6 years', '-11 months'), 3),
('CN014', 'Cao Wen', 'CSCN', 'WHITE TOWER', 'PAINTING', date('now', '-8 years', '-1 month'), 4),

-- WHITE TOWER - CSTW
('TW011', 'Jiang Hao', 'CSTW', 'WHITE TOWER', 'BLASTING', date('now', '-3 years', '-5 months'), 1),
('TW012', 'Song Kai', 'CSTW', 'WHITE TOWER', 'METALIZING', date('now', '-5 years', '-1 month'), 2),
('TW013', 'Tang Lei', 'CSTW', 'WHITE TOWER', 'PAINTING', date('now', '-6 years', '-4 months'), 3),
('TW014', 'Han Peng', 'CSTW', 'WHITE TOWER', 'PAINTING', date('now', '-7 years', '-7 months'), 4),

-- INTERNAL MOUNTING - CSVN
('VN016', 'Duong Van P', 'CSVN', 'INTERNAL MOUNTING', 'ASSEMBLY', date('now', '-4 years', '-4 months'), 2),
('VN017', 'Truong Thi Q', 'CSVN', 'INTERNAL MOUNTING', 'ASSEMBLY', date('now', '-5 years', '-10 months'), 3),
('VN018', 'Ha Van R', 'CSVN', 'INTERNAL MOUNTING', 'IM CABLE', date('now', '-6 years', '-6 months'), 3),
('VN019', 'Mai Thi S', 'CSVN', 'INTERNAL MOUNTING', 'IM CABLE', date('now', '-7 years', '-11 months'), 4),

-- INTERNAL MOUNTING - CSCN
('CN015', 'Ding Xue', 'CSCN', 'INTERNAL MOUNTING', 'ASSEMBLY', date('now', '-4 years', '-7 months'), 2),
('CN016', 'Fan Yu', 'CSCN', 'INTERNAL MOUNTING', 'IM CABLE', date('now', '-5 years', '-11 months'), 3),
('CN017', 'Fu Zhao', 'CSCN', 'INTERNAL MOUNTING', 'ASSEMBLY', date('now', '-7 years', '-2 months'), 4),

-- INTERNAL MOUNTING - CSTW
('TW015', 'Pan Tao', 'CSTW', 'INTERNAL MOUNTING', 'ASSEMBLY', date('now', '-3 years', '-11 months'), 2),
('TW016', 'Zhu Wei', 'CSTW', 'INTERNAL MOUNTING', 'IM CABLE', date('now', '-5 years', '-5 months'), 3),
('TW017', 'Ren Yang', 'CSTW', 'INTERNAL MOUNTING', 'ASSEMBLY', date('now', '-6 years', '-10 months'), 3);

-- Insert supervisor assessment items first (required for assessments)
INSERT INTO supervisor_assessment_items (category, item_name, description) VALUES
('Technical Skills', 'Equipment Operation', 'Ability to operate equipment safely and efficiently'),
('Technical Skills', 'Quality Standards', 'Understanding and adherence to quality standards'),
('Work Attitude', 'Teamwork', 'Collaboration and communication with team members'),
('Work Attitude', 'Punctuality', 'Attendance and time management'),
('Safety', 'Safety Compliance', 'Following safety procedures and regulations');

-- Insert supervisor assessments for the workers
INSERT INTO supervisor_assessments (worker_id, item_id, level, assessed_by, assessment_date, process_id) 
SELECT 
    w.id,
    1 as item_id,  -- Using first item as default
    w.current_level,
    'System' as assessed_by,
    date('now', '-30 days'),
    p.id as process_id
FROM workers w
LEFT JOIN positions p ON UPPER(p.name) = UPPER(w.position)
WHERE w.current_level IS NOT NULL;

-- Insert some written test results
-- Note: This simplified version assumes positions table exists and matches worker positions
INSERT INTO written_test_results (worker_id, process_id, score, passed, test_date)
SELECT 
    w.id,
    p.id,
    CASE 
        WHEN w.current_level = 1 THEN 65 + (abs(random()) % 15)  -- Level 1: 65-80
        WHEN w.current_level = 2 THEN 70 + (abs(random()) % 15)  -- Level 2: 70-85
        WHEN w.current_level = 3 THEN 75 + (abs(random()) % 15)  -- Level 3: 75-90
        WHEN w.current_level = 4 THEN 80 + (abs(random()) % 15)  -- Level 4: 80-95
        ELSE 70
    END as score,
    1 as passed,  -- Most passed
    date('now', '-' || (abs(random()) % 60) || ' days')
FROM workers w
JOIN positions p ON UPPER(p.name) = UPPER(w.position)
WHERE w.current_level IS NOT NULL
AND abs(random()) % 100 < 70  -- 70% of workers took the test
LIMIT 40;  -- Limit to 40 test results for reasonable dataset
