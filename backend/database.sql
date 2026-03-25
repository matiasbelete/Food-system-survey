-- SCF-EAT Survey Platform Database Schema
-- Complete schema with 12 tables as specified in requirements

CREATE DATABASE IF NOT EXISTS scf_eat_survey;
USE scf_eat_survey;

-- 1. surveys - Main survey record
CREATE TABLE surveys (
    survey_id INT AUTO_INCREMENT PRIMARY KEY,
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assessment_round INT CHECK (assessment_round IN (1, 2, 3, 4)),
    semester VARCHAR(20) CHECK (semester IN ('Fall', 'Winter', 'Summer')),
    is_complete BOOLEAN DEFAULT FALSE,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    submitted_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_submission_date (submission_date),
    INDEX idx_semester (semester),
    INDEX idx_assessment_round (assessment_round),
    INDEX idx_is_complete (is_complete)
);

-- 2. audit_information - Auditor & audit details
CREATE TABLE audit_information (
    audit_id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    auditor_name VARCHAR(255) NOT NULL,
    auditor_affiliation VARCHAR(100),
    auditor_email VARCHAR(255),
    audit_date DATE,
    audit_start_time TIME,
    audit_end_time TIME,
    received_training BOOLEAN,
    training_type_online BOOLEAN DEFAULT FALSE,
    training_type_in_person BOOLEAN DEFAULT FALSE,
    training_type_self_guided BOOLEAN DEFAULT FALSE,
    primary_dining_time VARCHAR(50),
    info_source_online_docs BOOLEAN DEFAULT FALSE,
    info_source_site_visit BOOLEAN DEFAULT FALSE,
    info_source_online_comms BOOLEAN DEFAULT FALSE,
    info_source_other VARCHAR(255),
    
    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id)
);

-- 3. campus_information - Campus details
CREATE TABLE campus_information (
    campus_id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    university_name VARCHAR(255),
    city VARCHAR(100),
    province_state VARCHAR(100),
    institution_type VARCHAR(20) CHECK (institution_type IN ('Public', 'Private')),
    campus_setting VARCHAR(50) CHECK (campus_setting IN ('Campus-based/self-contained', 'Urban/city-center', 'Mixed/distributed')),
    provider_type_university_operated BOOLEAN DEFAULT FALSE,
    provider_type_franchised BOOLEAN DEFAULT FALSE,
    provider_type_grab_and_go BOOLEAN DEFAULT FALSE,
    provider_type_vending BOOLEAN DEFAULT FALSE,
    provider_type_independent BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id)
);

-- 4. context_metrics - Venue, headcount, sales data
CREATE TABLE context_metrics (
    context_id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    
    -- Venue Related
    total_food_providers INT NOT NULL,
    university_operated_units INT,
    venues_with_nutritious_items INT,
    venues_with_vegan_veg INT,
    venues_with_religious_inclusive INT,
    venues_with_dietary_restrictions INT,
    venues_with_cultural_inclusive INT,
    venues_open_24_7 INT,
    venues_open_until_9pm INT,
    venues_open_year_round INT,
    
    -- Headcount Related
    total_students_enrolled INT,
    undergraduate_students INT,
    graduate_students INT,
    students_with_meal_plan INT,
    total_employees INT,
    part_time_employees INT,
    full_time_employees INT,
    total_food_service_employees INT,
    student_food_service_workers INT,
    part_time_food_service INT,
    full_time_food_service INT,
    
    -- Sales Related (in USD)
    annual_sales_total DECIMAL(15,2),
    annual_sales_franchise DECIMAL(15,2),
    annual_sales_grab_and_go DECIMAL(15,2),
    annual_sales_vending DECIMAL(15,2),
    
    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id)
);

