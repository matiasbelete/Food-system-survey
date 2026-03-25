const express = require('express');
const mysql = require('mysql2/promise');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Session setup — runs before routes
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'scf_eat_survey',
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000,
    createDatabaseTable: true
});

app.use(session({
    key: 'scfeat_session',
    secret: process.env.SESSION_SECRET || 'scfeat_session_secret_2024',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 86400000 }
}));

// Auth middleware — validates JWT AND checks active session
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'scfeat_secret_key');
        if (req.session && req.session.userId && req.session.userId !== decoded.user_id) {
            return res.status(401).json({ error: 'Session mismatch' });
        }
        req.user = decoded;
        next();
    } catch { res.status(403).json({ error: 'Invalid or expired token' }); }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
};

app.use(express.json({ 
    limit: '10mb'
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb'
}));
app.use(express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const upload = multer({ 
    dest: process.env.UPLOAD_PATH || './uploads',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'scf_eat_survey',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let db;

// Initialize database connection
async function initDB() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL database');
        
        // Create tables if they don't exist
        const schemaPath = path.join(__dirname, 'database.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            // Split SQL commands and execute them one by one
            const commands = schema.split(';').filter(cmd => cmd.trim().length > 0);
            for (const command of commands) {
                try {
                    await db.query(command.trim());
                } catch (error) {
                    // Ignore database already exists errors
                    if (!error.message.includes('already exists')) {
                        console.error('Schema execution error:', error.message);
                    }
                }
            }
            console.log('Database schema initialized');
        }
        
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

// Calculate scores for different categories
function calculateCategoryScores(formData) {
  const scores = {
    checklists: 0,
    leadership: 0,
    policies: 0,
    overall: 0
  };

  // Calculate Checklist Score (14 questions, each worth ~7.14 points)
  const checklistQuestions = [
    'q1_food_sustainability_strategy',
    'q2_named_person_committee', 
    'q3_dedicated_budget',
    'q4_dedicated_leadership_staffing',
    'q5_dedicated_budget_line',
    'q6_metrics_tracked_reported',
    'q7_require_nutritious_item',
    'q8_require_basic_sustainability',
    'q9_stakeholder_input_channel',
    'q10_curricular_programs',
    'q11_student_innovation_programs',
    'q12_food_security_programs',
    'q14_labor_ethical_standards'
  ];

  let checklistScore = 0;
  checklistQuestions.forEach(question => {
    if (formData[question] === true) {
      checklistScore += 1;
    }
  });
  
  // Add points for food bank eligibility options
  if (formData.q13_food_bank_eligibility_open) checklistScore += 1;
  if (formData.q13_food_bank_eligibility_limited) checklistScore += 0.5;
  if (formData.q13_food_bank_eligibility_frequency_caps) checklistScore += 0.5;
  if (formData.q13_food_bank_eligibility_unclear) checklistScore -= 0.5;

  scores.checklists = Math.max(0, Math.min(100, (checklistScore / 15) * 100));

  // Calculate Leadership Score (8 questions, each worth 12.5 points)
  const leadershipQuestions = [
    'leadership_strategy_comprehensiveness',
    'leadership_strategy_inclusion',
    'leadership_support_extent',
    'leadership_local_procurement',
    'leadership_waste_reduction',
    'leadership_energy_water_conservation',
    'leadership_culture_promotion',
    'leadership_nutritious_item_requirement'
  ];

  let leadershipScore = 0;
  leadershipQuestions.forEach(question => {
    const rating = parseInt(formData[question]) || 0;
    leadershipScore += rating;
  });

  scores.leadership = Math.max(0, Math.min(100, (leadershipScore / 32) * 100));

  // Calculate Policies Score (9 questions, each worth ~11.11 points)
  const policyQuestions = [
    'policy_cross_unit_coordination',
    'policy_sustainable_diet_principles',
    'policy_environmental_alignment',
    'policy_ethical_fair_trade',
    'policy_environmental_sustainability',
    'policy_nutritional_labeling',
    'policy_direct_sales',
    'policy_waste_management',
    'policy_packaging_recycling'
  ];

  let policyScore = 0;
  policyQuestions.forEach(question => {
    const rating = parseInt(formData[question]) || 0;
    policyScore += rating;
  });

  scores.policies = Math.max(0, Math.min(100, (policyScore / 36) * 100));

  // Calculate Overall Score (weighted average)
  scores.overall = (scores.checklists * 0.4) + (scores.leadership * 0.3) + (scores.policies * 0.3);

  return scores;
}

// Calculate performance rating based on score
function calculatePerformanceRating(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Needs Improvement';
  return 'Poor';
}

// Routes

// Survey Management Endpoints

// GET all surveys with pagination and filtering
app.get('/api/surveys', async (req, res) => {
    try {
        const {
            page = 1, limit = 500,
            semester, assessment_round, campus_setting,
            province_state, institution_type, performance_rating,
            date_from, date_to, score_min, score_max
        } = req.query;
        const offset = (page - 1) * limit;

        const buildWhere = (params) => {
            let w = 'WHERE 1=1';
            if (semester)          { w += ' AND s.semester = ?';              params.push(semester); }
            if (assessment_round)  { w += ' AND s.assessment_round = ?';      params.push(assessment_round); }
            if (campus_setting)    { w += ' AND ci.campus_setting = ?';       params.push(campus_setting); }
            if (province_state)    { w += ' AND ci.province_state = ?';       params.push(province_state); }
            if (institution_type)  { w += ' AND ci.institution_type = ?';     params.push(institution_type); }
            if (performance_rating){ w += ' AND sc.performance_rating = ?';   params.push(performance_rating); }
            if (date_from)         { w += ' AND s.submission_date >= ?';      params.push(date_from); }
            if (date_to)           { w += ' AND s.submission_date <= ?';      params.push(date_to + ' 23:59:59'); }
            if (score_min)         { w += ' AND sc.overall_score >= ?';       params.push(parseFloat(score_min)); }
            if (score_max)         { w += ' AND sc.overall_score <= ?';       params.push(parseFloat(score_max)); }
            return w;
        };

        const dataParams = [];
        const where = buildWhere(dataParams);
        const [surveys] = await db.execute(`
            SELECT s.*, ci.university_name, ci.campus_setting, ci.province_state,
                   ci.institution_type, sc.overall_score, sc.performance_rating
            FROM surveys s
            LEFT JOIN campus_information ci ON s.survey_id = ci.survey_id
            LEFT JOIN survey_scores sc ON s.survey_id = sc.survey_id
            ${where}
            ORDER BY s.submission_date DESC LIMIT ? OFFSET ?
        `, [...dataParams, parseInt(limit), parseInt(offset)]);

        const countParams = [];
        const countWhere = buildWhere(countParams);
        const [countResult] = await db.execute(`
            SELECT COUNT(*) as total FROM surveys s
            LEFT JOIN campus_information ci ON s.survey_id = ci.survey_id
            LEFT JOIN survey_scores sc ON s.survey_id = sc.survey_id
            ${countWhere}
        `, countParams);

        res.json({
            surveys,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(countResult[0].total / limit),
                totalItems: countResult[0].total,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get surveys error:', error);
        res.status(500).json({ error: 'Failed to fetch surveys' });
    }
});

// GET single survey with all related data
app.get('/api/surveys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [survey] = await db.execute(`
            SELECT s.*, ci.*, cm.*, ai.*, cr.*, gi.*, wr.*, sc.*
            FROM surveys s
            LEFT JOIN campus_information ci ON s.survey_id = ci.survey_id
            LEFT JOIN context_metrics cm ON s.survey_id = cm.survey_id
            LEFT JOIN audit_information ai ON s.survey_id = ai.survey_id
            LEFT JOIN checklist_responses cr ON s.survey_id = cr.survey_id
            LEFT JOIN governance_indicators gi ON s.survey_id = gi.survey_id
            LEFT JOIN wrap_up_responses wr ON s.survey_id = wr.survey_id
            LEFT JOIN survey_scores sc ON s.survey_id = sc.survey_id
            WHERE s.survey_id = ?
        `, [id]);
        
        if (survey.length === 0) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        
        res.json(survey[0]);
    } catch (error) {
        console.error('Get survey error:', error);
        res.status(500).json({ error: 'Failed to fetch survey' });
    }
});

// POST create new survey (complete implementation)
app.post('/api/surveys', async (req, res) => {
    try {
        const surveyData = req.body;
        
        // Validation
        const requiredFields = ['auditor_name', 'auditor_email', 'university_name', 'city', 'province_state'];
        for (const field of requiredFields) {
            if (!surveyData[field]) {
                return res.status(400).json({ error: `${field} is required` });
            }
        }
        
        // Duplicate check: same auditor_email + university_name + audit_date
        const [dup] = await db.execute(`
            SELECT s.survey_id FROM surveys s
            JOIN audit_information ai ON s.survey_id = ai.survey_id
            JOIN campus_information ci ON s.survey_id = ci.survey_id
            WHERE ai.auditor_email = ? AND ci.university_name = ? AND DATE(ai.audit_date) = DATE(?)
            LIMIT 1
        `, [surveyData.auditor_email, surveyData.university_name, surveyData.audit_date]);
        if (dup.length > 0) {
            return res.status(409).json({
                error: 'Duplicate submission detected. A survey for this auditor, university, and audit date already exists.',
                existing_survey_id: dup[0].survey_id
            });
        }

        // Start transaction
        await db.beginTransaction();
        
        try {
            // Insert main survey record
            const [surveyResult] = await db.execute(`
                INSERT INTO surveys (assessment_round, semester, submitted_by) 
                VALUES (?, ?, ?)
            `, [
                surveyData.assessment_round || 1,
                surveyData.semester || 'Fall',
                surveyData.submitted_by || surveyData.auditor_name
            ]);
            const surveyId = surveyResult.insertId;
            
            // Insert audit information
            await db.execute(`
                INSERT INTO audit_information (
                    survey_id, auditor_name, auditor_affiliation, auditor_email,
                    audit_date, audit_start_time, audit_end_time, received_training,
                    training_type_online, training_type_in_person, training_type_self_guided,
                    primary_dining_time, info_source_online_docs, info_source_site_visit,
                    info_source_online_comms, info_source_other
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                surveyId, 
                surveyData.auditor_name || null, 
                surveyData.auditor_affiliation || 'Not Specified', 
                surveyData.auditor_email || null,
                surveyData.audit_date || null, 
                surveyData.audit_start_time || null, 
                surveyData.audit_end_time || null, 
                surveyData.received_training || null,
                surveyData.training_type_online || null, 
                surveyData.training_type_in_person || null, 
                surveyData.training_type_self_guided || null,
                surveyData.primary_dining_time || null, 
                surveyData.info_source_online_docs || null, 
                surveyData.info_source_site_visit || null,
                surveyData.info_source_online_comms || null, 
                surveyData.info_source_other || null
            ]);
            
            // Insert campus information
            await db.execute(`
                INSERT INTO campus_information (
                    survey_id, university_name, city, province_state, institution_type, campus_setting,
                    provider_type_university_operated, provider_type_franchised, provider_type_grab_and_go,
                    provider_type_vending, provider_type_independent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                surveyId, 
                surveyData.university_name || null, 
                surveyData.city || null, 
                surveyData.province_state || null,
                surveyData.institution_type || null, 
                surveyData.campus_setting || null,
                surveyData.provider_type_university_operated || null, 
                surveyData.provider_type_franchised || null,
                surveyData.provider_type_grab_and_go || null, 
                surveyData.provider_type_vending || null,
                surveyData.provider_type_independent || null
            ]);
            
            // Insert context metrics
            await db.execute(`
                INSERT INTO context_metrics (
                    survey_id, total_food_providers, university_operated_units,
                    venues_with_nutritious_items, venues_with_vegan_veg, venues_with_religious_inclusive,
                    venues_with_dietary_restrictions, venues_with_cultural_inclusive,
                    venues_open_24_7, venues_open_until_9pm, venues_open_year_round,
                    total_students_enrolled, undergraduate_students, graduate_students,
                    students_with_meal_plan, total_employees, part_time_employees,
                    full_time_employees, total_food_service_employees, student_food_service_workers,
                    part_time_food_service, full_time_food_service,
                    annual_sales_total, annual_sales_franchise, annual_sales_grab_and_go, annual_sales_vending
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                surveyId, 
                surveyData.total_food_providers || null, 
                surveyData.university_operated_units || null,
                surveyData.venues_with_nutritious_items || null, 
                surveyData.venues_with_vegan_veg || null, 
                surveyData.venues_with_religious_inclusive || null,
                surveyData.venues_with_dietary_restrictions || null, 
                surveyData.venues_with_cultural_inclusive || null,
                surveyData.venues_open_24_7 || null, 
                surveyData.venues_open_until_9pm || null, 
                surveyData.venues_open_year_round || null,
                surveyData.total_students_enrolled || null, 
                surveyData.undergraduate_students || null, 
                surveyData.graduate_students || null,
                surveyData.students_with_meal_plan || null, 
                surveyData.total_employees || null, 
                surveyData.part_time_employees || null,
                surveyData.full_time_employees || null, 
                surveyData.total_food_service_employees || null, 
                surveyData.student_food_service_workers || null,
                surveyData.part_time_food_service || null, 
                surveyData.full_time_food_service || null,
                surveyData.annual_sales_total || null, 
                surveyData.annual_sales_franchise || null, 
                surveyData.annual_sales_grab_and_go || null, 
                surveyData.annual_sales_vending || null
            ]);
            
            // Insert checklist responses
            await db.execute(`
                INSERT INTO checklist_responses (
                    survey_id, q1_food_sustainability_strategy, q2_named_person_committee,
                    q3_dedicated_budget, q4_dedicated_leadership_staffing, q5_dedicated_budget_line,
                    q6_metrics_tracked_reported, q7_require_nutritious_item, q8_require_basic_sustainability,
                    q9_stakeholder_input_channel, q10_curricular_programs, q11_student_innovation_programs,
                    q12_food_security_programs, q13_food_bank_eligibility_open, q13_food_bank_eligibility_limited,
                    q13_food_bank_eligibility_frequency_caps, q13_food_bank_eligibility_unclear,
                    q14_labor_ethical_standards
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                surveyId, 
                surveyData.q1_food_sustainability_strategy || null, 
                surveyData.q2_named_person_committee || null,
                surveyData.q3_dedicated_budget || null, 
                surveyData.q4_dedicated_leadership_staffing || null, 
                surveyData.q5_dedicated_budget_line || null,
                surveyData.q6_metrics_tracked_reported || null, 
                surveyData.q7_require_nutritious_item || null, 
                surveyData.q8_require_basic_sustainability || null,
                surveyData.q9_stakeholder_input_channel || null, 
                surveyData.q10_curricular_programs || null, 
                surveyData.q11_student_innovation_programs || null,
                surveyData.q12_food_security_programs || null, 
                surveyData.q13_food_bank_eligibility_open || null, 
                surveyData.q13_food_bank_eligibility_limited || null,
                surveyData.q13_food_bank_eligibility_frequency_caps || null, 
                surveyData.q13_food_bank_eligibility_unclear || null,
                surveyData.q14_labor_ethical_standards || null
            ]);
            
            // Insert governance indicators
            await db.execute(`
                INSERT INTO governance_indicators (
                    survey_id, leadership_strategy_comprehensiveness, leadership_strategy_inclusion,
                    leadership_support_extent, leadership_local_procurement, leadership_waste_reduction,
                    leadership_energy_water_conservation, leadership_culture_promotion, leadership_nutritious_item_requirement,
                    policy_cross_unit_coordination, policy_sustainable_diet_principles, policy_environmental_alignment,
                    policy_ethical_fair_trade, policy_environmental_sustainability, policy_nutritional_labeling,
                    policy_direct_sales, policy_waste_management, policy_packaging_recycling
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                surveyId, 
                surveyData.leadership_strategy_comprehensiveness || null, 
                surveyData.leadership_strategy_inclusion || null,
                surveyData.leadership_support_extent || null, 
                surveyData.leadership_local_procurement || null, 
                surveyData.leadership_waste_reduction || null,
                surveyData.leadership_energy_water_conservation || null, 
                surveyData.leadership_culture_promotion || null, 
                surveyData.leadership_nutritious_item_requirement || null,
                surveyData.policy_cross_unit_coordination || null, 
                surveyData.policy_sustainable_diet_principles || null, 
                surveyData.policy_environmental_alignment || null,
                surveyData.policy_ethical_fair_trade || null, 
                surveyData.policy_environmental_sustainability || null, 
                surveyData.policy_nutritional_labeling || null,
                surveyData.policy_direct_sales || null, 
                surveyData.policy_waste_management || null, 
                surveyData.policy_packaging_recycling || null
            ]);
            
            // Insert wrap-up responses
            await db.execute(`
                INSERT INTO wrap_up_responses (
                    survey_id, info_source_publicly_available, info_source_internal_docs,
                    info_source_direct_observation, info_source_staff_consultation, info_source_not_accessible,
                    confidence_level, constraint_access_internal_docs, constraint_access_hr_labor,
                    constraint_time_capacity, constraint_multiple_departments, constraint_seasonal_limits,
                    constraint_vendor_data, constraint_unclear_wording, constraint_other,
                    factor_urban_off_campus, factor_vendor_operated, factor_university_operated,
                    factor_low_activity_term, factor_limited_day_part, factor_other
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                surveyId, 
                surveyData.info_source_publicly_available || null, 
                surveyData.info_source_internal_docs || null,
                surveyData.info_source_direct_observation || null, 
                surveyData.info_source_staff_consultation || null, 
                surveyData.info_source_not_accessible || null,
                surveyData.confidence_level || null, 
                surveyData.constraint_access_internal_docs || null, 
                surveyData.constraint_access_hr_labor || null,
                surveyData.constraint_time_capacity || null, 
                surveyData.constraint_multiple_departments || null, 
                surveyData.constraint_seasonal_limits || null,
                surveyData.constraint_vendor_data || null, 
                surveyData.constraint_unclear_wording || null, 
                surveyData.constraint_other || null,
                surveyData.factor_urban_off_campus || null, 
                surveyData.factor_vendor_operated || null, 
                surveyData.factor_university_operated || null,
                surveyData.factor_low_activity_term || null, 
                surveyData.factor_limited_day_part || null, 
                surveyData.factor_other || null
            ]);
            
            // Calculate scores
            const categoryScores = calculateCategoryScores(surveyData);
            const performanceRating = calculatePerformanceRating(categoryScores.overall);
            
            // Insert scores
            await db.execute(`
                INSERT INTO survey_scores (
                    survey_id, checklists_raw_score, governance_raw_score, university_level_raw_score,
                    overall_score, performance_rating
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                surveyId, 
                categoryScores.checklists || 0, 
                categoryScores.leadership || 0, 
                categoryScores.policies || 0,
                categoryScores.overall || 0, 
                performanceRating || 'Poor'
            ]);
            
            // Commit transaction
            await db.commit();
            
            res.status(201).json({ 
                message: 'Survey created successfully',
                survey_id: surveyId 
            });
        } catch (error) {
            await db.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Create survey error:', error);
        res.status(500).json({ error: 'Failed to create survey: ' + error.message });
    }
});

// PUT update survey
app.put('/api/surveys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const surveyData = req.body;
        
        // Check if survey exists
        const [existing] = await db.execute('SELECT survey_id FROM surveys WHERE survey_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        
        // Update survey
        await db.execute(`UPDATE surveys SET assessment_round = ?, semester = ?, submitted_by = ?, updated_at = CURRENT_TIMESTAMP WHERE survey_id = ?`, [surveyData.assessment_round, surveyData.semester, surveyData.submitted_by, id]);
        
        res.json({ message: 'Survey updated successfully' });
    } catch (error) {
        console.error('Update survey error:', error);
        res.status(500).json({ error: 'Failed to update survey' });
    }
});

// DELETE survey
app.delete('/api/surveys/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Start transaction
        await db.beginTransaction();
        
        try {
            // Delete related records first (foreign key constraints)
            await db.execute('DELETE FROM survey_scores WHERE survey_id = ?', [id]);
            await db.execute('DELETE FROM wrap_up_responses WHERE survey_id = ?', [id]);
            await db.execute('DELETE FROM governance_indicators WHERE survey_id = ?', [id]);
            await db.execute('DELETE FROM checklist_responses WHERE survey_id = ?', [id]);
            await db.execute('DELETE FROM context_metrics WHERE survey_id = ?', [id]);
            await db.execute('DELETE FROM campus_information WHERE survey_id = ?', [id]);
            await db.execute('DELETE FROM audit_information WHERE survey_id = ?', [id]);
            await db.execute('DELETE FROM surveys WHERE survey_id = ?', [id]);
            
            await db.commit();
            
            res.json({ message: 'Survey deleted successfully' });
        } catch (error) {
            await db.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Delete survey error:', error);
        res.status(500).json({ error: 'Failed to delete survey' });
    }
});

