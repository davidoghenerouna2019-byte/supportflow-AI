import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Plus, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, extractApiError } from '../../services/api';
import type { Department } from '../../types';

export function DepartmentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ departments: Department[] }>('/departments');
      setDepartments(res.data.departments);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load departments.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setShowForm(true);
  };

  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setName(d.name);
    setDescription(d.description);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/departments/${editingId}`, { name, description });
      } else {
        await api.post('/departments', { name, description, isActive: true });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Failed to save department.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d: Department) => {
    try {
      await api.put(`/departments/${d.id}`, { isActive: !d.isActive });
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Failed to update department status.'));
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading departments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#062D48]">
            Support Departments
          </h2>
          <p className="text-xs text-slate-500">
            Configure functional queues used by automated routing and human
            agent transfers.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-xs font-semibold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-[#062D48]">
            {editingId ? 'Edit Department' : 'New Department'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Department Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#0D9488] text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((d) => (
          <div
            key={d.id}
            className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold text-[#062D48]">{d.name}</h3>
                {d.isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                    <XCircle className="w-3.5 h-3.5" />
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {d.description || 'No description provided.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="text-slate-500 font-mono tabular-nums">
                {d.agentCount ?? 0} agents · {d.openCount ?? 0} active ·{' '}
                {d.conversationCount ?? 0} total
              </div>
              {isAdmin && (
                <div className="space-x-3">
                  <button
                    type="button"
                    onClick={() => openEdit(d)}
                    className="font-semibold text-[#062D48] hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(d)}
                    className="text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    {d.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
