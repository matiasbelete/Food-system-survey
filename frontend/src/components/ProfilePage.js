import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  AcademicCapIcon, ArrowLeftIcon, ArrowRightOnRectangleIcon,
  UserCircleIcon, EnvelopeIcon, LockClosedIcon, CheckCircleIcon,
  EyeIcon, EyeSlashIcon
} from '@heroicons/react/24/outline';

const API = 'http://localhost:5000';

const roleBack = { admin: '/admin', manager: '/manager', auditor: '/auditor' };
const roleLabel = { admin: 'Admin Panel', manager: 'Dashboard', auditor: 'Survey' };
const roleBadge = { admin: 'bg-red-100 text-red-700', manager: 'bg-blue-100 text-blue-700', auditor: 'bg-green-100 text-green-700' };

export default function ProfilePage() {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const [form, setForm] = useState({ name: '', email: '', current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [joinedDate, setJoinedDate] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/api/profile`, { headers });
      setForm(f => ({ ...f, name: res.data.name, email: res.data.email }));
      setJoinedDate(res.data.created_at);
    } catch { setError('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const notify = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.new_password && form.new_password !== form.confirm_password)
      return notify('New passwords do not match', true);
    if (form.new_password && form.new_password.length < 6)
      return notify('New password must be at least 6 characters', true);

    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email };
      if (form.new_password) {
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
      }
      const res = await axios.put(`${API}/api/profile`, payload, { headers });
      updateUser(res.data.user);
      setForm(f => ({ ...f, current_password: '', new_password: '', confirm_password: '' }));
      notify('Profile updated successfully');
    } catch (err) { notify(err.response?.data?.error || 'Failed to update profile', true); }
    finally { setSaving(false); }
  };

  const backPath = roleBack[user?.role] || '/';
  const backLabel = roleLabel[user?.role] || 'Home';

  const PasswordInput = ({ field, label, show, onToggle, placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <LockClosedIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type={show ? 'text' : 'password'}
          value={form[field]}
          onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
          placeholder={placeholder}
          className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
            <span className="font-semibold text-gray-900">SCF-EAT</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">My Profile</span>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate(backPath)} className="flex items-center space-x-1 text-sm text-indigo-600 hover:underline">
              <ArrowLeftIcon className="w-4 h-4" /><span>{backLabel}</span>
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600">
              <ArrowRightOnRectangleIcon className="w-4 h-4" /><span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {error   && <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="mb-5 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2"><CheckCircleIcon className="w-4 h-4" />{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left — avatar card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <span className="text-4xl font-bold text-indigo-600">
                  {form.name ? form.name.charAt(0).toUpperCase() : <UserCircleIcon className="w-12 h-12" />}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{form.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{form.email}</p>
              <span className={`mt-3 px-3 py-1 text-xs font-semibold rounded-full capitalize ${roleBadge[user?.role]}`}>
                {user?.role}
              </span>
              {joinedDate && (
                <p className="text-xs text-gray-400 mt-4">
                  Member since {new Date(joinedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </p>
              )}
            </div>
          </div>

          {/* Right — form */}
          <div className="md:col-span-2 space-y-5">
            <form onSubmit={handleSave} className="space-y-5">
              {/* Basic info */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <div className="relative">
                      <UserCircleIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Your full name"
                        required
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <EnvelopeIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="your@email.com"
                        required
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={user?.role}
                      disabled
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed capitalize"
                    />
                    <p className="text-xs text-gray-400 mt-1">Role can only be changed by an administrator.</p>
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Change Password</h3>
                <p className="text-xs text-gray-400 mb-4">Leave blank to keep your current password.</p>
                <div className="space-y-4">
                  <PasswordInput field="current_password" label="Current Password" show={showCurrent} onToggle={() => setShowCurrent(v => !v)} placeholder="Enter current password" />
                  <PasswordInput field="new_password" label="New Password" show={showNew} onToggle={() => setShowNew(v => !v)} placeholder="Min. 6 characters" />
                  <PasswordInput field="confirm_password" label="Confirm New Password" show={showConfirm} onToggle={() => setShowConfirm(v => !v)} placeholder="Repeat new password" />
                  {form.new_password && form.confirm_password && (
                    <p className={`text-xs font-medium ${form.new_password === form.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                      {form.new_password === form.confirm_password ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving
                    ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Saving...</>
                    : 'Save Changes'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
