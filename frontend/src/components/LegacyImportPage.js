import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  AcademicCapIcon, ArrowRightOnRectangleIcon, ArrowLeftIcon,
  CloudArrowUpIcon, DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon
} from '@heroicons/react/24/outline';

const API = 'http://localhost:5000';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);

const LegacyImportPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [file, setFile] = useState(null);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [label, setLabel] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [importedFiles, setImportedFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    fetchImportedFiles();
  }, []);

  const fetchImportedFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/imported-files`, { headers });
      setImportedFiles(res.data);
    } catch {}
    finally { setFilesLoading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', year);
    formData.append('label', label || file.name);
    try {
      const res = await axios.post(`${API}/api/admin/import-legacy`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      setResult({ ...res.data, success: true });
      setFile(null);
      setLabel('');
      fetchImportedFiles();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || 'Import failed' });
    } finally {
      setLoading(false);
    }
  };

  const fileExt = file ? file.name.split('.').pop().toLowerCase() : '';
  const validExt = ['csv', 'xlsx', 'xls'].includes(fileExt);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
            <span className="font-semibold text-gray-900">Import Legacy Survey Data</span>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin')}
              className="flex items-center space-x-1 text-sm text-indigo-600 hover:underline">
              <ArrowLeftIcon className="w-4 h-4" /><span>Admin Panel</span>
            </button>
            <button onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors">
              <span className="text-sm font-bold text-indigo-600">{user?.name?.charAt(0).toUpperCase()}</span>
            </button>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600">
              <ArrowRightOnRectangleIcon className="w-4 h-4" /><span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Upload Excel or CSV File</h2>
          <p className="text-sm text-gray-500 mb-5">
            Upload old survey data collected via Excel or CSV. Column names should match the survey fields
            (e.g. <span className="font-mono text-xs bg-gray-100 px-1 rounded">university_name</span>,{' '}
            <span className="font-mono text-xs bg-gray-100 px-1 rounded">auditor_name</span>,{' '}
            <span className="font-mono text-xs bg-gray-100 px-1 rounded">overall_score</span>, etc.).
            Partial data is accepted — missing fields will be left blank.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragging ? 'border-indigo-400 bg-indigo-50' :
              file && validExt ? 'border-green-400 bg-green-50' :
              file && !validExt ? 'border-red-400 bg-red-50' :
              'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
            }`}>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => setFile(e.target.files[0])} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <DocumentArrowUpIcon className={`w-10 h-10 ${validExt ? 'text-green-500' : 'text-red-500'}`} />
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                {!validExt && <p className="text-sm text-red-600">Unsupported format. Use .csv, .xlsx, or .xls</p>}
                <button onClick={e => { e.stopPropagation(); setFile(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 underline mt-1">Remove</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <CloudArrowUpIcon className="w-10 h-10 text-gray-400" />
                <p className="text-gray-600 font-medium">Drag & drop or click to select</p>
                <p className="text-sm text-gray-400">Supports .csv, .xlsx, .xls — max 10 MB</p>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Year</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Used as the survey submission year if no date column is present</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                placeholder={`e.g. Fall ${year} Legacy Data`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={!file || !validExt || loading}
            className="mt-5 flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Importing...</>
              : <><DocumentArrowUpIcon className="w-4 h-4" />Import File</>
            }
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-xl p-5 border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-3">
              {result.success
                ? <CheckCircleIcon className="w-5 h-5 text-green-600" />
                : <XCircleIcon className="w-5 h-5 text-red-600" />}
              <span className={`font-semibold text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Import Complete' : 'Import Failed'}
              </span>
            </div>
            {result.success ? (
              <div className="grid grid-cols-3 gap-4 text-center mb-3">
                {[
                  { label: 'Total Rows', value: result.total, color: 'text-gray-700' },
                  { label: 'Imported', value: result.inserted, color: 'text-green-700' },
                  { label: 'Skipped', value: result.skipped, color: 'text-orange-600' },
                ].map(({ label: l, value, color }) => (
                  <div key={l} className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500">{l}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-700">{result.message}</p>
            )}
            {result.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  {result.errors.length} row error{result.errors.length !== 1 ? 's' : ''} — click to expand
                </summary>
                <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Column Reference */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Supported Column Names</h3>
          <p className="text-xs text-gray-500 mb-4">
            Column names are matched case-insensitively. Spaces are treated as underscores. Only columns present in your file will be imported.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {[
              { group: 'Audit Info', cols: ['auditor_name','auditor_email','auditor_affiliation','audit_date','audit_start_time','audit_end_time','received_training','semester','assessment_round'] },
              { group: 'Campus Info', cols: ['university_name','city','province_state','institution_type','campus_setting','provider_type_university_operated','provider_type_franchised','provider_type_vending'] },
              { group: 'Context Metrics', cols: ['total_food_providers','total_students_enrolled','undergraduate_students','graduate_students','total_employees','annual_sales_total'] },
              { group: 'Checklist (Yes/No)', cols: ['q1_food_sustainability_strategy','q2_named_person_committee','q3_dedicated_budget','q4_dedicated_leadership_staffing','q5_dedicated_budget_line','q6_metrics_tracked_reported','q14_labor_ethical_standards'] },
              { group: 'Leadership (0–4)', cols: ['leadership_strategy_comprehensiveness','leadership_strategy_inclusion','leadership_support_extent','leadership_local_procurement','leadership_waste_reduction','leadership_culture_promotion'] },
              { group: 'Policies (0–4)', cols: ['policy_cross_unit_coordination','policy_sustainable_diet_principles','policy_environmental_alignment','policy_ethical_fair_trade','policy_waste_management','policy_packaging_recycling'] },
            ].map(({ group, cols }) => (
              <div key={group} className="border border-gray-100 rounded-lg p-3">
                <p className="font-semibold text-gray-700 mb-2">{group}</p>
                <ul className="space-y-1">
                  {cols.map(c => (
                    <li key={c} className="font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Import History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Import History</h3>
          {filesLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading...</p>
          ) : importedFiles.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No files imported yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-gray-100">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    {['File', 'Label', 'Year', 'Type', 'Rows', 'Imported', 'Skipped', 'Uploaded By', 'Date'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {importedFiles.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900 max-w-xs truncate">{f.original_name}</td>
                      <td className="px-3 py-2 text-gray-500">{f.label || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{f.data_year || '—'}</td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs uppercase">{f.file_type}</span></td>
                      <td className="px-3 py-2 text-gray-500">{f.row_count}</td>
                      <td className="px-3 py-2 text-green-700 font-medium">{f.inserted_count}</td>
                      <td className="px-3 py-2 text-orange-600">{f.skipped_count}</td>
                      <td className="px-3 py-2 text-gray-500">{f.uploaded_by_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{new Date(f.uploaded_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegacyImportPage;