// Dashboard Analytics Endpoints

// GET dashboard stats
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const stats = {};
        
        // Total responses
        const [totalResult] = await db.execute('SELECT COUNT(*) as count FROM surveys');
        stats.total_responses = totalResult[0].count;
        
        // Average scores
        const [scoresResult] = await db.execute(`
            SELECT 
                AVG(checklists_raw_score) as avg_checklists_score,
                AVG(governance_raw_score) as avg_governance_score,
                AVG(university_level_raw_score) as avg_university_level_score,
                AVG(overall_score) as avg_overall_score
            FROM survey_scores
        `);
        stats.average_scores = scoresResult[0];
        
        // Performance rating distribution
        const [ratingResult] = await db.execute(`
            SELECT performance_rating, COUNT(*) as count
            FROM survey_scores
            GROUP BY performance_rating
            ORDER BY FIELD(performance_rating, 'Excellent', 'Good', 'Fair', 'Needs Improvement', 'Poor')
        `);
        stats.performance_distribution = ratingResult;
        
        // Response count by semester
        const [semesterResult] = await db.execute(`
            SELECT s.semester, COUNT(*) as count
            FROM surveys s
            GROUP BY s.semester
            ORDER BY s.semester
        `);
        stats.semester_distribution = semesterResult;
        
        // Response count by assessment round
        const [roundResult] = await db.execute(`
            SELECT s.assessment_round, COUNT(*) as count
            FROM surveys s
            GROUP BY s.assessment_round
            ORDER BY s.assessment_round
        `);
        stats.round_distribution = roundResult;
        
        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// GET trends over time
