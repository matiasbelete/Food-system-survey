import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  ArrowUpTrayIcon, ArrowDownTrayIcon, CheckCircleIcon,
  XCircleIcon, DocumentTextIcon, TrashIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const API = 'http://localhost:5000';

// All known DB column names across all survey tables
const DB_COLUMNS = [
  'auditor_name','auditor_affiliation','auditor_email','audit_date','audit_start_time','audit_end_time',
  'received_training','training_type_online','training_type_in_person','training_type_self_guided',
  'primary_dining_time','info_source_online_docs','info_source_site_visit','info_source_online_comms','info_source_other',
  'university_name','city','province_state','institution_type','campus_setting',
  'provider_type_university_operated','provider_type_franchised','provider_type_grab_and_go',
  'provider_type_vending','provider_type_independent',
  'total_food_providers','university_operated_units','venues_with_nutritious_items','venues_with_vegan_veg',
  'venues_with_religious_inclusive','venues_with_dietary_restrictions','venues_with_cultural_inclusive',
  'venues_open_24_7','venues_open_until_9pm','venues_open_year_round',
  'total_students_enrolled','undergraduate_students','graduate_students','students_with_meal_plan',
  'total_employees','part_time_employees','full_time_employees','total_food_service_employees',
  'student_food_service_workers','part_time_food_service','full_time_food_service',
  'annual_sales_total','annual_sales_franchise','annual_sales_grab_and_go','annual_sales_vending',
  'q1_food_sustainability_strategy','q2_named_person_committee','q3_dedicated_budget',
  'q4_dedicated_leadership_staffing','q5_dedicated_budget_line','q6_metrics_tracked_reported',
  'q7_require_nutritious_item','q8_require_basic_sustainability','q9_stakeholder_input_channel',
  'q10_curricular_programs','q11_student_innovation_programs','q12_food_security_programs',
  'q13_food_bank_eligibility_open','q13_food_bank_eligibility_limited',
  'q13_food_bank_eligibility_frequency_caps','q13_food_bank_eligibility_unclear','q14_labor_ethical_standards',
  'leadership_strategy_comprehensiveness','leadership_strategy_inclusion','leadership_support_extent',
  'leadership_local_procurement','leadership_waste_reduction','leadership_energy_water_conservation',
  'leadership_culture_promotion','leadership_nutritious_item_requirement',
  'policy_cross_unit_coordination','policy_sustainable_diet_principles','policy_environmental_alignment',
  'policy_ethical_fair_trade','policy_environmental_sustainability','policy_nutritional_labeling',
  'policy_direct_sales','policy_waste_management','policy_packaging_recycling',
  'info_source_publicly_available','info_source_internal_docs','info_source_direct_observation',
  'info_source_staff_consultation','info_source_not_accessible','confidence_level',
  'constraint_access_internal_docs','constraint_access_hr_labor','constraint_time_capacity',
  'constraint_multiple_departments','constraint_seasonal_limits','constraint_vendor_data',
  'constraint_unclear_wording','constraint_other',
  'factor_urban_off_campus','factor_vendor_operated','factor_university_operated',
  'factor_low_activity_term','factor_limited_day_part','factor_other',
  'assessment_round','semester','submitted_by'
];

// Normalize a string for fuzzy matching
const normalize = s => s.toLowerCase().replace(/[\s_\-\/()]/g, '');

// Score similarity between two strings (0-1)
const similarity = (a, b) => {
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (nb.includes(na) || na.includes(nb)) return 0.9;
  let matches = 0;
  const shorter = na.length < nb.length ? na : nb;
  const longer  = na.length < nb.length ? nb : na;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length;
};

// Find best DB column match for a given header
const findBestMatch = (header) => {
  let best = null, bestScore = 0;
  for (const col of DB_COLUMNS) {
    const score = similarity(header, col);
    if (score > bestScore) { bestScore = score; best = col; }
  }
  return bestScore >= 0.5 ? { col: best, score: bestScore } : null;
};

// Build column mapping from file headers
const buildMapping = (headers) =>
  headers.map(h => {
    const match = findBestMatch(h);
    return { fileCol: h, dbCol: match?.col || '', confidence: match?.score || 0, mapped: !!match };
  });