-- 5. checklist_responses - 14 checklist questions
CREATE TABLE checklist_responses (
    checklist_id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    
    -- 14 checklist questions (0 = No, 1 = Yes)
    q1_food_sustainability_strategy BOOLEAN,
    q2_named_person_committee BOOLEAN,
    q3_dedicated_budget BOOLEAN,
    q4_dedicated_leadership_staffing BOOLEAN,
    q5_dedicated_budget_line BOOLEAN,
    q6_metrics_tracked_reported BOOLEAN,
    q7_require_nutritious_item BOOLEAN,
    q8_require_basic_sustainability BOOLEAN,
    q9_stakeholder_input_channel BOOLEAN,
    q10_curricular_programs BOOLEAN,
    q11_student_innovation_programs BOOLEAN,
    q12_food_security_programs BOOLEAN,
    q13_food_bank_eligibility_open BOOLEAN,
    q13_food_bank_eligibility_limited BOOLEAN,
    q13_food_bank_eligibility_frequency_caps BOOLEAN,
    q13_food_bank_eligibility_unclear BOOLEAN,
    q14_labor_ethical_standards BOOLEAN,
    
    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id)
);

-- 6. governance_indicators - 17 indicators rated 0-4
CREATE TABLE governance_indicators (
    governance_id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    
    -- Leadership indicators (8 questions, 0-4 rating)
    leadership_strategy_comprehensiveness INT CHECK (leadership_strategy_comprehensiveness BETWEEN 0 AND 4),
    leadership_strategy_inclusion INT CHECK (leadership_strategy_inclusion BETWEEN 0 AND 4),
    leadership_support_extent INT CHECK (leadership_support_extent BETWEEN 0 AND 4),
    leadership_local_procurement INT CHECK (leadership_local_procurement BETWEEN 0 AND 4),
    leadership_waste_reduction INT CHECK (leadership_waste_reduction BETWEEN 0 AND 4),
    leadership_energy_water_conservation INT CHECK (leadership_energy_water_conservation BETWEEN 0 AND 4),
    leadership_culture_promotion INT CHECK (leadership_culture_promotion BETWEEN 0 AND 4),
    leadership_nutritious_item_requirement INT CHECK (leadership_nutritious_item_requirement BETWEEN 0 AND 4),
    
    -- Policies indicators (9 questions, 0-4 rating)
    policy_cross_unit_coordination INT CHECK (policy_cross_unit_coordination BETWEEN 0 AND 4),
    policy_sustainable_diet_principles INT CHECK (policy_sustainable_diet_principles BETWEEN 0 AND 4),
    policy_environmental_alignment INT CHECK (policy_environmental_alignment BETWEEN 0 AND 4),
    policy_ethical_fair_trade INT CHECK (policy_ethical_fair_trade BETWEEN 0 AND 4),
    policy_environmental_sustainability INT CHECK (policy_environmental_sustainability BETWEEN 0 AND 4),
    policy_nutritional_labeling INT CHECK (policy_nutritional_labeling BETWEEN 0 AND 4),
    policy_direct_sales INT CHECK (policy_direct_sales BETWEEN 0 AND 4),
    policy_waste_management INT CHECK (policy_waste_management BETWEEN 0 AND 4),
    policy_packaging_recycling INT CHECK (policy_packaging_recycling BETWEEN 0 AND 4),
    
    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id)
);

