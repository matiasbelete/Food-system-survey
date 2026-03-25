import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { 
  CalendarIcon, 
  UserIcon, 
  AcademicCapIcon, 
  BuildingLibraryIcon, 
  ChartBarIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusCircleIcon,
  MinusCircleIcon
} from '@heroicons/react/24/outline';

const SurveyForm = ({ token = null, initialData = null, initialSection = 1 }) => {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState(initialSection || 1);
  const [formData, setFormData] = useState({
    // Section 1: Auditor & Audit Information
    auditor_name: '',
    auditor_affiliation: '',
    auditor_email: '',
    audit_date: null,
    audit_start_time: '',
    audit_end_time: '',
    received_training: false,
    training_type_online: false,
    training_type_in_person: false,
    training_type_self_guided: false,
    training_type_other: '',
    primary_dining_time: '',
    info_source_online_docs: false,
    info_source_site_visit: false,
    info_source_online_comms: false,
    info_source_other: '',

    // Section 2: Campus Information
    university_name: '',
    city: '',
    province_state: '',
    institution_type: '',
    campus_setting: '',
    provider_types: [],

    // Section 3: Context Metrics
    total_food_providers: '',
    university_operated_units: '',
    university_controlled_units: '',
    non_food_service_units: '',
    franchise_units: '',
    vending_machines: '',
    grab_and_go_providers: '',
    off_campus_affiliated_units: '',
    
    venues_with_nutritious_items: '',
    venues_with_vegan_veg: '',
    venues_with_religious_inclusive: '',
    venues_with_dietary_restrictions: '',
    venues_with_cultural_inclusive: '',
    
    venues_open_24_7: '',
    venues_open_until_9pm: '',
    venues_open_year_round: '',
    
    operation_models: [],
    
    total_students_enrolled: '',
    undergraduate_students: '',
    graduate_students: '',
    students_with_meal_plan: '',
    total_employees: '',
    part_time_employees: '',
    full_time_employees: '',
    total_food_service_employees: '',
    student_food_service_workers: '',
    part_time_food_service: '',
    full_time_food_service: '',
    
    annual_sales_total: '',
    annual_sales_franchise: '',
    annual_sales_grab_and_go: '',
    annual_sales_vending: '',

    // Section 4: Checklist (14 Questions)
    q1_food_sustainability_strategy: null,
    q2_named_person_committee: null,
    q3_dedicated_budget: null,
    q4_dedicated_leadership_staffing: null,
    q5_dedicated_budget_line: null,
    q6_metrics_tracked_reported: null,
    q7_require_nutritious_item: null,
    q8_require_basic_sustainability: null,
    q9_stakeholder_input_channel: null,
    q10_curricular_programs: null,
    q11_student_innovation_programs: null,
    q12_food_security_programs: null,
    q13_food_bank_eligibility_open: false,
    q13_food_bank_eligibility_limited: false,
    q13_food_bank_eligibility_frequency_caps: false,
    q13_food_bank_eligibility_unclear: false,
    q14_labor_ethical_standards: null,

    // Section 5: Governance Indicators (17 Questions)
    leadership_strategy_comprehensiveness: null,
    leadership_strategy_inclusion: null,
    leadership_support_extent: null,
    leadership_local_procurement: null,
    leadership_waste_reduction: null,
    leadership_energy_water_conservation: null,
    leadership_culture_promotion: null,
    leadership_nutritious_item_requirement: null,
    
    policy_cross_unit_coordination: null,
    policy_sustainable_diet_principles: null,
    policy_environmental_alignment: null,
    policy_ethical_fair_trade: null,
    policy_environmental_sustainability: null,
    policy_nutritional_labeling: null,
    policy_direct_sales: null,
    policy_waste_management: null,
    policy_packaging_recycling: null,

    // Section 6: Wrap-up Questions
    info_source_publicly_available: '',
    info_source_internal_docs: '',
    info_source_direct_observation: '',
    info_source_staff_consultation: '',
    info_source_not_accessible: '',
    confidence_level: null,
    constraints: [],
    factors: [],
    constraints_other: '',
    factors_other: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedSections, setCompletedSections] = useState([]);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
      if (initialSection) setCurrentSection(initialSection);
    }
  }, [initialData]);

  const saveDraft = async () => {
    if (!token) return;
    try {
      await axios.post('http://localhost:5000/api/drafts',
        { form_data: formData, current_section: currentSection },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    } catch {}
  };

  // Provider type options
  const providerTypeOptions = [
    { value: 'university_operated', label: 'University-operated' },
    { value: 'franchised', label: 'Franchised' },
    { value: 'grab_and_go', label: 'Grab-and-go' },
    { value: 'vending_machines', label: 'Vending machines' },
    { value: 'independent_vendors', label: 'Independent vendors' }
  ];

  // Operation model options
  const operationModelOptions = [
    { value: 'centralized', label: 'Centralized' },
    { value: 'decentralized', label: 'Decentralized' },
    { value: 'mixed', label: 'Mixed' }
  ];

  // Constraint options
  const constraintOptions = [
    { value: 'access_internal_docs', label: 'Access to internal documents' },
    { value: 'access_hr_labor', label: 'Access to HR/labor data' },
    { value: 'time_capacity', label: 'Time/capacity constraints' },
    { value: 'multiple_departments', label: 'Multiple departments involved' },
    { value: 'seasonal_limits', label: 'Seasonal/time-of-year limits' },
    { value: 'vendor_data', label: 'Vendor data limitations' },
    { value: 'unclear_wording', label: 'Unclear wording in documents' }
  ];

  // Factor options
  const factorOptions = [
    { value: 'urban_off_campus', label: 'Urban/off-campus setting' },
    { value: 'vendor_operated', label: 'Vendor-operated services' },
    { value: 'university_operated', label: 'University-operated services' },
    { value: 'low_activity_term', label: 'Low activity term' },
    { value: 'limited_day_part', label: 'Limited day part' }
  ];

  const sectionTitles = [
    'Auditor & Audit Information',
    'Campus Information', 
    'Context Metrics',
    'Checklist Questions',
    'Governance Indicators',
    'Wrap-up Questions'
  ];

  const sectionIcons = [
    <UserIcon className="w-5 h-5" />,
    <BuildingLibraryIcon className="w-5 h-5" />,
    <ChartBarIcon className="w-5 h-5" />,
    <CheckCircleIcon className="w-5 h-5" />,
    <ExclamationTriangleIcon className="w-5 h-5" />,
    <CalendarIcon className="w-5 h-5" />
  ];

  const sectionColors = [
    'indigo', 'violet', 'blue', 'amber', 'emerald', 'rose'
  ];

  const inputCls = (hasError) =>
    `w-full px-4 py-2.5 border-2 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-0 transition-colors ${
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-indigo-500'
    }`;

  const subHeadCls = 'flex items-center space-x-2 mb-5';
  const subHeadTextCls = 'text-base font-bold text-gray-800 uppercase tracking-wide';

  const validateSection = (section) => {
    const newErrors = {};

    switch (section) {
      case 1: {
        // Name
        if (!formData.auditor_name.trim()) newErrors.auditor_name = 'Auditor name is required';

        // Email format
        if (!formData.auditor_email.trim()) newErrors.auditor_email = 'Auditor email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.auditor_email)) newErrors.auditor_email = 'Enter a valid email (e.g. name@example.com)';

        // Affiliation
        if (!formData.auditor_affiliation.trim()) newErrors.auditor_affiliation = 'Auditor affiliation is required';

        // Date: required and not in the future
        if (!formData.audit_date) {
          newErrors.audit_date = 'Audit date is required';
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (new Date(formData.audit_date) > today) newErrors.audit_date = 'Audit date cannot be in the future';
        }

        // Start time required
        if (!formData.audit_start_time) newErrors.audit_start_time = 'Audit start time is required';

        // End time required and must be after start time
        if (!formData.audit_end_time) {
          newErrors.audit_end_time = 'Audit end time is required';
        } else if (formData.audit_start_time) {
          const [sh, sm] = formData.audit_start_time.split(':').map(Number);
          const [eh, em] = formData.audit_end_time.split(':').map(Number);
          if (eh * 60 + em <= sh * 60 + sm) {
            newErrors.audit_end_time = 'End time must be after start time';
          }
        }

        // Primary dining time (radio/select — required)
        if (!formData.primary_dining_time) newErrors.primary_dining_time = 'Primary dining time is required';

        // Assessment round required
        if (!formData.assessment_round) newErrors.assessment_round = 'Assessment round is required';

        // Info sources: at least one checkbox required
        const hasInfoSource = formData.info_source_online_docs || formData.info_source_site_visit ||
          formData.info_source_online_comms || formData.info_source_other.trim();
        if (!hasInfoSource) newErrors.info_sources = 'Select at least one information source';

        // If training received, at least one training type must be checked
        if (formData.received_training) {
          const hasTrainingType = formData.training_type_online || formData.training_type_in_person ||
            formData.training_type_self_guided || formData.training_type_other.trim();
          if (!hasTrainingType) newErrors.training_type = 'Select at least one training type';
        }
        break;
      }

      case 2: {
        if (!formData.university_name.trim()) newErrors.university_name = 'University name is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.province_state.trim()) newErrors.province_state = 'Province/State is required';
        if (!formData.institution_type) newErrors.institution_type = 'Institution type is required';
        if (!formData.campus_setting) newErrors.campus_setting = 'Campus setting is required';
        if (formData.provider_types.length === 0) newErrors.provider_types = 'At least one provider type is required';
        break;
      }

      case 3: {
        if (!formData.total_food_providers) newErrors.total_food_providers = 'Total food providers is required';
        else if (parseInt(formData.total_food_providers) < 1) newErrors.total_food_providers = 'Must be at least 1';
        if (!formData.university_operated_units && formData.university_operated_units !== 0) newErrors.university_operated_units = 'University operated units is required';
        if (!formData.total_students_enrolled) newErrors.total_students_enrolled = 'Total students enrolled is required';
        if (!formData.undergraduate_students && formData.undergraduate_students !== 0) newErrors.undergraduate_students = 'Undergraduate students is required';
        if (!formData.graduate_students && formData.graduate_students !== 0) newErrors.graduate_students = 'Graduate students is required';
        if (!formData.annual_sales_total && formData.annual_sales_total !== 0) newErrors.annual_sales_total = 'Total annual sales is required';
        break;
      }

      case 4: {
        const checklistQuestions = [
          'q1_food_sustainability_strategy', 'q2_named_person_committee', 'q3_dedicated_budget',
          'q4_dedicated_leadership_staffing', 'q5_dedicated_budget_line', 'q6_metrics_tracked_reported',
          'q7_require_nutritious_item', 'q8_require_basic_sustainability', 'q9_stakeholder_input_channel',
          'q10_curricular_programs', 'q11_student_innovation_programs', 'q12_food_security_programs',
          'q14_labor_ethical_standards'
        ];
        for (const question of checklistQuestions) {
          if (formData[question] === null) newErrors[question] = 'Please select Yes or No';
        }
        // Food bank eligibility: at least one checkbox required
        const hasFoodBank = formData.q13_food_bank_eligibility_open || formData.q13_food_bank_eligibility_limited ||
          formData.q13_food_bank_eligibility_frequency_caps || formData.q13_food_bank_eligibility_unclear;
        if (!hasFoodBank) newErrors.q13_food_bank = 'Select at least one food bank eligibility option';
        break;
      }

      case 5: {
        const governanceQuestions = [
          'leadership_strategy_comprehensiveness', 'leadership_strategy_inclusion', 'leadership_support_extent',
          'leadership_local_procurement', 'leadership_waste_reduction', 'leadership_energy_water_conservation',
          'leadership_culture_promotion', 'leadership_nutritious_item_requirement', 'policy_cross_unit_coordination',
          'policy_sustainable_diet_principles', 'policy_environmental_alignment', 'policy_ethical_fair_trade',
          'policy_environmental_sustainability', 'policy_nutritional_labeling', 'policy_direct_sales',
          'policy_waste_management', 'policy_packaging_recycling'
        ];
        for (const question of governanceQuestions) {
          if (formData[question] === null) newErrors[question] = 'Please select a rating';
        }
        break;
      }

      case 6: {
        const percentages = [
          parseInt(formData.info_source_publicly_available || 0),
          parseInt(formData.info_source_internal_docs || 0),
          parseInt(formData.info_source_direct_observation || 0),
          parseInt(formData.info_source_staff_consultation || 0),
          parseInt(formData.info_source_not_accessible || 0)
        ];
        const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);
        if (totalPercentage !== 100) newErrors.percentages = `Percentages must sum to 100% (currently ${totalPercentage}%)`;
        if (formData.confidence_level === null) newErrors.confidence_level = 'Please select a confidence level';
        break;
      }

      default: break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateSection(currentSection)) {
      setCompletedSections(prev => prev.includes(currentSection) ? prev : [...prev, currentSection]);
      setCurrentSection(currentSection + 1);
      setSubmitError('');
    }
  };

  const handleBack = () => {
    setCurrentSection(currentSection - 1);
    setSubmitError('');
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMultiSelectChange = (field, selectedOptions) => {
    setFormData(prev => ({
      ...prev,
      [field]: selectedOptions ? selectedOptions.map(opt => opt.value) : []
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all sections
    for (let i = 1; i <= 6; i++) {
      if (!validateSection(i)) {
        setCurrentSection(i);
        setSubmitError('Please complete all required fields before submitting.');
        return;
      }
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      await axios.post('http://localhost:5000/api/surveys', formData);
      if (token) {
        try { await axios.delete('http://localhost:5000/api/drafts', { headers: { Authorization: `Bearer ${token}` } }); } catch {}
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Submission error:', error);
      if (error.response?.status === 409) {
        setSubmitError(error.response.data.error);
      } else {
        setSubmitError('Failed to submit survey. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSection = () => {
    switch (currentSection) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auditor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.auditor_name}
                  onChange={(e) => handleInputChange('auditor_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.auditor_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter auditor name"
                />
                {errors.auditor_name && <p className="text-red-500 text-sm mt-1">{errors.auditor_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auditor Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.auditor_email}
                  onChange={(e) => handleInputChange('auditor_email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.auditor_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter auditor email"
                />
                {errors.auditor_email && <p className="text-red-500 text-sm mt-1">{errors.auditor_email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auditor Affiliation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.auditor_affiliation}
                  onChange={(e) => handleInputChange('auditor_affiliation', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.auditor_affiliation ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter affiliation"
                />
                {errors.auditor_affiliation && <p className="text-red-500 text-sm mt-1">{errors.auditor_affiliation}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audit Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={formData.audit_date}
                  onChange={(date) => handleInputChange('audit_date', date)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.audit_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholderText="Select audit date"
                />
                {errors.audit_date && <p className="text-red-500 text-sm mt-1">{errors.audit_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audit Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.audit_start_time}
                  onChange={(e) => handleInputChange('audit_start_time', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.audit_start_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.audit_start_time && <p className="text-red-500 text-sm mt-1">{errors.audit_start_time}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audit End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.audit_end_time}
                  onChange={(e) => handleInputChange('audit_end_time', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.audit_end_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.audit_end_time && <p className="text-red-500 text-sm mt-1">{errors.audit_end_time}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Dining Time <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.primary_dining_time}
                  onChange={(e) => handleInputChange('primary_dining_time', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.primary_dining_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select primary dining time</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Multiple day parts">Multiple day parts</option>
                </select>
                {errors.primary_dining_time && <p className="text-red-500 text-sm mt-1">{errors.primary_dining_time}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Round <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.assessment_round || ''}
                  onChange={(e) => handleInputChange('assessment_round', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.assessment_round ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select round</option>
                  <option value="1">First-time</option>
                  <option value="2">Second</option>
                  <option value="3">Third+</option>
                </select>
                {errors.assessment_round && <p className="text-red-500 text-sm mt-1">{errors.assessment_round}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Information Sources <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.info_source_online_docs} onChange={(e) => handleInputChange('info_source_online_docs', e.target.checked)} className="mr-2" />
                  Online documents
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.info_source_site_visit} onChange={(e) => handleInputChange('info_source_site_visit', e.target.checked)} className="mr-2" />
                  Site visit
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.info_source_online_comms} onChange={(e) => handleInputChange('info_source_online_comms', e.target.checked)} className="mr-2" />
                  Online communications
                </label>
                <div className="flex items-center">
                  <input type="checkbox" checked={formData.info_source_other !== ''} onChange={(e) => { if (!e.target.checked) handleInputChange('info_source_other', ''); }} className="mr-2" />
                  <input type="text" value={formData.info_source_other} onChange={(e) => handleInputChange('info_source_other', e.target.value)} placeholder="Other (specify)" className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
              </div>
              {errors.info_sources && <p className="text-red-500 text-sm mt-1">{errors.info_sources}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Training Received</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.received_training}
                    onChange={(e) => handleInputChange('received_training', e.target.checked)}
                    className="mr-2"
                  />
                  Yes, training received
                </label>
              </div>
            </div>

            {formData.received_training && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Training Type <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  <label className="flex items-center"><input type="checkbox" checked={formData.training_type_online} onChange={(e) => handleInputChange('training_type_online', e.target.checked)} className="mr-2" />Online</label>
                  <label className="flex items-center"><input type="checkbox" checked={formData.training_type_in_person} onChange={(e) => handleInputChange('training_type_in_person', e.target.checked)} className="mr-2" />In-person workshop</label>
                  <label className="flex items-center"><input type="checkbox" checked={formData.training_type_self_guided} onChange={(e) => handleInputChange('training_type_self_guided', e.target.checked)} className="mr-2" />Self-guided</label>
                  <div className="flex items-center">
                    <input type="checkbox" checked={formData.training_type_other !== ''} onChange={(e) => { if (!e.target.checked) handleInputChange('training_type_other', ''); }} className="mr-2" />
                    <input type="text" value={formData.training_type_other} onChange={(e) => handleInputChange('training_type_other', e.target.value)} placeholder="Other (specify)" className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
                {errors.training_type && <p className="text-red-500 text-sm mt-1">{errors.training_type}</p>}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  University/College Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.university_name}
                  onChange={(e) => handleInputChange('university_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.university_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter university name"
                />
                {errors.university_name && <p className="text-red-500 text-sm mt-1">{errors.university_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.city ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter city"
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Province/State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.province_state}
                  onChange={(e) => handleInputChange('province_state', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.province_state ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter province/state"
                />
                {errors.province_state && <p className="text-red-500 text-sm mt-1">{errors.province_state}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.institution_type}
                  onChange={(e) => handleInputChange('institution_type', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.institution_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select institution type</option>
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                </select>
                {errors.institution_type && <p className="text-red-500 text-sm mt-1">{errors.institution_type}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campus Setting <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.campus_setting}
                  onChange={(e) => handleInputChange('campus_setting', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.campus_setting ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select campus setting</option>
                  <option value="Campus-based/self-contained">Campus-based/self-contained</option>
                  <option value="Urban/city-center">Urban/city-center</option>
                  <option value="Mixed/distributed">Mixed/distributed</option>
                </select>
                {errors.campus_setting && <p className="text-red-500 text-sm mt-1">{errors.campus_setting}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Food Service Providers <span className="text-red-500">*</span>
              </label>
              <Select
                isMulti
                options={providerTypeOptions}
                value={providerTypeOptions.filter(option => 
                  formData.provider_types.includes(option.value)
                )}
                onChange={selectedOptions => handleMultiSelectChange('provider_types', selectedOptions)}
                className={`react-select-container ${errors.provider_types ? 'error' : ''}`}
                classNamePrefix="react-select"
                placeholder="Select provider types..."
              />
              {errors.provider_types && <p className="text-red-500 text-sm mt-1">{errors.provider_types}</p>}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Venue Related Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Food Providers</label>
                  <input
                    type="number"
                    value={formData.total_food_providers}
                    onChange={(e) => handleInputChange('total_food_providers', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.total_food_providers ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.total_food_providers && <p className="text-red-500 text-sm mt-1">{errors.total_food_providers}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    University-operated Units <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.university_operated_units}
                    onChange={(e) => handleInputChange('university_operated_units', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.university_operated_units ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.university_operated_units && <p className="text-red-500 text-sm mt-1">{errors.university_operated_units}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Franchise Units</label>
                  <input
                    type="number"
                    value={formData.franchise_units}
                    onChange={(e) => handleInputChange('franchise_units', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vending Machines</label>
                  <input
                    type="number"
                    value={formData.vending_machines}
                    onChange={(e) => handleInputChange('vending_machines', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Nutritional & Inclusive Options</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venues with Nutritious Items</label>
                  <input
                    type="number"
                    value={formData.venues_with_nutritious_items}
                    onChange={(e) => handleInputChange('venues_with_nutritious_items', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venues with Vegan/Vegetarian</label>
                  <input
                    type="number"
                    value={formData.venues_with_vegan_veg}
                    onChange={(e) => handleInputChange('venues_with_vegan_veg', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venues with Religious Inclusive</label>
                  <input
                    type="number"
                    value={formData.venues_with_religious_inclusive}
                    onChange={(e) => handleInputChange('venues_with_religious_inclusive', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venues with Dietary Restrictions</label>
                  <input
                    type="number"
                    value={formData.venues_with_dietary_restrictions}
                    onChange={(e) => handleInputChange('venues_with_dietary_restrictions', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venues with Cultural Inclusive</label>
                  <input
                    type="number"
                    value={formData.venues_with_cultural_inclusive}
                    onChange={(e) => handleInputChange('venues_with_cultural_inclusive', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Operational Hours</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venues Open 24/7</label>
                  <input
                    type="number"
                    value={formData.venues_open_24_7}
                    onChange={(e) => handleInputChange('venues_open_24_7', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venues Open Until 9pm</label>
                  <input
                    type="number"
                    value={formData.venues_open_until_9pm}
                    onChange={(e) => handleInputChange('venues_open_until_9pm', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venues Open Year-round</label>
                  <input
                    type="number"
                    value={formData.venues_open_year_round}
                    onChange={(e) => handleInputChange('venues_open_year_round', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Headcount Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Students Enrolled</label>
                  <input
                    type="number"
                    value={formData.total_students_enrolled}
                    onChange={(e) => handleInputChange('total_students_enrolled', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.total_students_enrolled ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.total_students_enrolled && <p className="text-red-500 text-sm mt-1">{errors.total_students_enrolled}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Undergraduate Students <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.undergraduate_students}
                    onChange={(e) => handleInputChange('undergraduate_students', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.undergraduate_students ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.undergraduate_students && <p className="text-red-500 text-sm mt-1">{errors.undergraduate_students}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Graduate Students <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.graduate_students}
                    onChange={(e) => handleInputChange('graduate_students', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.graduate_students ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {errors.graduate_students && <p className="text-red-500 text-sm mt-1">{errors.graduate_students}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Students with Meal Plan</label>
                  <input
                    type="number"
                    value={formData.students_with_meal_plan}
                    onChange={(e) => handleInputChange('students_with_meal_plan', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Sales Information (USD)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Annual Sales</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.annual_sales_total}
                    onChange={(e) => handleInputChange('annual_sales_total', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Franchise Sales</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.annual_sales_franchise}
                    onChange={(e) => handleInputChange('annual_sales_franchise', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grab-and-go Sales</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.annual_sales_grab_and_go}
                    onChange={(e) => handleInputChange('annual_sales_grab_and_go', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vending Sales</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.annual_sales_vending}
                    onChange={(e) => handleInputChange('annual_sales_vending', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'q1_food_sustainability_strategy', label: 'Food sustainability strategy' },
                { key: 'q2_named_person_committee', label: 'Named person or committee responsible for food sustainability' },
                { key: 'q3_dedicated_budget', label: 'Dedicated budget for food sustainability' },
                { key: 'q4_dedicated_leadership_staffing', label: 'Dedicated leadership staffing for food sustainability' },
                { key: 'q5_dedicated_budget_line', label: 'Dedicated budget line for food sustainability' },
                { key: 'q6_metrics_tracked_reported', label: 'Metrics tracked and reported' },
                { key: 'q7_require_nutritious_item', label: 'Require nutritious item in all food service contracts' },
                { key: 'q8_require_basic_sustainability', label: 'Require basic sustainability in all food service contracts' },
                { key: 'q9_stakeholder_input_channel', label: 'Stakeholder input channel' },
                { key: 'q10_curricular_programs', label: 'Curricular programs' },
                { key: 'q11_student_innovation_programs', label: 'Student innovation programs' },
                { key: 'q12_food_security_programs', label: 'Food security programs' },
                { key: 'q14_labor_ethical_standards', label: 'Labor and ethical standards' }
              ].map((question) => (
                <div key={question.key} className="bg-white p-4 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">{question.label}</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={question.key}
                        checked={formData[question.key] === true}
                        onChange={() => handleInputChange(question.key, true)}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={question.key}
                        checked={formData[question.key] === false}
                        onChange={() => handleInputChange(question.key, false)}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {errors[question.key] && <p className="text-red-500 text-sm mt-1">{errors[question.key]}</p>}
                </div>
              ))}
            </div>

            <div className="bg-white p-6 border border-gray-200 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Food Bank Eligibility <span className="text-red-500">*</span></h4>
              <p className="text-sm text-gray-600 mb-4">Select at least one that applies:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.q13_food_bank_eligibility_open} onChange={(e) => handleInputChange('q13_food_bank_eligibility_open', e.target.checked)} className="mr-2" />
                  Open to all students
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.q13_food_bank_eligibility_limited} onChange={(e) => handleInputChange('q13_food_bank_eligibility_limited', e.target.checked)} className="mr-2" />
                  Limited eligibility
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.q13_food_bank_eligibility_frequency_caps} onChange={(e) => handleInputChange('q13_food_bank_eligibility_frequency_caps', e.target.checked)} className="mr-2" />
                  Frequency caps
                </label>
                <label className="flex items-center">
                  <input type="checkbox" checked={formData.q13_food_bank_eligibility_unclear} onChange={(e) => handleInputChange('q13_food_bank_eligibility_unclear', e.target.checked)} className="mr-2" />
                  Unclear eligibility
                </label>
              </div>
              {errors.q13_food_bank && <p className="text-red-500 text-sm mt-2">{errors.q13_food_bank}</p>}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Leadership Indicators (Rate 0-4)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'leadership_strategy_comprehensiveness', label: 'Leadership strategy comprehensiveness' },
                  { key: 'leadership_strategy_inclusion', label: 'Leadership strategy inclusion' },
                  { key: 'leadership_support_extent', label: 'Leadership support extent' },
                  { key: 'leadership_local_procurement', label: 'Leadership local procurement' },
                  { key: 'leadership_waste_reduction', label: 'Leadership waste reduction' },
                  { key: 'leadership_energy_water_conservation', label: 'Leadership energy/water conservation' },
                  { key: 'leadership_culture_promotion', label: 'Leadership culture promotion' },
                  { key: 'leadership_nutritious_item_requirement', label: 'Leadership nutritious item requirement' }
                ].map((question) => (
                  <div key={question.key} className="bg-white p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-3">{question.label}</label>
                    <div className="flex space-x-2">
                      {[0, 1, 2, 3, 4].map((rating) => (
                        <label key={rating} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={question.key}
                            checked={formData[question.key] === rating}
                            onChange={() => handleInputChange(question.key, rating)}
                            className="mr-1"
                          />
                          <span className="text-sm text-gray-600">{rating}</span>
                        </label>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      0=Poor, 1=Minimal, 2=Partial, 3=Good, 4=Excellent
                    </div>
                    {errors[question.key] && <p className="text-red-500 text-sm mt-1">{errors[question.key]}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Policies & Procurement Indicators (Rate 0-4)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'policy_cross_unit_coordination', label: 'Cross-unit coordination' },
                  { key: 'policy_sustainable_diet_principles', label: 'Sustainable diet principles' },
                  { key: 'policy_environmental_alignment', label: 'Environmental alignment' },
                  { key: 'policy_ethical_fair_trade', label: 'Ethical fair trade' },
                  { key: 'policy_environmental_sustainability', label: 'Environmental sustainability' },
                  { key: 'policy_nutritional_labeling', label: 'Nutritional labeling' },
                  { key: 'policy_direct_sales', label: 'Direct sales' },
                  { key: 'policy_waste_management', label: 'Waste management' },
                  { key: 'policy_packaging_recycling', label: 'Packaging recycling' }
                ].map((question) => (
                  <div key={question.key} className="bg-white p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-3">{question.label}</label>
                    <div className="flex space-x-2">
                      {[0, 1, 2, 3, 4].map((rating) => (
                        <label key={rating} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name={question.key}
                            checked={formData[question.key] === rating}
                            onChange={() => handleInputChange(question.key, rating)}
                            className="mr-1"
                          />
                          <span className="text-sm text-gray-600">{rating}</span>
                        </label>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      0=Poor, 1=Minimal, 2=Partial, 3=Good, 4=Excellent
                    </div>
                    {errors[question.key] && <p className="text-red-500 text-sm mt-1">{errors[question.key]}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Information Sources (Must sum to 100%)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publicly Available Documents</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.info_source_publicly_available}
                    onChange={(e) => handleInputChange('info_source_publicly_available', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Internal Documents</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.info_source_internal_docs}
                    onChange={(e) => handleInputChange('info_source_internal_docs', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Direct Observation</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.info_source_direct_observation}
                    onChange={(e) => handleInputChange('info_source_direct_observation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Staff Consultation</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.info_source_staff_consultation}
                    onChange={(e) => handleInputChange('info_source_staff_consultation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Not Accessible</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.info_source_not_accessible}
                    onChange={(e) => handleInputChange('info_source_not_accessible', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>
              {errors.percentages && <p className="text-red-500 text-sm mt-2">{errors.percentages}</p>}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Confidence Level</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[0, 1, 2, 3, 4].map((rating) => (
                  <label key={rating} className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="confidence_level"
                      checked={formData.confidence_level === rating}
                      onChange={() => handleInputChange('confidence_level', rating)}
                      className="mb-2"
                    />
                    <span className="font-medium">{rating}</span>
                    <span className="text-xs text-gray-600 text-center">
                      {rating === 0 && 'Not applicable'}
                      {rating === 1 && 'Poor'}
                      {rating === 2 && 'Fair'}
                      {rating === 3 && 'Good'}
                      {rating === 4 && 'Excellent'}
                    </span>
                  </label>
                ))}
              </div>
              {errors.confidence_level && <p className="text-red-500 text-sm mt-2">{errors.confidence_level}</p>}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Constraints</h4>
              <Select
                isMulti
                options={constraintOptions}
                value={constraintOptions.filter(option => 
                  formData.constraints.includes(option.value)
                )}
                onChange={selectedOptions => handleMultiSelectChange('constraints', selectedOptions)}
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Select constraints..."
              />
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Other Constraints</label>
                <input
                  type="text"
                  value={formData.constraints_other}
                  onChange={(e) => handleInputChange('constraints_other', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe other constraints"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Influencing Factors</h4>
              <Select
                isMulti
                options={factorOptions}
                value={factorOptions.filter(option => 
                  formData.factors.includes(option.value)
                )}
                onChange={selectedOptions => handleMultiSelectChange('factors', selectedOptions)}
                className="react-select-container"
                classNamePrefix="react-select"
                placeholder="Select influencing factors..."
              />
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Other Factors</label>
                <input
                  type="text"
                  value={formData.factors_other}
                  onChange={(e) => handleInputChange('factors_other', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe other factors"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (submitted) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Survey Submitted!</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">Your campus food sustainability audit has been successfully submitted. Thank you for your contribution.</p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setSubmitted(false)}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Submit Another
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Page header ── */}
      <div className="mb-6 px-1">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">SCF-EAT Survey Form</h2>
        <p className="text-gray-500 mt-1 text-sm">Complete all 6 sections to submit your campus food sustainability audit.</p>
      </div>

      {/* ── Progress bar ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Progress</span>
          <span className="text-xs font-bold text-gray-600">{Math.round((currentSection / 6) * 100)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${(currentSection / 6) * 100}%` }} />
        </div>
      </div>

      {/* ── Section stepper ── */}
      <div className="flex space-x-2 overflow-x-auto pb-2 mb-6">
        {sectionTitles.map((title, index) => {
          const sectionNum = index + 1;
          const isCompleted = completedSections.includes(sectionNum);
          const isActive = currentSection === sectionNum;
          const isLocked = sectionNum > 1 && !completedSections.includes(sectionNum - 1) && !isActive;
          return (
            <button key={index} type="button"
              onClick={() => !isLocked && setCurrentSection(sectionNum)}
              disabled={isLocked}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap border-2 transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  : isLocked
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                isActive ? 'bg-white text-indigo-600'
                : isCompleted ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 text-gray-500'
              }`}>
                {isCompleted && !isActive ? '✓' : sectionNum}
              </span>
              <span>{title}</span>
              {isLocked && <span className="text-gray-300 text-xs">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* ── Active section card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* Card header */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center space-x-3"
          style={{ background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)' }}>
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            {sectionIcons[currentSection - 1]}
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">Section {currentSection} of 6</p>
            <h3 className="text-xl font-extrabold text-gray-900">{sectionTitles[currentSection - 1]}</h3>
          </div>
        </div>

        {/* Error message */}
        {submitError && (
          <div className="mx-8 mt-5 px-4 py-3 rounded-xl text-sm font-medium border-2 bg-red-50 border-red-300 text-red-800">
            {submitError}
          </div>
        )}

        {/* Section content */}
        <form onSubmit={handleSubmit}>
          <div className="px-8 py-7">
            {renderSection()}
          </div>

          {/* Nav footer */}
          <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <button type="button" onClick={handleBack} disabled={currentSection === 1}
              className="flex items-center space-x-2 px-5 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-400 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-3">
              {token && (
                <button type="button" onClick={saveDraft}
                  className="flex items-center space-x-2 px-5 py-2.5 border-2 border-indigo-200 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>{draftSaved ? '✓ Saved' : 'Save Draft'}</span>
                </button>
              )}
              {currentSection < 6 ? (
                <button type="button" onClick={handleNext}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">
                  <span>Next Section</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {isSubmitting ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg><span>Submitting...</span></>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg><span>Submit Survey</span></>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyForm;