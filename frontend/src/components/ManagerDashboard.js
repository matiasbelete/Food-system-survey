import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import {
  AcademicCapIcon, ArrowRightOnRectangleIcon, UsersIcon,
  ChartBarIcon, CheckCircleIcon, ClockIcon, ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon, XMarkIcon, FunnelIcon
} from '@heroicons/react/24/outline';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const API = 'http://localhost:5000';
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - i);
const PAGE_SIZES = [10, 25, 50];

const COLUMNS = [
  { key: 'university_name',    label: 'University' },
  { key: 'province_state',     label: 'Region' },
  { key: 'institution_type',   label: 'Type' },
  { key: 'campus_setting',     label: 'Campus Setting' },
  { key: 'semester',           label: 'Semester' },
  { key: 'submission_date',    label: 'Date' },
  { key: 'overall_score',      label: 'Score' },
  { key: 'performance_rating', label: 'Rating' },
];

const EMPTY_FILTERS = {
  year: '', date_from: '', date_to: '',
  province_state: '', institution_type: '',
  performance_rating: '', campus_setting: '',
  semester: '', assessment_round: '',
};

const FILTER_LABELS = {
  year: 'Year', date_from: 'From', date_to: 'To',
  province_state: 'Region', institution_type: 'Type',
  performance_rating: 'Rating', campus_setting: 'Campus',
  semester: 'Semester', assessment_round: 'Round',
};

const RATINGS = ['Excellent', 'Good', 'Fair', 'Needs Improvement', 'Poor'];
const RATING_COLORS = { Excellent: '#10b981', Good: '#34d399', Fair: '#fbbf24', 'Needs Improvement': '#f97316', Poor: '#ef4444' };

const ratingBadge = r =>
  r === 'Excellent'         ? 'bg-green-100 text-green-800' :
  r === 'Good'              ? 'bg-blue-100 text-blue-800' :
  r === 'Fair'              ? 'bg-yellow-100 text-yellow-800' :
  r === 'Needs Improvement' ? 'bg-orange-100 text-orange-800' :
  r === 'Poor'              ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
      <option value="">All</option>
      {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);

const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };

// Derive chart data directly from the filtered responses array
function buildCharts(rows) {
  // Performance distribution
  const perfCounts = Object.fromEntries(RATINGS.map(r => [r, 0]));
  rows.forEach(r => { if (r.performance_rating) perfCounts[r.performance_rating] = (perfCounts[r.performance_rating] || 0) + 1; });
  const performanceData = {
    labels: RATINGS,
    datasets: [{ data: RATINGS.map(r => perfCounts[r]), backgroundColor: RATINGS.map(r => RATING_COLORS[r]) }],
  };

  // Campus setting distribution
  const campusMap = {};
  rows.forEach(r => { const k = r.campus_setting || 'Unknown'; campusMap[k] = (campusMap[k] || 0) + 1; });
  const campusData = {
    labels: Object.keys(campusMap),
    datasets: [{ label: 'Responses', data: Object.values(campusMap), backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'] }],
  };

  // Institution type distribution
  const typeMap = {};
  rows.forEach(r => { const k = r.institution_type || 'Unknown'; typeMap[k] = (typeMap[k] || 0) + 1; });
  const typeData = {
    labels: Object.keys(typeMap),
    datasets: [{ label: 'Responses', data: Object.values(typeMap), backgroundColor: ['#3b82f6', '#a855f7', '#ec4899', '#14b8a6'] }],
  };

  return { performanceData, campusData, typeData };
}

const ManagerDashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [responses, setResponses] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [avgScores, setAvgScores] = useState({});
  const [filters, setFilters]     = useState(EMPTY_FILTERS);
  const [pending, setPending]     = useState(EMPTY_FILTERS);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch]       = useState('');
  const [sort, setSort]           = useState({ key: 'submission_date', dir: 'desc' });
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);

  useEffect(() => {
    if (!user || !['manager', 'admin'].includes(user.role)) { navigate('/login'); return; }
    fetchData();
  }, [filters]);

  useEffect(() => { setPage(1); }, [search, sort, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const active = { ...filters };
      if (active.year) { active.date_from = `${active.year}-01-01`; active.date_to = `${active.year}-12-31`; }
      delete active.year;
      // semester maps to respondent type; assessment_round maps to category
      const params = new URLSearchParams(Object.fromEntries(Object.entries(active).filter(([, v]) => v)));

      const [statsRes, survRes] = await Promise.all([
        axios.get(`${API}/api/dashboard/stats`, { headers }),
        axios.get(`${API}/api/surveys?${params}`, { headers }),
      ]);

      setAvgScores(statsRes.data.average_scores || {});
      setResponses(survRes.data.surveys || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const applyFilters = () => { setFilters({ ...pending }); setPanelOpen(false); };
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPending(EMPTY_FILTERS); };
  const removeChip   = key => { const f = { ...filters, [key]: '' }; setFilters(f); setPending(f); };
  const setF = key => val => setPending(p => ({ ...p, [key]: val }));

  const activeChips = Object.entries(filters).filter(([, v]) => v);
  const activeCount = activeChips.length;

  const filteredRows = responses
    .filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return ['university_name', 'province_state', 'institution_type', 'campus_setting', 'performance_rating']
        .some(k => (r[k] || '').toLowerCase().includes(q));
    })
    .sort((a, b) => {
      let av = a[sort.key], bv = b[sort.key];
      if (sort.key === 'submission_date') { av = new Date(av || 0); bv = new Date(bv || 0); }
      else if (sort.key === 'overall_score') { av = Number(av || 0); bv = Number(bv || 0); }
      else { av = (av || '').toString().toLowerCase(); bv = (bv || '').toString().toLowerCase(); }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows  = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const toggleSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const SortIcon   = ({ col }) => sort.key !== col
    ? <span className="ml-1 text-gray-300">↕</span>
    : <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>;

  // Charts are built from the current filtered responses
  const { performanceData, campusData, typeData } = buildCharts(filteredRows);

  // KPI derived from filtered rows
  const totalFiltered = filteredRows.length;
  const avgScore = totalFiltered
    ? (filteredRows.reduce((s, r) => s + Number(r.overall_score || 0), 0) / totalFiltered).toFixed(1)
    : '0.0';
  const excellentCount = filteredRows.filter(r => r.performance_rating === 'Excellent').length;
  const needsCount     = filteredRows.filter(r => r.performance_rating === 'Needs Improvement').length;

  const exportCSV = () => {
    if (!filteredRows.length) return;
    const hdrs = ['ID', 'University', 'Region', 'Type', 'Campus', 'Date', 'Score', 'Rating'];
    const rows = filteredRows.map(r => [
      r.survey_id, r.university_name || '', r.province_state || '', r.institution_type || '',
      r.campus_setting || '',
      r.submission_date ? new Date(r.submission_date).toLocaleDateString() : '',
      r.overall_score ? Number(r.overall_score).toFixed(1) : '',
      r.performance_rating || '',
    ]);
    const csv = [hdrs, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `scfeat_filtered_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
            <span className="font-semibold text-gray-900">SCF-EAT Manager Dashboard</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200">
              <span className="text-sm font-bold text-indigo-600">{user?.name?.charAt(0).toUpperCase()}</span>
            </button>
            {user?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className="text-sm text-indigo-600 hover:underline">Admin Panel</button>
            )}
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600">
              <ArrowRightOnRectangleIcon className="w-4 h-4" /><span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => { setPending({ ...filters }); setPanelOpen(o => !o); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  panelOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                <AdjustmentsHorizontalIcon className="w-4 h-4" />
                Filters
                {activeCount > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${panelOpen ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                    {activeCount}
                  </span>
                )}
              </button>

              {activeChips.map(([key, val]) => (
                <span key={key} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-full">
                  <span className="font-medium">{FILTER_LABELS[key]}:</span> {val}
                  <button onClick={() => removeChip(key)} className="hover:text-red-500 ml-0.5">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {activeCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-red-500">Clear all</button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {loading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
              <span className="text-sm text-gray-500">{responses.length} results</span>
              <button onClick={exportCSV}
                className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Export{activeCount > 0 ? ' Filtered' : ''} CSV</span>
              </button>
            </div>
          </div>

          {panelOpen && (
            <div className="px-4 py-4 border-b border-gray-100 bg-gray-50 rounded-b-xl">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">

                {/* Row 1: Date filters */}
                <SelectField label="Year" value={pending.year}
                  onChange={v => setPending(p => ({ ...p, year: v, date_from: '', date_to: '' }))}
                  options={YEARS.map(y => ({ value: String(y), label: String(y) }))} />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
                  <input type="date" value={pending.date_from}
                    onChange={e => setPending(p => ({ ...p, date_from: e.target.value, year: '' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
                  <input type="date" value={pending.date_to}
                    onChange={e => setPending(p => ({ ...p, date_to: e.target.value, year: '' }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Region / Province</label>
                  <input value={pending.province_state} onChange={e => setF('province_state')(e.target.value)}
                    placeholder="e.g. Ontario"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>

                {/* Row 2: Category filters */}
                <SelectField label="Institution Type" value={pending.institution_type} onChange={setF('institution_type')}
                  options={['Public', 'Private']} />
                <SelectField label="Campus Setting" value={pending.campus_setting} onChange={setF('campus_setting')}
                  options={['Campus-based/self-contained', 'Urban/city-center', 'Mixed/distributed']} />
                <SelectField label="Respondent Type (Semester)" value={pending.semester} onChange={setF('semester')}
                  options={['Fall', 'Winter', 'Summer']} />
                <SelectField label="Assessment Round" value={pending.assessment_round} onChange={setF('assessment_round')}
                  options={[1,2,3,4].map(n => ({ value: String(n), label: `Round ${n}` }))} />

                {/* Row 3: Score category */}
                <SelectField label="Performance Rating" value={pending.performance_rating} onChange={setF('performance_rating')}
                  options={RATINGS} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={applyFilters}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                  <FunnelIcon className="w-4 h-4" />Apply Filters
                </button>
                <button onClick={() => setPending(EMPTY_FILTERS)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-100">
                  Reset
                </button>
                <button onClick={() => setPanelOpen(false)} className="ml-auto text-sm text-gray-400 hover:text-gray-600">Close</button>
              </div>
            </div>
          )}
        </div>

        {/* ── KPI Cards (from filtered data) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Filtered Responses', value: totalFiltered,      icon: UsersIcon,       color: 'blue' },
            { label: 'Avg Overall Score',  value: avgScore,            icon: ChartBarIcon,    color: 'green' },
            { label: 'Excellent',          value: excellentCount,      icon: CheckCircleIcon, color: 'emerald' },
            { label: 'Needs Improvement',  value: needsCount,          icon: ClockIcon,       color: 'orange' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
              <div className={`p-3 bg-${color}-100 rounded-full`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Score Breakdown (global averages) ── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Average Score Breakdown <span className="text-xs font-normal text-gray-400">(global)</span></h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Checklists',       value: avgScores.avg_checklists_score },
              { label: 'Governance',       value: avgScores.avg_governance_score },
              { label: 'University Level', value: avgScores.avg_university_level_score },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-indigo-600">{Number(value || 0).toFixed(1)}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(value || 0, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Charts (driven by filtered rows) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Performance Distribution</h3>
            {activeCount > 0 && <p className="text-xs text-indigo-500 mb-3">Filtered data</p>}
            <div className="h-56"><Doughnut data={performanceData} options={chartOpts} /></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">By Campus Setting</h3>
            {activeCount > 0 && <p className="text-xs text-indigo-500 mb-3">Filtered data</p>}
            <div className="h-56"><Bar data={campusData} options={chartOpts} /></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">By Institution Type</h3>
            {activeCount > 0 && <p className="text-xs text-indigo-500 mb-3">Filtered data</p>}
            <div className="h-56"><Bar data={typeData} options={chartOpts} /></div>
          </div>
        </div>

        {/* ── Responses Table ── */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-gray-900">
              Responses
              {activeCount > 0 && <span className="ml-2 text-xs text-indigo-600 font-normal">({activeCount} filter{activeCount !== 1 ? 's' : ''} active)</span>}
            </h3>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Search university, region, rating…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64" />
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none">
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s} / page</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap">
                      {col.label}<SortIcon col={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedRows.map((r, i) => (
                  <tr key={r.survey_id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.university_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.province_state || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.institution_type
                        ? <span className={`px-2 py-0.5 text-xs rounded-full ${r.institution_type === 'Public' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{r.institution_type}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.campus_setting || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{r.semester || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {r.submission_date ? new Date(r.submission_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {r.overall_score != null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{Number(r.overall_score).toFixed(1)}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(r.overall_score, 100)}%` }} />
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ratingBadge(r.performance_rating)}`}>
                        {r.performance_rating || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagedRows.length === 0 && !loading && (
              <p className="text-center py-10 text-gray-400">
                {search ? `No results for "${search}"` : 'No responses match the current filters.'}
              </p>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>{filteredRows.length} result{filteredRows.length !== 1 ? 's' : ''}{search ? ` for "${search}"` : ''}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">&laquo;</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">&lsaquo;</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '...'
                  ? <span key={`e${i}`} className="px-2">…</span>
                  : <button key={p} onClick={() => setPage(p)}
                      className={`px-2.5 py-1 rounded border ${p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-100'}`}>{p}</button>
                )}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">&rsaquo;</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100">&raquo;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