-- 7. wrap_up_responses - Methodology and constraints
CREATE TABLE wrap_up_responses (
    wrap_up_id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    
    -- Information sources percentages (should sum to 100)
    info_source_publicly_available INT CHECK (info_source_publicly_available BETWEEN 0 AND 100),
    info_source_internal_docs INT CHECK (info_source_internal_docs BETWEEN 0 AND 100),
    info_source_direct_observation INT CHECK (info_source_direct_observation BETWEEN 0 AND 100),
    info_source_staff_consultation INT CHECK (info_source_staff_consultation BETWEEN 0 AND 100),
    info_source_not_accessible INT CHECK (info_source_not_accessible BETWEEN 0 AND 100),
    
    -- Confidence level (0-4)
    confidence_level INT CHECK (confidence_level BETWEEN 0 AND 4),
    
    -- Constraint flags
    constraint_access_internal_docs BOOLEAN DEFAULT FALSE,
    constraint_access_hr_labor BOOLEAN DEFAULT FALSE,
    constraint_time_capacity BOOLEAN DEFAULT FALSE,
    constraint_multiple_departments BOOLEAN DEFAULT FALSE,
    constraint_seasonal_limits BOOLEAN DEFAULT FALSE,
    constraint_vendor_data BOOLEAN DEFAULT FALSE,
    constraint_unclear_wording BOOLEAN DEFAULT FALSE,
    constraint_other VARCHAR(255),
    
    -- Factor flags
    factor_urban_off_campus BOOLEAN DEFAULT FALSE,
    factor_vendor_operated BOOLEAN DEFAULT FALSE,
    factor_university_operated BOOLEAN DEFAULT FALSE,
    factor_low_activity_term BOOLEAN DEFAULT FALSE,
    factor_limited_day_part BOOLEAN DEFAULT FALSE,
    factor_other VARCHAR(255),
    
    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE,
    INDEX idx_survey_id (survey_id)
);

-- 8. survey_scores - Calculated scores
CREATE TABLE survey_scores (
    score_id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    
    -- Raw scores (0-100)
    checklists_raw_score DECIMAL(5,2),
    governance_raw_score DECIMAL(5,2),
    university_level_raw_score DECIMAL(5,2),
    
    -- Overall weighted score (0-100)
    overall_score DECIMAL(5,2),
    
    -- Performance rating
    performance_rating ENUM('Excellent', 'Good', 'Fair', 'Needs Improvement', 'Poor'),
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE,
    UNIQUE KEY unique_survey_score (survey_id),
    INDEX idx_survey_id (survey_id),
    INDEX idx_performance_rating (performance_rating)
);

-- 9. question_categories - For extensibility
CREATE TABLE question_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    weight_percentage DECIMAL(5,2),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_category_code (category_code),
    INDEX idx_display_order (display_order),
    INDEX idx_is_active (is_active)
);

-- 10. question_groups - Sub-categories
CREATE TABLE question_groups (
    group_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    group_code VARCHAR(50) NOT NULL,
    group_name VARCHAR(200) NOT NULL,
    description TEXT,
    weight_in_category DECIMAL(5,2),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES question_categories(category_id) ON DELETE CASCADE,
    UNIQUE KEY unique_category_group (category_id, group_code),
    INDEX idx_category_id (category_id),
    INDEX idx_display_order (display_order)
);

-- 11. questions - Dynamic question management
CREATE TABLE questions (
    question_id INT AUTO_INCREMENT PRIMARY KEY,
    question_code VARCHAR(50) UNIQUE NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(30) NOT NULL,
    category_id INT,
    group_id INT,
    description TEXT,
    placeholder TEXT,
    tooltip TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Validation rules
    validation_regex VARCHAR(255),
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    min_length INT,
    max_length INT,
    
    -- Dependencies
    depends_on_question_id INT,
    depends_on_value VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES question_categories(category_id),
    FOREIGN KEY (group_id) REFERENCES question_groups(group_id),
    FOREIGN KEY (depends_on_question_id) REFERENCES questions(question_id),
    INDEX idx_category_id (category_id),
    INDEX idx_group_id (group_id),
    INDEX idx_question_code (question_code),
    INDEX idx_display_order (display_order),
    INDEX idx_is_active (is_active)
);

-- 12. question_options - Dropdown/checkbox options
CREATE TABLE question_options (
    option_id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_value VARCHAR(100) NOT NULL,
    option_label VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    additional_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE,
    INDEX idx_question_id (question_id),
    INDEX idx_display_order (display_order),
    INDEX idx_is_active (is_active)
);

