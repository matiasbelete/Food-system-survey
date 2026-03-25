import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SurveyForm from './SurveyForm';

const API = 'http://localhost:5000';

const PublicSurveyPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState(token ? 'loading' : 'valid');
  const [linkLabel, setLinkLabel] = useState('');
  const [expiredDate, setExpiredDate] = useState('');

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/api/public-survey/${token}`)
      .then(res => { setLinkLabel(res.data.label || ''); setStatus('valid'); })
      .catch(err => {
        const data = err.response?.data || {};
        if (data.expires_at) {
          setExpiredDate(new Date(data.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        }
        setStatus(data.error?.toLowerCase().includes('expired') ? 'expired' : 'invalid');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-900">SCF-EAT Survey</span>
              {linkLabel && <span className="ml-2 text-sm text-gray-500">— {linkLabel}</span>}
            </div>
          </div>
        </div>
      </header>

      <main className="py-8 px-4 sm:px-6 lg:px-8">
        {status === 'loading' && (
          <div className="flex items-center justify-center py-24">
            <svg className="animate-spin w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}

        {status === 'invalid' && (
          <div className="max-w-md mx-auto mt-16 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
            <p className="text-gray-500 text-sm">This survey link is invalid or has been revoked. Please contact the administrator for a new link.</p>
          </div>
        )}

        {status === 'expired' && (
          <div className="max-w-md mx-auto mt-16 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h2>
            {expiredDate && (
              <p className="text-sm font-semibold text-amber-600 mb-2">Expired on {expiredDate}</p>
            )}
            <p className="text-gray-500 text-sm">This survey link has expired. Please contact the administrator for a new link.</p>
          </div>
        )}

        {status === 'valid' && <SurveyForm />}
      </main>

      <footer className="border-t border-gray-200 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-gray-400">© {new Date().getFullYear()} SCF-EAT Survey Platform</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicSurveyPage;
