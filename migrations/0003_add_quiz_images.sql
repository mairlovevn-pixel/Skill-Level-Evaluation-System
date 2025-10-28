-- Add image URL columns to written_test_quizzes table
ALTER TABLE written_test_quizzes ADD COLUMN question_image_url TEXT;
ALTER TABLE written_test_quizzes ADD COLUMN option_a_image_url TEXT;
ALTER TABLE written_test_quizzes ADD COLUMN option_b_image_url TEXT;
ALTER TABLE written_test_quizzes ADD COLUMN option_c_image_url TEXT;
ALTER TABLE written_test_quizzes ADD COLUMN option_d_image_url TEXT;