-- Insert default question categories
INSERT INTO question_categories (category_code, category_name, weight_percentage, display_order, description) VALUES
('AUDIT', 'Auditor & Audit Information', NULL, 1, 'Section A: Auditor and audit information'),
('CAMPUS', 'Campus Information', NULL, 2, 'Section B: Campus details'),
('CONTEXT', 'Context Metrics', NULL, 3, 'Section C: Venue, headcount, and sales data'),
('CHECKLIST', 'Checklist', 30.00, 4, 'Section D: 14 checklist questions'),
('GOVERNANCE', 'Governance Indicators', 35.00, 5, 'Section E: 17 governance indicators'),
('WRAP_UP', 'Wrap-up Questions', NULL, 6, 'Section F: Methodology and constraints');

-- Insert default question groups
INSERT INTO question_groups (category_id, group_code, group_name, weight_in_category, display_order, description) VALUES
-- Audit groups
((SELECT category_id FROM question_categories WHERE category_code = 'AUDIT'), 'AUDITOR_INFO', 'Auditor Information', NULL, 1, 'Basic auditor details'),
((SELECT category_id FROM question_categories WHERE category_code = 'AUDIT'), 'AUDIT_DETAILS', 'Audit Details', NULL, 2, 'Audit timing and methodology'),

-- Context groups  
((SELECT category_id FROM question_categories WHERE category_code = 'CONTEXT'), 'VENUE_METRICS', 'Venue Metrics', NULL, 1, 'Food provider and venue data'),
((SELECT category_id FROM question_categories WHERE category_code = 'CONTEXT'), 'HEADCOUNT_METRICS', 'Headcount Metrics', NULL, 2, 'Student and employee data'),
((SELECT category_id FROM question_categories WHERE category_code = 'CONTEXT'), 'SALES_METRICS', 'Sales Metrics', NULL, 3, 'Financial data'),

-- Governance groups
((SELECT category_id FROM question_categories WHERE category_code = 'GOVERNANCE'), 'LEADERSHIP', 'Leadership Indicators', 42.86, 1, 'Leadership and strategy indicators'),
((SELECT category_id FROM question_categories WHERE category_code = 'GOVERNANCE'), 'POLICIES', 'Policies Indicators', 57.14, 2, 'Policy and procurement indicators'),

-- Checklist group
((SELECT category_id FROM question_categories WHERE category_code = 'CHECKLIST'), 'GOVERNANCE_MEASURES', 'Governance Measures', 100.00, 1, '14 governance checklist questions'),

-- Wrap-up groups
((SELECT category_id FROM question_categories WHERE category_code = 'WRAP_UP'), 'METHODOLOGY', 'Methodology', NULL, 1, 'Information sources and confidence'),
((SELECT category_id FROM question_categories WHERE category_code = 'WRAP_UP'), 'CONSTRAINTS', 'Constraints', NULL, 2, 'Assessment constraints and factors');

-- Create views for easier data access

-- View for complete survey data
CREATE VIEW survey_complete_data AS
SELECT 
    s.survey_id,
    s.submission_date,
    s.assessment_round,
    s.semester,
    s.is_complete,
    s.completion_percentage,
    s.submitted_by,
    
    -- Audit information
    ai.auditor_name,
    ai.auditor_affiliation,
    ai.auditor_email,
    ai.audit_date,
    ai.audit_start_time,
    ai.audit_end_time,
    ai.received_training,
    ai.training_type_online,
    ai.training_type_in_person,
    ai.primary_dining_time,
    
    -- Campus information
    ci.university_name,
    ci.city,
    ci.province_state,
    ci.institution_type,
    ci.campus_setting,
    ci.provider_type_university_operated,
    ci.provider_type_franchised,
    ci.provider_type_grab_and_go,
    ci.provider_type_vending,
    ci.provider_type_independent,
    
    -- Context metrics
    cm.total_food_providers,
    cm.university_operated_units,
    cm.venues_with_nutritious_items,
    cm.venues_with_vegan_veg,
    cm.total_students_enrolled,
    cm.undergraduate_students,
    cm.graduate_students,
    cm.annual_sales_total,
    
    -- Scores
    sc.checklists_raw_score,
    sc.governance_raw_score,
    sc.university_level_raw_score,
    sc.overall_score,
    sc.performance_rating
    
