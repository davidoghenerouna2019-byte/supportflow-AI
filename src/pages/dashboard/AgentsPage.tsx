import React, { useEffect, useState } from 'react';
import { Loader2, Plus, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, extractApiError } from '../../services/api';
import type { Department } from '../../types';

interface AgentRecord {
  id: number;
  fullName: string;
  email: string;
  role: 'AGENT' | 'ADMIN';
  departmentId: number | null;
  departmentName: string;
  isActive: boolean;
  activeWorkload: number;
  resolvedCount: number;
  totalAssigned: number;
}

export function AgentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [role, setRole] = useState<'AGENT' | 'ADMIN'>('AGENT');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, dRes] = await Promise.all([
        api.get<{ agents: AgentRecord[] }>('/agents'),
        api.get<{ departments: Department[] }>('/departments'),
      ]);
      setAgents(aRes.data.agents);
      setDepartments(dRes.data.departments);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load support agents.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditingId(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setDepartmentId(departments[0] ? String(departments[0].id) : '');
    setRole('AGENT');
    setShowForm(true);
  };

  const openEdit = (agent: AgentRecord) => {
    setEditingId(agent.id);
    setFullName(agent.fullName);
    setEmail(agent.email);
    setPassword('');
    setDepartmentId(agent.departmentId ? String(agent.departmentId) : '');
    setRole(agent.role);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.put(`/agents/${editingId}`, {
          fullName,
          email,
          departmentId: departmentId ? Number(departmentId) : null,
          role,
          ...(password ? { password } : {}),
        });
      } else {
        await api.post('/agents', {
          fullName,
          email,
          password,
          departmentId: departmentId ? Number(departmentId) : null,
          role,
          isActive: true,
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Could not save support agent.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (agent: AgentRecord) => {
    try {
      await api.put(`/agents/${agent.id}`, { isActive: !agent.isActive });
      await load();
    } catch (err) {
      setError(extractApiError(err, 'Could not update agent status.'));
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading support team...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#062D48]">
            Support Agents &amp; Administrators
          </h2>
          <p className="text-xs text-slate-500">
            Manage agent accounts, department assignments, workloads, and
            resolution counts.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#062D48] hover:bg-[#093e63] text-white text-xs font-semibold cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Support Agent</span>
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
            {editingId ? 'Edit Support Agent' : 'Create Support Agent'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {editingId ? 'New Password (optional)' : 'Initial Password'}
              </label>
              <input
                type="password"
                required={!editingId}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'AGENT' | 'ADMIN')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="AGENT">Support Agent</option>
                <option value="ADMIN">Administrator</option>
              </select>
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
              {saving ? 'Saving...' : 'Save Agent'}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <th className="py-3 px-4">Agent</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4 text-right">Active Queue</th>
              <th className="py-3 px-4 text-right">Resolved</th>
              <th className="py-3 px-4">Account Status</th>
              {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {agents.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{a.fullName}</div>
                  <div className="text-slate-500">{a.email}</div>
                </td>
                <td className="py-3 px-4 font-medium text-[#062D48]">{a.role}</td>
                <td className="py-3 px-4 text-slate-700">{a.departmentName}</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {a.activeWorkload}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                  {a.resolvedCount}
                </td>
                <td className="py-3 px-4">
                  {a.isActive ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <UserCheck className="w-3.5 h-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                      <UserX className="w-3.5 h-3.5" />
                      Inactive
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="text-[#062D48] font-semibold hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(a)}
                      className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      {a.isActive ? 'Deactivate' : 'Activate'}
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
