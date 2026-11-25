import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface AuditLogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
}

export function SettingsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api
        .get<{ logs: AuditLogEntry[] }>('/audit-logs')
        .then((res) => setLogs(res.data.logs))
        .catch(() => undefined);
    }
  }, [user?.role]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-base font-bold text-[#062D48]">Account Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div>
            <p className="text-slate-500">Full Name</p>
            <p className="font-semibold text-slate-900 mt-1">
              {user?.fullName}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Email Address</p>
            <p className="font-semibold text-slate-900 mt-1">{user?.email}</p>
          </div>
          <div>
            <p className="text-slate-500">Assigned Role</p>
            <p className="font-semibold text-[#0D9488] mt-1">{user?.role}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
          <h2 className="text-base font-bold text-[#062D48]">
            Data Retention, Privacy &amp; NDPA Governance
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-2">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1">
            <p className="font-semibold text-slate-900">Data Minimization</p>
            <p>
              Support Flow AI avoids requesting payment cards or passwords in
              conversations and collects customer email/name only on account
              registration or voluntary human escalation.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1">
            <p className="font-semibold text-slate-900">24-Month Retention</p>
            <p>
              Conversation transcripts and audit logs are persisted in Cloud SQL
              PostgreSQL with role-restricted access and support NDPA erasure
              requests.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1">
            <p className="font-semibold text-slate-900">Grounding Guardrail</p>
            <p>
              The Gemini assistant retrieves exclusively from Published
              Knowledge Base articles and escalates when approved guidance is
              missing.
            </p>
          </div>
        </div>
      </div>

      {user?.role === 'ADMIN' && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-[#062D48]">
              Recent Security &amp; Administrative Audit Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">
                      {log.actorName || 'System'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#062D48] font-medium">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.entityType} #{log.entityId}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