FROM surveys s
LEFT JOIN audit_information ai ON s.survey_id = ai.survey_id
LEFT JOIN campus_information ci ON s.survey_id = ci.survey_id
LEFT JOIN context_metrics cm ON s.survey_id = cm.survey_id
LEFT JOIN survey_scores sc ON s.survey_id = sc.survey_id;

-- Create stored procedure for score calculation
DELIMITER //

CREATE PROCEDURE CalculateSurveyScores(IN survey_id_param INT)
BEGIN
    DECLARE checklist_score DECIMAL(5,2) DEFAULT 0;
    DECLARE governance_score DECIMAL(5,2) DEFAULT 0;
    DECLARE university_level_score DECIMAL(5,2) DEFAULT 0;
    DECLARE overall_score DECIMAL(5,2) DEFAULT 0;
    DECLARE performance_rating VARCHAR(20);
    
    -- Calculate checklist score (13 questions, excluding Q13 food bank eligibility)
    SELECT 
        (SUM(
            CASE WHEN q1_food_sustainability_strategy THEN 1 ELSE 0 END +
            CASE WHEN q2_named_person_committee THEN 1 ELSE 0 END +
            CASE WHEN q3_dedicated_budget THEN 1 ELSE 0 END +
            CASE WHEN q4_dedicated_leadership_staffing THEN 1 ELSE 0 END +
            CASE WHEN q5_dedicated_budget_line THEN 1 ELSE 0 END +
            CASE WHEN q6_metrics_tracked_reported THEN 1 ELSE 0 END +
            CASE WHEN q7_require_nutritious_item THEN 1 ELSE 0 END +
            CASE WHEN q8_require_basic_sustainability THEN 1 ELSE 0 END +
            CASE WHEN q9_stakeholder_input_channel THEN 1 ELSE 0 END +
            CASE WHEN q10_curricular_programs THEN 1 ELSE 0 END +
            CASE WHEN q11_student_innovation_programs THEN 1 ELSE 0 END +
            CASE WHEN q12_food_security_programs THEN 1 ELSE 0 END +
            CASE WHEN q14_labor_ethical_standards THEN 1 ELSE 0 END
        ) / 13.0) * 100.0
    INTO checklist_score
    FROM checklist_responses 
    WHERE survey_id = survey_id_param;
    
    -- Calculate governance score (17 indicators)
    SELECT 
        (SUM(
            leadership_strategy_comprehensiveness +
            leadership_strategy_inclusion +
            leadership_support_extent +
            leadership_local_procurement +
            leadership_waste_reduction +
            leadership_energy_water_conservation +
            leadership_culture_promotion +
            leadership_nutritious_item_requirement +
            policy_cross_unit_coordination +
            policy_sustainable_diet_principles +
            policy_environmental_alignment +
            policy_ethical_fair_trade +
            policy_environmental_sustainability +
            policy_nutritional_labeling +
            policy_direct_sales +
            policy_waste_management +
            policy_packaging_recycling
        ) / 68.0) * 100.0
    INTO governance_score
    FROM governance_indicators 
    WHERE survey_id = survey_id_param;
    
    -- Calculate university level score (8 ratios)
    SELECT 
        (SUM(
            (venues_with_nutritious_items / total_food_providers) * 4 +
            (venues_with_vegan_veg / total_food_providers) * 4 +
            (venues_with_religious_inclusive / total_food_providers) * 4 +
            (venues_with_dietary_restrictions / total_food_providers) * 4 +
            (venues_with_cultural_inclusive / total_food_providers) * 4 +
            (venues_open_24_7 / total_food_providers) * 4 +
            (venues_open_until_9pm / total_food_providers) * 4 +
            (venues_open_year_round / total_food_providers) * 4
        ) / 8.0) * 100.0
    INTO university_level_score
    FROM context_metrics 
    WHERE survey_id = survey_id_param;
    
    -- Calculate overall weighted score
    SET overall_score = (checklist_score * 0.30) + (governance_score * 0.35) + (university_level_score * 0.35);
    
    -- Determine performance rating
    CASE 
        WHEN overall_score >= 80 THEN SET performance_rating = 'Excellent';
        WHEN overall_score >= 65 THEN SET performance_rating = 'Good';
        WHEN overall_score >= 50 THEN SET performance_rating = 'Fair';
        WHEN overall_score >= 35 THEN SET performance_rating = 'Needs Improvement';
        ELSE SET performance_rating = 'Poor';
    END CASE;
    
    -- Insert or update scores
    INSERT INTO survey_scores (
        survey_id, checklists_raw_score, governance_raw_score, 
        university_level_raw_score, overall_score, performance_rating
    ) VALUES (
        survey_id_param, checklist_score, governance_score, 
        university_level_score, overall_score, performance_rating
    )
    ON DUPLICATE KEY UPDATE
        checklists_raw_score = checklist_score,
        governance_raw_score = governance_score,
        university_level_raw_score = university_level_score,
        overall_score = overall_score,
        performance_rating = performance_rating,
        calculated_at = CURRENT_TIMESTAMP;
        
    -- Update survey completion status
    UPDATE surveys 
    SET is_complete = TRUE, completion_percentage = 100.00
    WHERE survey_id = survey_id_param;
