import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, extractApiError } from '../../services/api';
import type { Department, RoutingRule } from '../../types';

export function RoutingRulesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [category, setCategory] = useState('');
  const [keywords, setKeywords] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [priority, setPriority] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, dRes] = await Promise.all([
        api.get<{ rules: RoutingRule[] }>('/routing-rules'),
        api.get<{ departments: Department[] }>('/departments'),
      ]);
      setRules(rRes.data.rules);
      setDepartments(dRes.data.departments);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load routing rules.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setCategory('Technical');
    setKeywords('');
    setDepartmentId(departments[0] ? String(departments[0].id) : '');
    setPriority(rules.length + 1);
    setIsActive(true);
    setShowForm(true);
  };

  const openEdit = (r: RoutingRule) => {
    setEditingId(r.id);
    setCategory(r.category);
    setKeywords(r.keywords);
    setDepartmentId(String(r.departmentId));
    setPriority(r.priority);
    setIsActive(r.isActive);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        category,
        keywords,
        departmentId: Number(departmentId),
        priority: Number(priority),
        isActive,
      };
      if (editingId) {
        await api.put(`/routing-rules/${editingId}`, payload);
      } else {
        await api.post('/routing-rules', payload);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Failed to save routing rule.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: RoutingRule) => {
    try {
      await api.put(`/routing-rules/${r.id}`, { isActive: !r.isActive });
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Could not update rule status.'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/routing-rules/${id}`);
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Could not delete rule.'));
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading routing rules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#062D48]">
            Automated Routing Rules
          </h2>
          <p className="text-xs text-slate-500">
            Configured rules take priority over AI suggestions when matching
            categories and keywords to departments.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-xs font-semibold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Routing Rule</span>
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
            {editingId ? 'Edit Routing Rule' : 'New Routing Rule'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Technical"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Target Department
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Priority (1 = highest)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Trigger Keywords (comma-separated)
            </label>
            <input
              type="text"
              required
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="api, webhook, error, timeout, integration"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
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
              {saving ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Keywords</th>
              <th className="py-3 px-4">Target Department</th>
              <th className="py-3 px-4">State</th>
              {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {rules.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 font-mono tabular-nums font-semibold text-[#062D48]">
                  #{r.priority}
                </td>
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {r.category}
                </td>
                <td className="py-3 px-4 text-slate-600 max-w-md">
                  {r.keywords}
                </td>
                <td className="py-3 px-4 font-medium text-[#0D9488]">
                  {r.departmentName}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`font-medium ${
                      r.isActive ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {r.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleActive(r)}
                      className="text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      {r.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="font-semibold text-[#062D48] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      aria-label={`Delete rule ${r.category}`}
                      className="text-rose-600 hover:text-rose-800 inline-flex align-middle cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