// Sample reference data showing column names + example values per section
const SAMPLE_REFERENCE = [
  {
    section: 'Audit Info',
    color: 'blue',
    columns: [
      { col: 'auditor_name',              example: 'Jane Smith' },
      { col: 'auditor_affiliation',       example: 'University of Toronto' },
      { col: 'auditor_email',             example: 'jane@university.ca' },
      { col: 'audit_date',                example: '2024-03-15' },
      { col: 'audit_start_time',          example: '09:00' },
      { col: 'audit_end_time',            example: '11:30' },
      { col: 'received_training',         example: 'yes / no / 1 / 0' },
      { col: 'training_type_online',      example: 'yes / no' },
      { col: 'training_type_in_person',   example: 'yes / no' },
      { col: 'primary_dining_time',       example: 'Lunch' },
      { col: 'assessment_round',          example: '1' },
      { col: 'semester',                  example: 'Fall / Winter / Summer' },
    ]
  },
  {
    section: 'Campus Info',
    color: 'purple',
    columns: [
      { col: 'university_name',                    example: 'University of Toronto' },
      { col: 'city',                               example: 'Toronto' },
      { col: 'province_state',                     example: 'Ontario' },
      { col: 'institution_type',                   example: 'Public / Private' },
      { col: 'campus_setting',                     example: 'Campus-based/self-contained' },
      { col: 'provider_type_university_operated',  example: 'yes / no' },
      { col: 'provider_type_franchised',           example: 'yes / no' },
      { col: 'provider_type_grab_and_go',          example: 'yes / no' },
      { col: 'provider_type_vending',              example: 'yes / no' },
    ]
  },
  {
    section: 'Context Metrics',
    color: 'green',
    columns: [
      { col: 'total_food_providers',          example: '25' },
      { col: 'university_operated_units',     example: '10' },
      { col: 'venues_with_nutritious_items',  example: '18' },
      { col: 'venues_with_vegan_veg',         example: '12' },
      { col: 'venues_open_24_7',              example: '3' },
      { col: 'total_students_enrolled',       example: '45000' },
      { col: 'undergraduate_students',        example: '35000' },
      { col: 'graduate_students',             example: '10000' },
      { col: 'annual_sales_total',            example: '5000000.00' },
    ]
  },
  {
    section: 'Checklist (Yes/No)',
    color: 'amber',
    columns: [
      { col: 'q1_food_sustainability_strategy',  example: 'yes / no' },
      { col: 'q2_named_person_committee',        example: 'yes / no' },
      { col: 'q3_dedicated_budget',              example: 'yes / no' },
      { col: 'q4_dedicated_leadership_staffing', example: 'yes / no' },
      { col: 'q5_dedicated_budget_line',         example: 'yes / no' },
      { col: 'q6_metrics_tracked_reported',      example: 'yes / no' },
      { col: 'q7_require_nutritious_item',       example: 'yes / no' },
      { col: 'q14_labor_ethical_standards',      example: 'yes / no' },
    ]
  },
  {
    section: 'Governance (0–4 rating)',
    color: 'red',
    columns: [
      { col: 'leadership_strategy_comprehensiveness', example: '0–4' },
      { col: 'leadership_strategy_inclusion',         example: '0–4' },
      { col: 'leadership_support_extent',             example: '0–4' },
      { col: 'leadership_local_procurement',          example: '0–4' },
      { col: 'policy_cross_unit_coordination',        example: '0–4' },
      { col: 'policy_sustainable_diet_principles',    example: '0–4' },
      { col: 'policy_environmental_alignment',        example: '0–4' },
      { col: 'policy_waste_management',               example: '0–4' },
    ]
  },
  {
    section: 'Wrap-up',
    color: 'gray',
    columns: [
      { col: 'info_source_publicly_available',  example: '40 (% out of 100)' },
      { col: 'info_source_internal_docs',       example: '30' },
      { col: 'info_source_direct_observation',  example: '20' },
      { col: 'confidence_level',                example: '0–4' },
      { col: 'constraint_time_capacity',        example: 'yes / no' },
      { col: 'factor_urban_off_campus',         example: 'yes / no' },
    ]
  }
];

const colorMap = {
  blue:   { badge: 'bg-blue-100 text-blue-700',   header: 'bg-blue-50 border-blue-200',   tag: 'bg-blue-50 text-blue-800 border border-blue-200' },
  purple: { badge: 'bg-purple-100 text-purple-700', header: 'bg-purple-50 border-purple-200', tag: 'bg-purple-50 text-purple-800 border border-purple-200' },
  green:  { badge: 'bg-green-100 text-green-700',  header: 'bg-green-50 border-green-200',  tag: 'bg-green-50 text-green-800 border border-green-200' },
  amber:  { badge: 'bg-amber-100 text-amber-700',  header: 'bg-amber-50 border-amber-200',  tag: 'bg-amber-50 text-amber-800 border border-amber-200' },
  red:    { badge: 'bg-red-100 text-red-700',      header: 'bg-red-50 border-red-200',      tag: 'bg-red-50 text-red-800 border border-red-200' },
  gray:   { badge: 'bg-gray-100 text-gray-700',    header: 'bg-gray-50 border-gray-200',    tag: 'bg-gray-50 text-gray-800 border border-gray-200' },
};