app.get('/api/dashboard/trends', async (req, res) => {
    try {
        const { time_period = 'month' } = req.query;
        
        let groupByClause;
        if (time_period === 'year') {
            groupByClause = 'YEAR(s.submission_date), MONTH(s.submission_date)';
        } else if (time_period === 'week') {
            groupByClause = 'YEAR(s.submission_date), WEEK(s.submission_date)';
        } else {
            groupByClause = 'YEAR(s.submission_date), MONTH(s.submission_date)';
        }
        
        const [trends] = await db.execute(`
            SELECT 
                DATE_FORMAT(s.submission_date, '%Y-%m') as period,
                COUNT(*) as response_count,
                AVG(sc.overall_score) as avg_score
            FROM surveys s
            LEFT JOIN survey_scores sc ON s.survey_id = sc.survey_id
            WHERE s.submission_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY ${groupByClause}
            ORDER BY period
        `);
        
        res.json(trends);
    } catch (error) {
        console.error('Dashboard trends error:', error);
        res.status(500).json({ error: 'Failed to fetch trends' });
    }
});

// GET breakdowns by various criteria
app.get('/api/dashboard/breakdown', async (req, res) => {
    try {
        const { criteria = 'semester' } = req.query;
        
        let groupByField;
        if (criteria === 'semester') {
            groupByField = 's.semester';
        } else if (criteria === 'round') {
            groupByField = 's.assessment_round';
        } else if (criteria === 'rating') {
            groupByField = 'sc.performance_rating';
        } else if (criteria === 'campus_setting') {
            groupByField = 'ci.campus_setting';
        } else {
            return res.status(400).json({ error: 'Invalid criteria' });
        }
        
        const [breakdown] = await db.execute(`
            SELECT 
                ${groupByField} as category,
                COUNT(*) as count,
                AVG(sc.overall_score) as avg_score,
                AVG(sc.checklists_raw_score) as avg_checklists_score,
                AVG(sc.governance_raw_score) as avg_governance_score,
                AVG(sc.university_level_raw_score) as avg_university_level_score
            FROM surveys s
            LEFT JOIN campus_information ci ON s.survey_id = ci.survey_id
            LEFT JOIN survey_scores sc ON s.survey_id = sc.survey_id
            WHERE ${groupByField} IS NOT NULL
            GROUP BY ${groupByField}
            ORDER BY count DESC
        `);
        
        res.json(breakdown);
    } catch (error) {
        console.error('Dashboard breakdown error:', error);
        res.status(500).json({ error: 'Failed to fetch breakdown' });
    }
});

// Excel Import Endpoints

// POST upload and import Excel file (legacy multipart endpoint kept for compatibility)
app.post('/api/import/excel', upload.single('file'), async (req, res) => {
    res.status(400).json({ error: 'Use /api/import/survey with JSON payload instead' });
});

// POST process survey import from client-parsed data
app.post('/api/import/survey', async (req, res) => {
    const { sheets } = req.body;
    if (!sheets || !Array.isArray(sheets) || sheets.length === 0)
        return res.status(400).json({ error: 'No sheet data provided' });

    // Flatten all rows from all sheets into one merged row per index
    // Each sheet may cover different columns; merge by row index
    const mergedRows = [];
    const maxRows = Math.max(...sheets.map(s => s.rows.length));

    for (let i = 0; i < maxRows; i++) {
        const merged = {};
        for (const sheet of sheets) {
            const row = sheet.rows[i];
            if (!row) continue;
            for (const m of sheet.mapping) {
                if (!m.mapped || !m.dbCol) continue;
                const val = row[m.fileCol];
                if (val !== undefined && val !== '') merged[m.dbCol] = val;
            }
        }
        if (Object.keys(merged).length > 0) mergedRows.push(merged);
    }

    let inserted = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < mergedRows.length; i++) {
        const d = mergedRows[i];
        // Require at minimum auditor_name or university_name
        if (!d.auditor_name && !d.university_name) { skipped++; continue; }

        // Duplicate check
        if (d.auditor_email && d.university_name && d.audit_date) {
            const [dup] = await db.execute(`
                SELECT s.survey_id FROM surveys s
                JOIN audit_information ai ON s.survey_id = ai.survey_id
                JOIN campus_information ci ON s.survey_id = ci.survey_id
                WHERE ai.auditor_email = ? AND ci.university_name = ? AND DATE(ai.audit_date) = DATE(?)
                LIMIT 1
            `, [d.auditor_email, d.university_name, d.audit_date]);
            if (dup.length > 0) { errors.push(`Row ${i + 1}: Duplicate — survey already exists for ${d.auditor_email} at ${d.university_name} on ${d.audit_date}`); skipped++; continue; }
        }

        await db.beginTransaction();
        try {
            // surveys
            const [sr] = await db.execute(
                'INSERT INTO surveys (assessment_round, semester, submitted_by) VALUES (?, ?, ?)',
                [d.assessment_round || 1, d.semester || 'Fall', d.submitted_by || d.auditor_name || null]
            );
            const sid = sr.insertId;

            // audit_information
            await db.execute(`INSERT INTO audit_information
                (survey_id,auditor_name,auditor_affiliation,auditor_email,audit_date,audit_start_time,audit_end_time,
                 received_training,training_type_online,training_type_in_person,training_type_self_guided,
                 primary_dining_time,info_source_online_docs,info_source_site_visit,info_source_online_comms,info_source_other)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, d.auditor_name||null, d.auditor_affiliation||null, d.auditor_email||null,
                 d.audit_date||null, d.audit_start_time||null, d.audit_end_time||null,
                 toBool(d.received_training), toBool(d.training_type_online),
                 toBool(d.training_type_in_person), toBool(d.training_type_self_guided),
                 d.primary_dining_time||null, toBool(d.info_source_online_docs),
                 toBool(d.info_source_site_visit), toBool(d.info_source_online_comms), d.info_source_other||null]
            );

            // campus_information
            await db.execute(`INSERT INTO campus_information
                (survey_id,university_name,city,province_state,institution_type,campus_setting,
                 provider_type_university_operated,provider_type_franchised,provider_type_grab_and_go,
                 provider_type_vending,provider_type_independent)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, d.university_name||null, d.city||null, d.province_state||null,
                 d.institution_type||null, d.campus_setting||null,
                 toBool(d.provider_type_university_operated), toBool(d.provider_type_franchised),
                 toBool(d.provider_type_grab_and_go), toBool(d.provider_type_vending), toBool(d.provider_type_independent)]
            );

            // context_metrics
            await db.execute(`INSERT INTO context_metrics
                (survey_id,total_food_providers,university_operated_units,venues_with_nutritious_items,
                 venues_with_vegan_veg,venues_with_religious_inclusive,venues_with_dietary_restrictions,
                 venues_with_cultural_inclusive,venues_open_24_7,venues_open_until_9pm,venues_open_year_round,
                 total_students_enrolled,undergraduate_students,graduate_students,students_with_meal_plan,
                 total_employees,part_time_employees,full_time_employees,total_food_service_employees,
                 student_food_service_workers,part_time_food_service,full_time_food_service,
                 annual_sales_total,annual_sales_franchise,annual_sales_grab_and_go,annual_sales_vending)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, toNum(d.total_food_providers)||0, toNum(d.university_operated_units),
                 toNum(d.venues_with_nutritious_items), toNum(d.venues_with_vegan_veg),
                 toNum(d.venues_with_religious_inclusive), toNum(d.venues_with_dietary_restrictions),
                 toNum(d.venues_with_cultural_inclusive), toNum(d.venues_open_24_7),
                 toNum(d.venues_open_until_9pm), toNum(d.venues_open_year_round),
                 toNum(d.total_students_enrolled), toNum(d.undergraduate_students), toNum(d.graduate_students),
                 toNum(d.students_with_meal_plan), toNum(d.total_employees), toNum(d.part_time_employees),
                 toNum(d.full_time_employees), toNum(d.total_food_service_employees),
                 toNum(d.student_food_service_workers), toNum(d.part_time_food_service), toNum(d.full_time_food_service),
                 toNum(d.annual_sales_total), toNum(d.annual_sales_franchise),
                 toNum(d.annual_sales_grab_and_go), toNum(d.annual_sales_vending)]
            );

            // checklist_responses
            await db.execute(`INSERT INTO checklist_responses
                (survey_id,q1_food_sustainability_strategy,q2_named_person_committee,q3_dedicated_budget,
                 q4_dedicated_leadership_staffing,q5_dedicated_budget_line,q6_metrics_tracked_reported,
                 q7_require_nutritious_item,q8_require_basic_sustainability,q9_stakeholder_input_channel,
                 q10_curricular_programs,q11_student_innovation_programs,q12_food_security_programs,
                 q13_food_bank_eligibility_open,q13_food_bank_eligibility_limited,
                 q13_food_bank_eligibility_frequency_caps,q13_food_bank_eligibility_unclear,q14_labor_ethical_standards)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, toBool(d.q1_food_sustainability_strategy), toBool(d.q2_named_person_committee),
                 toBool(d.q3_dedicated_budget), toBool(d.q4_dedicated_leadership_staffing),
                 toBool(d.q5_dedicated_budget_line), toBool(d.q6_metrics_tracked_reported),
                 toBool(d.q7_require_nutritious_item), toBool(d.q8_require_basic_sustainability),
                 toBool(d.q9_stakeholder_input_channel), toBool(d.q10_curricular_programs),
                 toBool(d.q11_student_innovation_programs), toBool(d.q12_food_security_programs),
                 toBool(d.q13_food_bank_eligibility_open), toBool(d.q13_food_bank_eligibility_limited),
                 toBool(d.q13_food_bank_eligibility_frequency_caps), toBool(d.q13_food_bank_eligibility_unclear),
                 toBool(d.q14_labor_ethical_standards)]
            );

            // governance_indicators
            await db.execute(`INSERT INTO governance_indicators
                (survey_id,leadership_strategy_comprehensiveness,leadership_strategy_inclusion,
                 leadership_support_extent,leadership_local_procurement,leadership_waste_reduction,
                 leadership_energy_water_conservation,leadership_culture_promotion,leadership_nutritious_item_requirement,
                 policy_cross_unit_coordination,policy_sustainable_diet_principles,policy_environmental_alignment,
                 policy_ethical_fair_trade,policy_environmental_sustainability,policy_nutritional_labeling,
                 policy_direct_sales,policy_waste_management,policy_packaging_recycling)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, toNum(d.leadership_strategy_comprehensiveness), toNum(d.leadership_strategy_inclusion),
                 toNum(d.leadership_support_extent), toNum(d.leadership_local_procurement),
                 toNum(d.leadership_waste_reduction), toNum(d.leadership_energy_water_conservation),
                 toNum(d.leadership_culture_promotion), toNum(d.leadership_nutritious_item_requirement),
                 toNum(d.policy_cross_unit_coordination), toNum(d.policy_sustainable_diet_principles),
                 toNum(d.policy_environmental_alignment), toNum(d.policy_ethical_fair_trade),
                 toNum(d.policy_environmental_sustainability), toNum(d.policy_nutritional_labeling),
                 toNum(d.policy_direct_sales), toNum(d.policy_waste_management), toNum(d.policy_packaging_recycling)]
            );

            // wrap_up_responses
            await db.execute(`INSERT INTO wrap_up_responses
                (survey_id,info_source_publicly_available,info_source_internal_docs,info_source_direct_observation,
                 info_source_staff_consultation,info_source_not_accessible,confidence_level,
                 constraint_access_internal_docs,constraint_access_hr_labor,constraint_time_capacity,
                 constraint_multiple_departments,constraint_seasonal_limits,constraint_vendor_data,
                 constraint_unclear_wording,constraint_other,factor_urban_off_campus,factor_vendor_operated,
                 factor_university_operated,factor_low_activity_term,factor_limited_day_part,factor_other)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, toNum(d.info_source_publicly_available), toNum(d.info_source_internal_docs),
                 toNum(d.info_source_direct_observation), toNum(d.info_source_staff_consultation),
                 toNum(d.info_source_not_accessible), toNum(d.confidence_level),
                 toBool(d.constraint_access_internal_docs), toBool(d.constraint_access_hr_labor),
                 toBool(d.constraint_time_capacity), toBool(d.constraint_multiple_departments),
                 toBool(d.constraint_seasonal_limits), toBool(d.constraint_vendor_data),
                 toBool(d.constraint_unclear_wording), d.constraint_other||null,
                 toBool(d.factor_urban_off_campus), toBool(d.factor_vendor_operated),
                 toBool(d.factor_university_operated), toBool(d.factor_low_activity_term),
                 toBool(d.factor_limited_day_part), d.factor_other||null]
            );

            // scores
            const scores = calculateCategoryScores(d);
            await db.execute(`INSERT INTO survey_scores
                (survey_id,checklists_raw_score,governance_raw_score,university_level_raw_score,overall_score,performance_rating)
                VALUES (?,?,?,?,?,?)`,
                [sid, scores.checklists||0, scores.leadership||0, scores.policies||0,
                 scores.overall||0, calculatePerformanceRating(scores.overall)]
            );

            await db.commit();
            inserted++;
        } catch (err) {
            await db.rollback();
            errors.push(`Row ${i + 1}: ${err.message}`);
        }
    }

    res.json({ success: true, inserted, skipped, errors, total: mergedRows.length });
});

