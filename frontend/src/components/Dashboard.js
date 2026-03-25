import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import {
  Bar,
  Line,
  Doughnut,
  Pie
} from 'react-chartjs-2';
import {
  AcademicCapIcon,
  ChartBarIcon,
  UsersIcon,
  PlusCircleIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    campus_setting: '',
    semester: '',
    assessment_round: '',
    date_from: '',
    date_to: '',
    performance_rating: ''
  });

  // Chart configurations
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        font: {
          size: 14,
          weight: 'bold'
        }
      },
    },
    maintainAspectRatio: false
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch stats
      const statsResponse = await axios.get('http://localhost:5000/api/dashboard/stats');
      setStats(statsResponse.data);

      // Fetch responses with filters
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const responsesResponse = await axios.get(`http://localhost:5000/api/surveys?${params.toString()}`);
      setResponses(responsesResponse.data.surveys || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      campus_setting: '',
      semester: '',
      assessment_round: '',
      date_from: '',
      date_to: '',
      performance_rating: ''
    });
  };

  const exportToCSV = () => {
    // Simple CSV export for responses
    if (responses.length === 0) return;

    const headers = [
      'Survey ID', 'University', 'Campus Setting', 'Semester', 'Assessment Round',
      'Submission Date', 'Overall Score', 'Performance Rating'
    ];
    
    const csvContent = [
      headers.join(','),
      ...responses.map(r => [
        r.survey_id,
        r.university_name || 'N/A',
        r.campus_setting || 'N/A',
        r.semester || 'N/A',
        r.assessment_round || 'N/A',
        r.submission_date ? new Date(r.submission_date).toLocaleDateString() : 'N/A',
        r.overall_score || 'N/A',
        r.performance_rating || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scf_eat_responses.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Chart Data
  const scoreDistributionData = {
    labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
    datasets: [
      {
        label: 'Number of Surveys',
        data: [
          stats.score_distribution?.['0-20'] || 0,
          stats.score_distribution?.['21-40'] || 0,
          stats.score_distribution?.['41-60'] || 0,
          stats.score_distribution?.['61-80'] || 0,
          stats.score_distribution?.['81-100'] || 0
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)', // Red
          'rgba(245, 158, 11, 0.8)', // Orange
          'rgba(234, 179, 8, 0.8)', // Yellow
          'rgba(34, 197, 94, 0.8)', // Green
          'rgba(16, 185, 129, 0.8)' // Light Green
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const trendData = {
    labels: stats.trends?.map(t => t.period) || [],
    datasets: [
      {
        label: 'Average Overall Score',
        data: stats.trends?.map(t => t.avg_score) || [],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Response Count',
        data: stats.trends?.map(t => t.response_count) || [],
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      }
    ],
  };

  const trendOptions = {
    ...chartOptions,
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Average Score'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Response Count'
        }
      },
    },
  };

  const categoryComparisonData = {
    labels: ['Checklists', 'Leadership', 'Policies'],
    datasets: [
      {
        label: 'Average Score',
        data: [
          stats.average_scores?.avg_checklists_score || 0,
          stats.average_scores?.avg_leadership_score || 0,
          stats.average_scores?.avg_policies_score || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(245, 158, 11, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const performanceRatingData = {
    labels: ['Excellent', 'Good', 'Fair', 'Needs Improvement', 'Poor'],
    datasets: [
      {
        data: [
          stats.performance_distribution?.['Excellent'] || 0,
          stats.performance_distribution?.['Good'] || 0,
          stats.performance_distribution?.['Fair'] || 0,
          stats.performance_distribution?.['Needs Improvement'] || 0,
          stats.performance_distribution?.['Poor'] || 0
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Excellent - Green
          'rgba(34, 197, 94, 0.8)', // Good - Light Green
          'rgba(234, 179, 8, 0.8)', // Fair - Yellow
          'rgba(245, 158, 11, 0.8)', // Needs Improvement - Orange
          'rgba(239, 68, 68, 0.8)' // Poor - Red
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };

  const campusDistributionData = {
    labels: stats.campus_distribution?.map(item => item.campus_setting) || [],
    datasets: [
      {
        label: 'Number of Responses',
        data: stats.campus_distribution?.map(item => item.count) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const semesterDistributionData = {
    labels: stats.semester_distribution?.map(item => item.semester) || [],
    datasets: [
      {
        label: 'Number of Responses',
        data: stats.semester_distribution?.map(item => item.count) || [],
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgba(168, 85, 247, 1)',
        borderWidth: 1,
      },
    ],
  };

  const roundDistributionData = {
    labels: stats.round_distribution?.map(item => `Round ${item.assessment_round}`) || [],
    datasets: [
      {
        label: 'Number of Responses',
        data: stats.round_distribution?.map(item => item.count) || [],
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-24"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Backend Server Not Running</h3>
            <p className="text-gray-600 mb-6">Please start the backend server on port 5000 to view dashboard data.</p>
            <div className="space-y-4">
              <button
                onClick={fetchDashboardData}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                Try Again
              </button>
              <div className="text-sm text-gray-500 mt-4">
                <p>To start the backend server:</p>
                <code className="bg-gray-100 px-2 py-1 rounded">cd backend && npm install && npm start</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SCF-EAT Dashboard</h1>
            <p className="text-gray-600">Overview of campus food environment assessments</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/survey')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center space-x-2"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>New Survey</span>
            </button>
            <button
              onClick={exportToCSV}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campus Setting</label>
              <select
                value={filters.campus_setting}
                onChange={(e) => handleFilterChange('campus_setting', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Settings</option>
                <option value="Campus-based/self-contained">Campus-based/self-contained</option>
                <option value="Urban/city-center">Urban/city-center</option>
                <option value="Mixed/distributed">Mixed/distributed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select
                value={filters.semester}
                onChange={(e) => handleFilterChange('semester', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Semesters</option>
                <option value="Fall">Fall</option>
                <option value="Winter">Winter</option>
                <option value="Summer">Summer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Round</label>
              <select
                value={filters.assessment_round}
                onChange={(e) => handleFilterChange('assessment_round', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Rounds</option>
                <option value="1">First-time</option>
                <option value="2">Second</option>
                <option value="3">Third+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Performance Rating</label>
              <select
                value={filters.performance_rating}
                onChange={(e) => handleFilterChange('performance_rating', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Ratings</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Improvement">Needs Improvement</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={clearFilters}
              className="text-gray-600 hover:text-gray-900 flex items-center space-x-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Clear Filters</span>
            </button>
            <div className="text-sm text-gray-500">
              Showing {responses.length} responses
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Responses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total_responses || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Overall Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {Number(stats.average_scores?.avg_overall_score || 0).toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Excellent Performances</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.performance_distribution?.['Excellent'] || 0}
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Needs Improvement</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.performance_distribution?.['Needs Improvement'] || 0}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <ClockIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Score Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
          <div className="h-80">
            <Bar data={scoreDistributionData} options={chartOptions} />
          </div>
        </div>

        {/* Performance Rating Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Rating Distribution</h3>
          <div className="h-80">
            <Doughnut data={performanceRatingData} options={chartOptions} />
          </div>
        </div>

        {/* Trends Over Time */}
        <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trends Over Time</h3>
          <div className="h-80">
            <Line data={trendData} options={trendOptions} />
          </div>
        </div>

        {/* Category Comparison */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Comparison</h3>
          <div className="h-80">
            <Bar data={categoryComparisonData} options={chartOptions} />
          </div>
        </div>

        {/* Campus Setting Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Campus Setting Distribution</h3>
          <div className="h-80">
            <Pie data={campusDistributionData} options={chartOptions} />
          </div>
        </div>

        {/* Semester Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Semester Distribution</h3>
          <div className="h-80">
            <Pie data={semesterDistributionData} options={chartOptions} />
          </div>
        </div>

        {/* Assessment Round Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Round Distribution</h3>
          <div className="h-80">
            <Pie data={roundDistributionData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Responses Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Responses</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => navigate('/survey')}
              className="text-indigo-600 hover:text-indigo-700 text-sm"
            >
              View All Surveys
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus Setting</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {responses.slice(0, 10).map((response, index) => (
                <tr key={response.survey_id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {response.university_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {response.campus_setting || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {response.semester || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {response.assessment_round ? `Round ${response.assessment_round}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {response.submission_date ? new Date(response.submission_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {response.overall_score ? Number(response.overall_score).toFixed(1) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      response.performance_rating === 'Excellent' ? 'bg-green-100 text-green-800' :
                      response.performance_rating === 'Good' ? 'bg-blue-100 text-blue-800' :
                      response.performance_rating === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                      response.performance_rating === 'Needs Improvement' ? 'bg-orange-100 text-orange-800' :
                      response.performance_rating === 'Poor' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {response.performance_rating || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {responses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No responses found. Create your first survey to see data here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;