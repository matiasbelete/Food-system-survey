import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SurveyForm from './SurveyForm';
import ImportPage from './ImportPage';
import { AcademicCapIcon, ArrowRightOnRectangleIcon, CloudArrowUpIcon, ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const AuditorPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [resumedDraft, setResumedDraft] = useState(false);
  const [view, setView] = useState('form'); // 'form' | 'import'

  useEffect(() => {
    if (!user || user.role !== 'auditor') { navigate('/login'); return; }
    loadDraft();
  }, []);

  const loadDraft = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/drafts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) { setDraft(res.data); setShowDraftBanner(true); }
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
            <span className="font-semibold text-gray-900">SCF-EAT Survey</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <button onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors" title="My Profile">
              <span className="text-sm font-bold text-indigo-600">{user?.name?.charAt(0).toUpperCase()}</span>
            </button>
            <button onClick={handleLogout} className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600">
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto mb-6 flex justify-end">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button onClick={() => setView('form')} className={`flex items-center space-x-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <DocumentTextIcon className="w-4 h-4" /><span>Fill Form</span>
            </button>
            <button onClick={() => setView('import')} className={`flex items-center space-x-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'import' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <ArrowUpTrayIcon className="w-4 h-4" /><span>Upload File</span>
            </button>
          </div>
        </div>
        {view === 'import' ? (
          <ImportPage token={token} />
        ) : (
          <>
        {showDraftBanner && draft && (
          <div className="max-w-6xl mx-auto mb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CloudArrowUpIcon className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">You have a saved draft</p>
                  <p className="text-xs text-amber-600">Last saved: {new Date(draft.last_saved).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => { setResumedDraft(true); setShowDraftBanner(false); }}
                  className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Resume Draft
                </button>
                <button
                  onClick={async () => {
                    await axios.delete('http://localhost:5000/api/drafts', { headers: { Authorization: `Bearer ${token}` } });
                    setDraft(null); setShowDraftBanner(false);
                  }}
                  className="px-3 py-1 text-sm border border-amber-300 text-amber-700 rounded hover:bg-amber-100"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </div>
        )}
        <SurveyForm
          key={resumedDraft ? 'resumed' : 'fresh'}
          token={token}
          initialData={resumedDraft ? draft?.form_data : null}
          initialSection={resumedDraft ? draft?.current_section : 1}
        />
          </>
        )}
      </main>
    </div>
  );
};

export default AuditorPage;
