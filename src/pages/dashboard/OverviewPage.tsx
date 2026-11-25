import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, Loader2 } from 'lucide-react';
import { api, extractApiError } from '../../services/api';
import type { AnalyticsOverview } from '../../types';

interface ConversationsChartPayload {
  overTime: Array<{
    date: string;
    total: number;
    aiResolved: number;
    agentHandled: number;
  }>;
  byCategory: Array<{ category: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  resolutionSplit: Array<{ name: string; value: number }>;
}

interface PerformancePayload {
  departmentPerformance: Array<{
    departmentId: number;
    departmentName: string;
    total: number;
    resolved: number;
    escalated: number;
    avgFirstResponseMs: number;
  }>;
}

const CHART_COLORS = ['#062D48', '#0D9488', '#1D5B8C', '#D97706', '#DC2626', '#64748B'];

export function OverviewPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [charts, setCharts] = useState<ConversationsChartPayload | null>(null);
  const [perf, setPerf] = useState<PerformancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ovRes, convRes, perfRes] = await Promise.all([
          api.get<{ overview: AnalyticsOverview }>('/analytics/overview'),
          api.get<ConversationsChartPayload>('/analytics/conversations'),
          api.get<PerformancePayload>('/analytics/performance'),
        ]);
        if (!active) return;
        setOverview(ovRes.data.overview);
        setCharts(convRes.data);
        setPerf(perfRes.data);
      } catch (err) {
        if (!active) return;
        setError(extractApiError(err, 'Failed to load dashboard overview.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading live database metrics...</span>
      </div>
    );
  }

  if (error || !overview || !charts || !perf) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center gap-2 text-sm text-rose-800">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error || 'Unable to load analytics overview.'}</span>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Conversations', value: overview.totalConversations },
    { label: 'Open Conversations', value: overview.openConversations },
    { label: 'Pending Conversations', value: overview.pendingConversations },
    { label: 'Resolved Conversations', value: overview.resolvedConversations },
    { label: 'Active Customers', value: overview.activeCustomers },
    { label: 'Total Support Agents', value: overview.totalAgents },
    { label: 'AI Resolution Rate', value: `${overview.aiResolutionRate}%` },
    {
      label: 'Avg First Response Time',
      value: `${(overview.avgFirstResponseMs / 1000).toFixed(2)}s`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 8 Real KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-[#062D48] font-mono tabular-nums">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-[#062D48] mb-4">
            Conversations Over Time (Last 14 Days)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickFormatter={(d) => String(d).slice(5)}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#062D48"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="aiResolved"
                  name="AI Resolved"
                  stroke="#0D9488"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-[#062D48] mb-4">
            AI-Resolved vs. Agent-Resolved
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.resolutionSplit}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={2}
                >
                  {charts.resolutionSplit.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-[#062D48] mb-4">
            Enquiries by Category
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip />
                <Bar dataKey="count" name="Enquiries" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-[#062D48] mb-4">
            Department Performance
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perf.departmentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="departmentName"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={(v) => String(v).split(' ')[0]}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#062D48" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-[#062D48] mb-4">
            Conversation Status Distribution
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.byStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <YAxis
                  type="category"
                  dataKey="status"
                  width={82}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip />
                <Bar dataKey="count" name="Conversations" fill="#1D5B8C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
