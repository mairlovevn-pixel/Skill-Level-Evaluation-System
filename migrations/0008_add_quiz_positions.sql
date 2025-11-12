-- Add 18 quiz-specific positions
-- These are the exact positions needed for Written Test Quiz Registration

INSERT OR IGNORE INTO positions (name, description, created_at) VALUES 
('CUTTING', 'Cutting operations', CURRENT_TIMESTAMP),
('BEVELLING', 'Bevelling operations', CURRENT_TIMESTAMP),
('BENDING', 'Bending operations', CURRENT_TIMESTAMP),
('LS WELDING', 'LS Welding operations', CURRENT_TIMESTAMP),
('FIT UP', 'Fit up operations', CURRENT_TIMESTAMP),
('CS WELDING', 'CS Welding operations', CURRENT_TIMESTAMP),
('VTMT', 'VTMT operations', CURRENT_TIMESTAMP),
('BRACKET FU', 'Bracket FU operations', CURRENT_TIMESTAMP),
('BRACKET WELD', 'Bracket welding operations', CURRENT_TIMESTAMP),
('UT REPAIR', 'UT repair operations', CURRENT_TIMESTAMP),
('DOOR FRAME FU', 'Door frame FU operations', CURRENT_TIMESTAMP),
('DOOR FRAME WELD', 'Door frame welding operations', CURRENT_TIMESTAMP),
('FLATNESS', 'Flatness operations', CURRENT_TIMESTAMP),
('BLASTING', 'Blasting operations', CURRENT_TIMESTAMP),
('METALIZING', 'Metalizing operations', CURRENT_TIMESTAMP);
-- Note: PAINTING, ASSEMBLY, IM CABLE already exist in database
