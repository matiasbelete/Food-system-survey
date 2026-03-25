import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PlusCircleIcon, PencilIcon, TrashIcon, ChevronRightIcon,
  ArrowLeftIcon, CheckCircleIcon, XMarkIcon
} from '@heroicons/react/24/outline';

const API = 'http://localhost:5000';

const SurveyFormManager = ({ token, onNotify }) => {
  const headers = { Authorization: `Bearer ${token}` };

  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formQuestions, setFormQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);

  // Modals
  const [formModal, setFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [formData, setFormData] = useState({ form_name: '', form_code: '', description: '', version: '1.0', is_active: true, is_default: false });

  const [addQModal, setAddQModal] = useState(false);
  const [addQSearch, setAddQSearch] = useState('');
  const [editQModal, setEditQModal] = useState(false);
  const [editingFQ, setEditingFQ] = useState(null);
  const [editQForm, setEditQForm] = useState({ section_number: 1, display_order: 0, is_required_override: null });

  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'form'|'question', id, label }

  useEffect(() => { fetchForms(); fetchAllQuestions(); }, []);

  const fetchForms = async () => {
    try { const res = await axios.get(`${API}/api/admin/forms`, { headers }); setForms(res.data); } catch {}
  };

  const fetchFormDetail = async (formId) => {
    try {
      const res = await axios.get(`${API}/api/admin/forms/${formId}`, { headers });
      setSelectedForm(res.data);
      setFormQuestions(res.data.questions || []);
    } catch {}
  };

  const fetchAllQuestions = async () => {
    try { const res = await axios.get(`${API}/api/admin/questions`, { headers }); setAllQuestions(res.data); } catch {}
  };

  const openFormModal = (f = null) => {
    setEditingForm(f);
    setFormData(f ? { form_name: f.form_name, form_code: f.form_code, description: f.description || '', version: f.version || '1.0', is_active: !!f.is_active, is_default: !!f.is_default }
      : { form_name: '', form_code: '', description: '', version: '1.0', is_active: true, is_default: false });
    setFormModal(true);
  };

  const saveForm = async () => {
    try {
      if (editingForm) {
        await axios.put(`${API}/api/admin/forms/${editingForm.form_id}`, formData, { headers });
        onNotify('Form updated');
        if (selectedForm?.form_id === editingForm.form_id) fetchFormDetail(editingForm.form_id);
      } else {
        await axios.post(`${API}/api/admin/forms`, formData, { headers });
        onNotify('Form created');
      }
      setFormModal(false);
      fetchForms();
    } catch (err) { onNotify(err.response?.data?.error || 'Failed', true); }
  };

  const confirmDelete = (type, id, label) => setDeleteConfirm({ type, id, label });

  const handleDelete = async () => {
    const { type, id } = deleteConfirm;
    try {
      if (type === 'form') {
        await axios.delete(`${API}/api/admin/forms/${id}`, { headers });
        onNotify('Form deleted');
        setView('list');
        setSelectedForm(null);
        fetchForms();
      } else if (type === 'question') {
        await axios.delete(`${API}/api/admin/forms/${selectedForm.form_id}/questions/${id}`, { headers });
        onNotify('Question removed from form');
        fetchFormDetail(selectedForm.form_id);
      }
    } catch (err) { onNotify(err.response?.data?.error || 'Failed to delete', true); }
    setDeleteConfirm(null);
  };

  const openFormDetail = (form) => {
    fetchFormDetail(form.form_id);
    setView('detail');
  };

  const addQuestionToForm = async (questionId) => {
    try {
      const existing = formQuestions.find(q => q.question_id === questionId);
      if (existing) { onNotify('Question already in form', true); return; }
      await axios.post(`${API}/api/admin/forms/${selectedForm.form_id}/questions`, { question_id: questionId, section_number: 1, display_order: formQuestions.length + 1 }, { headers });
      onNotify('Question added');
      fetchFormDetail(selectedForm.form_id);
    } catch (err) { onNotify(err.response?.data?.error || 'Failed', true); }
  };

  const openEditQ = (fq) => {
    setEditingFQ(fq);
    setEditQForm({ section_number: fq.section_number, display_order: fq.display_order, is_required_override: fq.is_required_override });
    setEditQModal(true);
  };

  const saveEditQ = async () => {
    try {
      await axios.put(`${API}/api/admin/forms/${selectedForm.form_id}/questions/${editingFQ.question_id}`, editQForm, { headers });
      onNotify('Question updated');
      setEditQModal(false);
      fetchFormDetail(selectedForm.form_id);
    } catch { onNotify('Failed', true); }
  };

  const availableQuestions = allQuestions.filter(q =>
    q.is_active &&
    !formQuestions.find(fq => fq.question_id === q.question_id) &&
    (q.question_text.toLowerCase().includes(addQSearch.toLowerCase()) || q.question_code.toLowerCase().includes(addQSearch.toLowerCase()))
  );

  // ── List View ──────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Survey Forms ({forms.length})</h2>
        <button onClick={() => openFormModal()} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          <PlusCircleIcon className="w-4 h-4" /><span>New Form</span>
        </button>
      </div>

      <div className="grid gap-4">
        {forms.map(f => (
          <div key={f.form_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1 cursor-pointer" onClick={() => openFormDetail(f)}>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{f.form_name}</h3>
                  {f.is_default && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">Default</span>}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {f.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Code: {f.form_code} · v{f.version} · {f.question_count} questions</p>
                {f.description && <p className="text-sm text-gray-600 mt-1">{f.description}</p>}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button onClick={() => openFormModal(f)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="w-4 h-4" /></button>
                <button onClick={() => confirmDelete('form', f.form_id, f.form_name)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                <button onClick={() => openFormDetail(f)} className="text-gray-400 hover:text-gray-600"><ChevronRightIcon className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        ))}
        {forms.length === 0 && <p className="text-center text-gray-500 py-12">No forms yet. Create one to get started.</p>}
      </div>

      {/* Form Modal */}
      {formModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">{editingForm ? 'Edit Form' : 'New Survey Form'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                <input value={formData.form_name} onChange={e => setFormData(p => ({ ...p, form_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500" placeholder="e.g. SCF-EAT Survey 2025" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Code</label>
                <input value={formData.form_code} onChange={e => setFormData(p => ({ ...p, form_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500"
                  placeholder="e.g. SCF_EAT_V2" disabled={!!editingForm} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                <input value={formData.version} onChange={e => setFormData(p => ({ ...p, version: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500" placeholder="1.0" />
              </div>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} />
                  <span>Active</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={formData.is_default} onChange={e => setFormData(p => ({ ...p, is_default: e.target.checked }))} />
                  <span>Set as Default</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-5">
              <button onClick={() => setFormModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && <DeleteConfirmModal item={deleteConfirm} onConfirm={handleDelete} onCancel={() => setDeleteConfirm(null)} />}
    </div>
  );

  // ── Detail View ────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <button onClick={() => { setView('list'); setSelectedForm(null); }} className="flex items-center space-x-1 text-sm text-indigo-600 hover:underline">
          <ArrowLeftIcon className="w-4 h-4" /><span>Back to Forms</span>
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-sm font-medium text-gray-700">{selectedForm?.form_name}</span>
      </div>

      {selectedForm && (
        <div className="space-y-6">
          {/* Form Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-semibold text-gray-900">{selectedForm.form_name}</h2>
                  {selectedForm.is_default && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">Default</span>}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${selectedForm.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {selectedForm.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">Code: {selectedForm.form_code} · Version {selectedForm.version}</p>
                {selectedForm.description && <p className="text-sm text-gray-600 mt-2">{selectedForm.description}</p>}
              </div>
              <div className="flex space-x-2">
                <button onClick={() => openFormModal(selectedForm)} className="flex items-center space-x-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                  <PencilIcon className="w-4 h-4" /><span>Edit</span>
                </button>
                <button onClick={() => confirmDelete('form', selectedForm.form_id, selectedForm.form_name)} className="flex items-center space-x-1 px-3 py-1.5 border border-red-200 rounded-md text-sm text-red-600 hover:bg-red-50">
                  <TrashIcon className="w-4 h-4" /><span>Delete Form</span>
                </button>
              </div>
            </div>
          </div>

          {/* Questions in Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Form Questions ({formQuestions.length})</h3>
              <button onClick={() => { setAddQSearch(''); setAddQModal(true); }} className="flex items-center space-x-2 bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm">
                <PlusCircleIcon className="w-4 h-4" /><span>Add Question</span>
              </button>
            </div>

            {formQuestions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No questions added yet. Click "Add Question" to start building this form.</p>
            ) : (
              <div className="space-y-2">
                {formQuestions.map((fq, idx) => (
                  <div key={fq.form_question_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-xs text-gray-400 w-6 text-center">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{fq.question_text}</p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-xs text-gray-500 font-mono">{fq.question_code}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{fq.question_type}</span>
                          <span className="text-xs text-gray-400">§{fq.section_number}</span>
                          {fq.category_name && <span className="text-xs text-indigo-500">{fq.category_name}</span>}
                          {fq.is_required_override !== null && fq.is_required_override !== undefined ? (
                            <span className={`text-xs ${fq.is_required_override ? 'text-red-500' : 'text-gray-400'}`}>
                              {fq.is_required_override ? 'Required' : 'Optional'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Default required</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-3">
                      <button onClick={() => openEditQ(fq)} className="text-indigo-600 hover:text-indigo-800"><PencilIcon className="w-4 h-4" /></button>
                      <button onClick={() => confirmDelete('question', fq.question_id, fq.question_text)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {addQModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Question to Form</h3>
              <button onClick={() => setAddQModal(false)} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <input value={addQSearch} onChange={e => setAddQSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-3 focus:outline-none focus:ring-indigo-500"
              placeholder="Search questions by text or code..." />
            <div className="overflow-y-auto flex-1 space-y-2">
              {availableQuestions.map(q => (
                <div key={q.question_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{q.question_text}</p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-xs font-mono text-gray-500">{q.question_code}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{q.question_type}</span>
                      {q.category_name && <span className="text-xs text-indigo-500">{q.category_name}</span>}
                    </div>
                  </div>
                  <button onClick={() => addQuestionToForm(q.question_id)} className="ml-3 flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700">
                    <PlusCircleIcon className="w-3.5 h-3.5" /><span>Add</span>
                  </button>
                </div>
              ))}
              {availableQuestions.length === 0 && <p className="text-center text-gray-500 py-8">No available questions found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Edit Question in Form Modal */}
      {editQModal && editingFQ && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-1">Edit Question in Form</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{editingFQ.question_text}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section Number</label>
                  <input type="number" min="1" value={editQForm.section_number} onChange={e => setEditQForm(p => ({ ...p, section_number: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input type="number" min="0" value={editQForm.display_order} onChange={e => setEditQForm(p => ({ ...p, display_order: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Override</label>
                <select value={editQForm.is_required_override === null || editQForm.is_required_override === undefined ? '' : String(editQForm.is_required_override)}
                  onChange={e => setEditQForm(p => ({ ...p, is_required_override: e.target.value === '' ? null : e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500">
                  <option value="">Use question default</option>
                  <option value="true">Required</option>
                  <option value="false">Optional</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-5">
              <button onClick={() => setEditQModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveEditQ} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Form Edit Modal (reused from list) */}
      {formModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Edit Form</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                <input value={formData.form_name} onChange={e => setFormData(p => ({ ...p, form_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                <input value={formData.version} onChange={e => setFormData(p => ({ ...p, version: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500" />
              </div>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))} />
                  <span>Active</span>
                </label>
                <label className="flex items-center space-x-2 text-sm">
                  <input type="checkbox" checked={formData.is_default} onChange={e => setFormData(p => ({ ...p, is_default: e.target.checked }))} />
                  <span>Set as Default</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-5">
              <button onClick={() => setFormModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={saveForm} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && <DeleteConfirmModal item={deleteConfirm} onConfirm={handleDelete} onCancel={() => setDeleteConfirm(null)} />}
    </div>
  );
};

const DeleteConfirmModal = ({ item, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[60]">
    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <TrashIcon className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Confirm Delete</h3>
      </div>
      <p className="text-sm text-gray-600 mb-1">
        {item.type === 'form' ? 'Are you sure you want to delete this form?' : 'Remove this question from the form?'}
      </p>
      <p className="text-sm font-medium text-gray-900 truncate mb-4">"{item.label}"</p>
      {item.type === 'form' && <p className="text-xs text-red-500 mb-4">This will also remove all questions assigned to this form.</p>}
      <div className="flex justify-end space-x-2">
        <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">Delete</button>
      </div>
    </div>
  </div>
);

export default SurveyFormManager;