const ImportPage = ({ token }) => {
  const [file, setFile]           = useState(null);
  const [step, setStep]           = useState('upload'); // upload | preview | result
  const [sheets, setSheets]       = useState([]);       // [{ name, headers, rows, mapping }]
  const [activeSheet, setActiveSheet] = useState(0);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef();

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // ── Parse file client-side ─────────────────────────────────────────────────
  const parseFile = (f) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array', cellDates: true });

        const parsed = wb.SheetNames.map(name => {
          const ws      = wb.Sheets[name];
          const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const hdrs    = jsonRows.length ? Object.keys(jsonRows[0]) : [];
          return { name, headers: hdrs, rows: jsonRows.slice(0, 5), allRows: jsonRows, mapping: buildMapping(hdrs) };
        });

        setSheets(parsed);
        setActiveSheet(0);
        setStep('preview');
      } catch {
        alert('Could not parse file. Make sure it is a valid .xlsx, .xls, or .csv file.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const onFileChange = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) { alert('Only .xlsx, .xls, .csv files are accepted.'); return; }
    setFile(f);
    setResult(null);
    parseFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    onFileChange(e.dataTransfer.files[0]);
  };

  const updateMapping = (sheetIdx, colIdx, dbCol) => {
    setSheets(prev => prev.map((s, si) => si !== sheetIdx ? s : {
      ...s,
      mapping: s.mapping.map((m, ci) => ci !== colIdx ? m : { ...m, dbCol, mapped: !!dbCol, confidence: dbCol ? 1 : 0 })
    }));
  };

  // ── Submit to backend ──────────────────────────────────────────────────────
  const handleImport = async () => {
    setImporting(true);
    try {
      // Build payload: for each sheet send allRows + mapping
      const payload = sheets.map(s => ({
        sheetName: s.name,
        mapping: s.mapping.filter(m => m.mapped && m.dbCol),
        rows: s.allRows
      }));

      const res = await axios.post(`${API}/api/import/survey`, { sheets: payload }, { headers });
      setResult(res.data);
      setStep('result');
    } catch (err) {
      setResult({ success: false, error: err.response?.data?.error || 'Import failed' });
      setStep('result');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/api/import/template`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', 'scf_eat_survey_template.xlsx');
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download template.'); }
  };

  const reset = () => { setFile(null); setSheets([]); setResult(null); setStep('upload'); };

  const mappedCount = sheets[activeSheet]?.mapping.filter(m => m.mapped && m.dbCol).length || 0;
  const totalCols   = sheets[activeSheet]?.mapping.length || 0;

  // ── UPLOAD STEP ────────────────────────────────────────────────────────────
  if (step === 'upload') return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">Import Survey Data</h2>
          <p className="text-sm text-gray-500 mt-1">Upload an Excel or CSV file to submit survey data without filling the form</p>
        </div>

        {/* Action buttons below header */}
        <div className="flex items-center space-x-3 mb-6 pb-5 border-b border-gray-100">
          <button onClick={downloadTemplate}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium">
            <ArrowDownTrayIcon className="w-4 h-4" /><span>Download Template (.xlsx)</span>
          </button>
          <span className="text-gray-300">|</span>
          <p className="text-xs text-gray-500">Template contains all 6 sheets with exact column names ready to fill in.</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }`}
        >
          <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-base font-medium text-gray-700">Drag & drop your file here, or click to browse</p>
          <p className="text-sm text-gray-400 mt-1">Accepts .xlsx, .xls, .csv — max 10MB</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => onFileChange(e.target.files[0])} />
        </div>

        {/* Matching tips */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="font-semibold text-blue-800 mb-1">Exact column names</p>
            <p className="text-blue-700 text-xs">Use column names like <code className="bg-blue-100 px-1 rounded">auditor_name</code> or <code className="bg-blue-100 px-1 rounded">university_name</code> for instant auto-mapping.</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <p className="font-semibold text-amber-800 mb-1">Fuzzy matching</p>
            <p className="text-amber-700 text-xs">Columns like "Auditor Name" or "University" are auto-detected. You can review and fix mappings before importing.</p>
          </div>
        </div>
      </div>

      {/* Sample Column Reference */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Sample Column Reference</h3>
            <p className="text-xs text-gray-500 mt-0.5">Use these exact column names in your file for best results. Each section can be a separate sheet or all in one sheet.</p>
          </div>
        </div>

        <div className="space-y-4">
          {SAMPLE_REFERENCE.map(({ section, color, columns }) => {
            const c = colorMap[color];
            return (
              <div key={section} className={`rounded-lg border p-4 ${c.header}`}>
                <div className="flex items-center space-x-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>{section}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {columns.map(({ col, example }) => (
                    <div key={col} className={`rounded-md px-2 py-1.5 text-xs ${c.tag}`}>
                      <p className="font-mono font-semibold">{col}</p>
                      <p className="text-gray-500 mt-0.5">e.g. {example}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── PREVIEW / MAPPING STEP ─────────────────────────────────────────────────
  if (step === 'preview') return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Review Column Mapping</h2>
            <p className="text-sm text-gray-500">{file?.name} · {sheets.length} sheet(s) detected</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={reset} className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50">
              <TrashIcon className="w-4 h-4" /><span>Change File</span>
            </button>
            <button onClick={handleImport} disabled={importing || mappedCount === 0}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm">
              <ArrowUpTrayIcon className="w-4 h-4" />
              <span>{importing ? 'Importing...' : `Import ${sheets.reduce((a,s) => a + s.allRows.length, 0)} rows`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex space-x-1 bg-white rounded-lg shadow-sm p-1 w-fit">
          {sheets.map((s, i) => (
            <button key={i} onClick={() => setActiveSheet(i)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeSheet === i ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {sheets[activeSheet] && (
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Sheet: <span className="text-indigo-600">{sheets[activeSheet].name}</span>
              <span className="ml-2 text-sm font-normal text-gray-500">({sheets[activeSheet].allRows.length} rows)</span>
            </h3>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${mappedCount === totalCols ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {mappedCount}/{totalCols} columns mapped
            </span>
          </div>

          {/* Column mapping table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File Column</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Maps To (DB Column)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sample Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sheets[activeSheet].mapping.map((m, ci) => {
                  const sample = sheets[activeSheet].rows[0]?.[m.fileCol];
                  return (
                    <tr key={ci} className={m.mapped && m.dbCol ? 'bg-white' : 'bg-red-50'}>
                      <td className="px-4 py-2 font-mono text-xs text-gray-700">{m.fileCol}</td>
                      <td className="px-4 py-2">
                        <select value={m.dbCol} onChange={e => updateMapping(activeSheet, ci, e.target.value)}
                          className={`w-full px-2 py-1 border rounded text-xs focus:outline-none focus:ring-indigo-500 ${m.dbCol ? 'border-gray-300' : 'border-red-300 bg-red-50'}`}>
                          <option value="">— skip this column —</option>
                          {DB_COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        {m.dbCol ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                            m.confidence >= 0.6 ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {m.confidence === 1 ? 'Exact' : m.confidence >= 0.9 ? 'High' : m.confidence >= 0.6 ? 'Medium' : 'Manual'}
                          </span>
                        ) : <span className="text-xs text-gray-400">Skipped</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{String(sample ?? '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Data preview */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Data Preview (first 5 rows)</h4>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {sheets[activeSheet].headers.map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sheets[activeSheet].rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-gray-50">
                      {sheets[activeSheet].headers.map(h => (
                        <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">{String(row[h] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── RESULT STEP ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${result?.success ? 'border-green-500' : 'border-red-500'}`}>
        <div className="flex items-center space-x-3 mb-4">
          {result?.success
            ? <CheckCircleIcon className="w-8 h-8 text-green-500" />
            : <XCircleIcon className="w-8 h-8 text-red-500" />}
          <h2 className="text-lg font-bold text-gray-900">{result?.success ? 'Import Successful' : 'Import Failed'}</h2>
        </div>

        {result?.success ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{result.inserted ?? 0}</p>
                <p className="text-xs text-gray-600 mt-1">Surveys Inserted</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{result.skipped ?? 0}</p>
                <p className="text-xs text-gray-600 mt-1">Rows Skipped</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{result.errors?.length ?? 0}</p>
                <p className="text-xs text-gray-600 mt-1">Errors</p>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2 flex items-center space-x-1">
                  <ExclamationTriangleIcon className="w-4 h-4" /><span>Row Errors</span>
                </h4>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i} className="text-xs text-red-700">• {e}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-red-600 text-sm">{result?.error}</p>
        )}

        <div className="flex space-x-3 mt-6">
          <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Import Another File</button>
          <button onClick={downloadTemplate} className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <ArrowDownTrayIcon className="w-4 h-4" /><span>Download Template</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportPage;