// Helpers for type coercion
function toBool(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'boolean') return v;
    const s = String(v).toLowerCase().trim();
    return ['1','true','yes','y'].includes(s) ? 1 : 0;
}
function toNum(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
}

// GET download Excel template
app.get('/api/import/template', async (req, res) => {
    try {
        const workbook = xlsx.utils.book_new();

        const auditCols = ['auditor_name','auditor_affiliation','auditor_email','audit_date','audit_start_time','audit_end_time','received_training','training_type_online','training_type_in_person','training_type_self_guided','primary_dining_time','info_source_online_docs','info_source_site_visit','info_source_online_comms','info_source_other','assessment_round','semester','submitted_by'];
        const campusCols = ['university_name','city','province_state','institution_type','campus_setting','provider_type_university_operated','provider_type_franchised','provider_type_grab_and_go','provider_type_vending','provider_type_independent'];
        const contextCols = ['total_food_providers','university_operated_units','venues_with_nutritious_items','venues_with_vegan_veg','venues_with_religious_inclusive','venues_with_dietary_restrictions','venues_with_cultural_inclusive','venues_open_24_7','venues_open_until_9pm','venues_open_year_round','total_students_enrolled','undergraduate_students','graduate_students','students_with_meal_plan','total_employees','part_time_employees','full_time_employees','total_food_service_employees','student_food_service_workers','part_time_food_service','full_time_food_service','annual_sales_total','annual_sales_franchise','annual_sales_grab_and_go','annual_sales_vending'];
        const checklistCols = ['q1_food_sustainability_strategy','q2_named_person_committee','q3_dedicated_budget','q4_dedicated_leadership_staffing','q5_dedicated_budget_line','q6_metrics_tracked_reported','q7_require_nutritious_item','q8_require_basic_sustainability','q9_stakeholder_input_channel','q10_curricular_programs','q11_student_innovation_programs','q12_food_security_programs','q13_food_bank_eligibility_open','q13_food_bank_eligibility_limited','q13_food_bank_eligibility_frequency_caps','q13_food_bank_eligibility_unclear','q14_labor_ethical_standards'];
        const governanceCols = ['leadership_strategy_comprehensiveness','leadership_strategy_inclusion','leadership_support_extent','leadership_local_procurement','leadership_waste_reduction','leadership_energy_water_conservation','leadership_culture_promotion','leadership_nutritious_item_requirement','policy_cross_unit_coordination','policy_sustainable_diet_principles','policy_environmental_alignment','policy_ethical_fair_trade','policy_environmental_sustainability','policy_nutritional_labeling','policy_direct_sales','policy_waste_management','policy_packaging_recycling'];
        const wrapupCols = ['info_source_publicly_available','info_source_internal_docs','info_source_direct_observation','info_source_staff_consultation','info_source_not_accessible','confidence_level','constraint_access_internal_docs','constraint_access_hr_labor','constraint_time_capacity','constraint_multiple_departments','constraint_seasonal_limits','constraint_vendor_data','constraint_unclear_wording','constraint_other','factor_urban_off_campus','factor_vendor_operated','factor_university_operated','factor_low_activity_term','factor_limited_day_part','factor_other'];

        const makeSheet = (cols) => xlsx.utils.aoa_to_sheet([cols]);
        xlsx.utils.book_append_sheet(workbook, makeSheet(auditCols), 'Audit Info');
        xlsx.utils.book_append_sheet(workbook, makeSheet(campusCols), 'Campus Info');
        xlsx.utils.book_append_sheet(workbook, makeSheet(contextCols), 'Context Metrics');
        xlsx.utils.book_append_sheet(workbook, makeSheet(checklistCols), 'Checklist');
        xlsx.utils.book_append_sheet(workbook, makeSheet(governanceCols), 'Governance');
        xlsx.utils.book_append_sheet(workbook, makeSheet(wrapupCols), 'Wrap-up');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="scf_eat_survey_template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate template' });
    }
});

// Score Calculation Endpoints

// POST calculate scores for a survey
app.post('/api/scores/calculate/:surveyId', async (req, res) => {
    try {
        const { surveyId } = req.params;
        
        // Check if survey exists
        const [existing] = await db.execute('SELECT survey_id FROM surveys WHERE survey_id = ?', [surveyId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Survey not found' });
        }
        
        // Calculate scores using JavaScript function
        // For now, we'll use the existing calculateSurveyScores function
        await calculateSurveyScores(surveyId);
        
        // Get the calculated scores
        const [scores] = await db.execute('SELECT * FROM survey_scores WHERE survey_id = ?', [surveyId]);
        
        res.json({ message: 'Scores calculated successfully', scores: scores[0] });
    } catch (error) {
        console.error('Score calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate scores: ' + error.message });
    }
});

