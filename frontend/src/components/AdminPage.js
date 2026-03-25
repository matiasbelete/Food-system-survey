import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SurveyFormManager from './SurveyFormManager';
import {
  AcademicCapIcon, ArrowRightOnRectangleIcon, UserPlusIcon,
  PencilIcon, TrashIcon, PlusCircleIcon, DocumentArrowUpIcon
} from '@heroicons/react/24/outline';

const API = 'http://localhost:5000';

const AdminPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');

  // Question options state
  const [questionOptions, setQuestionOptions] = useState([]);
  const [optionModal, setOptionModal] = useState(false);
  const [selectedQuestionForOptions, setSelectedQuestionForOptions] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [optionForm, setOptionForm] = useState({ option_value: '', option_label: '', display_order: 0 });

  // Category state
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ category_code: '', category_name: '', description: '', weight_percentage: '', display_order: 0, is_active: true });

  // Questions state
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questionModal, setQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_code: '', question_text: '', question_type: 'text',
    category_id: '', is_required: true, display_order: 0, placeholder: '', is_active: true
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Public link state
  const [publicLinks, setPublicLinks] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkExpiry, setNewLinkExpiry] = useState('');
  const [shareModal, setShareModal] = useState(null); // { url, label }
  const [shareEmails, setShareEmails] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareLoading, setShareLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    fetchQuestions();
    fetchCategories();
    fetchPublicLinks();
  }, []);

  const fetchPublicLinks = async () => {
    try { const res = await axios.get(`${API}/api/admin/public-links`, { headers }); setPublicLinks(res.data); } catch {}
  };

  const createPublicLink = async () => {
    setLinkLoading(true);
    try {
      await axios.post(`${API}/api/admin/public-links`, { label: newLinkLabel || 'Survey Link', expires_at: newLinkExpiry || null }, { headers });
      notify('Public link created');
      setNewLinkLabel('');
      setNewLinkExpiry('');
      fetchPublicLinks();
    } catch (err) { notify(err.response?.data?.error || 'Failed', true); }
    finally { setLinkLoading(false); }
  };

  const revokePublicLink = async (id) => {
    if (!window.confirm('Revoke this link? Anyone with the link will no longer be able to access the survey.')) return;
    try { await axios.delete(`${API}/api/admin/public-links/${id}`, { headers }); notify('Link revoked'); fetchPublicLinks(); }
    catch { notify('Failed to revoke', true); }
  };

  const deletePublicLink = async (id) => {
    if (!window.confirm('Permanently delete this link? This cannot be undone.')) return;
    try { await axios.delete(`${API}/api/admin/public-links/${id}/permanent`, { headers }); notify('Link deleted'); fetchPublicLinks(); }
    catch { notify('Failed to delete', true); }
  };

  const copyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openShareModal = (url, label) => {
    setShareModal({ url, label });
    setShareEmails('');
    setShareMessage('');
  };

  const sendEmailInvites = async () => {
    const recipients = shareEmails.split(/[,\n]+/).map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) return notify('Enter at least one email address', true);
    setShareLoading(true);
    try {
      const res = await axios.post(`${API}/api/admin/send-survey-link`,
        { recipients, url: shareModal.url, label: shareModal.label, message: shareMessage },
        { headers }
      );
      notify(res.data.message);
      setShareModal(null);
    } catch (err) { notify(err.response?.data?.error || 'Failed to send email', true); }
    finally { setShareLoading(false); }
  };

  const fetchQuestions = async () => {
    try { const res = await axios.get(`${API}/api/admin/questions`, { headers }); setQuestions(res.data); } catch {}
  };
  const fetchCategories = async () => {
    try { const res = await axios.get(`${API}/api/admin/categories`, { headers }); setCategories(res.data); } catch {}
  };

  const notify = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  // Question CRUD
  const openQuestionModal = (q = null) => {
    setEditingQuestion(q);
    setQuestionForm(q ? {
      question_code: q.question_code, question_text: q.question_text,
      question_type: q.question_type, category_id: q.category_id || '',
      is_required: q.is_required, display_order: q.display_order,
      placeholder: q.placeholder || '', is_active: q.is_active
    } : { question_code: '', question_text: '', question_type: 'text', category_id: '', is_required: true, display_order: 0, placeholder: '', is_active: true });
    setQuestionModal(true);
  };

  const saveQuestion = async () => {
    try {
      if (editingQuestion) {
        await axios.put(`${API}/api/admin/questions/${editingQuestion.question_id}`, questionForm, { headers });
        notify('Question updated');
      } else {
        await axios.post(`${API}/api/admin/questions`, questionForm, { headers });
        notify('Question created');
      }
      setQuestionModal(false);
      fetchQuestions();
    } catch (err) { notify(err.response?.data?.error || 'Failed', true); }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Deactivate this question?')) return;
    try { await axios.delete(`${API}/api/admin/questions/${id}`, { headers }); notify('Question deactivated'); fetchQuestions(); }
    catch { notify('Failed', true); }
  };

  // Question Options CRUD
  const fetchQuestionOptions = async (questionId) => {
    try { 
      const res = await axios.get(`${API}/api/admin/questions/${questionId}/options`, { headers }); 
      setQuestionOptions(res.data); 
    } catch {}
  };

  const openOptionsManager = (question) => {
    setSelectedQuestionForOptions(question);
    fetchQuestionOptions(question.question_id);
  };

  const openOptionModal = (opt = null) => {
    setEditingOption(opt);
    setOptionForm(opt ? { option_value: opt.option_value, option_label: opt.option_label, display_order: opt.display_order } : { option_value: '', option_label: '', display_order: 0 });
    setOptionModal(true);
  };

  const saveOption = async () => {
    try {
      if (editingOption) {
        await axios.put(`${API}/api/admin/options/${editingOption.option_id}`, optionForm, { headers });
        notify('Option updated');
      } else {
        await axios.post(`${API}/api/admin/questions/${selectedQuestionForOptions.question_id}/options`, optionForm, { headers });
        notify('Option created');
      }
      setOptionModal(false);
      fetchQuestionOptions(selectedQuestionForOptions.question_id);
    } catch (err) { notify(err.response?.data?.error || 'Failed', true); }
  };

  const deleteOption = async (id) => {
    if (!window.confirm('Delete this option?')) return;
    try { 
      await axios.delete(`${API}/api/admin/options/${id}`, { headers }); 
      notify('Option deleted'); 
      fetchQuestionOptions(selectedQuestionForOptions.question_id); 
    } catch { notify('Failed', true); }
  };

  // Category CRUD
  const openCategoryModal = (cat = null) => {
    setEditingCategory(cat);
    setCategoryForm(cat ? {
      category_code: cat.category_code,
      category_name: cat.category_name,
      description: cat.description || '',
      weight_percentage: cat.weight_percentage || '',
      display_order: cat.display_order,
      is_active: cat.is_active
    } : { category_code: '', category_name: '', description: '', weight_percentage: '', display_order: 0, is_active: true });
    setCategoryModal(true);
  };

  const saveCategory = async () => {
    try {
      if (editingCategory) {
        await axios.put(`${API}/api/admin/categories/${editingCategory.category_id}`, categoryForm, { headers });
        notify('Category updated');
      } else {
        await axios.post(`${API}/api/admin/categories`, categoryForm, { headers });
        notify('Category created');
      }
      setCategoryModal(false);
      fetchCategories();
    } catch (err) { notify(err.response?.data?.error || 'Failed', true); }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category? This will affect all associated questions.')) return;
    try { 
      await axios.delete(`${API}/api/admin/categories/${id}`, { headers }); 
      notify('Category deleted'); 
      fetchCategories(); 
    } catch { notify('Failed to delete', true); }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
            <span className="font-semibold text-gray-900">SCF-EAT Admin Panel</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={() => navigate('/profile')}
              className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center hover:bg-indigo-200 transition-colors" title="My Profile">
              <span className="text-sm font-bold text-indigo-600">{user?.name?.charAt(0).toUpperCase()}</span>
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600">
              <ArrowRightOnRectangleIcon className="w-4 h-4" /><span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">{success}</div>}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-white rounded-lg shadow-sm p-1 w-fit">
          {['users', 'forms', 'questions', 'categories', 'public-link', 'import-legacy'].map(t => (
            <button key={t} onClick={() => t === 'import-legacy' ? navigate('/admin/import-legacy') : setTab(t)}
              className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t === 'users' ? 'Manage Users' : t === 'forms' ? 'Survey Forms' : t === 'questions' ? 'Questions' : t === 'categories' ? 'Categories' : t === 'public-link' ? '🔗 Public Link' : '📂 Import Legacy'}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <UserPlusIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Manage Users</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">View, search, filter, and manage all platform users with a full-featured dynamic table.</p>
            </div>
            <button onClick={() => navigate('/admin/users')}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              <UserPlusIcon className="w-4 h-4" />
              Open User Management
            </button>
          </div>
        )}

        {/* Survey Forms Tab */}
        {tab === 'forms' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SurveyFormManager token={token} onNotify={notify} />
          </div>
        )}

        {/* Questions Tab */}
        {tab === 'questions' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Survey Form Questions ({questions.length})</h2>
              <button onClick={() => openQuestionModal()} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
                <PlusCircleIcon className="w-4 h-4" /><span>Add Question</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>{['Code','Question','Type','Category','Required','Status','Options','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {questions.map(q => (
                    <tr key={q.question_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{q.question_code}</td>
                      <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{q.question_text}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{q.question_type}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{q.category_name || '—'}</td>
                      <td className="px-4 py-3">{q.is_required ? <span className="text-red-500 text-xs font-medium">Required</span> : <span className="text-gray-400 text-xs">Optional</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${q.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {q.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {['select', 'radio', 'checkbox'].includes(q.question_type) && (
                          <button onClick={() => openOptionsManager(q)} className="text-blue-600 hover:text-blue-800 text-xs underline">Manage Options</button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button onClick={() => openQuestionModal(q)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="w-4 h-4" /></button>
                          <button onClick={() => deleteQuestion(q.question_id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Public Link Tab */}
        {tab === 'public-link' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Generate Public Survey Link</h2>
              <p className="text-sm text-gray-500 mb-5">Create a shareable link anyone can use to fill the survey — no login required. Works like a Google Form link.</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Label (optional)</label>
                  <input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)}
                    placeholder="e.g. Fall 2025 Audit"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expires on (optional)</label>
                  <input type="date" value={newLinkExpiry} onChange={e => setNewLinkExpiry(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <button onClick={createPublicLink} disabled={linkLoading}
                  className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  <span>{linkLoading ? 'Generating...' : 'Generate Link'}</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">All Links ({publicLinks.length})</h3>
              {publicLinks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  <p className="text-sm">No links generated yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {publicLinks.map(link => {
                    const url = `${window.location.origin}/survey/${link.token}`;
                    const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                    return (
                      <div key={link.id} className={`border-2 rounded-xl p-5 ${
                        !link.is_active || isExpired ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-indigo-100 bg-indigo-50'
                      }`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">{link.label}</span>
                              {isExpired ? (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">Expired</span>
                              ) : link.is_active ? (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 font-medium">Active</span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">Revoked</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                              <span className="text-sm text-gray-700 font-mono truncate flex-1">{url}</span>
                              <button onClick={() => copyLink(url, link.id)}
                                className={`flex items-center space-x-1 px-3 py-1 rounded-md text-xs font-medium transition-colors flex-shrink-0 ${
                                  copiedId === link.id ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                }`}>
                                {copiedId === link.id
                                  ? <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span>Copied!</span></>
                                  : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg><span>Copy</span></>
                                }
                              </button>
                            </div>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                              <span>Created: {new Date(link.created_at).toLocaleDateString()}</span>
                              {link.expires_at && <span>Expires: {new Date(link.expires_at).toLocaleDateString()}</span>}
                              <span>Responses: {link.response_count ?? 0}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {link.is_active && !isExpired && (
                              <>
                                <button onClick={() => openShareModal(url, link.label)}
                                  className="flex items-center space-x-1 px-3 py-1.5 border border-indigo-200 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-50">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                  <span>Share</span>
                                </button>
                                <button onClick={() => revokePublicLink(link.id)}
                                  className="flex items-center space-x-1 px-3 py-1.5 border border-orange-200 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-50">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                  <span>Revoke</span>
                                </button>
                              </>
                            )}
                            <button onClick={() => deletePublicLink(link.id)}
                              className="flex items-center space-x-1 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {tab === 'categories' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Question Categories ({categories.length})</h2>
              <button onClick={() => openCategoryModal()} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
                <PlusCircleIcon className="w-4 h-4" /><span>Add Category</span>
              </button>
            </div>
            <div className="grid gap-4">
              {categories.map(c => (
                <div key={c.category_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{c.category_name}</h3>
                      <p className="text-xs text-gray-500 mt-1">Code: {c.category_code}</p>
                      {c.description && <p className="text-sm text-gray-600 mt-2">{c.description}</p>}
                      <div className="flex gap-3 mt-2">
                        <span className="text-xs text-gray-500">Order: {c.display_order}</span>
                        {c.weight_percentage && <span className="text-xs text-gray-500">Weight: {c.weight_percentage}%</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex space-x-2">
                        <button onClick={() => openCategoryModal(c)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={() => deleteCategory(c.category_id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">Share Survey Link</h3>
              <button onClick={() => setShareModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Quick share buttons */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">Quick Share</p>
                <div className="grid grid-cols-3 gap-2">
                  {/* Copy */}
                  <button onClick={() => { navigator.clipboard.writeText(shareModal.url); notify('Link copied!'); }}
                    className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Copy Link</span>
                  </button>
                  {/* WhatsApp */}
                  <a href={`https://wa.me/?text=${encodeURIComponent(`${shareModal.label}\n${shareModal.url}`)}`} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">WhatsApp</span>
                  </a>
                  {/* Gmail */}
                  <a href={`https://mail.google.com/mail/?view=cm&su=${encodeURIComponent(`Survey Invitation: ${shareModal.label}`)}&body=${encodeURIComponent(`You are invited to fill out the survey:\n${shareModal.url}`)}`} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Gmail</span>
                  </a>
                </div>
              </div>

              {/* Email via backend */}
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-3">Send Email Directly</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Recipients <span className="text-gray-400 font-normal">(comma or newline separated)</span></label>
                    <textarea value={shareEmails} onChange={e => setShareEmails(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Custom message <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea value={shareMessage} onChange={e => setShareMessage(e.target.value)}
                      placeholder="Please complete this survey by Friday..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                  </div>
                  <button onClick={sendEmailInvites} disabled={shareLoading || !shareEmails.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {shareLoading
                      ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Sending...</>
                      : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Send Invitations</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {categoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Code</label>
                <input value={categoryForm.category_code} onChange={e => setCategoryForm(p => ({ ...p, category_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" 
                  placeholder="e.g. AUDIT, CONTEXT" disabled={!!editingCategory} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input value={categoryForm.category_name} onChange={e => setCategoryForm(p => ({ ...p, category_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" 
                  placeholder="e.g. Auditor Information" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={categoryForm.description} onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight %</label>
                  <input type="number" step="0.01" value={categoryForm.weight_percentage} onChange={e => setCategoryForm(p => ({ ...p, weight_percentage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" placeholder="e.g. 30.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" value={categoryForm.display_order} onChange={e => setCategoryForm(p => ({ ...p, display_order: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              {editingCategory && (
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={categoryForm.is_active} onChange={e => setCategoryForm(p => ({ ...p, is_active: e.target.checked }))} />
                  <span>Active</span>
                </label>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-5">
              <button onClick={() => setCategoryModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveCategory} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Question Options Manager Modal */}
      {selectedQuestionForOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">Manage Options</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedQuestionForOptions.question_text}</p>
              </div>
              <button onClick={() => setSelectedQuestionForOptions(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <button onClick={() => openOptionModal()} className="mb-4 flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
              <PlusCircleIcon className="w-4 h-4" /><span>Add Option</span>
            </button>
            <div className="space-y-2">
              {questionOptions.map(opt => (
                <div key={opt.option_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500 font-mono">#{opt.display_order}</span>
                      <span className="font-medium text-gray-900">{opt.option_label}</span>
                      <span className="text-xs text-gray-500">({opt.option_value})</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => openOptionModal(opt)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => deleteOption(opt.option_id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {questionOptions.length === 0 && (
                <p className="text-center text-gray-500 py-8">No options yet. Add one to get started.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Option Modal */}
      {optionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{editingOption ? 'Edit Option' : 'Add Option'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option Value</label>
                <input value={optionForm.option_value} onChange={e => setOptionForm(p => ({ ...p, option_value: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" placeholder="e.g. yes, no, option1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Option Label</label>
                <input value={optionForm.option_label} onChange={e => setOptionForm(p => ({ ...p, option_label: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" placeholder="e.g. Yes, No, Option 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input type="number" value={optionForm.display_order} onChange={e => setOptionForm(p => ({ ...p, display_order: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-5">
              <button onClick={() => setOptionModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveOption} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {questionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">{editingQuestion ? 'Edit Question' : 'Add Question'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Code</label>
                <input value={questionForm.question_code} onChange={e => setQuestionForm(p => ({ ...p, question_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" placeholder="e.g. q15_new_question" disabled={!!editingQuestion} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea value={questionForm.question_text} onChange={e => setQuestionForm(p => ({ ...p, question_text: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={questionForm.question_type} onChange={e => setQuestionForm(p => ({ ...p, question_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm">
                    {['text','number','email','date','time','select','radio','checkbox','textarea'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={questionForm.category_id} onChange={e => setQuestionForm(p => ({ ...p, category_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm">
                    <option value="">None</option>
                    {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                <input value={questionForm.placeholder} onChange={e => setQuestionForm(p => ({ ...p, placeholder: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" value={questionForm.display_order} onChange={e => setQuestionForm(p => ({ ...p, display_order: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 text-sm" />
                </div>
                <div className="flex flex-col justify-end space-y-2 pb-1">
                  <label className="flex items-center space-x-2 text-sm">
                    <input type="checkbox" checked={questionForm.is_required} onChange={e => setQuestionForm(p => ({ ...p, is_required: e.target.checked }))} />
                    <span>Required</span>
                  </label>
                  {editingQuestion && (
                    <label className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={questionForm.is_active} onChange={e => setQuestionForm(p => ({ ...p, is_active: e.target.checked }))} />
                      <span>Active</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-5">
              <button onClick={() => setQuestionModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveQuestion} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