END //

DELIMITER ;

-- Create indexes for performance
CREATE INDEX idx_survey_scores_overall ON survey_scores(overall_score);
CREATE INDEX idx_survey_scores_rating ON survey_scores(performance_rating);
CREATE INDEX idx_audit_information_email ON audit_information(auditor_email);
CREATE INDEX idx_campus_information_university ON campus_information(university_name);

-- Grant necessary permissions (uncomment if needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON scf_eat_survey.* TO 'your_username'@'localhost';

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'auditor') NOT NULL DEFAULT 'auditor',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Survey drafts for save-and-resume
CREATE TABLE IF NOT EXISTS survey_drafts (
    draft_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    form_data JSON NOT NULL,
    current_section INT DEFAULT 1,
    last_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_draft (user_id)
);

-- Default admin account (password: admin123)
INSERT IGNORE INTO users (name, email, password, role) VALUES
('Admin', 'admin@scfeat.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('Manager', 'manager@scfeat.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager'),
('Auditor', 'auditor@scfeat.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'auditor');


-- Survey Form Templates Management
CREATE TABLE IF NOT EXISTS survey_forms (
    form_id INT AUTO_INCREMENT PRIMARY KEY,
    form_name VARCHAR(255) NOT NULL,
    form_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    INDEX idx_form_code (form_code),
    INDEX idx_is_active (is_active),
    INDEX idx_is_default (is_default)
);

-- Junction table for form-question relationships
CREATE TABLE IF NOT EXISTS form_questions (
    form_question_id INT AUTO_INCREMENT PRIMARY KEY,
    form_id INT NOT NULL,
    question_id INT NOT NULL,
    section_number INT DEFAULT 1,
    display_order INT DEFAULT 0,
    is_required_override BOOLEAN,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (form_id) REFERENCES survey_forms(form_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE,
    UNIQUE KEY unique_form_question (form_id, question_id),
    INDEX idx_form_id (form_id),
    INDEX idx_question_id (question_id),
    INDEX idx_section_number (section_number),
    INDEX idx_display_order (display_order)
);

-- Insert default survey form
INSERT INTO survey_forms (form_name, form_code, description, is_active, is_default, created_by) VALUES
('SCF-EAT Default Survey', 'SCF_EAT_V1', 'Default comprehensive food system survey form', TRUE, TRUE, 1);