// GET scores for a survey
app.get('/api/scores/:surveyId', async (req, res) => {
    try {
        const { surveyId } = req.params;
        
        const [scores] = await db.execute('SELECT * FROM survey_scores WHERE survey_id = ?', [surveyId]);
        
        if (scores.length === 0) {
            return res.status(404).json({ error: 'Scores not found for this survey' });
        }
        
        res.json(scores[0]);
    } catch (error) {
        console.error('Get scores error:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

// Helper functions for processing Excel data
async function processExcelSheet(sheetName, data) {
    const result = { imported: 0, errors: [] };
    
    if (sheetName === 'Intro Information') {
        for (const row of data) {
            try {
                // Map Excel columns to database fields and insert
                // This is a simplified version - in production, you'd want more robust mapping
                result.imported++;
            } catch (error) {
                result.errors.push(`Row ${result.imported + 1}: ${error.message}`);
            }
        }
    } else if (sheetName === 'Context') {
        // Process context data
        result.imported = data.length;
    } else if (sheetName === 'Checklist') {
        // Process checklist data
        result.imported = data.length;
    } else if (sheetName === 'Governance') {
        // Process governance data
        result.imported = data.length;
    } else if (sheetName === 'Wrap-up Questions') {
        // Process wrap-up data
        result.imported = data.length;
    }
    
    return result;
}

// Get dynamic survey form structure
app.get('/api/survey-form', async (req, res) => {
    try {
        const query = `
            SELECT 
                q.question_id,
                q.question_code,
                q.question_text,
                q.question_type,
                q.category_id,
                q.group_id,
                q.description,
                q.placeholder,
                q.tooltip,
                q.is_required,
                q.display_order,
                q.validation_regex,
                q.min_value,
                q.max_value,
                q.min_length,
                q.max_length,
                q.contributes_to_score,
                q.scoring_method,
                q.max_points,
                q.depends_on_question_id,
                q.depends_on_value,
                qc.category_code,
                qc.category_name,
                qg.group_code,
                qg.group_name,
                qo.option_id,
                qo.option_value,
                qo.option_label,
                qo.display_order as option_display_order
            FROM questions q
            LEFT JOIN question_categories qc ON q.category_id = qc.category_id
            LEFT JOIN question_groups qg ON q.group_id = qg.group_id
            LEFT JOIN question_options qo ON q.question_id = qo.question_id
            WHERE q.is_active = TRUE
            ORDER BY qc.display_order, qg.display_order, q.display_order, qo.display_order
        `;
        
        const [rows] = await db.execute(query);
        
        // Group questions by categories and groups
        const formStructure = {};
        
        rows.forEach(row => {
            if (!formStructure[row.category_code]) {
                formStructure[row.category_code] = {
                    category_id: row.category_id,
                    category_name: row.category_name,
                    groups: {}
                };
            }
            
            if (!formStructure[row.category_code].groups[row.group_code]) {
                formStructure[row.category_code].groups[row.group_code] = {
                    group_id: row.group_id,
                    group_name: row.group_name,
                    questions: []
                };
            }
            
            let question = formStructure[row.category_code].groups[row.group_code].questions.find(q => q.question_id === row.question_id);
            
            if (!question) {
                question = {
                    question_id: row.question_id,
                    question_code: row.question_code,
                    question_text: row.question_text,
                    question_type: row.question_type,
                    description: row.description,
                    placeholder: row.placeholder,
                    tooltip: row.tooltip,
                    is_required: row.is_required,
                    display_order: row.display_order,
                    validation_regex: row.validation_regex,
                    min_value: row.min_value,
                    max_value: row.max_value,
                    min_length: row.min_length,
                    max_length: row.max_length,
                    contributes_to_score: row.contributes_to_score,
                    scoring_method: row.scoring_method,
                    max_points: row.max_points,
                    depends_on_question_id: row.depends_on_question_id,
                    depends_on_value: row.depends_on_value,
                    options: []
                };
                formStructure[row.category_code].groups[row.group_code].questions.push(question);
            }
            
            if (row.option_id) {
                question.options.push({
                    option_id: row.option_id,
                    option_value: row.option_value,
                    option_label: row.option_label,
                    display_order: row.option_display_order
                });
            }
        });
        
        res.json(formStructure);
    } catch (error) {
        console.error('Get survey form error:', error);
        res.status(500).json({ error: 'Failed to fetch survey form structure' });
    }
});

// Submit dynamic survey responses
app.post('/api/survey-responses', async (req, res) => {
    try {
        const { survey_id, responses } = req.body;
        
        if (!survey_id || !responses || !Array.isArray(responses)) {
            return res.status(400).json({ error: 'Invalid request format' });
        }

        // Start transaction
        await db.beginTransaction();

        try {
            // Insert responses
            for (const response of responses) {
                const {
                    question_id,
                    answer_text,
                    answer_number,
                    answer_boolean,
                    answer_date,
                    answer_time,
                    answer_json
                } = response;

                const query = `
                    INSERT INTO responses (
                        survey_id, question_id, answer_text, answer_number, 
                        answer_boolean, answer_date, answer_time, answer_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        answer_text = VALUES(answer_text),
                        answer_number = VALUES(answer_number),
                        answer_boolean = VALUES(answer_boolean),
                        answer_date = VALUES(answer_date),
                        answer_time = VALUES(answer_time),
                        answer_json = VALUES(answer_json),
                        updated_at = CURRENT_TIMESTAMP
                `;
                
                await db.execute(query, [
                    survey_id, question_id, answer_text, answer_number,
                    answer_boolean, answer_date, answer_time, answer_json
                ]);
            }

            // Update survey completion status
            await db.execute('UPDATE surveys SET is_complete = TRUE WHERE survey_id = ?', [survey_id]);

            // Calculate and update scores
            await calculateSurveyScores(survey_id);

            // Commit transaction
            await db.commit();

            res.json({ 
                message: 'Survey responses submitted successfully',
                survey_id: survey_id 
            });
        } catch (error) {
            await db.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Survey responses submission error:', error);
        res.status(500).json({ error: 'Submission failed: ' + error.message });
    }
});

// Get survey responses with detailed question information
app.get('/api/survey-responses/:surveyId', async (req, res) => {
    try {
        const { surveyId } = req.params;
        
        const query = `
            SELECT 
                r.response_id,
                r.survey_id,
                r.question_id,
                r.answer_text,
                r.answer_number,
                r.answer_boolean,
                r.answer_date,
                r.answer_time,
                r.answer_json,
                r.created_at,
                r.updated_at,
                q.question_code,
                q.question_text,
                q.question_type,
                q.category_id,
                q.group_id,
                qc.category_code,
                qc.category_name,
                qg.group_code,
                qg.group_name
            FROM responses r
            JOIN questions q ON r.question_id = q.question_id
            LEFT JOIN question_categories qc ON q.category_id = qc.category_id
            LEFT JOIN question_groups qg ON q.group_id = qg.group_id
            WHERE r.survey_id = ? AND q.is_active = TRUE
            ORDER BY qc.display_order, qg.display_order, q.display_order
        `;
        
        const [rows] = await db.execute(query, [surveyId]);
        res.json(rows);
    } catch (error) {
        console.error('Get survey responses error:', error);
        res.status(500).json({ error: 'Failed to fetch survey responses' });
    }
});

// Calculate survey scores
async function calculateSurveyScores(surveyId) {
    try {
        // Get all responses for the survey
        const [responses] = await db.execute(`
            SELECT r.question_id, r.answer_boolean, r.answer_number, r.answer_text
            FROM responses r
            JOIN questions q ON r.question_id = q.question_id
            WHERE r.survey_id = ? AND q.is_active = TRUE
        `, [surveyId]);

        // Calculate scores by category
        const scores = {
            context_score: 0,
            checklist_score: 0,
            leadership_score: 0,
            policies_score: 0,
            overall_score: 0
        };

        // Calculate checklist score (yes/no questions)
        const checklistResponses = responses.filter(r => r.answer_boolean !== null);
        if (checklistResponses.length > 0) {
            const yesCount = checklistResponses.filter(r => r.answer_boolean === 1).length;
            scores.checklist_score = (yesCount / checklistResponses.length) * 100;
        }

        // Calculate governance scores (rating questions)
        const leadershipResponses = responses.filter(r => r.answer_number !== null && r.answer_number >= 0 && r.answer_number <= 4);
        if (leadershipResponses.length > 0) {
            const totalScore = leadershipResponses.reduce((sum, r) => sum + r.answer_number, 0);
            scores.leadership_score = (totalScore / (leadershipResponses.length * 4)) * 100;
        }

        // Calculate policies score (similar to leadership)
        const policiesResponses = responses.filter(r => r.answer_number !== null && r.answer_number >= 0 && r.answer_number <= 4);
        if (policiesResponses.length > 0) {
            const totalScore = policiesResponses.reduce((sum, r) => sum + r.answer_number, 0);
            scores.policies_score = (totalScore / (policiesResponses.length * 4)) * 100;
        }

        // Calculate overall weighted score
        scores.overall_score = (
            scores.checklist_score * 0.30 + // 30% weight for checklist
            scores.leadership_score * 0.15 + // 15% weight for leadership
            scores.policies_score * 0.25     // 25% weight for policies
        );

        // Insert or update scores - ensure all values are not undefined
        const [existingScores] = await db.execute('SELECT score_id FROM survey_scores WHERE survey_id = ?', [surveyId]);
        
        // Ensure all score values are explicitly defined
        const contextScore = scores.context_score ?? 0;
        const checklistScore = scores.checklist_score ?? 0;
        const leadershipScore = scores.leadership_score ?? 0;
        const policiesScore = scores.policies_score ?? 0;
        const overallScore = scores.overall_score ?? 0;
        
        const scoreValues = [
            contextScore,
            checklistScore,
            leadershipScore,
            policiesScore,
            overallScore,
            surveyId
        ];
        
        if (existingScores.length > 0) {
            await db.execute(`
                UPDATE survey_scores SET
                    context_score = ?, checklist_score = ?, leadership_score = ?,
                    policies_score = ?, overall_score = ?
                WHERE survey_id = ?
            `, scoreValues);
        } else {
            await db.execute(`
                INSERT INTO survey_scores (
                    survey_id, context_score, checklist_score, leadership_score,
                    policies_score, overall_score
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, scoreValues);
        }
    } catch (error) {
        console.error('Score calculation error:', error);
        throw error;
    }
}

// Get survey responses with filters
app.get('/api/responses', async (req, res) => {
    try {
        const { campus_setting, semester, date_from, date_to } = req.query;
        
        let query = `
            SELECT 
                s.survey_id,
                s.submission_date,
                s.assessment_round,
                s.semester,
                s.is_complete,
                s.created_by,
                ci.university_name,
                ci.campus_setting,
                ci.institution_type,
                cm.total_food_providers,
                cm.total_students_enrolled,
                cm.annual_sales_total,
                ai.auditor_name,
                ai.auditor_email,
                ai.audit_date
            FROM surveys s
            LEFT JOIN campus_information ci ON s.survey_id = ci.survey_id
            LEFT JOIN context_metrics cm ON s.survey_id = cm.survey_id
            LEFT JOIN audit_information ai ON s.survey_id = ai.survey_id
            WHERE 1=1
        `;
        const params = [];
        
        if (campus_setting) {
            query += ' AND ci.campus_setting = ?';
            params.push(campus_setting);
        }
        
        if (semester) {
            query += ' AND s.semester = ?';
            params.push(semester);
        }
        
        if (date_from) {
            query += ' AND s.submission_date >= ?';
            params.push(date_from);
        }
        
        if (date_to) {
            query += ' AND s.submission_date <= ?';
            params.push(date_to);
        }
        
        query += ' ORDER BY s.submission_date DESC';
        
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Get responses error:', error);
        res.status(500).json({ error: 'Failed to fetch responses' });
    }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = {};
        
        // Total responses
        const [totalResult] = await db.execute('SELECT COUNT(*) as count FROM surveys');
        stats.total_responses = totalResult[0].count;
        
        // Campus setting distribution
        const [campusResult] = await db.execute(`
            SELECT ci.campus_setting, COUNT(*) as count 
            FROM surveys s
            LEFT JOIN campus_information ci ON s.survey_id = ci.survey_id
            GROUP BY ci.campus_setting
        `);
        stats.campus_distribution = campusResult;
        
        // Average food providers
        const [foodProvidersResult] = await db.execute(`
            SELECT AVG(cm.total_food_providers) as avg_food_providers 
            FROM surveys s
            LEFT JOIN context_metrics cm ON s.survey_id = cm.survey_id
            WHERE cm.total_food_providers IS NOT NULL
        `);
        stats.avg_food_providers = foodProvidersResult[0]?.avg_food_providers || 0;
        
        // Average students
        const [studentsResult] = await db.execute(`
            SELECT AVG(cm.total_students_enrolled) as avg_students 
            FROM surveys s
            LEFT JOIN context_metrics cm ON s.survey_id = cm.survey_id
            WHERE cm.total_students_enrolled IS NOT NULL
        `);
        stats.avg_students = studentsResult[0]?.avg_students || 0;
        
        // Average annual sales
        const [salesResult] = await db.execute(`
            SELECT AVG(cm.annual_sales_total) as avg_sales 
            FROM surveys s
            LEFT JOIN context_metrics cm ON s.survey_id = cm.survey_id
            WHERE cm.annual_sales_total IS NOT NULL
        `);
        stats.avg_annual_sales = salesResult[0]?.avg_sales || 0;
        
        // Average governance score (leadership indicators)
        const [governanceResult] = await db.execute(`
            SELECT AVG(
                (gi.leadership_strategy_comprehensiveness + 
                 gi.leadership_strategy_inclusion + 
                 gi.leadership_support_extent + 
                 gi.leadership_local_procurement + 
                 gi.leadership_waste_reduction + 
                 gi.leadership_energy_water_conservation + 
                 gi.leadership_culture_promotion + 
                 gi.leadership_nutritious_item_requirement) / 8
            ) as avg_leadership_score
            FROM surveys s
            LEFT JOIN governance_indicators gi ON s.survey_id = gi.survey_id
            WHERE gi.leadership_strategy_comprehensiveness IS NOT NULL
        `);
        stats.avg_leadership_score = governanceResult[0]?.avg_leadership_score || 0;
        
        // Average policies score
        const [policiesResult] = await db.execute(`
            SELECT AVG(
                (gi.policy_cross_unit_coordination + 
                 gi.policy_sustainable_diet_principles + 
                 gi.policy_environmental_alignment + 
                 gi.policy_ethical_fair_trade + 
                 gi.policy_environmental_sustainability + 
                 gi.policy_nutritional_labeling + 
                 gi.policy_direct_sales + 
                 gi.policy_waste_management + 
                 gi.policy_packaging_recycling) / 9
            ) as avg_policies_score
            FROM surveys s
            LEFT JOIN governance_indicators gi ON s.survey_id = gi.survey_id
            WHERE gi.policy_cross_unit_coordination IS NOT NULL
        `);
        stats.avg_policies_score = policiesResult[0]?.avg_policies_score || 0;
        
        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Helper functions for processing Excel data
async function processIntroInformation(data) {
    // Implementation for processing intro information
    // This would map Excel columns to database fields
}

async function processContextData(data) {
    // Implementation for processing context data
}

async function processChecklistData(data) {
    // Implementation for processing checklist data
}

async function processGovernanceData(data) {
    // Implementation for processing governance data
}

async function processWrapUpData(data) {
    // Implementation for processing wrap-up data
}

// ─── AUTH ROUTES ───────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        const [users] = await db.execute('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
        if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = users[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET || 'scfeat_secret_key',
            { expiresIn: '24h' }
        );
        // Create server-side session
        req.session.userId = user.user_id;
        req.session.role = user.role;
        req.session.loginTime = Date.now();
        res.json({ token, user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.clearCookie('scfeat_session');
        res.json({ message: 'Logged out' });
    });
});

app.get('/api/auth/session', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ active: true, userId: req.session.userId, role: req.session.role });
    } else {
        res.json({ active: false });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role = 'auditor' } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
        const hashed = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashed, role]
        );
        res.status(201).json({ message: 'User created', user_id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ─── USER MANAGEMENT (Admin only) ───────────────────────────────────────────

app.get('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [users] = await db.execute('SELECT user_id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

app.post('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });
        const hashed = await bcrypt.hash(password, 10);
        const [result] = await db.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hashed, role]);
        res.status(201).json({ message: 'User created', user_id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { name, email, role, is_active, password } = req.body;
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await db.execute('UPDATE users SET name=?, email=?, role=?, is_active=?, password=?, updated_at=NOW() WHERE user_id=?', [name, email, role, is_active, hashed, req.params.id]);
        } else {
            await db.execute('UPDATE users SET name=?, email=?, role=?, is_active=?, updated_at=NOW() WHERE user_id=?', [name, email, role, is_active, req.params.id]);
        }
        res.json({ message: 'User updated' });
    } catch (error) { res.status(500).json({ error: 'Failed to update user' }); }
});

app.delete('/api/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.execute('DELETE FROM users WHERE user_id = ?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete user' }); }
});

// ─── DRAFT SAVE / LOAD ───────────────────────────────────────────────────────

app.post('/api/drafts', authenticateToken, async (req, res) => {
    try {
        const { form_data, current_section } = req.body;
        await db.execute(
            'INSERT INTO survey_drafts (user_id, form_data, current_section) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE form_data=VALUES(form_data), current_section=VALUES(current_section), last_saved=NOW()',
            [req.user.user_id, JSON.stringify(form_data), current_section]
        );
        res.json({ message: 'Draft saved' });
    } catch (error) { res.status(500).json({ error: 'Failed to save draft' }); }
});

app.get('/api/drafts', authenticateToken, async (req, res) => {
    try {
        const [drafts] = await db.execute('SELECT * FROM survey_drafts WHERE user_id = ?', [req.user.user_id]);
        if (drafts.length === 0) return res.json(null);
        res.json({ form_data: drafts[0].form_data, current_section: drafts[0].current_section, last_saved: drafts[0].last_saved });
    } catch (error) { res.status(500).json({ error: 'Failed to load draft' }); }
});

app.delete('/api/drafts', authenticateToken, async (req, res) => {
    try {
        await db.execute('DELETE FROM survey_drafts WHERE user_id = ?', [req.user.user_id]);
        res.json({ message: 'Draft deleted' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete draft' }); }
});

// ─── DYNAMIC FORM QUESTIONS (Admin only) ─────────────────────────────────────

app.get('/api/admin/questions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT q.*, qc.category_name, qg.group_name FROM questions q
            LEFT JOIN question_categories qc ON q.category_id = qc.category_id
            LEFT JOIN question_groups qg ON q.group_id = qg.group_id
            ORDER BY qc.display_order, qg.display_order, q.display_order
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch questions' }); }
});

app.post('/api/admin/questions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { question_code, question_text, question_type, category_id, group_id, is_required, display_order, placeholder } = req.body;
        const [result] = await db.execute(
            'INSERT INTO questions (question_code, question_text, question_type, category_id, group_id, is_required, display_order, placeholder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [question_code, question_text, question_type, category_id || null, group_id || null, is_required ?? true, display_order || 0, placeholder || null]
        );
        res.status(201).json({ message: 'Question created', question_id: result.insertId });
    } catch (error) { res.status(500).json({ error: 'Failed to create question' }); }
});

app.put('/api/admin/questions/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { question_text, question_type, is_required, display_order, is_active, placeholder } = req.body;
        await db.execute(
            'UPDATE questions SET question_text=?, question_type=?, is_required=?, display_order=?, is_active=?, placeholder=?, updated_at=NOW() WHERE question_id=?',
            [question_text, question_type, is_required, display_order, is_active, placeholder, req.params.id]
        );
        res.json({ message: 'Question updated' });
    } catch (error) { res.status(500).json({ error: 'Failed to update question' }); }
});

app.delete('/api/admin/questions/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.execute('UPDATE questions SET is_active = FALSE WHERE question_id = ?', [req.params.id]);
        res.json({ message: 'Question deactivated' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete question' }); }
});

// Question Options Management
app.get('/api/admin/questions/:id/options', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM question_options WHERE question_id = ? ORDER BY display_order',
            [req.params.id]
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch options' }); }
});

app.post('/api/admin/questions/:id/options', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { option_value, option_label, display_order } = req.body;
        const [result] = await db.execute(
            'INSERT INTO question_options (question_id, option_value, option_label, display_order) VALUES (?, ?, ?, ?)',
            [req.params.id, option_value, option_label, display_order || 0]
        );
        res.status(201).json({ message: 'Option created', option_id: result.insertId });
    } catch (error) { res.status(500).json({ error: 'Failed to create option' }); }
});

app.put('/api/admin/options/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { option_value, option_label, display_order } = req.body;
        await db.execute(
            'UPDATE question_options SET option_value=?, option_label=?, display_order=? WHERE option_id=?',
            [option_value, option_label, display_order, req.params.id]
        );
        res.json({ message: 'Option updated' });
    } catch (error) { res.status(500).json({ error: 'Failed to update option' }); }
});

app.delete('/api/admin/options/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.execute('DELETE FROM question_options WHERE option_id = ?', [req.params.id]);
        res.json({ message: 'Option deleted' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete option' }); }
});

app.get('/api/admin/categories', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM question_categories ORDER BY display_order');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch categories' }); }
});

app.post('/api/admin/categories', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { category_code, category_name, description, weight_percentage, display_order } = req.body;
        const [result] = await db.execute(
            'INSERT INTO question_categories (category_code, category_name, description, weight_percentage, display_order) VALUES (?, ?, ?, ?, ?)',
            [category_code, category_name, description || null, weight_percentage || null, display_order || 0]
        );
        res.status(201).json({ message: 'Category created', category_id: result.insertId });
    } catch (error) { 
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Category code already exists' });
        res.status(500).json({ error: 'Failed to create category' }); 
    }
});

app.put('/api/admin/categories/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { category_name, description, weight_percentage, display_order, is_active } = req.body;
        await db.execute(
            'UPDATE question_categories SET category_name=?, description=?, weight_percentage=?, display_order=?, is_active=? WHERE category_id=?',
            [category_name, description, weight_percentage, display_order, is_active, req.params.id]
        );
        res.json({ message: 'Category updated' });
    } catch (error) { res.status(500).json({ error: 'Failed to update category' }); }
});

app.delete('/api/admin/categories/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.execute('DELETE FROM question_categories WHERE category_id = ?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (error) { 
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete category with associated questions' });
        }
        res.status(500).json({ error: 'Failed to delete category' }); 
    }
});

app.get('/api/admin/groups', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT qg.*, qc.category_name 
            FROM question_groups qg
            LEFT JOIN question_categories qc ON qg.category_id = qc.category_id
            ORDER BY qc.display_order, qg.display_order
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch groups' }); }
});

// ─── SURVEY FORMS MANAGEMENT (Admin only) ─────────────────────────────────────

// Get all survey forms
app.get('/api/admin/forms', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT sf.*, u.name as created_by_name,
                   COUNT(fq.form_question_id) as question_count
            FROM survey_forms sf
            LEFT JOIN users u ON sf.created_by = u.user_id
            LEFT JOIN form_questions fq ON sf.form_id = fq.form_id
            GROUP BY sf.form_id
            ORDER BY sf.is_default DESC, sf.created_at DESC
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch forms' }); }
});

// Get single form with questions
app.get('/api/admin/forms/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [form] = await db.execute('SELECT * FROM survey_forms WHERE form_id = ?', [req.params.id]);
        if (form.length === 0) return res.status(404).json({ error: 'Form not found' });
        
        const [questions] = await db.execute(`
            SELECT fq.*, q.question_code, q.question_text, q.question_type, 
                   qc.category_name, q.is_required as original_required
            FROM form_questions fq
            JOIN questions q ON fq.question_id = q.question_id
            LEFT JOIN question_categories qc ON q.category_id = qc.category_id
            WHERE fq.form_id = ?
            ORDER BY fq.section_number, fq.display_order
        `, [req.params.id]);
        
        res.json({ ...form[0], questions });
    } catch (error) { res.status(500).json({ error: 'Failed to fetch form' }); }
});

// Create new form
app.post('/api/admin/forms', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { form_name, form_code, description, version, is_active, is_default } = req.body;
        
        // If setting as default, unset other defaults
        if (is_default) {
            await db.execute('UPDATE survey_forms SET is_default = FALSE');
        }
        
        const [result] = await db.execute(
            'INSERT INTO survey_forms (form_name, form_code, description, version, is_active, is_default, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [form_name, form_code, description || null, version || '1.0', is_active ?? true, is_default ?? false, req.user.user_id]
        );
        res.status(201).json({ message: 'Form created', form_id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Form code already exists' });
        res.status(500).json({ error: 'Failed to create form' });
    }
});

// Update form
app.put('/api/admin/forms/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { form_name, description, version, is_active, is_default } = req.body;
        
        // If setting as default, unset other defaults
        if (is_default) {
            await db.execute('UPDATE survey_forms SET is_default = FALSE WHERE form_id != ?', [req.params.id]);
        }
        
        await db.execute(
            'UPDATE survey_forms SET form_name=?, description=?, version=?, is_active=?, is_default=? WHERE form_id=?',
            [form_name, description, version, is_active, is_default, req.params.id]
        );
        res.json({ message: 'Form updated' });
    } catch (error) { res.status(500).json({ error: 'Failed to update form' }); }
});

// Delete form
app.delete('/api/admin/forms/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        // Check if it's the default form
        const [form] = await db.execute('SELECT is_default FROM survey_forms WHERE form_id = ?', [req.params.id]);
        if (form.length > 0 && form[0].is_default) {
            return res.status(400).json({ error: 'Cannot delete the default form' });
        }
        
        await db.execute('DELETE FROM survey_forms WHERE form_id = ?', [req.params.id]);
        res.json({ message: 'Form deleted' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete form' }); }
});

// Add question to form
app.post('/api/admin/forms/:id/questions', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { question_id, section_number, display_order, is_required_override } = req.body;
        const [result] = await db.execute(
            'INSERT INTO form_questions (form_id, question_id, section_number, display_order, is_required_override) VALUES (?, ?, ?, ?, ?)',
            [req.params.id, question_id, section_number || 1, display_order || 0, is_required_override]
        );
        res.status(201).json({ message: 'Question added to form', form_question_id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Question already in form' });
        res.status(500).json({ error: 'Failed to add question' });
    }
});

// Update question in form
app.put('/api/admin/forms/:formId/questions/:questionId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { section_number, display_order, is_required_override } = req.body;
        await db.execute(
            'UPDATE form_questions SET section_number=?, display_order=?, is_required_override=? WHERE form_id=? AND question_id=?',
            [section_number, display_order, is_required_override, req.params.formId, req.params.questionId]
        );
        res.json({ message: 'Question updated' });
    } catch (error) { res.status(500).json({ error: 'Failed to update question' }); }
});

// Remove question from form
app.delete('/api/admin/forms/:formId/questions/:questionId', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.execute('DELETE FROM form_questions WHERE form_id = ? AND question_id = ?', [req.params.formId, req.params.questionId]);
        res.json({ message: 'Question removed from form' });
    } catch (error) { res.status(500).json({ error: 'Failed to remove question' }); }
});

// ─── PUBLIC SURVEY LINKS ─────────────────────────────────────────────────────

app.get('/api/admin/public-links', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT pl.*, 0 as response_count
            FROM public_survey_links pl
            ORDER BY pl.created_at DESC
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch links' }); }
});

app.post('/api/admin/public-links', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { label, expires_at } = req.body;
        const token = require('crypto').randomBytes(24).toString('hex');
        const [result] = await db.execute(
            'INSERT INTO public_survey_links (token, label, expires_at, created_by) VALUES (?, ?, ?, ?)',
            [token, label || 'Survey Link', expires_at || null, req.user.user_id]
        );
        res.status(201).json({ id: result.insertId, token });
    } catch (error) { res.status(500).json({ error: 'Failed to create link' }); }
});

app.delete('/api/admin/public-links/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.execute('UPDATE public_survey_links SET is_active = FALSE WHERE id = ?', [req.params.id]);
        res.json({ message: 'Link revoked' });
    } catch (error) { res.status(500).json({ error: 'Failed to revoke link' }); }
});

app.delete('/api/admin/public-links/:id/permanent', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        await db.execute('DELETE FROM public_survey_links WHERE id = ?', [req.params.id]);
        res.json({ message: 'Link deleted' });
    } catch (error) { res.status(500).json({ error: 'Failed to delete link' }); }
});

// Public: validate token and return link info
app.get('/api/public-survey/:token', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM public_survey_links WHERE token = ? AND is_active = TRUE',
            [req.params.token]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Invalid or revoked link' });
        const link = rows[0];
        if (link.expires_at && new Date(link.expires_at) < new Date())
            return res.status(410).json({ error: 'Link has expired', expires_at: link.expires_at });
        res.json({ label: link.label });
    } catch (error) { res.status(500).json({ error: 'Failed to validate link' }); }
});

// ─── USER PROFILE ────────────────────────────────────────────────────────────

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?',
            [req.user.user_id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch { res.status(500).json({ error: 'Failed to fetch profile' }); }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, current_password, new_password } = req.body;
        if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

        const [rows] = await db.execute('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = rows[0];

        // Check email uniqueness if changed
        if (email !== user.email) {
            const [dup] = await db.execute('SELECT user_id FROM users WHERE email = ? AND user_id != ?', [email, user.user_id]);
            if (dup.length > 0) return res.status(400).json({ error: 'Email already in use' });
        }

        if (new_password) {
            if (!current_password) return res.status(400).json({ error: 'Current password is required to set a new password' });
            const valid = await bcrypt.compare(current_password, user.password);
            if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
            const hashed = await bcrypt.hash(new_password, 10);
            await db.execute('UPDATE users SET name=?, email=?, password=?, updated_at=NOW() WHERE user_id=?', [name, email, hashed, user.user_id]);
        } else {
            await db.execute('UPDATE users SET name=?, email=?, updated_at=NOW() WHERE user_id=?', [name, email, user.user_id]);
        }

        res.json({ message: 'Profile updated', user: { user_id: user.user_id, name, email, role: user.role } });
    } catch { res.status(500).json({ error: 'Failed to update profile' }); }
});

// ─── LEGACY FILE IMPORT (Admin only) ────────────────────────────────────────

const csvParse = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    return lines.slice(1).map(line => {
        const vals = [];
        let cur = '', inQ = false;
        for (const ch of line) {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
            else cur += ch;
        }
        vals.push(cur.trim());
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
        return row;
    });
};

// GET list of imported legacy files
app.get('/api/admin/imported-files', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT f.*, u.name as uploaded_by_name
            FROM imported_files f
            LEFT JOIN users u ON f.uploaded_by = u.user_id
            ORDER BY f.uploaded_at DESC
        `);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch imported files' }); }
});

// POST upload and import legacy Excel/CSV file
app.post('/api/admin/import-legacy', authenticateToken, requireRole('admin'), upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const { year, label } = req.body;

    let rows = [];
    try {
        if (ext === '.csv') {
            const text = fs.readFileSync(filePath, 'utf8');
            rows = csvParse(text);
        } else if (ext === '.xlsx' || ext === '.xls') {
            const wb = xlsx.readFile(filePath);
            const sheetName = wb.SheetNames[0];
            rows = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
        } else {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Only .csv, .xlsx, .xls files are supported' });
        }
    } catch (err) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ error: 'Failed to parse file: ' + err.message });
    }

    // Normalize column names (lowercase, trim, replace spaces with underscores)
    const normalize = (key) => key.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    rows = rows.map(row => {
        const n = {};
        for (const k of Object.keys(row)) n[normalize(k)] = row[k];
        return n;
    });

    // Determine submission year from param or file data
    const submissionYear = year ? parseInt(year) : new Date().getFullYear();

    let inserted = 0, skipped = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
        const d = rows[i];
        if (!d.university_name && !d.auditor_name) { skipped++; continue; }

        // Build audit_date from year if not present
        if (!d.audit_date && submissionYear) d.audit_date = `${submissionYear}-01-01`;

        // Duplicate check
        if (d.auditor_email && d.university_name && d.audit_date) {
            const [dup] = await db.execute(`
                SELECT s.survey_id FROM surveys s
                JOIN audit_information ai ON s.survey_id = ai.survey_id
                JOIN campus_information ci ON s.survey_id = ci.survey_id
                WHERE ai.auditor_email = ? AND ci.university_name = ? AND DATE(ai.audit_date) = DATE(?)
                LIMIT 1
            `, [d.auditor_email, d.university_name, d.audit_date]);
            if (dup.length > 0) { skipped++; errors.push(`Row ${i + 1}: Duplicate — ${d.university_name}`); continue; }
        }

        await db.beginTransaction();
        try {
            const submissionDate = d.audit_date || `${submissionYear}-06-01`;
            const [sr] = await db.execute(
                'INSERT INTO surveys (assessment_round, semester, submitted_by, submission_date) VALUES (?, ?, ?, ?)',
                [toNum(d.assessment_round) || 1, d.semester || 'Fall', d.submitted_by || d.auditor_name || 'Legacy Import', submissionDate]
            );
            const sid = sr.insertId;

            await db.execute(`INSERT INTO audit_information
                (survey_id,auditor_name,auditor_affiliation,auditor_email,audit_date,audit_start_time,audit_end_time,
                 received_training,training_type_online,training_type_in_person,training_type_self_guided,
                 primary_dining_time,info_source_online_docs,info_source_site_visit,info_source_online_comms,info_source_other)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, d.auditor_name||null, d.auditor_affiliation||null, d.auditor_email||null,
                 d.audit_date||null, d.audit_start_time||null, d.audit_end_time||null,
                 toBool(d.received_training), toBool(d.training_type_online),
                 toBool(d.training_type_in_person), toBool(d.training_type_self_guided),
                 d.primary_dining_time||null, toBool(d.info_source_online_docs),
                 toBool(d.info_source_site_visit), toBool(d.info_source_online_comms), d.info_source_other||null]
            );

            await db.execute(`INSERT INTO campus_information
                (survey_id,university_name,city,province_state,institution_type,campus_setting,
                 provider_type_university_operated,provider_type_franchised,provider_type_grab_and_go,
                 provider_type_vending,provider_type_independent)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, d.university_name||null, d.city||null, d.province_state||null,
                 d.institution_type||null, d.campus_setting||null,
                 toBool(d.provider_type_university_operated), toBool(d.provider_type_franchised),
                 toBool(d.provider_type_grab_and_go), toBool(d.provider_type_vending), toBool(d.provider_type_independent)]
            );

            await db.execute(`INSERT INTO context_metrics
                (survey_id,total_food_providers,university_operated_units,venues_with_nutritious_items,
                 venues_with_vegan_veg,venues_with_religious_inclusive,venues_with_dietary_restrictions,
                 venues_with_cultural_inclusive,venues_open_24_7,venues_open_until_9pm,venues_open_year_round,
                 total_students_enrolled,undergraduate_students,graduate_students,students_with_meal_plan,
                 total_employees,part_time_employees,full_time_employees,total_food_service_employees,
                 student_food_service_workers,part_time_food_service,full_time_food_service,
                 annual_sales_total,annual_sales_franchise,annual_sales_grab_and_go,annual_sales_vending)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, toNum(d.total_food_providers)||0, toNum(d.university_operated_units),
                 toNum(d.venues_with_nutritious_items), toNum(d.venues_with_vegan_veg),
                 toNum(d.venues_with_religious_inclusive), toNum(d.venues_with_dietary_restrictions),
                 toNum(d.venues_with_cultural_inclusive), toNum(d.venues_open_24_7),
                 toNum(d.venues_open_until_9pm), toNum(d.venues_open_year_round),
                 toNum(d.total_students_enrolled), toNum(d.undergraduate_students), toNum(d.graduate_students),
                 toNum(d.students_with_meal_plan), toNum(d.total_employees), toNum(d.part_time_employees),
                 toNum(d.full_time_employees), toNum(d.total_food_service_employees),
                 toNum(d.student_food_service_workers), toNum(d.part_time_food_service), toNum(d.full_time_food_service),
                 toNum(d.annual_sales_total), toNum(d.annual_sales_franchise),
                 toNum(d.annual_sales_grab_and_go), toNum(d.annual_sales_vending)]
            );

            await db.execute(`INSERT INTO checklist_responses
                (survey_id,q1_food_sustainability_strategy,q2_named_person_committee,q3_dedicated_budget,
                 q4_dedicated_leadership_staffing,q5_dedicated_budget_line,q6_metrics_tracked_reported,
                 q7_require_nutritious_item,q8_require_basic_sustainability,q9_stakeholder_input_channel,
                 q10_curricular_programs,q11_student_innovation_programs,q12_food_security_programs,
                 q13_food_bank_eligibility_open,q13_food_bank_eligibility_limited,
                 q13_food_bank_eligibility_frequency_caps,q13_food_bank_eligibility_unclear,q14_labor_ethical_standards)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, toBool(d.q1_food_sustainability_strategy), toBool(d.q2_named_person_committee),
                 toBool(d.q3_dedicated_budget), toBool(d.q4_dedicated_leadership_staffing),
                 toBool(d.q5_dedicated_budget_line), toBool(d.q6_metrics_tracked_reported),
                 toBool(d.q7_require_nutritious_item), toBool(d.q8_require_basic_sustainability),
                 toBool(d.q9_stakeholder_input_channel), toBool(d.q10_curricular_programs),
                 toBool(d.q11_student_innovation_programs), toBool(d.q12_food_security_programs),
                 toBool(d.q13_food_bank_eligibility_open), toBool(d.q13_food_bank_eligibility_limited),
                 toBool(d.q13_food_bank_eligibility_frequency_caps), toBool(d.q13_food_bank_eligibility_unclear),
                 toBool(d.q14_labor_ethical_standards)]
            );

            await db.execute(`INSERT INTO governance_indicators
                (survey_id,leadership_strategy_comprehensiveness,leadership_strategy_inclusion,
                 leadership_support_extent,leadership_local_procurement,leadership_waste_reduction,
                 leadership_energy_water_conservation,leadership_culture_promotion,leadership_nutritious_item_requirement,
                 policy_cross_unit_coordination,policy_sustainable_diet_principles,policy_environmental_alignment,
                 policy_ethical_fair_trade,policy_environmental_sustainability,policy_nutritional_labeling,
                 policy_direct_sales,policy_waste_management,policy_packaging_recycling)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, toNum(d.leadership_strategy_comprehensiveness), toNum(d.leadership_strategy_inclusion),
                 toNum(d.leadership_support_extent), toNum(d.leadership_local_procurement),
                 toNum(d.leadership_waste_reduction), toNum(d.leadership_energy_water_conservation),
                 toNum(d.leadership_culture_promotion), toNum(d.leadership_nutritious_item_requirement),
                 toNum(d.policy_cross_unit_coordination), toNum(d.policy_sustainable_diet_principles),
                 toNum(d.policy_environmental_alignment), toNum(d.policy_ethical_fair_trade),
                 toNum(d.policy_environmental_sustainability), toNum(d.policy_nutritional_labeling),
                 toNum(d.policy_direct_sales), toNum(d.policy_waste_management), toNum(d.policy_packaging_recycling)]
            );

            await db.execute(`INSERT INTO wrap_up_responses
                (survey_id,info_source_publicly_available,info_source_internal_docs,info_source_direct_observation,
                 info_source_staff_consultation,info_source_not_accessible,confidence_level,
                 constraint_access_internal_docs,constraint_access_hr_labor,constraint_time_capacity,
                 constraint_multiple_departments,constraint_seasonal_limits,constraint_vendor_data,
                 constraint_unclear_wording,constraint_other,factor_urban_off_campus,factor_vendor_operated,
                 factor_university_operated,factor_low_activity_term,factor_limited_day_part,factor_other)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [sid, toNum(d.info_source_publicly_available), toNum(d.info_source_internal_docs),
                 toNum(d.info_source_direct_observation), toNum(d.info_source_staff_consultation),
                 toNum(d.info_source_not_accessible), toNum(d.confidence_level),
                 toBool(d.constraint_access_internal_docs), toBool(d.constraint_access_hr_labor),
                 toBool(d.constraint_time_capacity), toBool(d.constraint_multiple_departments),
                 toBool(d.constraint_seasonal_limits), toBool(d.constraint_vendor_data),
                 toBool(d.constraint_unclear_wording), d.constraint_other||null,
                 toBool(d.factor_urban_off_campus), toBool(d.factor_vendor_operated),
                 toBool(d.factor_university_operated), toBool(d.factor_low_activity_term),
                 toBool(d.factor_limited_day_part), d.factor_other||null]
            );

            const scores = calculateCategoryScores(d);
            await db.execute(`INSERT INTO survey_scores
                (survey_id,checklists_raw_score,governance_raw_score,university_level_raw_score,overall_score,performance_rating)
                VALUES (?,?,?,?,?,?)`,
                [sid, scores.checklists||0, scores.leadership||0, scores.policies||0,
                 scores.overall||0, calculatePerformanceRating(scores.overall)]
            );

            await db.commit();
            inserted++;
        } catch (err) {
            await db.rollback();
            errors.push(`Row ${i + 1}: ${err.message}`);
        }
    }

    // Record the import in imported_files table
    try {
        await db.execute(
            'INSERT INTO imported_files (original_name, file_type, row_count, inserted_count, skipped_count, data_year, label, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [originalName, ext.replace('.', ''), rows.length, inserted, skipped, submissionYear, label || originalName, req.user.user_id]
        );
    } catch (e) { console.error('Failed to record import:', e.message); }

    // Clean up temp file
    try { fs.unlinkSync(filePath); } catch {}

    res.json({ success: true, inserted, skipped, errors, total: rows.length, fileName: originalName });
});

