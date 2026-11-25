import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { api, extractApiError } from '../../services/api';
import type { AnalyticsOverview } from '../../types';

interface PerformanceData {
  departmentPerformance: Array<{
    departmentId: number;
    departmentName: string;
    total: number;
    resolved: number;
    escalated: number;
    avgFirstResponseMs: number;
  }>;
  agentPerformance: Array<{
    agentId: number;
    fullName: string;
    departmentName: string;
    assignedCount: number;
    resolvedCount: number;
    activeQueue: number;
  }>;
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ overview: AnalyticsOverview }>('/analytics/overview'),
      api.get<PerformanceData>('/analytics/performance'),
    ])
      .then(([ovRes, pRes]) => {
        setOverview(ovRes.data.overview);
        setPerf(pRes.data);
      })
      .catch((err) =>
        setError(extractApiError(err, 'Failed to load analytics report.'))
      )
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    if (!perf) return;
    const rows = [
      ['Department', 'Total Conversations', 'Resolved', 'Escalated', 'Avg First Response (ms)'],
      ...perf.departmentPerformance.map((d) => [
        d.departmentName,
        String(d.total),
        String(d.resolved),
        String(d.escalated),
        String(d.avgFirstResponseMs),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `support-flow-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading analytics report...</span>
      </div>
    );
  }

  if (error || !overview || !perf) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error || 'Analytics unavailable.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#062D48]">
            Support Performance &amp; Success Metrics
          </h2>
          <p className="text-xs text-slate-500">
            Live database measurements alongside proposed 90-day PRD launch targets.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download CSV</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">First-Response Time (Avg)</p>
          <p className="mt-2 text-2xl font-bold text-[#062D48] font-mono tabular-nums">
            {(overview.avgFirstResponseMs / 1000).toFixed(2)}s
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">AI Resolution Rate</p>
          <p className="mt-2 text-2xl font-bold text-[#0D9488] font-mono tabular-nums">
            {overview.aiResolutionRate}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Escalation Rate</p>
          <p className="mt-2 text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {overview.escalationRate}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Avg Resolution Duration</p>
          <p className="mt-2 text-2xl font-bold text-[#062D48] font-mono tabular-nums">
            {overview.avgResolutionMinutes}m
          </p>
        </div>
      </div>

      {/* Proposed PRD Targets Notice */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
        <h3 className="text-sm font-semibold text-[#062D48]">
          Proposed 90-Day PRD Launch Targets (Benchmark Goals)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 pt-1">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
            <span className="font-semibold text-slate-900">
              First-Response Target:
            </span>{' '}
            {overview.proposedTargets.firstResponseReductionTarget}
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
            <span className="font-semibold text-slate-900">
              AI Deflection Target:
            </span>{' '}
            {overview.proposedTargets.aiResolutionTarget}
          </div>
        </div>
      </div>

      {/* Department Performance Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-[#062D48]">
            Department Performance Breakdown
          </h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-right">Resolved</th>
              <th className="py-3 px-4 text-right">Escalated</th>
              <th className="py-3 px-4 text-right">Avg First Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {perf.departmentPerformance.map((d) => (
              <tr key={d.departmentId}>
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {d.departmentName}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {d.total}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                  {d.resolved}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700">
                  {d.escalated}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                  {(d.avgFirstResponseMs / 1000).toFixed(2)}s
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Agent Performance Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-[#062D48]">
            Support Agent Performance
          </h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
              <th className="py-3 px-4">Agent</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4 text-right">Assigned</th>
              <th className="py-3 px-4 text-right">Resolved</th>
              <th className="py-3 px-4 text-right">Active Queue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {perf.agentPerformance.map((a) => (
              <tr key={a.agentId}>
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {a.fullName}
                </td>
                <td className="py-3 px-4 text-slate-600">{a.departmentName}</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {a.assignedCount}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                  {a.resolvedCount}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">
                  {a.activeQueue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
