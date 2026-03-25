import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  AcademicCapIcon, ArrowRightOnRectangleIcon,
  ArrowLeftIcon, UserPlusIcon, PencilIcon, TrashIcon,
  MagnifyingGlassIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon,
  UsersIcon, ShieldCheckIcon, EyeIcon, CheckCircleIcon
} from '@heroicons/react/24/outline';

const API = 'http://localhost:5000';

const ROLES = ['all', 'admin', 'manager', 'auditor'];
const STATUSES = ['all', 'active', 'inactive'];
const PAGE_SIZES = [10, 25, 50];

const roleStyle = {
  admin:   'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  auditor: 'bg-green-100 text-green-700',
};

export default function ManageUsersPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // filters & sort
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey]     = useState('created_at');
  const [sortDir, setSortDir]     = useState('desc');

  // pagination
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);

  // modal
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ name: '', email: '', password: '', role: 'auditor', is_active: true });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/users`, { headers });
      setUsers(res.data);
    } catch { notify('Failed to load users', true); }
    finally { setLoading(false); }
  };

  const notify = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  // ── derived data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...users];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all')   list = list.filter(u => u.role === roleFilter);
    if (statusFilter !== 'all') list = list.filter(u => (statusFilter === 'active') === Boolean(u.is_active));

    list.sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [users, search, roleFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    admins:   users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    auditors: users.filter(u => u.role === 'auditor').length,
  }), [users]);

  // ── sort helper ───────────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc'
      ? <ChevronUpIcon className="w-3.5 h-3.5 text-indigo-500" />
      : <ChevronDownIcon className="w-3.5 h-3.5 text-indigo-500" />;
  };

  // ── modal helpers ─────────────────────────────────────────────────────────
  const openModal = (u = null) => {
    setEditing(u);
    setForm(u
      ? { name: u.name, email: u.email, password: '', role: u.role, is_active: Boolean(u.is_active) }
      : { name: '', email: '', password: '', role: 'auditor', is_active: true }
    );
    setModal(true);
  };

  const saveUser = async () => {
    if (!form.name.trim() || !form.email.trim()) return notify('Name and email are required', true);
    if (!editing && !form.password.trim()) return notify('Password is required for new users', true);
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/api/users/${editing.user_id}`, form, { headers });
        notify('User updated successfully');
      } else {
        await axios.post(`${API}/api/users`, form, { headers });
        notify('User created successfully');
      }
      setModal(false);
      fetchUsers();
    } catch (err) { notify(err.response?.data?.error || 'Failed to save user', true); }
    finally { setSaving(false); }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete "${u.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/api/users/${u.user_id}`, { headers });
      notify('User deleted');
      fetchUsers();
    } catch { notify('Failed to delete user', true); }
  };

  const toggleActive = async (u) => {
    try {
      await axios.put(`${API}/api/users/${u.user_id}`, { ...u, is_active: !u.is_active }, { headers });
      notify(`User ${u.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch { notify('Failed to update status', true); }
  };

  // ── render ────────────────────────────────────────────────────────────────
  const cols = [
    { key: 'name',       label: 'Name' },
    { key: 'email',      label: 'Email' },
    { key: 'role',       label: 'Role' },
    { key: 'is_active',  label: 'Status' },
    { key: 'created_at', label: 'Created' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AcademicCapIcon className="w-7 h-7 text-indigo-600" />
            <span className="font-semibold text-gray-900">SCF-EAT Admin Panel</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Manage Users</span>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin')} className="flex items-center space-x-1 text-sm text-indigo-600 hover:underline">
              <ArrowLeftIcon className="w-4 h-4" /><span>Admin Panel</span>
            </button>
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

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Notifications */}
        {error   && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Users',  value: stats.total,    icon: UsersIcon,       color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Active',       value: stats.active,   icon: CheckCircleIcon, color: 'bg-green-50 text-green-600' },
            { label: 'Admins',       value: stats.admins,   icon: ShieldCheckIcon, color: 'bg-red-50 text-red-600' },
            { label: 'Managers',     value: stats.managers, icon: EyeIcon,         color: 'bg-blue-50 text-blue-600' },
            { label: 'Auditors',     value: stats.auditors, icon: UsersIcon,       color: 'bg-emerald-50 text-emerald-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search name or email…"
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
                />
              </div>
              {/* Role filter */}
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {ROLES.map(r => <option key={r} value={r}>{r === 'all' ? 'All Roles' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              {/* Status filter */}
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              {/* Results count */}
              <span className="text-sm text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => openModal()}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium flex-shrink-0">
              <UserPlusIcon className="w-4 h-4" /><span>Add User</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {cols.map(({ key, label }) => (
                    <th key={key} onClick={() => handleSort(key)}
                      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-1">
                        {label}<SortIcon col={key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center">
                    <svg className="w-6 h-6 animate-spin text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm">
                    No users match your filters.
                  </td></tr>
                ) : paginated.map(u => (
                  <tr key={u.user_id} className="hover:bg-gray-50 transition-colors">
                    {/* Name + avatar */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-600">{u.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          {u.user_id === user.user_id && <p className="text-xs text-indigo-500">You</p>}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    {/* Role */}
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${roleStyle[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    {/* Status toggle */}
                    <td className="px-5 py-3">
                      <button onClick={() => u.user_id !== user.user_id && toggleActive(u)}
                        disabled={u.user_id === user.user_id}
                        title={u.user_id === user.user_id ? "Can't deactivate yourself" : (u.is_active ? 'Click to deactivate' : 'Click to activate')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                          u.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        } ${u.user_id === user.user_id ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    {/* Created */}
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal(u)}
                          className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors" title="Edit">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteUser(u)} disabled={u.user_id === user.user_id}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Delete">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows per page:</span>
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-indigo-500">
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="ml-2">
                {filtered.length === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}`} of {filtered.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded-md text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">«</button>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="px-2 py-1 rounded-md text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '…'
                  ? <span key={`e${i}`} className="px-2 py-1 text-gray-400 text-sm">…</span>
                  : <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${page === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                      {p}
                    </button>
                )}
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                className="px-2 py-1 rounded-md text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded-md text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">»</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-base font-semibold text-gray-900">{editing ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: 'Full Name', field: 'name', type: 'text', placeholder: 'e.g. Jane Smith' },
                { label: 'Email Address', field: 'email', type: 'email', placeholder: 'e.g. jane@university.edu' },
                { label: editing ? 'New Password (leave blank to keep)' : 'Password', field: 'password', type: 'password', placeholder: editing ? 'Leave blank to keep current' : 'Min. 8 characters' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={form[field]} placeholder={placeholder}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['auditor', 'manager', 'admin'].map(r => (
                    <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))}
                      className={`py-2 rounded-lg text-sm font-medium border-2 transition-colors capitalize ${
                        form.role === r
                          ? r === 'admin' ? 'border-red-500 bg-red-50 text-red-700'
                            : r === 'manager' ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {editing && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-gray-700">{form.is_active ? 'Active' : 'Inactive'}</span>
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100">Cancel</button>
              <button onClick={saveUser} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {saving && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                {editing ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