// ─── SEND SURVEY LINK VIA EMAIL ─────────────────────────────────────────────

const nodemailer = require('nodemailer');

app.post('/api/admin/send-survey-link', authenticateToken, requireRole('admin'), async (req, res) => {
    const { recipients, url, label, message } = req.body;
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0)
        return res.status(400).json({ error: 'At least one recipient email is required' });
    if (!url) return res.status(400).json({ error: 'Survey URL is required' });

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const customMsg = message ? `<p style="color:#374151;margin:0 0 16px">${message}</p>` : '';
    const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#4f46e5;padding:24px 32px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:20px">SCF-EAT Survey</h1>
          </div>
          <div style="background:#f9fafb;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="color:#111827;margin:0 0 8px;font-size:16px">${label || 'Survey Invitation'}</h2>
            <p style="color:#6b7280;margin:0 0 20px;font-size:14px">You have been invited to complete a food system survey.</p>
            ${customMsg}
            <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Fill Out Survey</a>
            <p style="color:#9ca3af;font-size:12px;margin:20px 0 0">Or copy this link: <a href="${url}" style="color:#4f46e5">${url}</a></p>
          </div>
        </div>`;

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: recipients.join(', '),
            subject: `Survey Invitation: ${label || 'SCF-EAT Survey'}`,
            html
        });
        res.json({ message: `Email sent to ${recipients.length} recipient(s)` });
    } catch (err) {
        console.error('Email send error:', err.message);
        res.status(500).json({ error: 'Failed to send email: ' + err.message });
    }
});

// Start server
initDB().then(async () => {
    // Create survey form tables if they don't exist
    await db.execute(`
        CREATE TABLE IF NOT EXISTS public_survey_links (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(64) UNIQUE NOT NULL,
            label VARCHAR(255) DEFAULT 'Survey Link',
            is_active BOOLEAN DEFAULT TRUE,
            expires_at DATE NULL,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(user_id),
            INDEX idx_token (token)
        )
    `).catch(e => console.error('public_survey_links table error:', e.message));

    await db.execute(`
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
            INDEX idx_is_active (is_active)
        )
    `).catch(() => {});
    
    await db.execute(`
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
            INDEX idx_form_id (form_id)
        )
    `).catch(() => {});
    
    await db.execute(`
        CREATE TABLE IF NOT EXISTS imported_files (
            id INT AUTO_INCREMENT PRIMARY KEY,
            original_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(10),
            row_count INT DEFAULT 0,
            inserted_count INT DEFAULT 0,
            skipped_count INT DEFAULT 0,
            data_year INT,
            label VARCHAR(255),
            uploaded_by INT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
        )
    `).catch(() => {});

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});